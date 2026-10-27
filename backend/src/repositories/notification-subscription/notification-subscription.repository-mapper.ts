import { NotificationSubscription } from "../../entities";
import type {
	NotificationSubscriptionModel,
	NotificationSubscriptionModelProps,
} from "./notification-subscription.model";

export class NotificationSubscriptionRepositoryMapper {
	public static toRepository(entity: NotificationSubscription): Partial<NotificationSubscriptionModelProps> {
		return {
			id: entity.id,
			fid: entity.fid,
			isSubscribedToAllInterruptions: entity.isSubscribedToAllInterruptions,
			keywords: entity.keywords,
			lastSeenAt: entity.lastSeenAt,
		};
	}

	public static toDomainEntity(props: NotificationSubscriptionModel): NotificationSubscription {
		return new NotificationSubscription({
			id: props.id,
			fid: props.fid,
			isSubscribedToAllInterruptions: props.isSubscribedToAllInterruptions,
			keywords: props.keywords,
			lastSeenAt: props.lastSeenAt,
		});
	}
}
