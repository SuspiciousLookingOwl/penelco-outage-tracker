import { Logger } from "@nestjs/common";
import { EventsHandler, IEventHandler } from "@nestjs/cqrs";
import type { InterruptionRecord } from "../entities";
import { InterruptionRecordsCreatedEvent } from "../events";
import { NotificationSubscriptionRepository } from "../repositories";
import { PushService } from "../services/push.service";
import { DateUtil } from "../utils/date.util";

@EventsHandler(InterruptionRecordsCreatedEvent)
export class InterruptionRecordsCreatedListener implements IEventHandler<InterruptionRecordsCreatedEvent> {
	private readonly logger = new Logger(InterruptionRecordsCreatedListener.name);

	constructor(
		private readonly pushService: PushService,
		private readonly subscriptionRepository: NotificationSubscriptionRepository
	) {}

	public async handle({ records }: InterruptionRecordsCreatedEvent): Promise<void> {
		try {
			if (!records.length) return;

			const keywords = [...new Set(records.flatMap((record) => this.getKeywords(record)))];
			const subscriptions = await this.subscriptionRepository.findByKeywords(keywords);

			this.logger.log(`Broadcasting to ${subscriptions.length} subscriptions`);

			if (!subscriptions.length) return;

			const { sent, invalid } = await this.pushService.sendToFids(
				subscriptions.map((subscription) => subscription.fid),
				{
					title: this.getTitle(records),
					body: this.getDescription(records),
					url: "/",
					data: {
						interruptionIds: [...new Set(records.map((record) => record.interruptionId))].join(","),
						recordIds: records.map((record) => record.id).join(","),
						types: [...new Set(records.map((record) => record.type))].join(","),
					},
				}
			);

			if (invalid.length) await this.subscriptionRepository.deleteByFids(invalid);

			const recordIds = records.map((record) => record.id).join(", ");
			this.logger.log(`Sent ${sent}/${subscriptions.length} notifications for records ${recordIds}`);
		} catch (error) {
			const recordIds = records.map((record) => record.id).join(", ");
			this.logger.error(`Failed to broadcast records ${recordIds}: ${error}`);
		}
	}

	private getKeywords(record: InterruptionRecord): string[] {
		return [...record.area.split(","), ...(record.subareas?.split(",") ?? [])]
			.flatMap((value) => value.split(" "))
			.map((value) => value.trim())
			.filter(Boolean);
	}

	private getTitle(records: InterruptionRecord[]): string {
		const areas = [
			...new Set(
				records
					.flatMap((record) => record.area.split(","))
					.map((area) => area.trim())
					.filter(Boolean)
			),
		];

		return `Power Interruption Notice: ${areas.join(", ") || "unknown"}`;
	}

	private getDescription(records: InterruptionRecord[]): string {
		const slotsByDate = new Map<string, Set<string>>();

		for (const record of records) {
			const date = DateUtil.format(record.date, "EEE, MMM dd") ?? "";
			const slots = slotsByDate.get(date) ?? new Set<string>();

			for (const slot of record.timeSlots) {
				const start = DateUtil.format(slot.start, "HH:mm");
				if (!start) continue;

				const end = DateUtil.format(slot.end, "HH:mm");
				slots.add(end ? `${start} - ${end}` : start);
			}

			slotsByDate.set(date, slots);
		}

		return [...slotsByDate]
			.map(([date, slots]) => [date, [...slots].join(", ")].filter(Boolean).join(", "))
			.join("\n");
	}
}
