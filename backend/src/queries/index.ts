import { GetInterruptionRecordsHandler } from "./get-interruption-records";
import { GetInterruptionsHandler } from "./get-interruptions";

export * from "./get-interruption-records";
export * from "./get-interruptions";

export const QueryHandlers = [GetInterruptionRecordsHandler, GetInterruptionsHandler];
