import { Query } from "@nestjs/cqrs";
import { z } from "zod";
import type { Interruption } from "../../entities";

export type GetInterruptionsResult = Interruption[];

export class GetInterruptionsQuery extends Query<GetInterruptionsResult> {
	public readonly days!: number;

	constructor(params: Partial<GetInterruptionsQuery> = {}) {
		super();
		Object.assign(this, params);
	}
}

export const GetInterruptionsParamSchema = z.object({
	days: z.coerce.number().int().positive().max(30).default(14),
});
