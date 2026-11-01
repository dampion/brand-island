# 王品品牌島

以王品集團為中心的 3D 品牌探索網站。收錄集團台灣品牌版圖的 20 個餐廳品牌，每品牌一島，提供代表料理、官網與可核實的菜單／訂位入口。非官方展示，無後端、帳號、訂位交易或即時營運資料。

## 本機啟動

需要 Node.js **24.22.1 或以上**與 npm。專案含 `.node-version`；若使用 fnm，可先執行 `fnm use`。

```sh
npm ci
npm run dev
```

開啟終端顯示的 `http://127.0.0.1:5173/`。不要直接以 `file://` 開啟 HTML。此電腦現有 Node 位於 `~/.local/share/fnm/node-versions/v24.22.1/installation/bin`；若 shell 尚未啟用 fnm，可先將該目錄加入 PATH。

```sh
npm run build
npm run preview
```

正式輸出為 `dist/`，可由一般靜態網站主機提供。本次未部署、未建立 Sites 託管專案。

## 操作

- 拖曳旋轉，滾動／雙指縮放；點島嶼或名牌看品牌卡。
- 品牌清單支援名稱、代表料理與關鍵字搜尋；按 `/` 開啟搜尋。
- 料理按鈕可複選；品牌沿革依「成立年份上限」過濾，搜尋與料理篩選會一併生效。
- 切換品牌關係、鳥瞰、名牌、暫停與日夜；全景可清除篩選並復位鏡頭。
- 「?」開啟指南，可逐站探索六種料理；Esc 關閉品牌卡或導覽。
- 直接連結如 `/?brand=wangsteak`。WebGL 不可用時仍可使用完整清單與品牌卡。
- 人物、橋梁與日誌是場景演示；日夜不是門市營業時間。減少動態偏好會預設暫停人物與環境動畫。
- 每個品牌屋頂設有三道招牌精選看板（餐點名稱與原創料理小圖示），與品牌卡共用已核對的資料；是編輯選擇，非銷量排名。來源見 `research/signature-dish-audit.json`，實際供應以官方最新資訊為準。
- 路燈依場景時鐘在 **17:30（含）至翌日 05:30（不含）** 亮起，提供暖色燈罩、地面光暈與附近建築照明；菜單看板與窗戶同步轉為暖色夜景。
- 島嶼外圍有臨水碼頭、停泊船、燈塔、野餐小島與沿岸植栽，外海船隻緩慢航行；裝飾位置會避開餐廳島嶼。
- 全版海面採低對比的連續水紋，10 朵雲持續漂移；最多 84 位旅人沿島邊步道及相鄰橋梁往返。料理篩選會依可見島嶼重新分配路線與人數，暫停時同步停止海面、雲與人物。

## 內容維護

正式資料位於 `src/data/brands.json`；型別在 `src/types.ts`，分類與篩選邏輯在 `src/domain.ts`。品牌 ID 必須穩定；新增品牌後場景會自動配置。場景目前為 20 品牌設計，超過 36 品牌前須擴大六角配置。

```sh
npm run collect -- --refresh   # 重新抓取官方來源，產生候選結果
npm run collect -- --cached    # 只分析既有本機快取
```

採集採雙工作併發及 20 秒逾時；只讀取公開頁面與已觀察到的同站導覽片段，不執行遠端腳本。原始快取在 `research/cache/`，候選 JSON 與差異報告在 `research/candidates/`，皆預設不納入版本控制。預設採集會優先使用快取，更新請加 `--refresh`。

先人工核對 `research/candidates/report.md` 與實際來源，再核准單一品牌入口：

```sh
npm run review -- --approve=wangsteak
npm test
npm run build
```

核准只更新成功候選中的菜單／訂位與來源紀錄，不自動刪除既有入口。新增、退場、品牌簡介、代表餐點與成立年份須人工編輯；索引候選及來源文字摘要／指紋協助檢查，不直接發布。採集失敗會保留正式資料，報告原因並回傳退出碼 **2**。集團索引本次直接抓取遭到防爬拒絕；18 個品牌官網成功、2 個社群品牌需人工核對，詳見研究紀錄。

## 驗證

```sh
npm test             # 資料、篩選、來源、採集失敗保護及核准流程
npm run build        # TypeScript 檢查與正式建置
npm run test:e2e      # 桌機、手機、WebGL 備援、導覽與互動
```

E2E 預設使用已安裝的 **Google Chrome**，透過 Playwright 攔截請求讀取 `dist/`，不需要啟動本機伺服器。先執行 build；截圖和 trace 寫入 `test-results/`。若使用 Playwright Chromium，先安裝該瀏覽器，並設定 `PLAYWRIGHT_BROWSER_CHANNEL=chromium`。

**本次結果：** 20 項資料／採集／步行路線／夜間照明測試通過，TypeScript 與正式建置通過。執行環境限制伺服器綁定（EPERM）與 Chrome 啟動（SIGABRT），因此 E2E、實際截圖、效能與視覺比對尚未通過，需於一般本機環境驗收。網頁字型可選擇載入 Google Fonts；無網路時回退至系統字型，品牌資料與場景不依賴外部 API。

## 技術與研究

Vite、TypeScript、Three.js、OrbitControls、CSS2DRenderer；程序化原創餐廳模型與六角群島，獨立的 DOM 資訊介面。原站公開模組的結構研究、證據摘要、納入／排除清單與限制位於 [research/README.md](research/README.md)。

互動參考：[HEART 政策島](https://puma.taipei/heart-island)。研究方法參考：[REA](https://github.com/morluto/rea)。品牌事實來源：[王品集團品牌版圖](https://www.wowprime.com/zh-tw/business/strategy)及各品牌官網。原站參考碼未納入產品，也未複製候選人、政策文字、人物或網站分析追蹤碼。
# brand-island
# brand-island
