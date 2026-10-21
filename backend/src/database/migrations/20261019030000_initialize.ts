import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
	await knex.schema.createTable("interruption_posts", (table) => {
		table.string("id", 128).primary();
		table.string("post_id", 128).notNullable();
		table.string("filter", 64).notNullable();
		table.string("type", 64).notNullable();
		table.timestamp("timestamp", { useTz: true }).notNullable();
		table.text("content").notNullable().defaultTo("");
		table.jsonb("images").notNullable().defaultTo(knex.raw("'[]'::jsonb"));
		table.timestamps(true, true);

		table.index(["timestamp"], "interruption_posts_timestamp_index");
		table.index(["type"], "interruption_posts_type_index");
	});

	await knex.schema.createTable("interruptions", (table) => {
		table.uuid("id").primary();
		table
			.string("interruption_post_id", 128)
			.nullable()
			.references("id")
			.inTable("interruption_posts")
			.onDelete("SET NULL");
		table.date("date").notNullable();
		table.jsonb("time_slots").notNullable().defaultTo(knex.raw("'[]'::jsonb"));
		table.string("area", 1024).notNullable();
		table.text("subareas").nullable();
		table.text("reason").nullable();
		table.timestamps(true, true);

		table.index(["date"], "interruptions_date_index");
		table.index(["interruption_post_id"], "interruptions_interruption_post_id_index");
	});

	await knex.schema.createTable("interruption_recognitions", (table) => {
		table.uuid("id").primary();
		table
			.string("interruption_post_id", 128)
			.notNullable()
			.references("id")
			.inTable("interruption_posts")
			.onDelete("CASCADE");
		table.string("filename", 512).nullable();
		table.boolean("success").notNullable();
		table.jsonb("response").notNullable();
		table.timestamps(true, true);

		table.index(["interruption_post_id"], "interruption_recognitions_interruption_post_id_index");
	});

	await knex.schema.createTable("interruption_records", (table) => {
		table.uuid("id").primary();
		table.uuid("interruption_id").notNullable().references("id").inTable("interruptions").onDelete("CASCADE");
		table
			.uuid("interruption_recognition_id")
			.nullable()
			.references("id")
			.inTable("interruption_recognitions")
			.onDelete("SET NULL");
		table.date("date").notNullable();
		table.jsonb("time_slots").notNullable().defaultTo(knex.raw("'[]'::jsonb"));
		table.string("area", 1024).notNullable();
		table.text("subareas").nullable();
		table.text("reason").nullable();
		table.text("type").notNullable();
		table.timestamps(true, true);

		table.index(["interruption_id"], "interruption_records_interruption_id_index");
		table.index(["interruption_recognition_id"], "interruption_records_interruption_recognition_id_index");
		table.index(["date"], "interruption_records_date_index");
	});
}

export async function down(knex: Knex): Promise<void> {
	await knex.schema.dropTableIfExists("interruption_records");
	await knex.schema.dropTableIfExists("interruption_recognitions");
	await knex.schema.dropTableIfExists("interruptions");
	await knex.schema.dropTableIfExists("interruption_posts");
}
