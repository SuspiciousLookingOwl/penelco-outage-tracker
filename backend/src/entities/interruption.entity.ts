import type { InterruptionPost } from "./interruption-post.entity";
import type { InterruptionRecord } from "./interruption-record.entity";

export interface TimeSlot {
	start: string | null;
	end: string | null;
	label: string | null;
}

interface InterruptionProps {
	id?: string;
	interruptionPostId: string | null;
	date: Date;
	timeSlots: TimeSlot[];
	area: string;
	subareas: string | null;
	reason: string | null;
	createdAt?: Date;
	updatedAt?: Date;
	post?: InterruptionPost;
	records?: InterruptionRecord[];
}

export class Interruption {
	public readonly id: string;
	public readonly interruptionPostId: string | null;
	public readonly date: Date;
	public timeSlots: TimeSlot[];
	public readonly area: string;
	public readonly subareas: string | null;
	public reason: string | null;

	public readonly createdAt: Date;
	public readonly updatedAt: Date;

	public readonly post?: InterruptionPost;
	public readonly records?: InterruptionRecord[];

	constructor(props: InterruptionProps) {
		this.id = props.id || crypto.randomUUID();
		this.interruptionPostId = props.interruptionPostId;
		this.date = props.date;
		this.timeSlots = props.timeSlots;
		this.area = props.area;
		this.subareas = props.subareas;
		this.reason = props.reason;

		this.createdAt = props.createdAt || new Date();
		this.updatedAt = props.updatedAt || new Date();

		this.post = props.post;
		this.records = props.records;
	}
}
