import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
	RecognizePostCommand,
	SendNotificationCommand,
	SubscribeNotificationCommand,
	UnsubscribeNotificationCommand,
	UpdateNotificationSubscriptionCommand,
	type RecognizePostResult,
	type SendNotificationResult,
	type SubscribeNotificationResult,
	type UnsubscribeNotificationResult,
	type UpdateNotificationSubscriptionResult,
} from "./commands";
import { BasicAuthGuard } from "./guards/basic-auth.guard";
import {
	GetInterruptionRecordsQuery,
	GetInterruptionsQuery,
	GetNotificationSubscriptionQuery,
	type GetInterruptionRecordsResult,
	type GetInterruptionsResult,
	type GetNotificationSubscriptionResult,
} from "./queries";

@Controller()
export class AppController {
	constructor(
		private readonly commandBus: CommandBus,
		private readonly queryBus: QueryBus
	) {}

	@Get("/interruptions")
	async getInterruptions(): Promise<GetInterruptionsResult> {
		return this.queryBus.execute(new GetInterruptionsQuery());
	}

	@Get("/interruptions-records")
	async getInterruptionRecords(): Promise<GetInterruptionRecordsResult> {
		return this.queryBus.execute(new GetInterruptionRecordsQuery());
	}
	@Post("/posts/:id/recognize")
	@HttpCode(202)
	@UseGuards(BasicAuthGuard)
	async recognizePost(@Param("id") id: string): Promise<RecognizePostResult> {
		return this.commandBus.execute(new RecognizePostCommand({ postId: id }));
	}

	@Post("/push/subscriptions")
	async subscribe(@Body() body: Partial<SubscribeNotificationCommand>): Promise<SubscribeNotificationResult> {
		return this.commandBus.execute(new SubscribeNotificationCommand(body as SubscribeNotificationCommand));
	}

	@Get("/push/subscriptions/:fid")
	async getSubscription(@Param("fid") fid: string): Promise<GetNotificationSubscriptionResult> {
		return this.queryBus.execute(new GetNotificationSubscriptionQuery({ fid }));
	}

	@Patch("/push/subscriptions/:fid")
	async updateSubscription(
		@Param("fid") fid: string,
		@Body() body: Partial<UpdateNotificationSubscriptionCommand>
	): Promise<UpdateNotificationSubscriptionResult> {
		return this.commandBus.execute(
			new UpdateNotificationSubscriptionCommand({
				fid,
				keywords: body.keywords,
				isSubscribedToAllInterruptions: body.isSubscribedToAllInterruptions,
			})
		);
	}

	@Delete("/push/subscription/:fid")
	async unsubscribe(@Param("fid") fid: string): Promise<UnsubscribeNotificationResult> {
		return this.commandBus.execute(new UnsubscribeNotificationCommand({ fid }));
	}

	@Post("/push/subscription/:fid/send")
	@HttpCode(200)
	@UseGuards(BasicAuthGuard)
	async sendNotification(
		@Param("fid") fid: string,
		@Body() body: Partial<SendNotificationCommand>
	): Promise<SendNotificationResult> {
		return this.commandBus.execute(
			new SendNotificationCommand({
				fid,
				title: body.title,
				body: body.body,
				url: body.url,
			})
		);
	}
}
