import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "./env.validation";

@Injectable()
export class AppConfigService {
	constructor(private readonly config: ConfigService<Env, true>) {}

	get port(): number {
		return this.config.get("PORT", { infer: true });
	}

	get imagePath(): string {
		return this.config.get("IMAGE_PATH", { infer: true });
	}

	get fetchMaxAgeDays(): number {
		return this.config.get("FETCH_MAX_AGE_DAYS", { infer: true });
	}

	get basicAuth() {
		return {
			username: this.config.get("BASIC_AUTH_USERNAME", { infer: true }),
			password: this.config.get("BASIC_AUTH_PASSWORD", { infer: true }),
		};
	}

	get ai() {
		return {
			baseUrl: this.config.get("OPENAI_BASE_URL", { infer: true }),
			apiKey: this.config.get("OPENAI_API_KEY", { infer: true }),
			models: this.config.get("OPENAI_MODEL", { infer: true }),
			imageDetail: this.config.get("OPENAI_IMAGE_DETAIL", { infer: true }),
			timeoutMs: this.config.get("OPENAI_TIMEOUT_MS", { infer: true }),
		};
	}

	get firebase() {
		return {
			serviceAccountPath: this.config.get("FIREBASE_SERVICE_ACCOUNT_PATH", { infer: true }) ?? null,
		};
	}
}
