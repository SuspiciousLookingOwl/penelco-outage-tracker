import { Model, snakeCaseMappers } from "objection";
import { InterruptionModel } from "../interruption/interruption.model";
import { InterruptionRecognitionModel } from "../interruption-recognition/interruption-recognition.model";

export type InterruptionPostModelProps = {
	id: string;
	postId: string;
	filter: string;
	type: string;
	timestamp: string;
	content: string;
	images: string[];
	createdAt: Date;
	updatedAt: Date;
};

export class InterruptionPostModel extends Model {
	id!: string;
	postId!: string;
	filter!: string;
	type!: string;
	timestamp!: string;
	content!: string;
	images!: string[];
	createdAt!: Date;
	updatedAt!: Date;

	interruptions?: InterruptionModel[];
	recognitions?: InterruptionRecognitionModel[];

	static tableName = "interruption_posts";

	static jsonAttributes = ["images"];

	static get columnNameMappers() {
		return snakeCaseMappers();
	}

	static get relationMappings() {
		return {
			interruptions: {
				relation: Model.HasManyRelation,
				modelClass: InterruptionModel,
				join: {
					from: "interruption_posts.id",
					to: "interruptions.interruption_post_id",
				},
			},
			recognitions: {
				relation: Model.HasManyRelation,
				modelClass: InterruptionRecognitionModel,
				join: {
					from: "interruption_posts.id",
					to: "interruption_recognitions.interruption_post_id",
				},
			},
		};
	}
}
