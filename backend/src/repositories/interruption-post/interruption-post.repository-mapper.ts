import { InterruptionPost } from "../../entities";
import { DateUtil } from "../../utils/date.util";
import { InterruptionRecognitionRepositoryMapper } from "../interruption-recognition/interruption-recognition.repository-mapper";
import { InterruptionRepositoryMapper } from "../interruption/interruption.repository-mapper";
import type { InterruptionPostModel, InterruptionPostModelProps } from "./interruption-post.model";

export class InterruptionPostRepositoryMapper {
	public static toRepository(entity: InterruptionPost): Partial<InterruptionPostModelProps> {
		return {
			id: entity.id,
			postId: entity.postId,
			filter: entity.filter,
			type: entity.type,
			timestamp: entity.timestamp,
			content: entity.content,
			images: entity.images,
		};
	}

	public static toDomainEntity(props: InterruptionPostModel): InterruptionPost {
		return new InterruptionPost({
			filter: props.filter,
			id: props.id,
			postId: props.postId,
			timestamp: DateUtil.parseDateOrNull(props.timestamp) as Date,
			content: props.content,
			type: props.type,
			images: Array.isArray(props.images) ? props.images : [],
			interruptions: props.interruptions?.map((interruption) =>
				InterruptionRepositoryMapper.toDomainEntity(interruption)
			),
			recognitions: props.recognitions?.map((recognition) =>
				InterruptionRecognitionRepositoryMapper.toDomainEntity(recognition)
			),
		});
	}
}
