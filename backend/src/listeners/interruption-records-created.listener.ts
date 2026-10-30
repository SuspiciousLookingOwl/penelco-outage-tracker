import { Logger } from "@nestjs/common";
import { EventsHandler, IEventHandler } from "@nestjs/cqrs";
import type { InterruptionRecord, TimeSlot } from "../entities";
import { InterruptionRecordsCreatedEvent } from "../events";
import { NotificationSubscriptionRepository } from "../repositories";
import { PushService } from "../services/push.service";
import { DateUtil } from "../utils/date.util";

@EventsHandler(InterruptionRecordsCreatedEvent)
export class InterruptionRecordsCreatedListener implements IEventHandler<InterruptionRecordsCreatedEvent> {
	private static readonly TITLE = "⚠️ PENELCO Power Interruption Notice ⚠️";

	private readonly logger = new Logger(InterruptionRecordsCreatedListener.name);

	constructor(
		private readonly pushService: PushService,
		private readonly subscriptionRepository: NotificationSubscriptionRepository
	) {}

	public async handle({ records, postId }: InterruptionRecordsCreatedEvent): Promise<void> {
		try {
			if (!records.length) return;

			const keywords = [...new Set(records.flatMap((record) => this.getKeywords(record)))];
			const subscriptions = await this.subscriptionRepository.findByKeywords(keywords);

			this.logger.log(`Broadcasting to ${subscriptions.length} subscriptions`);

			if (!subscriptions.length) return;

			const { sent, invalid } = await this.pushService.sendToFids(
				subscriptions.map((subscription) => subscription.fid),
				{
					title: InterruptionRecordsCreatedListener.TITLE,
					body: this.getBody(records),
					url: postId ? `/?postId=${encodeURIComponent(postId)}` : "/",
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

	private getBody(records: InterruptionRecord[]): string {
		const entries = new Map<string, { area: string; date: string; slots: string[] }>();

		for (const record of records) {
			const date = DateUtil.format(record.date, "MMM d") ?? "";
			const slots = [...new Set(record.timeSlots.flatMap((slot) => this.getSlot(slot)))];
			const areas = [
				...new Set(
					record.area
						.split(",")
						.map((area) => area.trim())
						.filter(Boolean)
				),
			];

			for (const area of areas) {
				const key = `${area}|${date}`;
				const entry = entries.get(key) ?? { area, date, slots: [] };

				entry.slots = [...new Set([...entry.slots, ...slots])];
				entries.set(key, entry);
			}
		}

		return [...entries.values()]
			.map(({ area, date, slots }) => `${area} (${[date, ...slots].filter(Boolean).join(", ")})`)
			.join(", ");
	}

	private getSlot(slot: TimeSlot): string[] {
		const start = DateUtil.format(slot.start, "hh:mm a");
		if (!start) return [];

		const end = DateUtil.format(slot.end, "hh:mm a");
		return [end ? `${start} - ${end}` : start];
	}
}
