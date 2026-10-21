import { Inject, Injectable } from "@nestjs/common";
import { RelationExpression } from "objection";
import { InterruptionPost } from "../../entities";
import { DEFAULT_LIMIT, DEFAULT_START, GetOptions } from "../common/pagination";
import { InterruptionPostModel } from "./interruption-post.model";
import { InterruptionPostRepositoryMapper } from "./interruption-post.repository-mapper";

export type InterruptionPostOrderBy = "timestamp" | "created_at" | "type";

export interface InterruptionPostGetOptions extends GetOptions<InterruptionPostOrderBy> {
	type?: string;
}

@Injectable()
export class InterruptionPostRepository {
	constructor(
		@Inject(InterruptionPostModel)
		private readonly postModel: typeof InterruptionPostModel
	) {}

	public async get(
		options: InterruptionPostGetOptions = {},
		fetchRelations?: RelationExpression<InterruptionPostModel>
	): Promise<InterruptionPost[]> {
		const {
			start = DEFAULT_START,
			limit = DEFAULT_LIMIT,
			orderBy = "created_at",
			orderDirection = "desc",
		} = options;

		const query = this.postModel.query();

		if (options.type) query.where("type", options.type);
		if (fetchRelations) query.withGraphFetched(fetchRelations);
		if (orderBy) query.orderBy(orderBy, orderDirection);
		if (start) query.offset(start);
		if (limit) query.limit(limit);

		const result = await query;

		return result.map((row) => InterruptionPostRepositoryMapper.toDomainEntity(row));
	}

	public async getById(id: string): Promise<InterruptionPost | null> {
		const row = await this.postModel.query().findById(id);
		if (!row) return null;

		return InterruptionPostRepositoryMapper.toDomainEntity(row);
	}

	public async getLatestPostId(): Promise<string | null> {
		const row = await this.postModel.query().select("id").orderBy("timestamp", "desc").first();

		return row?.id ?? null;
	}

	public async upsert(post: InterruptionPost): Promise<InterruptionPost> {
		const props = InterruptionPostRepositoryMapper.toRepository(post);

		const result = await this.postModel
			.query()
			.insert({ ...props, updatedAt: new Date() })
			.onConflict("id")
			.merge()
			.returning("*");

		return InterruptionPostRepositoryMapper.toDomainEntity(result);
	}
}
