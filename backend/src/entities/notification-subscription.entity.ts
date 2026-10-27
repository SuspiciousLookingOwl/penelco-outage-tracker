interface NotificationSubscriptionProps {
	id?: string;
	fid: string;
	isSubscribedToAllInterruptions?: boolean;
	keywords?: string[];
	lastSeenAt?: Date;
	createdAt?: Date;
	updatedAt?: Date;
}

export class NotificationSubscription {
	public readonly id: string;
	public readonly fid: string;
	public isSubscribedToAllInterruptions: boolean;
	public keywords: string[];
	public lastSeenAt: Date;

	public readonly createdAt: Date;
	public updatedAt: Date;

	constructor(props: NotificationSubscriptionProps) {
		this.id = props.id || crypto.randomUUID();
		this.fid = props.fid;
		this.isSubscribedToAllInterruptions = props.isSubscribedToAllInterruptions ?? false;
		this.keywords = props.keywords ?? [];
		this.lastSeenAt = props.lastSeenAt ?? new Date();

		this.createdAt = props.createdAt ?? new Date();
		this.updatedAt = props.updatedAt ?? new Date();
	}
}
