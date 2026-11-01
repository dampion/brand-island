import data from "./data/brands.json" with { type: "json" };
import type { Brand, Category, Filters, Relationship } from "./types.ts";
export const brands = data as Brand[];
export const GROUP_SOURCE = "https://www.wowprime.com/zh-tw/business/strategy";
export const categories: Category[] = [
  {
    id: "steak",
    name: "歐美牛排",
    english: "STEAK",
    color: "#ad4e43",
    description: "為重要時刻，留一席好滋味",
  },
  {
    id: "hotpot",
    name: "暖心鍋物",
    english: "HOTPOT",
    color: "#67877c",
    description: "一鍋熱湯，聚起熟悉的暖意",
  },
  {
    id: "bbq",
    name: "燒肉派對",
    english: "BBQ",
    color: "#b77c51",
    description: "把日子烤得熱熱鬧鬧",
  },
  {
    id: "teppan",
    name: "鐵板饗宴",
    english: "TEPPANYAKI",
    color: "#7f7394",
    description: "坐在板前，看美味發生",
  },
  {
    id: "japanese",
    name: "日式風味",
    english: "JAPANESE",
    color: "#b49a60",
    description: "細細品味，日常裡的講究",
  },
  {
    id: "chinese",
    name: "中台好菜",
    english: "CHINESE",
    color: "#6f919c",
    description: "一桌好菜，就是相聚的理由",
  },
];
export function filterBrands(items: Brand[], filters: Filters): Brand[] {
  const q = filters.search.trim().normalize("NFKC").toLocaleLowerCase();
  return items.filter(
    (b) =>
      (!filters.categories.length || filters.categories.includes(b.category)) &&
      b.founded <= filters.year &&
      (!q ||
        [
          b.name,
          b.english,
          b.tagline,
          b.description,
          ...b.dishes,
          categories.find((c) => c.id === b.category)?.name,
        ]
          .join(" ")
          .normalize("NFKC")
          .toLocaleLowerCase()
          .includes(q)),
  );
}
export const relationships: Relationship[] = brands.flatMap((b) => [
  {
    id: `group-${b.id}`,
    from: "wowprime",
    to: b.id,
    kind: "group" as const,
    label: "王品集團台灣品牌",
    source: GROUP_SOURCE,
  },
  ...brands
    .filter((other) => other.category === b.category && other.id > b.id)
    .map((other) => ({
      id: `category-${b.id}-${other.id}`,
      from: b.id,
      to: other.id,
      kind: "category" as const,
      label: `同屬${categories.find((c) => c.id === b.category)!.name}分類（編輯分組）`,
      source: GROUP_SOURCE,
    })),
]);
export const escapeHtml = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
