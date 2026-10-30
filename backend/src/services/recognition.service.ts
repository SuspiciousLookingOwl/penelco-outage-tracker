import { BadRequestException, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { EventBus } from "@nestjs/cqrs";
import { Cron } from "@nestjs/schedule";
import { addDays, isBefore, subDays } from "date-fns";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { AppConfigService } from "../config/app-config.service";
import {
	Interruption,
	InterruptionPost,
	InterruptionRecognition,
	InterruptionRecord,
	InterruptionRecordType,
} from "../entities";
import { InterruptionRecordsCreatedEvent } from "../events";
import { InterruptionPostRepository } from "../repositories/interruption-post/interruption-post.repository";
import { InterruptionRecognitionRepository } from "../repositories/interruption-recognition/interruption-recognition.repository";
import { InterruptionRecordRepository } from "../repositories/interruption-record/interruption-record.repository";
import { InterruptionRepository } from "../repositories/interruption/interruption.repository";
import { RandomUtil } from "../utils";
import { DATE_FORMAT, DateUtil } from "../utils/date.util";
import { OpenAiService } from "./openai.service";
import { PenelcoService, type InterruptionResponse } from "./penelco.service";

export type RecognizedNotice = z.infer<typeof RecognitionService.INTERRUPTION_SCHEMA>;

@Injectable()
export class RecognitionService implements OnModuleInit {
	private readonly logger = new Logger(RecognitionService.name);
	private static FETCH_PAGE_SIZE = 10;
	private static FETCH_MAX_PAGES = 10;
	private static IMAGE_MAX_SIZE = 1024;
	private static IMAGE_WEBP_QUALITY = 85;
	private static RECOGNIZE_PROMPT = `
		Extract structured data from PENELCO (Peninsula Electric Cooperative, Bataan, Philippines) power interruption notices.
		Rules:
		- The input is either text or an image
		- Transcribe only what is visible. Never invent dates, times or places.
		- Times are printed in various format (e.g. "8:00 AM TO 5:00 PM/NN"). Convert them to 24 hour "HH:mm".
		- Notice type can be a new scheduled interruption, cancellation, or update / moved. 
		- If it's an update, there usually will be "from" (old) and "to" (new) time slots indicating the change, or "Formerly" containing old date (and optionally time).
		- If a notice is a cancellation, it usually has cancelled label / stamp
		- If there's no red cancelled stamp or "from" / "to", it usually a new scheduled interruption.
		- If a notice announces a moved schedule, put the current window in timeSlots and the old one in formerTimeSlots, keeping the printed label ("NEW TIME", "FORMERLY").
		- Split locations into area (city or municipality level) and subareas (barangay, street, subdivision, or "some parts of ..."), don't alter the original text.`;
	private static EXTRA_CONTENT_PROMPT = `
		Content (may contain information from other notices, prioritize information from image if exists):`;
	private static MATCH_PROMPT = `
		You are matching a newly recognized PENELCO power interruption notice against interruptions already stored in the database.
		The stored candidates cover a small date window around the notice, so several of them are unrelated.
		Choose the single candidate that refers to the SAME interruption as the notice, or none if there is no confident match.
		Rules:
		- Compare the date first. Prefer a candidate with the same date; only allow a different date if the notice clearly indicates the interruption was moved (e.g. it has formerTimeSlots or a "moved"/"new schedule" wording).
		- Compare the area and subareas (barangay, street, subdivision, "some parts of ..."). They should refer to the same place, allowing for spelling differences, abbreviations and partial coverage. Overlap in area plus subareas is a strong signal.
		- Compare the time slots and the reason for consistency; they help but are not required to match exactly.
		- Never pick a candidate just because the date is the same. If the place is clearly different, or the notice is ambiguous, answer null.
		- Only answer with an id that appears in the candidates list. Never invent an id.`;

	public static TIME_SLOT_SCHEMA = z.object({
		from: z.string().nullable(),
		to: z.string().nullable(),
		label: z.string().nullable(),
	});

	public static INTERRUPTION_SCHEMA = z.object({
		type: z.enum(InterruptionRecordType),
		date: z.string().nullable(),
		formerDate: z.string().nullable(),
		dayOfWeek: z.string().nullable(),
		timeSlots: z.array(RecognitionService.TIME_SLOT_SCHEMA),
		formerTimeSlots: z.array(RecognitionService.TIME_SLOT_SCHEMA),
		area: z.array(z.string()),
		subareas: z.array(z.string()),
		reason: z.string().nullable(),
		restorationTime: z.string().nullable(),
		rawText: z.string().nullable(),
		confidence: z.number(),
	});

	public static MATCH_SCHEMA = z.object({
		id: z.string().nullable(),
	});

	private isRecognizingUnsuccessful = false;
	private isFetchingInterruptions = false;
	private postRecognitionsInProgress = new Set<string>();

	constructor(
		private readonly penelcoService: PenelcoService,
		private readonly postRepository: InterruptionPostRepository,
		private readonly recognitionRepository: InterruptionRecognitionRepository,
		private readonly interruptionRepository: InterruptionRepository,
		private readonly recordRepository: InterruptionRecordRepository,
		private readonly openAiService: OpenAiService,
		private readonly config: AppConfigService,
		private readonly eventBus: EventBus
	) {}

	onModuleInit() {
		void this.fetchInterruptions();
		void this.recognizeUnsuccessful();
	}

	@Cron("*/5 * * * *")
	public async recognizeUnsuccessful(): Promise<void> {
		if (this.isRecognizingUnsuccessful) return;

		this.isRecognizingUnsuccessful = true;
		this.logger.log(`Starting recognizeUnsuccessful at ${new Date().toISOString()}`);

		try {
			const pending = await this.recognitionRepository.get({ success: false }, { post: true });

			const byPost = new Map<string, InterruptionRecognition[]>();
			for (const recognition of pending) {
				const group = byPost.get(recognition.interruptionPostId) ?? [];
				group.push(recognition);
				byPost.set(recognition.interruptionPostId, group);
			}

			for (const [postId, recognitions] of byPost) {
				const post = await this.postRepository.getById(postId);
				if (!post) {
					this.logger.warn(`Post ${postId} no longer exists, skipping recognition.`);
					continue;
				}

				await this.recognizeAll(post, recognitions);
			}

			this.logger.log(`Finished recognizeUnsuccessful at ${new Date().toISOString()}`);
		} catch (error) {
			this.logger.error(`recognizeUnsuccessful failed: ${error}`);
		} finally {
			this.isRecognizingUnsuccessful = false;
		}
	}

	@Cron("*/30 * * * *")
	public async fetchInterruptions(): Promise<void> {
		if (this.isFetchingInterruptions) return;

		this.isFetchingInterruptions = true;
		this.logger.log(`Starting fetchInterruptions at ${new Date().toISOString()}`);

		try {
			const cutoff = subDays(new Date(), this.config.fetchMaxAgeDays);

			const storedIds = new Set<string>();
			const latestId = await this.postRepository.getLatestPostId();
			if (latestId) storedIds.add(latestId);

			const rawPosts: InterruptionResponse[] = [];

			for (let page = 0; page < RecognitionService.FETCH_MAX_PAGES; page++) {
				const start = page * RecognitionService.FETCH_PAGE_SIZE;
				this.logger.log(
					`Fetching posts ${start}-${start + RecognitionService.FETCH_PAGE_SIZE} (page: ${page})`
				);
				const batch = await this.penelcoService.getInterruptions(start, RecognitionService.FETCH_PAGE_SIZE);

				if (!batch.length) break;

				let stop = false;

				for (const post of batch) {
					if (storedIds.has(post.id)) {
						this.logger.log(`Reached already stored post ${post.id} after ${rawPosts.length} new posts.`);
						stop = true;
						break;
					}

					const published = DateUtil.parseDateOrNull(post.timestamp);
					if (!published || isBefore(published, cutoff)) {
						this.logger.log(
							`Reached ${this.config.fetchMaxAgeDays}-day limit at ${post.id} after ${rawPosts.length} new posts.`
						);
						stop = true;
						break;
					}

					rawPosts.push(post);
				}

				if (stop) break;
			}

			if (rawPosts.length >= RecognitionService.FETCH_MAX_PAGES * RecognitionService.FETCH_PAGE_SIZE) {
				this.logger.warn(
					`Stopped after ${RecognitionService.FETCH_MAX_PAGES} pages without finding a stored post.`
				);
			}

			const directory = resolve(this.config.imagePath);
			await mkdir(directory, { recursive: true });

			for (const rawPost of rawPosts.reverse()) {
				const filenames: string[] = [];

				for (const [index, base64] of rawPost.images.entries()) {
					try {
						const clean = base64.replace(/^data:[^;]+;base64,/, "");
						const buffer = await sharp(Buffer.from(clean, "base64"))
							.resize(RecognitionService.IMAGE_MAX_SIZE, RecognitionService.IMAGE_MAX_SIZE, {
								fit: "inside",
								withoutEnlargement: true,
							})
							.webp({ quality: RecognitionService.IMAGE_WEBP_QUALITY })
							.toBuffer();

						const filename = `${rawPost.id}_${index}_${RandomUtil.randomString(8)}.webp`;
						await writeFile(join(directory, filename), buffer);
						filenames.push(filename);
					} catch (error) {
						this.logger.error(`Failed to write an image of ${rawPost.id}: ${error}`);
					}
				}

				this.logger.log(`Storing post ${rawPost.id}`);
				const post = await this.postRepository.upsert(
					new InterruptionPost({
						id: rawPost.id,
						postId: rawPost.postId,
						filter: rawPost.filter,
						type: rawPost.type,
						timestamp: rawPost.timestamp,
						content: rawPost.content,
						images: filenames,
					})
				);

				this.logger.log(`Recognizing for post ${post.id}`);
				const recognitions: InterruptionRecognition[] = [];

				for (const recognition of this.createRecognitions(post, filenames)) {
					const [existing] = await this.recognitionRepository.get({
						interruptionPostId: post.id,
						filename: recognition.filename,
						limit: 1,
					});

					if (existing?.success) {
						this.logger.log(
							`Skipped recognition for post ${post.id} with filename ${recognition.filename}`
						);
						continue;
					}

					recognitions.push(recognition);
				}

				await this.recognizeAll(post, recognitions);
			}

			this.logger.log(`Finished fetchInterruptions at ${new Date().toISOString()}`);
		} catch (error) {
			this.logger.error(`fetchInterruptions failed: ${error}`);
		} finally {
			this.isFetchingInterruptions = false;
		}
	}

	public async recognizePost(post: InterruptionPost): Promise<void> {
		if (this.postRecognitionsInProgress.has(post.id)) {
			throw new BadRequestException(`Recognition for post ${post.id} is already in progress.`);
		}

		this.postRecognitionsInProgress.add(post.id);
		this.logger.log(`Starting recognition for post ${post.id}`);

		try {
			const recognitionIds = await this.recognitionRepository.deleteByPostId(post.id);
			await this.recordRepository.deleteByRecognitionIds(recognitionIds);
			const orphanIds = await this.interruptionRepository.findOrphanIdsByPostId(post.id);
			await this.interruptionRepository.deleteByIds(orphanIds);

			const recognitions = this.createRecognitions(post, post.images);
			await this.recognizeAll(post, recognitions);
			this.logger.log(`Recognized ${recognitions.length} image(s) for post ${post.id}`);
		} catch (error) {
			this.logger.error(`Recognition failed for post ${post.id}: ${error}`);
		} finally {
			this.postRecognitionsInProgress.delete(post.id);
		}
	}

	private createRecognitions(post: InterruptionPost, filenames: string[]): InterruptionRecognition[] {
		const targets: (string | null)[] = filenames.length ? filenames : [null];

		return targets.map(
			(filename) =>
				new InterruptionRecognition({
					interruptionPostId: post.id,
					filename,
					success: false,
					response: {},
				})
		);
	}

	private async recognizeAll(post: InterruptionPost, recognitions: InterruptionRecognition[]): Promise<void> {
		if (!recognitions.length) return;

		const created = await Promise.all(
			recognitions.map(async (recognition): Promise<InterruptionRecord | null> => {
				if (recognition.success) return null;

				this.logger.log(`Recognizing image ${recognition.filename}`);
				let result: RecognizedNotice | null = null;

				try {
					let prompt = RecognitionService.RECOGNIZE_PROMPT;
					if (post.content) prompt += `\n${RecognitionService.EXTRA_CONTENT_PROMPT} ${post.content}`;

					const images: string[] = [];
					if (recognition.filename) {
						const base64 = await readFile(join(resolve(this.config.imagePath), recognition.filename));
						images.push(base64.toString("base64"));
					}

					result = await this.openAiService.prompt(prompt, {
						images,
						responseFormat: RecognitionService.INTERRUPTION_SCHEMA,
					});
					this.logger.log(`Recognized image ${recognition.filename}`);
				} catch (error) {
					this.logger.error(`Recognition failed for ${recognition.filename}: ${error}`);
				}

				recognition.success = result !== null;
				recognition.response = result ?? {};
				await this.recognitionRepository.upsert(recognition);

				if (!result) return null;

				const date = DateUtil.parseCalendarDateOrNull(result.date);
				if (!date) return null;

				const details = {
					date,
					timeSlots: DateUtil.toTimeSlots(date, result.timeSlots),
					area: result.area.join(", ") || "unknown",
					subareas: result.subareas.length ? result.subareas.join(", ") : null,
				};

				let match: Interruption | null = null;

				if (result.type !== InterruptionRecordType.PUBLISHED) {
					this.logger.log(`Attempting to match interruption for ${recognition.filename}`);

					const candidates = await this.interruptionRepository.get({
						dateFrom: subDays(date, 14),
						dateTo: addDays(date, 14),
					});

					if (candidates.length) {
						const prompt = `${RecognitionService.MATCH_PROMPT}
							Notice:
							${JSON.stringify(
								{
									type: result.type,
									date: DateUtil.format(date, DATE_FORMAT),
									formerDate: DateUtil.format(result.formerDate, DATE_FORMAT),
									dayOfWeek: result.dayOfWeek,
									timeSlots: result.timeSlots,
									formerTimeSlots: result.formerTimeSlots,
									area: result.area,
									subareas: result.subareas,
									reason: result.reason,
									restorationTime: result.restorationTime,
									rawText: result.rawText,
								},
								null,
								2
							)}
							Candidates:
							${JSON.stringify(
								candidates.map(({ id, date: candidateDate, timeSlots, area, subareas, reason }) => ({
									id,
									date: DateUtil.format(candidateDate, DATE_FORMAT),
									timeSlots,
									area,
									subareas,
									reason,
								})),
								null,
								2
							)}`;

						try {
							const matched = await this.openAiService.prompt(prompt, {
								responseFormat: RecognitionService.MATCH_SCHEMA,
							});

							this.logger.log(
								`Matched interruption: ${JSON.stringify(matched)} for ${recognition.filename}`
							);

							if (matched.id) {
								match = candidates.find((candidate) => candidate.id === matched.id) ?? null;
							}
						} catch (error) {
							this.logger.error(`Matching interruption for ${date.toISOString()} failed: ${error}`);
						}
					}

					if (match) {
						match.reason = result.reason;
						if (result.timeSlots.length) match.timeSlots = details.timeSlots;
					}
				}

				const interruption = await this.interruptionRepository.upsert(
					match ??
						new Interruption({
							interruptionPostId: post.id,
							...details,
							reason: result.reason,
						})
				);

				return this.recordRepository.upsert(
					new InterruptionRecord({
						interruptionId: interruption.id,
						interruptionRecognitionId: recognition.id,
						...details,
						reason: result.reason,
						type: result.type,
					})
				);
			})
		);

		const records = created.filter((record): record is InterruptionRecord => record !== null);
		if (!records.length) return;

		void this.eventBus.publish(new InterruptionRecordsCreatedEvent({ records }));
	}
}
