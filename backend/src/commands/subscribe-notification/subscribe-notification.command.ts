import { Command } from "@nestjs/cqrs";
import { z } from "zod";

export type SubscribeNotificationResult = { subscriptionId: string };

export class SubscribeNotificationCommand extends Command<SubscribeNotificationResult> {
	public readonly fid!: string;

	constructor(params: Partial<SubscribeNotificationCommand>) {
		super();
		Object.assign(this, params);
	}
}

export const SubscribeNotificationParamSchema = z.object({
	fid: z.string().min(1).max(512),
});
