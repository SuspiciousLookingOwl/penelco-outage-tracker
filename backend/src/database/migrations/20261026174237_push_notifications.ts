import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
	await knex.raw("CREATE EXTENSION IF NOT EXISTS unaccent");

	await knex.schema.createTable("notification_subscriptions", (table) => {
		table.uuid("id").primary();
		table.string("fid", 512).notNullable().unique();
		table.boolean("is_subscribed_to_all_interruptions").notNullable().defaultTo(false);
		table.jsonb("keywords").notNullable().defaultTo(knex.raw("'[]'::jsonb"));
		table.timestamp("last_seen_at").notNullable().defaultTo(knex.fn.now());
		table.timestamps(true, true);
	});
}

export async function down(knex: Knex): Promise<void> {
	await knex.schema.dropTableIfExists("notification_subscriptions");
}
