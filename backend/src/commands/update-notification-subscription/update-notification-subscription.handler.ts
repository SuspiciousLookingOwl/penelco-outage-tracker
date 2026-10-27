import { NotFoundException } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { ValidateParams } from "../../common";
import { NotificationSubscriptionRepository } from "../../repositories";
import {
	UpdateNotificationSubscriptionCommand,
	UpdateNotificationSubscriptionParamSchema,
	UpdateNotificationSubscriptionResult,
} from "./update-notification-subscription.command";

@CommandHandler(UpdateNotificationSubscriptionCommand)
export class UpdateNotificationSubscriptionHandler implements ICommandHandler<UpdateNotificationSubscriptionCommand> {
	constructor(private readonly subscriptionRepository: NotificationSubscriptionRepository) {}

	@ValidateParams(UpdateNotificationSubscriptionParamSchema)
	public async execute(params: UpdateNotificationSubscriptionCommand): Promise<UpdateNotificationSubscriptionResult> {
		const { fid, keywords, isSubscribedToAllInterruptions } = params;

		const subscription = await this.subscriptionRepository.getByFid(fid);
		if (!subscription) throw new NotFoundException("Subscription not found");

		subscription.keywords = keywords;
		subscription.isSubscribedToAllInterruptions = isSubscribedToAllInterruptions;
		subscription.updatedAt = new Date();

		const updated = await this.subscriptionRepository.upsert(subscription);

		return {
			keywords: updated.keywords,
			isSubscribedToAllInterruptions: updated.isSubscribedToAllInterruptions,
		};
	}
}
