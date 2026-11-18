export interface Reel {
  page_name: string;
  page_url: string;
  reel_id: string;
  reel_url: string;
  caption: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  published_at: string | null;
  collected_at: string;
  source: string;
}

export type SortKey = 'views' | 'likes' | 'comments' | 'shares' | 'newest' | 'oldest';
export type DateRange = 'all' | '7' | '30' | '90' | 'custom';

export interface Filters {
  query: string;
  pageKey: string;
  source: string;
  minViews: number | null;
  sort: SortKey;
  sortWithinTop?: SortKey | '';
  sortTieBreaker?: SortKey | '';
  range: DateRange;
  from: string;
  to: string;
  top: number;
  now?: Date;
}
