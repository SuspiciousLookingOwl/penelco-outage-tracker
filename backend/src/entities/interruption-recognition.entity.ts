import type { InterruptionPost } from "./interruption-post.entity";

interface InterruptionRecognitionProps {
	id?: string;
	interruptionPostId: string;
	filename: string | null;
	success: boolean;
	response: object;

	createdAt?: Date;
	updatedAt?: Date;
	post?: InterruptionPost;
}

export class InterruptionRecognition {
	public readonly id: string;
	public readonly interruptionPostId: string;
	public readonly filename: string | null;
	public success: boolean;
	public response: object;

	public readonly createdAt: Date;
	public readonly updatedAt: Date;

	public readonly post?: InterruptionPost;

	constructor(props: InterruptionRecognitionProps) {
		this.id = props.id || crypto.randomUUID();
		this.interruptionPostId = props.interruptionPostId;
		this.filename = props.filename;
		this.success = props.success;
		this.response = props.response;

		this.createdAt = props.createdAt || new Date();
		this.updatedAt = props.updatedAt || new Date();

		this.post = props.post;
	}
}
