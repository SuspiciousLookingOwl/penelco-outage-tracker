import { Command } from "@nestjs/cqrs";
import { z } from "zod";

export type SendNotificationResult = { sent: number; invalid: string[] };

export class SendNotificationCommand extends Command<SendNotificationResult> {
	public readonly fid!: string;
	public readonly title?: string;
	public readonly body?: string;
	public readonly url?: string;

	constructor(params: Partial<SendNotificationCommand>) {
		super();
		Object.assign(this, params);
	}
}

export const SendNotificationParamSchema = z.object({
	fid: z.string().min(1).max(512),
	title: z.string().max(128).optional(),
	body: z.string().max(512).optional(),
	url: z.string().max(2048).optional(),
});
