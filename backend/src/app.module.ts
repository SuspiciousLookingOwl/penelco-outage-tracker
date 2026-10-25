import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CqrsModule } from "@nestjs/cqrs";
import { ScheduleModule } from "@nestjs/schedule";
import { AppController } from "./app.controller";
import { CommandHandlers } from "./commands";
import { AppConfigService } from "./config/app-config.service";
import { validateEnv } from "./config/env.validation";
import { DatabaseModule } from "./database/database.module";
import { BasicAuthGuard } from "./guards/basic-auth.guard";
import { QueryHandlers } from "./queries";
import { InterruptionPostRepository } from "./repositories/interruption-post/interruption-post.repository";
import { InterruptionRecognitionRepository } from "./repositories/interruption-recognition/interruption-recognition.repository";
import { InterruptionRecordRepository } from "./repositories/interruption-record/interruption-record.repository";
import { InterruptionRepository } from "./repositories/interruption/interruption.repository";
import { CronService } from "./services/cron.service";
import { OPENAI_OPTIONS, OpenAiService, OpenAiServiceOptions } from "./services/openai.service";
import { PenelcoService } from "./services/penelco.service";

@Module({
	imports: [
		ScheduleModule.forRoot(),
		ConfigModule.forRoot({
			isGlobal: true,
			cache: true,
			validate: validateEnv,
		}),
		HttpModule,
		DatabaseModule.forRoot(),
		CqrsModule.forRoot(),
	],
	controllers: [AppController],
	providers: [
		AppConfigService,
		BasicAuthGuard,
		PenelcoService,
		InterruptionRepository,
		InterruptionRecordRepository,
		InterruptionPostRepository,
		InterruptionRecognitionRepository,
		CronService,
		...CommandHandlers,
		...QueryHandlers,
		{
			provide: OPENAI_OPTIONS,
			inject: [AppConfigService],
			useFactory: (config: AppConfigService): OpenAiServiceOptions => config.ai,
		},
		OpenAiService,
	],
})
export class AppModule {}
