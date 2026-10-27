import type { InterruptionRecord } from "../entities";

export class InterruptionRecordCreatedEvent {
	public readonly record!: InterruptionRecord;

	constructor(params: Partial<InterruptionRecordCreatedEvent>) {
		Object.assign(this, params);
	}
}
