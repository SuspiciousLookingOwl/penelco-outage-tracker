import { Inject, Injectable } from "@nestjs/common";
import { RelationExpression } from "objection";
import { InterruptionRecognition } from "../../entities";
import { DEFAULT_LIMIT, DEFAULT_START, GetOptions } from "../common/pagination";
import { InterruptionRecognitionModel } from "./interruption-recognition.model";
import { InterruptionRecognitionRepositoryMapper } from "./interruption-recognition.repository-mapper";

export type InterruptionRecognitionOrderBy = "created_at";

export interface InterruptionRecognitionGetOptions extends GetOptions<InterruptionRecognitionOrderBy> {
	interruptionPostId?: string;
	filename?: string | null;
	success?: boolean;
}

@Injectable()
export class InterruptionRecognitionRepository {
	constructor(
		@Inject(InterruptionRecognitionModel)
		private readonly recognitionModel: typeof InterruptionRecognitionModel
	) {}

	public async get(
		options: InterruptionRecognitionGetOptions = {},
		fetchRelations?: RelationExpression<InterruptionRecognitionModel>
	): Promise<InterruptionRecognition[]> {
		const {
			start = DEFAULT_START,
			limit = DEFAULT_LIMIT,
			orderBy = "created_at",
			orderDirection = "desc",
		} = options;

		const query = this.recognitionModel.query();

		if (options.interruptionPostId) query.where("interruption_post_id", options.interruptionPostId);
		if (options.success !== undefined) query.where("success", options.success);
		if (fetchRelations) query.withGraphFetched(fetchRelations);
		if (orderBy) query.orderBy(orderBy, orderDirection);
		if (start) query.offset(start);
		if (limit) query.limit(limit);

		const result = await query;

		return result.map((row) => InterruptionRecognitionRepositoryMapper.toDomainEntity(row));
	}

	public async getById(id: string): Promise<InterruptionRecognition | null> {
		const row = await this.recognitionModel.query().findById(id);
		if (!row) return null;

		return InterruptionRecognitionRepositoryMapper.toDomainEntity(row);
	}

	public async upsert(recognition: InterruptionRecognition): Promise<InterruptionRecognition> {
		const props = InterruptionRecognitionRepositoryMapper.toRepository(recognition);

		const result = await this.recognitionModel
			.query()
			.insert({ ...props, updatedAt: new Date() })
			.onConflict("id")
			.merge()
			.returning("*");

		return InterruptionRecognitionRepositoryMapper.toDomainEntity(result);
	}
}
