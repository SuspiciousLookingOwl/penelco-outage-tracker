import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { ValidateParams } from "../../common";
import { NotificationSubscriptionRepository } from "../../repositories/notification-subscription/notification-subscription.repository";
import {
	UnsubscribeNotificationCommand,
	UnsubscribeNotificationParamSchema,
	UnsubscribeNotificationResult,
} from "./unsubscribe-notification.command";

@CommandHandler(UnsubscribeNotificationCommand)
export class UnsubscribeNotificationHandler implements ICommandHandler<UnsubscribeNotificationCommand> {
	constructor(private readonly subscriptionRepository: NotificationSubscriptionRepository) {}

	@ValidateParams(UnsubscribeNotificationParamSchema)
	public async execute(params: UnsubscribeNotificationCommand): Promise<UnsubscribeNotificationResult> {
		await this.subscriptionRepository.deleteByFids([params.fid]);
		return { deleted: true };
	}
}
