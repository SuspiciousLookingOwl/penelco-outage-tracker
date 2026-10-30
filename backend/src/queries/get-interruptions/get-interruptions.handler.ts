import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { ValidateParams } from "../../common";
import { InterruptionRepository } from "../../repositories";
import { GetInterruptionsParamSchema, GetInterruptionsQuery, GetInterruptionsResult } from "./get-interruptions.query";

@QueryHandler(GetInterruptionsQuery)
export class GetInterruptionsHandler implements IQueryHandler<GetInterruptionsQuery> {
	constructor(private readonly interruptionRepository: InterruptionRepository) {}

	@ValidateParams(GetInterruptionsParamSchema)
	public async execute(params: GetInterruptionsQuery): Promise<GetInterruptionsResult> {
		const { days } = params;
		const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

		return this.interruptionRepository.get(
			{ dateFrom: from, orderBy: "date", orderDirection: "desc" },
			{ records: { recognition: { post: true } } }
		);
	}
}
