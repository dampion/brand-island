import { load } from "cheerio";
import { createHash } from "node:crypto";
export function inspectPage(html, base) {
  const $ = load(html);
  $("script,style,noscript").remove();
  const title = $("title").text().trim();
  const text = $("body").text().replace(/\s+/g, " ").trim();
  if (
    /request rejected|access denied|just a moment|attention required|forbidden/i.test(
      title,
    ) ||
    text.length < 40
  )
    throw new Error("來源回傳防爬／空白頁，不能當作品牌內容");
  const links = [];
  $("a[href]").each((_, a) => {
    const raw = $(a).attr("href")?.trim();
    if (!raw || /^(#|javascript:|mailto:|tel:)/i.test(raw)) return;
    let url;
    try {
      url = new URL(raw, base);
    } catch {
      return;
    }
    if (!["http:", "https:"].includes(url.protocol)) return;
    const label = [
      $(a).text(),
      $(a).attr("aria-label"),
      $(a).attr("title"),
      $(a).find("img").attr("alt"),
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (!links.some((l) => l.url === url.href))
      links.push({ url: url.href, label: label.slice(0, 120) });
  });
  const menu = links.find(
    (l) =>
      /菜單|美饌|餐點|食好料|menu|嚐美食/i.test(
        l.label + " " + new URL(l.url).pathname,
      ) && !/(news|blog|activity)/i.test(new URL(l.url).pathname),
  );
  const reservation = links.find(
    (l) =>
      /預約|訂位|reserve|booking/i.test(l.label + " " + l.url) &&
      !/(togo|takeout|takeaway|\/order\/|autoreserve|news|blog|activity)/i.test(
        l.url,
      ),
  );
  return {
    title,
    textDigest: createHash("sha256").update(text).digest("hex"),
    excerpt: text.slice(0, 500),
    links,
    menu: menu?.url,
    reservation: reservation?.url,
  };
}
export function mergePages(pages) {
  return {
    title: pages[0].title,
    textDigest: pages.map((p) => p.textDigest).join(":"),
    menu: pages.find((p) => p.menu)?.menu,
    reservation: pages.find((p) => p.reservation)?.reservation,
    links: pages.flatMap((p) => p.links),
  };
}
export function diffBrand(current, candidate) {
  const changes = [];
  for (const field of ["menu", "reservation"])
    if (candidate[field] && candidate[field] !== current[field])
      changes.push({
        field,
        before: current[field] || null,
        after: candidate[field],
      });
  return changes;
}
export function safeReview(current, candidate) {
  if (current.id !== candidate.id || candidate.status !== "ok")
    throw Error("只能核准同品牌且成功採集的候選資料");
  const next = structuredClone(current);
  for (const field of ["menu", "reservation"])
    if (candidate[field]) {
      const u = new URL(candidate[field]);
      if (u.protocol !== "https:") throw Error("正式入口必須使用 HTTPS");
      next[field] = u.href;
    }
  const source = {
    url: current.official,
    title: candidate.title,
    checkedAt: candidate.checkedAt,
    method: "official-site",
    status: "verified",
  };
  next.sources = [
    ...current.sources.filter((s) => s.url !== source.url),
    source,
  ];
  return next;
}
