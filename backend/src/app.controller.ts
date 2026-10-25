import { Controller, Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { RecognizePostCommand, type RecognizePostResult } from "./commands";
import { BasicAuthGuard } from "./guards/basic-auth.guard";
import {
	GetInterruptionRecordsQuery,
	GetInterruptionsQuery,
	type GetInterruptionRecordsResult,
	type GetInterruptionsResult,
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
}
