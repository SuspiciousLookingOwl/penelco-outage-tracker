import { Controller, Get, HttpCode, NotFoundException, Param, Post, UseGuards } from "@nestjs/common";
import { subDays } from "date-fns";
import { BasicAuthGuard } from "./guards/basic-auth.guard";
import {
	InterruptionPostRepository,
	InterruptionRecognitionRepository,
	InterruptionRecordRepository,
	InterruptionRepository,
} from "./repositories";
import { CronService } from "./services/cron.service";

@Controller()
export class AppController {
	constructor(
		private readonly interruptionRepository: InterruptionRepository,
		private readonly interruptionRecordRepository: InterruptionRecordRepository,
		private readonly interruptionPostRepository: InterruptionPostRepository,
		private readonly interruptionRecognitionRepository: InterruptionRecognitionRepository,
		private readonly cronService: CronService
	) {}

	@Get("/interruptions")
	async getInterruptions() {
		const interruptions = await this.interruptionRepository.get(
			{ from: subDays(new Date(), 14), orderBy: "date", orderDirection: "desc" },
			{ records: { recognition: { post: true } } }
		);
		return interruptions;
	}

	@Get("/interruptions-records")
	async getInterruptionRecords() {
		const records = await this.interruptionRecordRepository.get(
			{ from: subDays(new Date(), 14) },
			{ interruption: { records: true }, recognition: { post: true } }
		);
		return records;
	}

	@Post("/posts/:id/recognize")
	@HttpCode(202)
	@UseGuards(BasicAuthGuard)
	async recognizePost(@Param("id") id: string) {
		const post = await this.interruptionPostRepository.getById(id);
		if (!post) throw new NotFoundException(`Post "${id}" was not found.`);

		const recognitionIds = await this.interruptionRecognitionRepository.findIdsByPostId(id);
		await this.interruptionRecordRepository.deleteByRecognitionIds(recognitionIds);
		await this.interruptionRecognitionRepository.deleteByPostId(id);

		const orphanIds = await this.interruptionRepository.findOrphanIdsByPostId(id);
		await this.interruptionRepository.deleteByIds(orphanIds);

		void this.cronService.recognizePost(post);

		return {
			postId: id,
			deletedRecognitions: recognitionIds.length,
			deletedInterruptions: orphanIds.length,
		};
	}

	// Handled by Nginx directly
	// @Get("/images/:name")
	// async getImage(@Param("name") name: string, @Res() res: Response): Promise<void> {
	// 	const file = this.resolveImagePath(name);
	// 	if (!file) throw new NotFoundException(`Image "${name}" was not found.`);

	// 	try {
	// 		const info = await stat(file);
	// 		if (!info.isFile()) throw new NotFoundException(`Image "${name}" was not found.`);
	// 	} catch {
	// 		throw new NotFoundException(`Image "${name}" was not found.`);
	// 	}

	// 	res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
	// 	res.sendFile(file);
	// }

	// private resolveImagePath(name: string): string | null {
	// 	if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) return null;

	// 	const directory = resolve(this.config.imagePath);
	// 	const file = resolve(directory, name);

	// 	return file.startsWith(directory + sep) ? file : null;
	// }
}
