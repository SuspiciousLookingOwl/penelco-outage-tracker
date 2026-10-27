import { Logger } from "@nestjs/common";
import { EventsHandler, IEventHandler } from "@nestjs/cqrs";
import type { InterruptionRecord } from "../entities";
import { InterruptionRecordCreatedEvent } from "../events";
import { NotificationSubscriptionRepository } from "../repositories";
import { PushService } from "../services/push.service";
import { DateUtil } from "../utils/date.util";

@EventsHandler(InterruptionRecordCreatedEvent)
export class InterruptionRecordCreatedListener implements IEventHandler<InterruptionRecordCreatedEvent> {
	private readonly logger = new Logger(InterruptionRecordCreatedListener.name);

	constructor(
		private readonly pushService: PushService,
		private readonly subscriptionRepository: NotificationSubscriptionRepository
	) {}

	public async handle({ record }: InterruptionRecordCreatedEvent): Promise<void> {
		try {
			const keywords = [...record.area.split(","), ...(record.subareas?.split(",") ?? [])].map((value) =>
				value.trim()
			);

			const subscriptions = await this.subscriptionRepository.findByKeywords(keywords);
			if (!subscriptions.length) return;

			const { sent, invalid } = await this.pushService.sendToFids(
				subscriptions.map((subscription) => subscription.fid),
				{
					title: this.getTitle(record),
					body: this.getDescription(record),
					url: "/",
					data: {
						interruptionId: record.interruptionId,
						recordId: record.id,
						type: record.type,
					},
				}
			);

			if (invalid.length) await this.subscriptionRepository.deleteByFids(invalid);

			this.logger.log(`Sent ${sent}/${subscriptions.length} notifications for record ${record.id}`);
		} catch (error) {
			this.logger.error(`Failed to broadcast record ${record.id}: ${error}`);
		}
	}

	private getTitle(record: InterruptionRecord): string {
		return `Power Interruption Notice: ${record.area}`;
	}

	private getDescription(record: InterruptionRecord): string {
		const date = DateUtil.toDayAndMonthString(record.date);

		const slots = record.timeSlots
			.map((slot) => {
				const start = DateUtil.toTimeStringNoTz(slot.start);
				const end = DateUtil.toTimeStringNoTz(slot.end);
				if (!start) return null;

				return end ? `${start} - ${end}` : start;
			})
			.filter(Boolean)
			.join(", ");

		return [date, slots].filter(Boolean).join(", ");
	}
}
