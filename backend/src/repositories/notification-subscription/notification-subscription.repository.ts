import { Inject, Injectable } from "@nestjs/common";
import { NotificationSubscription } from "../../entities";
import { NotificationSubscriptionModel } from "./notification-subscription.model";
import { NotificationSubscriptionRepositoryMapper } from "./notification-subscription.repository-mapper";

@Injectable()
export class NotificationSubscriptionRepository {
	constructor(
		@Inject(NotificationSubscriptionModel)
		private readonly subscriptionModel: typeof NotificationSubscriptionModel
	) {}

	public async getByFid(fid: string): Promise<NotificationSubscription | null> {
		const row = await this.subscriptionModel.query().findOne({ fid });
		if (!row) return null;

		return NotificationSubscriptionRepositoryMapper.toDomainEntity(row);
	}

	public async upsert(subscription: NotificationSubscription): Promise<NotificationSubscription> {
		const props = NotificationSubscriptionRepositoryMapper.toRepository(subscription);

		const result = await this.subscriptionModel
			.query()
			.insert({ ...props, lastSeenAt: new Date(), updatedAt: new Date() })
			.onConflict("fid")
			.merge(["last_seen_at", "updated_at", "keywords", "is_subscribed_to_all_interruptions"])
			.returning("*");

		return NotificationSubscriptionRepositoryMapper.toDomainEntity(result);
	}

	public async deleteByFids(fids: string[]): Promise<number> {
		if (!fids.length) return 0;
		return this.subscriptionModel.query().delete().whereIn("fid", fids);
	}

	public async findByKeywords(keywords: string[]): Promise<NotificationSubscription[]> {
		const candidates = keywords.filter((keyword) => keyword.trim().length);

		const query = this.subscriptionModel.query();

		query.where((builder) => {
			builder.where("notification_subscriptions.is_subscribed_to_all_interruptions", true);
			if (!candidates.length) return;

			builder.orWhereRaw(
				`EXISTS (
					SELECT 1
					FROM jsonb_array_elements_text(notification_subscriptions.keywords) AS stored(keyword)
					JOIN jsonb_array_elements_text(?::jsonb) AS input(keyword)
						ON lower(unaccent(stored.keyword)) = lower(unaccent(input.keyword))
				)`,
				[JSON.stringify(candidates)]
			);
		});

		const result = await query;

		return result.map((row) => NotificationSubscriptionRepositoryMapper.toDomainEntity(row));
	}
}
