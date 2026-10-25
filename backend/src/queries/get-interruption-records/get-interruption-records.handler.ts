import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { ValidateParams } from "../../common";
import { InterruptionRecordRepository } from "../../repositories";
import {
	GetInterruptionRecordsParamSchema,
	GetInterruptionRecordsQuery,
	GetInterruptionRecordsResult,
} from "./get-interruption-records.query";

@QueryHandler(GetInterruptionRecordsQuery)
export class GetInterruptionRecordsHandler implements IQueryHandler<GetInterruptionRecordsQuery> {
	constructor(private readonly recordRepository: InterruptionRecordRepository) {}

	@ValidateParams(GetInterruptionRecordsParamSchema)
	public async execute(params: GetInterruptionRecordsQuery): Promise<GetInterruptionRecordsResult> {
		const { days } = params;
		const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

		return this.recordRepository.get({ from }, { interruption: { records: true }, recognition: { post: true } });
	}
}
