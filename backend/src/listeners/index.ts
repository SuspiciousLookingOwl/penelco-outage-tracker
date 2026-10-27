import { Constructor, IEventHandler } from "@nestjs/cqrs";

import { InterruptionRecordsCreatedListener } from "./interruption-records-created.listener";

export * from "./interruption-records-created.listener";

export const Listeners: Constructor<IEventHandler>[] = [InterruptionRecordsCreatedListener];
