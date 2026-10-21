import { DynamicModule, Inject, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { type Connection, KNEX_CONNECTION, ObjectionModule } from "@willsoto/nestjs-objection";
import type { Knex } from "knex";
import { InterruptionModel, InterruptionPostModel, InterruptionRecordModel } from "../repositories";
import { InterruptionRecognitionModel } from "../repositories";
import * as initializeMigration from "./migrations/20261019030000_initialize";

type Migration = {
	up(knex: Knex): Promise<void>;
	down(knex: Knex): Promise<void>;
};

class StaticMigrationSource {
	private readonly migrations: Record<string, Migration> = {
		"20261019030000_initialize": initializeMigration,
	};

	public getMigrations(): Promise<string[]> {
		return Promise.resolve(Object.keys(this.migrations).sort());
	}

	public getMigrationName(name: string): string {
		return name;
	}

	public getMigration(name: string): Promise<Migration> {
		const migration = this.migrations[name];
		if (!migration) return Promise.reject(new Error(`Unknown migration: ${name}`));
		return Promise.resolve(migration);
	}
}

@Module({
	imports: [
		ObjectionModule.forFeature([
			InterruptionModel,
			InterruptionRecordModel,
			InterruptionPostModel,
			InterruptionRecognitionModel,
		]),
	],
	exports: [ObjectionModule],
})
export class DatabaseModule {
	constructor(@Inject(KNEX_CONNECTION) private readonly connection: Connection) {}

	async onModuleInit(): Promise<void> {
		await this.connection.migrate.latest();
	}

	static forRoot(): DynamicModule {
		return {
			global: true,
			module: DatabaseModule,
			imports: [
				ObjectionModule.registerAsync({
					imports: [ConfigModule],
					inject: [ConfigService],
					useFactory: (configService: ConfigService) => {
						const host: string = configService.getOrThrow("POSTGRES_HOST");
						const user: string = configService.getOrThrow("POSTGRES_USER");
						const password: string = configService.getOrThrow("POSTGRES_PASSWORD");
						const database: string = configService.getOrThrow("POSTGRES_DB");

						return {
							config: {
								client: "pg",
								connection: { host, user, password, database, port: 5432 },
								migrations: {
									migrationSource: new StaticMigrationSource(),
									tableName: "knex_migrations",
								},
							},
						};
					},
				}),
			],
		};
	}
}
