import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { cert, Credential, getApps, initializeApp, type App, type ServiceAccount } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";
import { readFileSync } from "node:fs";
import { AppConfigService } from "../config/app-config.service";

export interface PushMessage {
	title: string;
	body: string;
	data?: Record<string, string>;
	url?: string;
}

@Injectable()
export class PushService implements OnModuleInit {
	private static readonly MAX_FIDS_PER_REQUEST = 500;
	private static readonly INVALID_FID_CODES = new Set([
		"messaging/installation-id-not-registered",
		"messaging/registration-token-not-registered",
		"messaging/invalid-registration-token",
		"messaging/invalid-argument",
	]);

	private readonly logger = new Logger(PushService.name);
	private messaging: Messaging | null = null;

	constructor(private readonly config: AppConfigService) {}

	public onModuleInit(): void {
		let credential: Credential | null = null;

		const { serviceAccountPath } = this.config.firebase;
		if (serviceAccountPath) {
			try {
				const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8")) as ServiceAccount;
				credential = cert(serviceAccount);
			} catch (error) {
				this.logger.error(`Failed to load Firebase credentials: ${error}`);
			}
		}

		if (!credential) {
			this.logger.warn("Firebase credentials are not configured, push notifications are disabled.");
			return;
		}

		const app: App = getApps()[0] ?? initializeApp({ credential });
		this.messaging = getMessaging(app);
	}

	public async sendToFids(fids: string[], message: PushMessage): Promise<{ sent: number; invalid: string[] }> {
		if (!this.messaging || !fids.length) return { sent: 0, invalid: [] };

		let sent = 0;
		const invalid: string[] = [];

		for (let i = 0; i < fids.length; i += PushService.MAX_FIDS_PER_REQUEST) {
			const chunk = fids.slice(i, i + PushService.MAX_FIDS_PER_REQUEST);

			const response = await this.messaging.sendEachForMulticast({
				fids: chunk,
				notification: { title: message.title, body: message.body },
				data: message.data,
				webpush: message.url
					? {
							fcmOptions: { link: message.url },
							notification: { icon: "/icons/icon-192.png", badge: "/icons/icon-192.png" },
						}
					: undefined,
			});

			sent += response.successCount;

			response.responses.forEach((result, index) => {
				if (result.success) return;

				const code = result.error?.code ?? "";
				if (PushService.INVALID_FID_CODES.has(code)) {
					invalid.push(chunk[index]);
					return;
				}

				this.logger.warn(`Push to fid ${index} failed: ${code} ${result.error?.message ?? ""}`);
			});
		}

		return { sent, invalid };
	}
}
