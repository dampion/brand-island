# 逆向研究與內容依據

研究日期：2026-10-26。此專案依 REA「觀察 → 證據 → 推論 → 重建 → 驗證」的方法研究公開網站；沒有安裝 REA MCP，也未宣稱執行 REA 工具。使用 HTTP 讀取、公開模組檢視及靜態分析。參考程式碼只存於忽略的 `research/reference/`，產品程式碼為獨立實作。

## 已確認的原站機制

| 公開證據                                                                             | 結論                          | 本專案對應                                 |
| ------------------------------------------------------------------------------------ | ----------------------------- | ------------------------------------------ |
| HTML 的 import map 對應 `three` 與 `three/addons/`                                   | 原生 ES modules 載入 Three.js | Vite / TypeScript / Three.js               |
| `app.js` 匯入 `OrbitControls`、`CSS2DRenderer`、`CSS2DObject`                        | 軌道鏡頭與 DOM 名牌           | OrbitControls、可操作品牌名牌              |
| `app.js` 匯入 `world.js`、`scene-models.js`、`kit.js`、`environment.js`、`people.js` | 世界、建築、環境、人物分開    | 場景與餐廳建築生成、環境與人物更新         |
| `app.js` 載入 `policies.json`、建立 Raycaster                                        | 資料驅動場景與射線點選        | 品牌 JSON 與島嶼 ID 點選                   |
| `world.js` 的 `buildIslands`、六角頂點與配置函式                                     | 六角島嶼與鄰接拓樸            | 原創六角座標、相鄰橋梁                     |
| HTML 的搜尋清單、品牌式詳情卡、日夜／時間軸與手機抽屜                                | 地圖與文字介面並存            | 料理搜尋、品牌卡、成立年份與手機面板       |
| `app.js` 限制 pixel ratio、reduced motion、label collision                           | 有裝置品質與動態偏好處理      | 限制 DPR、減少動態、名牌避讓、隱藏分頁暫停 |

證據網址與 SHA-256 摘要見 `reference-evidence.json`。可執行 `npm run research` 重新讀取或分析本機參考快取；原站檔名與版本可能改變，需要先查看最新 HTML 更新網址。

## 原站與王品版的語意對應

- 政策主題島 → 每品牌一島；中央為王品集團。
- 政策建築 → 依料理特色設計的原創餐廳、造型道具與微縮庭園，不對應真實門市。
- HEART 分類 → 料理類別；料理類別是編輯分組。
- 任期時間軸 → 集團頁列示的品牌在台成立年份。
- 政策協作 → 官方品牌歸屬、同料理分類。只根據可核實的資料連線。
- 市民與城市日誌 → 明確標示為演示的旅人與島嶼小日誌。

## 資料範圍與核對

`brand-audit.json` 列出 20 個納入品牌、排除理由及資料限制。主清單來自[王品集團品牌版圖](https://www.wowprime.com/zh-tw/business/strategy)。18 個品牌官網與觀察到的菜單／訂位入口見 `official-link-audit.json`；入口是官網中的實際超連結，未測試提交訂位或付款。

品牌介紹與部分標語為編輯摘要；代表餐點與成立年份依官方品牌資料。品牌頁的成立年份屬台灣品牌介紹口徑，不解讀為全球創立年份。莆田等在台經營品牌亦納入，未將其描述成王品原創品牌。

集團版圖頁可透過網頁讀取取得內容，但本機直接 HTTP 抓取被回傳拒絕頁。保留人工核對的正式清單；採集工具遇此情況會產出明確失敗，並保持正式資料不變。社群品牌不使用猜測的訂位網址。

## 尚未完成的驗證

此執行環境禁止綁定本機 TCP 連接埠（`listen EPERM`），Chrome 在啟動時收到 SIGABRT，因此未取得實際桌機／手機截圖、觸控驗證或影格率數字，也未完成參考站的視覺比對。Playwright 情境已提供，透過 request interception 直接讀取正式建置，不需要啟動伺服器；仍需可啟動的 Chrome。

原站畫面、光影與操作節奏屬待瀏覽器驗收項目，不把靜態程式相似當成已驗證的視覺一致。

參考：[HEART 政策島](https://puma.taipei/heart-island)、[REA](https://github.com/morluto/rea)、[REA 網站觀察說明](https://github.com/morluto/rea/blob/main/docs/browser-observation.md)。
