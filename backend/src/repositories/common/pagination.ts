export type OrderDirection = "asc" | "desc";

export interface GetOptions<TOrderBy extends string = string> {
	start?: number;
	limit?: number;
	orderBy?: TOrderBy;
	orderDirection?: OrderDirection;
}

export const DEFAULT_START = 0;
export const DEFAULT_LIMIT = 50;
