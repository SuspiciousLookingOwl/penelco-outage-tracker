import { Command } from "@nestjs/cqrs";
import { z } from "zod";

export type UpdateNotificationSubscriptionResult = { keywords: string[]; isSubscribedToAllInterruptions: boolean };

export class UpdateNotificationSubscriptionCommand extends Command<UpdateNotificationSubscriptionResult> {
	public readonly fid!: string;
	public readonly keywords!: string[];
	public readonly isSubscribedToAllInterruptions!: boolean;

	constructor(params: Partial<UpdateNotificationSubscriptionCommand>) {
		super();
		Object.assign(this, params);
	}
}

export const UpdateNotificationSubscriptionParamSchema = z.object({
	fid: z.string().min(1).max(512),
	keywords: z.array(z.string().trim().min(3).max(64)).max(15).default([]),
	isSubscribedToAllInterruptions: z.boolean().default(false),
});
