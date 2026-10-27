import { RecognizePostHandler } from "./recognize-post";
import { SendNotificationHandler } from "./send-notification";
import { SubscribeNotificationHandler } from "./subscribe-notification";
import { UnsubscribeNotificationHandler } from "./unsubscribe-notification";
import { UpdateNotificationSubscriptionHandler } from "./update-notification-subscription";

export * from "./recognize-post";
export * from "./send-notification";
export * from "./subscribe-notification";
export * from "./unsubscribe-notification";
export * from "./update-notification-subscription";

export const CommandHandlers = [
	RecognizePostHandler,
	SendNotificationHandler,
	SubscribeNotificationHandler,
	UnsubscribeNotificationHandler,
	UpdateNotificationSubscriptionHandler,
];
