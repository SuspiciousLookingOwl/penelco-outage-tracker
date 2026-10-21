import type { InterruptionRecognition } from "./interruption-recognition.entity";
import type { Interruption } from "./interruption.entity";

interface InterruptionPostProps {
	id?: string;
	filter: string;
	postId: string;
	timestamp: Date;
	content: string;
	type: string;
	images: string[];

	createdAt?: Date;
	updatedAt?: Date;
	interruptions?: Interruption[];
	recognitions?: InterruptionRecognition[];
}

export class InterruptionPost {
	public readonly id: string;
	public readonly filter: string;
	public readonly postId: string;
	public readonly timestamp: Date;
	public readonly content: string;
	public readonly type: string;
	public readonly images: string[];

	public readonly createdAt: Date;
	public readonly updatedAt: Date;

	public readonly interruptions?: Interruption[];
	public readonly recognitions?: InterruptionRecognition[];

	constructor(props: InterruptionPostProps) {
		this.id = props.id || crypto.randomUUID();
		this.filter = props.filter;
		this.postId = props.postId;
		this.timestamp = props.timestamp;
		this.content = props.content;
		this.type = props.type;
		this.images = props.images;

		this.createdAt = props.createdAt || new Date();
		this.updatedAt = props.updatedAt || new Date();

		this.interruptions = props.interruptions;
		this.recognitions = props.recognitions;
	}
}
