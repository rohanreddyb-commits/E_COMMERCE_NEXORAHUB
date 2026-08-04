import { apiClient } from '@/lib/apiClient';
import { MAX_RECENT_SEARCHES, STORAGE_KEYS } from '@/lib/config';
import type {
  AutocompleteItem,
  Paginated,
  ProductSummary,
  SearchHistoryItem,
  TrendingSearch,
} from '@/types/api';

/** /api/v1/customer/search/* — search + autocomplete are public. */
export const searchService = {
  search: (
    params: {
      q: string;
      page?: number;
      limit?: number;
      category?: number;
      brand?: number;
      minPrice?: number;
      maxPrice?: number;
      sort?: string;
      order?: 'ASC' | 'DESC';
    },
    signal?: AbortSignal
  ) => apiClient.get<Paginated<ProductSummary>>('/search', { query: { ...params }, signal }),

  autocomplete: (q: string, signal?: AbortSignal) =>
    apiClient.get<AutocompleteItem[]>('/search/autocomplete', { query: { q }, signal }),

  trending: (signal?: AbortSignal) =>
    apiClient.get<TrendingSearch[]>('/search/trending', { withAuth: false, signal }),

  /** Server-side history — only populated for signed-in customers. */
  history: (signal?: AbortSignal) =>
    apiClient.get<SearchHistoryItem[]>('/search/history', { signal }),

  clearHistory: () => apiClient.delete<null>('/search/history'),
};

/**
 * Local recent searches so guests also get history. Signed-in customers see
 * the server-side list, which the backend records on every /search call.
 */
export const recentSearches = {
  get(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.recentSearches);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  },

  add(term: string): void {
    if (typeof window === 'undefined') return;
    const trimmed = term.trim();
    if (!trimmed) return;
    const next = [trimmed, ...this.get().filter((t) => t.toLowerCase() !== trimmed.toLowerCase())]
      .slice(0, MAX_RECENT_SEARCHES);
    try {
      window.localStorage.setItem(STORAGE_KEYS.recentSearches, JSON.stringify(next));
    } catch {
      /* Non-fatal. */
    }
  },

  clear(): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(STORAGE_KEYS.recentSearches);
    } catch {
      /* Non-fatal. */
    }
  },
};
