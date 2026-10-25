import { Command } from "@nestjs/cqrs";
import { z } from "zod";

export type RecognizePostResult = {
	postId: string;
	deletedRecognitions: number;
	deletedInterruptions: number;
};

export class RecognizePostCommand extends Command<RecognizePostResult> {
	public readonly postId!: string;

	constructor(params: Partial<RecognizePostCommand>) {
		super();
		Object.assign(this, params);
	}
}

export const RecognizePostParamSchema = z.object({
	postId: z.string().min(1).max(128),
});
