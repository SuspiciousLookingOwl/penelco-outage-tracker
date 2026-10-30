import { z } from "zod";

export const envSchema = z.object({
	PORT: z.coerce.number().int().positive().default(3000),

	OPENAI_BASE_URL: z.url(),
	OPENAI_API_KEY: z.string().min(1),
	OPENAI_MODEL: z
		.string()
		.min(1)
		.transform((value) =>
			value
				.split(",")
				.map((model) => model.trim())
				.filter(Boolean)
		)
		.refine((models) => models.length > 0, "At least one model is required"),
	OPENAI_IMAGE_DETAIL: z.enum(["low", "high", "auto"]).default("high"),
	OPENAI_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),

	FETCH_MAX_AGE_DAYS: z.coerce.number().int().positive().default(14),

	IMAGE_PATH: z.string().min(1).default("./images"),

	BASIC_AUTH_USERNAME: z.string().min(1),
	BASIC_AUTH_PASSWORD: z.string().min(1),

	FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),

	POSTGRES_HOST: z.string().min(1).default("127.0.0.1"),
	POSTGRES_USER: z.string().min(1),
	POSTGRES_PASSWORD: z.string().min(1),
	POSTGRES_DB: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
	const result = envSchema.safeParse(config);

	if (!result.success) {
		throw new Error(`Invalid environment configuration:\n${JSON.stringify(result.error.issues)}`);
	}

	return result.data;
}
