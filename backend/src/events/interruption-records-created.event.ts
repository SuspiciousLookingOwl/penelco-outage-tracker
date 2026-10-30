import type { InterruptionRecord } from "../entities";

export class InterruptionRecordsCreatedEvent {
	public readonly records!: InterruptionRecord[];
	public readonly postId?: string | null;

	constructor(params: Partial<InterruptionRecordsCreatedEvent>) {
		Object.assign(this, params);
	}
}
