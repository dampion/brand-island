import fs from "node:fs/promises";
import { createHash } from "node:crypto";
const urls = {
  "heart-island.html": "https://puma.taipei/heart-island",
  "app.js": "https://puma.taipei/heart-island-assets/app.js?v=20261025-3",
  "world.js": "https://puma.taipei/heart-island-assets/world.js?v=20261023-1",
};
await fs.mkdir("research/reference", { recursive: true });
const results = [];
for (const [file, url] of Object.entries(urls)) {
  try {
    let content;
    try {
      content = await fs.readFile("research/reference/" + file, "utf8");
    } catch {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw Error("HTTP " + response.status);
      content = await response.text();
      await fs.writeFile("research/reference/" + file, content);
    }
    results.push({
      file,
      url,
      sha256: createHash("sha256").update(content).digest("hex"),
      bytes: Buffer.byteLength(content),
      markers: [
        "OrbitControls",
        "CSS2DRenderer",
        "PerspectiveCamera",
        "Raycaster",
        "buildIslands",
        "createPeople",
        "policies.json",
      ].filter((s) => content.includes(s)),
    });
  } catch (e) {
    results.push({ file, url, error: e.message });
  }
}
await fs.writeFile(
  "research/reference-evidence.json",
  JSON.stringify({ capturedAt: new Date().toISOString(), results }, null, 2) +
    "\n",
);
console.log(
  "研究證據已輸出 research/reference-evidence.json；原始參考碼只存忽略的 research/reference，不納入網站。",
);
