import { Model, snakeCaseMappers } from "objection";
import type { TimeSlot } from "../../entities";
import { InterruptionPostModel } from "../interruption-post/interruption-post.model";
import { InterruptionRecordModel } from "../interruption-record/interruption-record.model";

export type InterruptionModelProps = {
	id: string;
	interruptionPostId: string | null;
	date: Date;
	timeSlots: TimeSlot[];
	area: string;
	subareas: string | null;
	reason: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export class InterruptionModel extends Model {
	id!: string;
	interruptionPostId!: string | null;
	date!: Date;
	timeSlots!: TimeSlot[];
	area!: string;
	subareas!: string | null;
	reason!: string | null;
	createdAt!: Date;
	updatedAt!: Date;

	records?: InterruptionRecordModel[];
	post?: InterruptionPostModel;

	static tableName = "interruptions";

	static jsonAttributes = ["timeSlots"];

	static get columnNameMappers() {
		return snakeCaseMappers();
	}

	static get relationMappings() {
		return {
			post: {
				relation: Model.BelongsToOneRelation,
				modelClass: InterruptionPostModel,
				join: {
					from: "interruptions.interruption_post_id",
					to: "interruption_posts.id",
				},
			},
			records: {
				relation: Model.HasManyRelation,
				modelClass: InterruptionRecordModel,
				join: {
					from: "interruptions.id",
					to: "interruption_records.interruption_id",
				},
			},
		};
	}
}
