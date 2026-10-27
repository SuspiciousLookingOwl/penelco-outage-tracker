import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { ValidateParams } from "../../common";
import { PushService } from "../../services/push.service";
import {
	SendNotificationCommand,
	SendNotificationParamSchema,
	SendNotificationResult,
} from "./send-notification.command";

@CommandHandler(SendNotificationCommand)
export class SendNotificationHandler implements ICommandHandler<SendNotificationCommand> {
	constructor(private readonly pushService: PushService) {}

	@ValidateParams(SendNotificationParamSchema)
	public async execute(params: SendNotificationCommand): Promise<SendNotificationResult> {
		const { fid, title, body, url } = params;

		return this.pushService.sendToFids([fid], {
			title: title ?? "PENELCO Outage Tracker",
			body: body ?? `Notification sent at ${new Date().toISOString()}`,
			url: url ?? "/",
		});
	}
}
