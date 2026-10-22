import type { Knex } from "knex";

const OFFSET_MINUTES = `
	(
		round(
			extract(epoch from (
				to_timestamp(
					substring(id from '[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}$'),
					'YYYY-MM-DD-HH24-MI-SS'
				)::timestamp
				- ("timestamp" AT TIME ZONE 'UTC')
			)) / 900
		) * 15
	)::int
`;

const CORRECTED = `
	COALESCE(
		("timestamp" AT TIME ZONE 'UTC')
		+ make_interval(mins => ${OFFSET_MINUTES}),
		-- id without an embedded timestamp: fall back to the UTC rendering.
		"timestamp" AT TIME ZONE 'UTC'
	)
`;

export async function up(knex: Knex): Promise<void> {
	await knex.raw(`
		ALTER TABLE interruption_posts
		ALTER COLUMN "timestamp" TYPE timestamp without time zone
		USING (${CORRECTED})
	`);
}

export async function down(knex: Knex): Promise<void> {
	await knex.raw(`
		ALTER TABLE interruption_posts
		ALTER COLUMN "timestamp" TYPE timestamp with time zone
		USING ("timestamp" AT TIME ZONE 'UTC')
	`);
}
