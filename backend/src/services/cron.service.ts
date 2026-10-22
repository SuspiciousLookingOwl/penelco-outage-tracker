import { BadRequestException, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { addDays, format, isBefore, isValid, parse, subDays } from "date-fns";
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
import { InterruptionPostRepository } from "../repositories/interruption-post/interruption-post.repository";
import { InterruptionRecognitionRepository } from "../repositories/interruption-recognition/interruption-recognition.repository";
import { InterruptionRecordRepository } from "../repositories/interruption-record/interruption-record.repository";
import { InterruptionRepository } from "../repositories/interruption/interruption.repository";
import { RandomUtil } from "../utils";
import { DateUtil } from "../utils/date.util";
import { OpenAiService } from "./openai.service";
import { PenelcoService, type InterruptionResponse } from "./penelco.service";

export type RecognizedNotice = z.infer<typeof CronService.INTERRUPTION_SCHEMA>;

// TODO Decouple services
@Injectable()
export class CronService implements OnModuleInit {
	private readonly logger = new Logger(CronService.name);
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
		- If it's an update, there usually will be "from" (old) and "to" (new) time slots indicating the change.
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
		dayOfWeek: z.string().nullable(),
		timeSlots: z.array(CronService.TIME_SLOT_SCHEMA),
		formerTimeSlots: z.array(CronService.TIME_SLOT_SCHEMA),
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
		private readonly config: AppConfigService
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
			const unsuccessfulRecognition = await this.recognitionRepository.get({ success: false }, { post: true });

			for (const recognition of unsuccessfulRecognition) {
				const post = await this.postRepository.getById(recognition.interruptionPostId);
				if (!post) {
					this.logger.warn(`Post ${recognition.interruptionPostId} no longer exists, skipping recognition.`);
					continue;
				}

				await this.recognize(post, recognition);
			}

			this.logger.log(`Finished recognizeUnsuccessful at ${new Date().toISOString()}`);
		} catch (error) {
			this.logger.error(`recognizeUnsuccessful failed: ${error}`);
		}
		this.isRecognizingUnsuccessful = false;
	}

	@Cron("*/30 * * * *")
	public async fetchInterruptions(): Promise<void> {
		if (this.isFetchingInterruptions) return;

		this.isFetchingInterruptions = true;
		this.logger.log(`Starting fetchInterruptions at ${new Date().toISOString()}`);
		try {
			const stored = await this.getLatestPosts();
			if (stored.length) await this.extractInterruptions(stored.reverse());

			this.logger.log(`Finished fetchInterruptions at ${new Date().toISOString()}`);
		} catch (error) {
			this.logger.error(`fetchInterruptions failed: ${error}`);
		}
		this.isFetchingInterruptions = false;
	}

	public async recognizePost(post: InterruptionPost): Promise<void> {
		if (this.postRecognitionsInProgress.has(post.id)) {
			throw new BadRequestException(`Recognition for post ${post.id} is already in progress.`);
		}

		this.postRecognitionsInProgress.add(post.id);

		const recognitionIds = await this.recognitionRepository.deleteByPostId(post.id);
		await this.recordRepository.deleteByRecognitionIds(recognitionIds);
		const orphanIds = await this.interruptionRepository.findOrphanIdsByPostId(post.id);
		await this.interruptionRepository.deleteByIds(orphanIds);

		try {
			const recognitions = post.images.length
				? post.images.map(
						(filename) =>
							new InterruptionRecognition({
								interruptionPostId: post.id,
								filename,
								success: false,
								response: {},
							})
					)
				: [
						new InterruptionRecognition({
							interruptionPostId: post.id,
							filename: null,
							success: false,
							response: {},
						}),
					];

			await Promise.all(recognitions.map((recognition) => this.recognize(post, recognition)));
			this.logger.log(`Recognized ${recognitions.length} image(s) for post ${post.id}`);
		} catch (error) {
			this.logger.error(`Recognition failed for post ${post.id}: ${error}`);
		} finally {
			this.postRecognitionsInProgress.delete(post.id);
		}
	}

	private async getLatestPosts(): Promise<InterruptionResponse[]> {
		const stored: InterruptionResponse[] = [];
		const cutoff = subDays(new Date(), this.config.fetchMaxAgeDays);

		const storedIds = new Set<string>();
		const latestStoredId = await this.postRepository.getLatestPostId();
		if (latestStoredId) storedIds.add(latestStoredId);

		for (let page = 0; page < CronService.FETCH_MAX_PAGES; page++) {
			const start = page * CronService.FETCH_PAGE_SIZE;
			this.logger.log(`Fetching posts ${start}-${start + CronService.FETCH_PAGE_SIZE} (page: ${page})`);
			const batch = await this.penelcoService.getInterruptions(start, CronService.FETCH_PAGE_SIZE);

			if (!batch.length) break;

			for (const post of batch) {
				if (storedIds.has(post.id)) {
					this.logger.log(`Reached already stored post ${post.id} after ${stored.length} new posts.`);
					return stored;
				}

				const published = DateUtil.parseDateOrNull(post.timestamp);
				if (!published || isBefore(published, cutoff)) {
					this.logger.log(
						`Reached ${this.config.fetchMaxAgeDays}-day limit at ${post.id} after ${stored.length} new posts.`
					);
					return stored;
				}

				stored.push(post);
			}
		}

		if (stored.length >= CronService.FETCH_MAX_PAGES * CronService.FETCH_PAGE_SIZE) {
			this.logger.warn(`Stopped after ${CronService.FETCH_MAX_PAGES} pages without finding a stored post.`);
		}

		return stored;
	}

	private async extractInterruptions(rawPosts: InterruptionResponse[]): Promise<void> {
		for (const rawPost of rawPosts) {
			const filenames: string[] = [];

			for (const [index, base64] of rawPost.images.entries()) {
				try {
					filenames.push(await this.writeImage(rawPost.id, index, base64));
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
			const promises: Promise<void>[] = [];

			if (!filenames.length) {
				const recognition = new InterruptionRecognition({
					interruptionPostId: post.id,
					filename: null,
					success: false,
					response: {},
				});

				const [recognitionExists] = await this.recognitionRepository.get({
					interruptionPostId: post.id,
					filename: recognition.filename,
					limit: 1,
				});

				if (!recognitionExists?.success) {
					promises.push(this.recognize(post, recognition));
				} else {
					this.logger.log(`Skipped recognition for post ${post.id} with filename ${recognition.filename}`);
				}
			}

			for (const filename of filenames) {
				const recognition = new InterruptionRecognition({
					interruptionPostId: post.id,
					filename,
					success: false,
					response: {},
				});

				const [recognitionExists] = await this.recognitionRepository.get({
					interruptionPostId: post.id,
					filename: recognition.filename,
					limit: 1,
				});

				if (recognitionExists?.success) {
					this.logger.log(`Skipped recognition for post ${post.id} with filename ${recognition.filename}`);
					continue;
				}

				promises.push(this.recognize(post, recognition));
			}
			await Promise.all(promises);
		}
	}

	private async recognize(post: InterruptionPost, recognition: InterruptionRecognition): Promise<void> {
		if (recognition.success) return;

		const { result, success } = await this.runRecognition(recognition.filename, post.content);

		recognition.success = success;
		recognition.response = result === null ? {} : result;

		await this.recognitionRepository.upsert(recognition);

		if (!success) return;

		const date = result ? DateUtil.parseCalendarDateOrNull(result.date) : null;
		if (!result || !date) return;

		let existing =
			result.type === InterruptionRecordType.PUBLISHED ? null : await this.findSameInterruption(result, date);

		if (existing) {
			existing.reason = result.reason;
			if (result.timeSlots.length) {
				existing.timeSlots = result.timeSlots.map((slot) => ({
					start: this.formatTime(date, slot.from),
					end: this.formatTime(date, slot.to),
					label: slot.label,
				}));
			}

			await this.interruptionRepository.upsert(existing);
		} else {
			existing = await this.interruptionRepository.upsert(
				new Interruption({
					interruptionPostId: post.id,
					date,
					timeSlots: result.timeSlots.map((slot) => ({
						start: this.formatTime(date, slot.from),
						end: this.formatTime(date, slot.to),
						label: slot.label,
					})),
					area: result.area.join(", ") || "unknown",
					subareas: result.subareas.length > 0 ? result.subareas.join(", ") : null,
					reason: result.reason,
				})
			);
		}

		await this.recordRepository.upsert(
			new InterruptionRecord({
				interruptionId: existing.id,
				interruptionRecognitionId: recognition.id,
				date,
				timeSlots: result.timeSlots.map((slot) => ({
					start: this.formatTime(date, slot.from),
					end: this.formatTime(date, slot.to),
					label: slot.label,
				})),
				area: result.area.join(", ") || "unknown",
				subareas: result.subareas.length > 0 ? result.subareas.join(", ") : null,
				reason: result.reason,
				type: result.type,
			})
		);
	}

	private async runRecognition(
		filename: string | null,
		content?: string
	): Promise<{ result: RecognizedNotice | null; success: boolean }> {
		try {
			let prompt = CronService.RECOGNIZE_PROMPT;
			if (content) prompt += `\n${CronService.EXTRA_CONTENT_PROMPT} ${content}`;

			const images: string[] = [];
			if (filename) {
				const base64 = await readFile(join(resolve(this.config.imagePath), filename));
				images.push(base64.toString("base64"));
			}
			const result = await this.openAiService.prompt(prompt, {
				images,
				responseFormat: CronService.INTERRUPTION_SCHEMA,
			});
			this.logger.log(`Recognized image ${filename}`);

			return { result, success: true };
		} catch (error) {
			this.logger.error(`Recognition failed for ${filename}: ${error}`);

			return { result: null, success: false };
		}
	}

	private async findSameInterruption(notice: RecognizedNotice, date: Date): Promise<Interruption | null> {
		const candidates = await this.interruptionRepository.get({
			dateFrom: subDays(date, 1),
			dateTo: addDays(date, 1),
		});

		if (!candidates.length) return null;

		const noticeString = JSON.stringify(this.toMatchNotice(notice, date), null, 2);
		const candidatesString = JSON.stringify(
			candidates.map((candidate) => this.toMatchCandidate(candidate)),
			null,
			2
		);

		const prompt = `
			${CronService.MATCH_PROMPT}
			Notice:
			${noticeString}
			Candidates:
			${candidatesString}
		`;

		let match: z.infer<typeof CronService.MATCH_SCHEMA>;
		try {
			match = await this.openAiService.prompt(prompt, { responseFormat: CronService.MATCH_SCHEMA });
		} catch (error) {
			this.logger.error(`Matching interruption for ${date.toISOString()} failed: ${error}`);
			return null;
		}

		if (!match.id) return null;

		return candidates.find((candidate) => candidate.id === match.id) ?? null;
	}

	private toMatchNotice(notice: RecognizedNotice, date: Date) {
		return {
			type: notice.type,
			date: DateUtil.toDateOnlyString(date),
			dayOfWeek: notice.dayOfWeek,
			timeSlots: notice.timeSlots,
			formerTimeSlots: notice.formerTimeSlots,
			area: notice.area,
			subareas: notice.subareas,
			reason: notice.reason,
			restorationTime: notice.restorationTime,
			rawText: notice.rawText,
		};
	}

	private toMatchCandidate(candidate: Interruption) {
		return {
			id: candidate.id,
			date: DateUtil.toDateOnlyString(candidate.date),
			timeSlots: candidate.timeSlots,
			area: candidate.area,
			subareas: candidate.subareas,
			reason: candidate.reason,
		};
	}

	private async writeImage(postId: string, index: number, base64: string): Promise<string> {
		const directory = resolve(this.config.imagePath);
		await mkdir(directory, { recursive: true });

		const clean = base64.replace(/^data:[^;]+;base64,/, "");

		const buffer = await sharp(Buffer.from(clean, "base64"))
			.resize(CronService.IMAGE_MAX_SIZE, CronService.IMAGE_MAX_SIZE, { fit: "inside", withoutEnlargement: true })
			.webp({ quality: CronService.IMAGE_WEBP_QUALITY })
			.toBuffer();

		const filename = `${postId}_${index}_${RandomUtil.randomString(8)}.webp`;

		await writeFile(join(directory, filename), buffer);

		return filename;
	}

	private formatTime(date: Date, hhmm: string | null): string | null {
		if (!hhmm) return null;

		const time = parse(hhmm.trim(), "H:mm", date);
		if (!isValid(time)) return null;

		const dateOnly = DateUtil.toDateOnlyString(date);
		return dateOnly ? `${dateOnly} ${format(time, "HH:mm:ss")}` : null;
	}
}
