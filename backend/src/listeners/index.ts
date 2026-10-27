import { Constructor, IEventHandler } from "@nestjs/cqrs";

import { InterruptionRecordCreatedListener } from "./interruption-record-created.listener";

export * from "./interruption-record-created.listener";

export const Listeners: Constructor<IEventHandler>[] = [InterruptionRecordCreatedListener];
