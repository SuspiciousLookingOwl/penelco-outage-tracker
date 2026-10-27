import type { InterruptionRecord } from "../entities";

export class InterruptionRecordsCreatedEvent {
	public readonly records!: InterruptionRecord[];

	constructor(params: Partial<InterruptionRecordsCreatedEvent>) {
		Object.assign(this, params);
	}
}
