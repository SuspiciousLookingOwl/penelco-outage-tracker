import { NotFoundException } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { ValidateParams } from "../../common";
import {
	InterruptionPostRepository,
	InterruptionRecognitionRepository,
	InterruptionRecordRepository,
	InterruptionRepository,
} from "../../repositories";
import { CronService } from "../../services/cron.service";
import { RecognizePostCommand, RecognizePostParamSchema, RecognizePostResult } from "./recognize-post.command";

@CommandHandler(RecognizePostCommand)
export class RecognizePostHandler implements ICommandHandler<RecognizePostCommand> {
	constructor(
		private readonly interruptionRepository: InterruptionRepository,
		private readonly recordRepository: InterruptionRecordRepository,
		private readonly postRepository: InterruptionPostRepository,
		private readonly recognitionRepository: InterruptionRecognitionRepository,
		private readonly cronService: CronService
	) {}

	@ValidateParams(RecognizePostParamSchema)
	public async execute(params: RecognizePostCommand): Promise<RecognizePostResult> {
		const { postId } = params;

		const post = await this.postRepository.getById(postId);
		if (!post) throw new NotFoundException(`Post "${postId}" was not found.`);

		const recognitionIds = await this.recognitionRepository.findIdsByPostId(postId);
		await this.recordRepository.deleteByRecognitionIds(recognitionIds);
		await this.recognitionRepository.deleteByPostId(postId);

		const orphanIds = await this.interruptionRepository.findOrphanIdsByPostId(postId);
		await this.interruptionRepository.deleteByIds(orphanIds);

		void this.cronService.recognizePost(post);

		return {
			postId,
			deletedRecognitions: recognitionIds.length,
			deletedInterruptions: orphanIds.length,
		};
	}
}
