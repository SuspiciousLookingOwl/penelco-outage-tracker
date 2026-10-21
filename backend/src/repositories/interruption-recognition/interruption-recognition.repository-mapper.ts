import { InterruptionRecognition } from "../../entities";
import { InterruptionPostRepositoryMapper } from "../interruption-post/interruption-post.repository-mapper";
import type { InterruptionRecognitionModel, InterruptionRecognitionModelProps } from "./interruption-recognition.model";

export class InterruptionRecognitionRepositoryMapper {
	public static toRepository(entity: InterruptionRecognition): Partial<InterruptionRecognitionModelProps> {
		return {
			id: entity.id,
			interruptionPostId: entity.interruptionPostId,
			filename: entity.filename,
			success: entity.success,
			response: entity.response,
		};
	}

	public static toDomainEntity(props: InterruptionRecognitionModel): InterruptionRecognition {
		return new InterruptionRecognition({
			id: props.id,
			interruptionPostId: props.interruptionPostId,
			filename: props.filename,
			success: props.success,
			response: props.response,
			post: props.post ? InterruptionPostRepositoryMapper.toDomainEntity(props.post) : undefined,
		});
	}
}
