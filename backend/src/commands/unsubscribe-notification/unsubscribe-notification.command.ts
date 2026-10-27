import { Command } from "@nestjs/cqrs";
import { z } from "zod";

export type UnsubscribeNotificationResult = { deleted: boolean };

export class UnsubscribeNotificationCommand extends Command<UnsubscribeNotificationResult> {
	public readonly fid!: string;

	constructor(params: Partial<UnsubscribeNotificationCommand>) {
		super();
		Object.assign(this, params);
	}
}

export const UnsubscribeNotificationParamSchema = z.object({
	fid: z.string().min(1).max(512),
});
