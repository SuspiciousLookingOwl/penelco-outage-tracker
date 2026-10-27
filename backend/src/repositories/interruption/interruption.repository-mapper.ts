import { Interruption } from "../../entities";
import { DATE_TIME_FORMAT, DateUtil } from "../../utils/date.util";
import { InterruptionPostRepositoryMapper } from "../interruption-post/interruption-post.repository-mapper";
import { InterruptionRecordRepositoryMapper } from "../interruption-record/interruption-record.repository-mapper";
import type { InterruptionModel, InterruptionModelProps } from "./interruption.model";

export class InterruptionRepositoryMapper {
	public static toRepository(entity: Interruption): Partial<InterruptionModelProps> {
		return {
			id: entity.id,
			interruptionPostId: entity.interruptionPostId,
			date: entity.date,
			timeSlots: entity.timeSlots.map((slot) => ({
				start: DateUtil.format(slot.start, DATE_TIME_FORMAT),
				end: DateUtil.format(slot.end, DATE_TIME_FORMAT),
				label: slot.label,
			})),
			area: entity.area,
			subareas: entity.subareas,
			reason: entity.reason,
		};
	}

	public static toDomainEntity(props: InterruptionModel): Interruption {
		return new Interruption({
			id: props.id,
			interruptionPostId: props.interruptionPostId,
			date: DateUtil.parseCalendarDateOrNull(props.date) as Date,
			timeSlots: props.timeSlots.map((slot) => ({
				start: slot.start ?? null,
				end: slot.end ?? null,
				label: slot.label ?? null,
			})),
			area: props.area,
			subareas: props.subareas,
			reason: props.reason,
			post: props.post ? InterruptionPostRepositoryMapper.toDomainEntity(props.post) : undefined,
			records: props.records?.map((record) => InterruptionRecordRepositoryMapper.toDomainEntity(record)),
		});
	}
}
