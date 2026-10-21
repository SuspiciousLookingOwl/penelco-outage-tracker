import { Model, snakeCaseMappers } from "objection";
import { InterruptionPostModel } from "../interruption-post/interruption-post.model";

export type InterruptionRecognitionModelProps = {
	id: string;
	interruptionPostId: string;
	filename: string | null;
	success: boolean;
	response: object;
	createdAt: Date;
	updatedAt: Date;
};

export class InterruptionRecognitionModel extends Model {
	id!: string;
	interruptionPostId!: string;
	filename!: string | null;
	success!: boolean;
	response!: object;
	createdAt!: Date;
	updatedAt!: Date;

	post?: InterruptionPostModel;

	static tableName = "interruption_recognitions";

	static get columnNameMappers() {
		return snakeCaseMappers();
	}

	static get relationMappings() {
		return {
			post: {
				relation: Model.BelongsToOneRelation,
				modelClass: InterruptionPostModel,
				join: {
					from: "interruption_recognitions.interruption_post_id",
					to: "interruption_posts.id",
				},
			},
		};
	}
}
