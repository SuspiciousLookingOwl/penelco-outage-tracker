import { InterruptionRecord } from "../../entities";
import { DateUtil } from "../../utils/date.util";
import { InterruptionRecognitionRepositoryMapper } from "../interruption-recognition/interruption-recognition.repository-mapper";
import { InterruptionRepositoryMapper } from "../interruption/interruption.repository-mapper";
import type { InterruptionRecordModel, InterruptionRecordModelProps } from "./interruption-record.model";

export class InterruptionRecordRepositoryMapper {
	public static toRepository(entity: InterruptionRecord): Partial<InterruptionRecordModelProps> {
		return {
			id: entity.id,
			interruptionId: entity.interruptionId,
			interruptionRecognitionId: entity.interruptionRecognitionId,
			date: entity.date,
			timeSlots: entity.timeSlots.map((slot) => ({
				// Stored as timezone-less "yyyy-MM-dd HH:mm:ss" strings.
				start: DateUtil.toDateTimeStringNoTz(slot.start),
				end: DateUtil.toDateTimeStringNoTz(slot.end),
				label: slot.label,
			})),
			area: entity.area,
			subareas: entity.subareas,
			reason: entity.reason,
			type: entity.type,
		};
	}

	public static toDomainEntity(props: InterruptionRecordModel): InterruptionRecord {
		return new InterruptionRecord({
			id: props.id,
			interruptionId: props.interruptionId,
			interruptionRecognitionId: props.interruptionRecognitionId,
			date: DateUtil.parseCalendarDateOrNull(props.date) as Date,
			timeSlots: props.timeSlots.map((slot) => ({
				start: slot.start ?? null,
				end: slot.end ?? null,
				label: slot.label ?? null,
			})),
			area: props.area,
			subareas: props.subareas,
			reason: props.reason,
			type: props.type,
			interruption: props.interruption
				? InterruptionRepositoryMapper.toDomainEntity(props.interruption)
				: undefined,
			recognition: props.recognition
				? InterruptionRecognitionRepositoryMapper.toDomainEntity(props.recognition)
				: undefined,
		});
	}
}
