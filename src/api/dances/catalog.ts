import http from '../http';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type CatalogSort = 'popular' | 'newest' | 'easy' | 'medium' | 'hard';

export interface DanceItem {
	id: string;
	url: string;
	title?: string;
	difficulty?: Difficulty;
	difficulty_by_users?: boolean;
	attempt_count?: number;
	avg_score?: number;
	view_count?: number;
	like_count?: number;
	duration_sec?: number;
	created_at?: string;
}

export interface CatalogPagination {
	page: number;
	limit: number;
	total: number;
	has_more: boolean;
}

export interface DanceCatalogResponse {
	count: number;
	dances: DanceItem[];
	pagination: CatalogPagination;
}

export const getDancesCatalog = async (params?: {
	search?: string;
	sort?: CatalogSort;
	page?: number;
	limit?: number;
	signal?: AbortSignal;
}): Promise<DanceCatalogResponse> => {
	const { signal, ...queryParams } = params ?? {};
	const response = await http.get<DanceCatalogResponse>('/dances', {
		params: queryParams,
		signal,
	});

	return response.data;
};
