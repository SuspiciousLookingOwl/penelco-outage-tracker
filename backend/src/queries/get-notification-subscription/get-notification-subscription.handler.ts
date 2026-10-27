import { NotFoundException } from "@nestjs/common";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { ValidateParams } from "../../common";
import { NotificationSubscriptionRepository } from "../../repositories";
import {
	GetNotificationSubscriptionParamSchema,
	GetNotificationSubscriptionQuery,
	GetNotificationSubscriptionResult,
} from "./get-notification-subscription.query";

@QueryHandler(GetNotificationSubscriptionQuery)
export class GetNotificationSubscriptionHandler implements IQueryHandler<GetNotificationSubscriptionQuery> {
	constructor(private readonly subscriptionRepository: NotificationSubscriptionRepository) {}

	@ValidateParams(GetNotificationSubscriptionParamSchema)
	public async execute(params: GetNotificationSubscriptionQuery): Promise<GetNotificationSubscriptionResult> {
		const { fid } = params;

		const subscription = await this.subscriptionRepository.getByFid(fid);
		if (!subscription) throw new NotFoundException("The fid is not subscribed.");

		return {
			keywords: subscription.keywords,
			isSubscribedToAllInterruptions: subscription.isSubscribedToAllInterruptions,
		};
	}
}
