export type CategoryId =
  | "steak"
  | "hotpot"
  | "bbq"
  | "teppan"
  | "japanese"
  | "chinese";
export interface Category {
  id: CategoryId;
  name: string;
  english: string;
  color: string;
  description: string;
}
export interface Source {
  url: string;
  title: string;
  checkedAt: string;
  method: "official-index" | "official-site" | "manual";
  status: "verified" | "needs-review";
}
export interface Brand {
  id: string;
  name: string;
  english: string;
  category: CategoryId;
  founded: number;
  tagline: string;
  description: string;
  dishes: string[];
  color: string;
  official: string;
  menu?: string;
  reservation?: string;
  sources: Source[];
  status: "listed-active";
}
export interface Relationship {
  id: string;
  from: string;
  to: string;
  kind: "group" | "category";
  label: string;
  source: string;
}
export interface Filters {
  search: string;
  categories: CategoryId[];
  year: number;
}
