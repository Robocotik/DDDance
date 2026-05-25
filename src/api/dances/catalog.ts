import http from '../http';

export type Difficulty = 'easy' | 'medium' | 'hard';
// popular/newest — глобальные сортировки, easy/medium/hard — фильтры по
// уровню (с тай-брейкером по популярности внутри уровня на бэке).
export type CatalogSort =
	| 'popular'
	| 'newest'
	| 'easy'
	| 'medium'
	| 'hard';

export interface DanceItem {
	id: string;
	url: string;
	title?: string;
	difficulty?: Difficulty;
	// true — сложность посчитана по оценкам пользователей, false — задана автором
	difficulty_by_users?: boolean;
	attempt_count?: number;
	avg_score?: number;
	view_count?: number;
	like_count?: number;
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
}): Promise<DanceCatalogResponse> => {
	const response = await http.get<DanceCatalogResponse>('/dances', { params });
	return response.data;
};
