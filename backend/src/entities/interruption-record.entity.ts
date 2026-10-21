import type { InterruptionRecognition } from "./interruption-recognition.entity";
import type { Interruption, TimeSlot } from "./interruption.entity";

interface InterruptionProps {
	id?: string;
	interruptionId: string;
	interruptionRecognitionId: string | null;
	date: Date;
	timeSlots: TimeSlot[];
	area: string;
	subareas: string | null;
	reason: string | null;
	type: InterruptionRecordType;
	interruption?: Interruption;
	recognition?: InterruptionRecognition;

	createdAt?: Date;
	updatedAt?: Date;
}

export enum InterruptionRecordType {
	PUBLISHED = "PUBLISHED",
	UPDATED = "UPDATED",
	CANCELLED = "CANCELLED",
}

export class InterruptionRecord {
	public readonly id: string;
	public readonly interruptionId: string;
	public readonly interruptionRecognitionId: string | null;
	public readonly date: Date;
	public readonly timeSlots: TimeSlot[];
	public readonly area: string;
	public readonly subareas: string | null;
	public readonly reason: string | null;
	public readonly type: InterruptionRecordType;

	public readonly createdAt: Date;
	public readonly updatedAt: Date;

	public readonly interruption?: Interruption;
	public readonly recognition?: InterruptionRecognition;

	constructor(props: InterruptionProps) {
		this.interruptionId = props.interruptionId;
		this.id = props.id || crypto.randomUUID();
		this.interruptionRecognitionId = props.interruptionRecognitionId;
		this.date = props.date;
		this.timeSlots = props.timeSlots;
		this.area = props.area;
		this.subareas = props.subareas;
		this.reason = props.reason;
		this.type = props.type;

		this.createdAt = props.createdAt || new Date();
		this.updatedAt = props.updatedAt || new Date();

		this.interruption = props.interruption;
		this.recognition = props.recognition;
	}
}
