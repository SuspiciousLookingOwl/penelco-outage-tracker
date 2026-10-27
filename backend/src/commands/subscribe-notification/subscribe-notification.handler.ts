import { BadRequestException } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { ValidateParams } from "../../common";
import { NotificationSubscription } from "../../entities";
import { NotificationSubscriptionRepository } from "../../repositories/notification-subscription/notification-subscription.repository";
import { PushService } from "../../services/push.service";
import {
	SubscribeNotificationCommand,
	SubscribeNotificationParamSchema,
	SubscribeNotificationResult,
} from "./subscribe-notification.command";

@CommandHandler(SubscribeNotificationCommand)
export class SubscribeNotificationHandler implements ICommandHandler<SubscribeNotificationCommand> {
	constructor(
		private readonly subscriptionRepository: NotificationSubscriptionRepository,
		private readonly pushService: PushService
	) {}

	@ValidateParams(SubscribeNotificationParamSchema)
	public async execute(params: SubscribeNotificationCommand): Promise<SubscribeNotificationResult> {
		const { fid } = params;

		const { sent } = await this.pushService.sendToFids([fid], {
			title: "Subscribed to PENELCO Outage Tracker!",
			body: "You will now receive notification from PENELCO Outage Tracker",
			url: "/",
			data: { subscribed: "true" },
		});

		if (!sent) throw new BadRequestException("The push token could not be reached.");

		const subscription = await this.subscriptionRepository.upsert(new NotificationSubscription({ fid }));

		return { subscriptionId: subscription.id };
	}
}
