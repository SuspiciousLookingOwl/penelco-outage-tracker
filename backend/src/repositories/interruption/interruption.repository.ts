import { Inject, Injectable } from "@nestjs/common";
import { Model, RelationExpression } from "objection";
import { Interruption } from "../../entities";
import { DEFAULT_LIMIT, DEFAULT_START, GetOptions } from "../common/pagination";
import { InterruptionModel } from "./interruption.model";
import { InterruptionRepositoryMapper } from "./interruption.repository-mapper";

export type InterruptionOrderBy = "date" | "createdAt" | "area";

export interface InterruptionGetOptions extends GetOptions<InterruptionOrderBy> {
	from?: Date;
	to?: Date;
	dateFrom?: Date;
	dateTo?: Date;
}

@Injectable()
export class InterruptionRepository {
	constructor(
		@Inject(InterruptionModel)
		private readonly interruptionModel: typeof InterruptionModel
	) {}

	public async get(
		options: InterruptionGetOptions = {},
		fetchRelations?: RelationExpression<Model>
	): Promise<Interruption[]> {
		const { start = DEFAULT_START, limit = DEFAULT_LIMIT, orderBy = "date", orderDirection = "desc" } = options;

		const query = this.interruptionModel.query();

		if (options.dateFrom) query.where("date", ">=", options.dateFrom);
		if (options.dateTo) query.where("date", "<=", options.dateTo);
		if (options.from) query.where("created_at", ">=", options.from);
		if (options.to) query.where("created_at", "<=", options.to);
		if (fetchRelations) query.withGraphFetched(fetchRelations);
		if (orderBy) query.orderBy(orderBy, orderDirection);
		if (start) query.offset(start);
		if (limit) query.limit(limit);

		const result = await query;

		return result.map((row) => InterruptionRepositoryMapper.toDomainEntity(row));
	}

	public async upsert(interruption: Interruption): Promise<Interruption> {
		const props = InterruptionRepositoryMapper.toRepository(interruption);

		const result = await this.interruptionModel
			.query()
			.insert({ ...props, updatedAt: new Date() })
			.onConflict("id")
			.merge()
			.returning("*");

		return InterruptionRepositoryMapper.toDomainEntity(result);
	}

	public async findOrphanIdsByPostId(interruptionPostId: string): Promise<string[]> {
		const rows = await this.interruptionModel
			.query()
			.select("interruptions.id")
			.leftJoin("interruption_records", "interruption_records.interruption_id", "interruptions.id")
			.where("interruptions.interruption_post_id", interruptionPostId)
			.whereNull("interruption_records.id");

		return rows.map((row) => row.id);
	}

	public async deleteByIds(ids: string[]): Promise<number> {
		if (!ids.length) return 0;
		return this.interruptionModel.query().delete().whereIn("id", ids);
	}
}
