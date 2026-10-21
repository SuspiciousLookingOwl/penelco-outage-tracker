import { Model, snakeCaseMappers } from "objection";
import type { InterruptionRecordType, TimeSlot } from "../../entities";
import { InterruptionRecognitionModel } from "../interruption-recognition/interruption-recognition.model";
import { InterruptionModel } from "../interruption/interruption.model";

export type InterruptionRecordModelProps = {
	id: string;
	interruptionId: string;
	interruptionRecognitionId: string | null;
	date: Date;
	timeSlots: TimeSlot[];
	area: string;
	subareas: string | null;
	reason: string | null;
	type: InterruptionRecordType;
	createdAt: Date;
	updatedAt: Date;
};

export class InterruptionRecordModel extends Model {
	id!: string;
	interruptionId!: string;
	interruptionRecognitionId!: string | null;
	date!: Date;
	timeSlots!: TimeSlot[];
	area!: string;
	subareas!: string | null;
	reason!: string | null;
	type!: InterruptionRecordType;
	createdAt!: Date;
	updatedAt!: Date;

	interruption?: InterruptionModel;
	recognition?: InterruptionRecognitionModel;

	static tableName = "interruption_records";

	static jsonAttributes = ["timeSlots"];

	static get columnNameMappers() {
		return snakeCaseMappers();
	}

	static get relationMappings() {
		return {
			interruption: {
				relation: Model.BelongsToOneRelation,
				modelClass: InterruptionModel,
				join: {
					from: "interruption_records.interruption_id",
					to: "interruptions.id",
				},
			},
			recognition: {
				relation: Model.BelongsToOneRelation,
				modelClass: InterruptionRecognitionModel,
				join: {
					from: "interruption_records.interruption_recognition_id",
					to: "interruption_recognitions.id",
				},
			},
		};
	}
}
