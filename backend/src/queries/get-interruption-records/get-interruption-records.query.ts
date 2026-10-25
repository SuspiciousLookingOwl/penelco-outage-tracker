import { Query } from "@nestjs/cqrs";
import { z } from "zod";
import type { InterruptionRecord } from "../../entities";

export type GetInterruptionRecordsResult = InterruptionRecord[];

export class GetInterruptionRecordsQuery extends Query<GetInterruptionRecordsResult> {
	public readonly days!: number;

	constructor(params: Partial<GetInterruptionRecordsQuery> = {}) {
		super();
		Object.assign(this, params);
	}
}

export const GetInterruptionRecordsParamSchema = z.object({
	days: z.coerce.number().int().positive().max(365).default(14),
});
