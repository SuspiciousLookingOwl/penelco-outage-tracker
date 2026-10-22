import { Inject, Injectable } from "@nestjs/common";
import { Model, RelationExpression } from "objection";
import { InterruptionRecord, InterruptionRecordType } from "../../entities";
import { DEFAULT_LIMIT, DEFAULT_START, GetOptions } from "../common/pagination";
import { InterruptionRecordModel } from "./interruption-record.model";
import { InterruptionRecordRepositoryMapper } from "./interruption-record.repository-mapper";

export type InterruptionRecordOrderBy = "date" | "created_at" | "type";

export interface InterruptionRecordGetOptions extends GetOptions<InterruptionRecordOrderBy> {
	interruptionId?: string;
	type?: InterruptionRecordType;
	from?: Date;
	to?: Date;
}

@Injectable()
export class InterruptionRecordRepository {
	constructor(
		@Inject(InterruptionRecordModel)
		private readonly recordModel: typeof InterruptionRecordModel
	) {}

	public async get(
		options: InterruptionRecordGetOptions = {},
		fetchRelations?: RelationExpression<Model>
	): Promise<InterruptionRecord[]> {
		const {
			start = DEFAULT_START,
			limit = DEFAULT_LIMIT,
			orderBy = "created_at",
			orderDirection = "desc",
		} = options;

		const query = this.recordModel.query();

		if (options.interruptionId) query.where("interruption_id", options.interruptionId);
		if (options.from) query.where("created_at", ">=", options.from);
		if (options.to) query.where("created_at", "<=", options.to);
		if (options.type) query.where("type", options.type);
		if (fetchRelations) query.withGraphFetched(fetchRelations);
		if (orderBy) query.orderBy(orderBy, orderDirection);
		if (start) query.offset(start);
		if (limit) query.limit(limit);

		const result = await query;

		return result.map((row) => InterruptionRecordRepositoryMapper.toDomainEntity(row));
	}

	public async upsert(record: InterruptionRecord): Promise<InterruptionRecord> {
		const props = InterruptionRecordRepositoryMapper.toRepository(record);

		const result = await this.recordModel
			.query()
			.insert({ ...props, updatedAt: new Date() })
			.onConflict("id")
			.merge()
			.returning("*");

		return InterruptionRecordRepositoryMapper.toDomainEntity(result);
	}

	public async deleteByRecognitionIds(interruptionRecognitionIds: string[]): Promise<number> {
		if (!interruptionRecognitionIds.length) return 0;
		return this.recordModel.query().delete().whereIn("interruption_recognition_id", interruptionRecognitionIds);
	}
}
