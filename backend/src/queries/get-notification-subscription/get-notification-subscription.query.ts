import { Query } from "@nestjs/cqrs";
import { z } from "zod";

export type GetNotificationSubscriptionResult = {
	keywords: string[];
	isSubscribedToAllInterruptions: boolean;
};

export class GetNotificationSubscriptionQuery extends Query<GetNotificationSubscriptionResult> {
	public readonly fid!: string;

	constructor(params: Partial<GetNotificationSubscriptionQuery>) {
		super();
		Object.assign(this, params);
	}
}

export const GetNotificationSubscriptionParamSchema = z.object({
	fid: z.string().min(1).max(512),
});
