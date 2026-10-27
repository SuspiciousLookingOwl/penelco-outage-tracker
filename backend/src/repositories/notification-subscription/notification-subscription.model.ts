import { Model, snakeCaseMappers } from "objection";

export type NotificationSubscriptionModelProps = {
	id: string;
	fid: string;
	isSubscribedToAllInterruptions: boolean;
	keywords: string[];
	lastSeenAt: Date;
	createdAt: Date;
	updatedAt: Date;
};

export class NotificationSubscriptionModel extends Model {
	id!: string;
	fid!: string;
	isSubscribedToAllInterruptions!: boolean;
	keywords!: string[];
	lastSeenAt!: Date;
	createdAt!: Date;
	updatedAt!: Date;

	static tableName = "notification_subscriptions";

	static jsonAttributes = ["keywords"];

	static get columnNameMappers() {
		return snakeCaseMappers();
	}
}
