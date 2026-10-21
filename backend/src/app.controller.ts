import { Controller, Get } from "@nestjs/common";
import { subDays } from "date-fns";
import { InterruptionRecordRepository, InterruptionRepository } from "./repositories";

@Controller()
export class AppController {
	constructor(
		private readonly interruptionRepository: InterruptionRepository,
		private readonly interruptionRecordRepository: InterruptionRecordRepository
		// private readonly config: AppConfigService
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
