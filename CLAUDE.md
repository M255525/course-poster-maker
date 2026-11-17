# course-poster-maker — 課程招生海報產生器

給辦訓單位、講師、社區大學、協會用：填課程資訊 → 自動排出 A4 列印海報與 IG／FB／LINE 社群圖（6 尺寸 × 6 版型 × 6 配色＋自訂色 × 3 字型），報名網址自動變 QR code → 下載 PNG、全部尺寸 ZIP（含貼文文案 .txt）、列印 A4、A6 傳單（一張 A4 印 4 份）、複製貼文文案、分享連結 `#p=`。

2026-11-17 建立。使用者從「新軟體方向」清單挑了這個，規格由 Claude 自行決定；中途要求「加上標準五件套」（當時沒說六件套 → 沒加序號）；**同日稍晚使用者要求加登入序號**（見下方「登入序號閘門」）。**2026-11-17 已上線** <https://m255525.github.io/course-poster-maker/>（使用者同意後 Claude 執行 `gh repo create`；先 push 再開 Pages，`github-pages` 環境仍只允許 main，已補 master 分支許可並 workflow_dispatch 重跑）。線上版 `CPM_BASE=https://m255525.github.io/course-poster-maker/ python tools/e2e_poster.py` 2026-11-17 全過。已加進 AI 工具導航（`class` 類、辦訓補助情境第二站）、程式牆與 github-dashboard 的 `REPO_META`。上線改版要升 `service-worker.js` 的 `CACHE_NAME`。

## 登入序號閘門（2026-11-17，比照訓練證書產生器）
- 序號表：試算表「辦訓相關」（`1oXn9S2SjupP0o9eJrV-4c0f8o_Cs_ejL9CGCIBGT-LE`）分頁 **「課程招生海報產生器」**，表頭「序號／開始日期／結束日期」，選填「人數限制」「目前登入人數」「已登入裝置」。
- **沒有自己的 Apps Script**：直接打訓練證書產生器那支綁定腳本（`政府補助認證產生器/training-certificate-generator/gas/Code.js`，部署 `AKfycbw2qz…kADHeIl`），請求帶 `sheet:'課程招生海報產生器'`（`app.js` 的 `LICENSE_SHEET`；驗證、背景重驗、release 都要帶）。後端本來就支援 `payload.sheet`，沒改後端。**改那支 GAS 時要記得這裡也在用**。
- 前端複製自訓練證書：`#entryGate` 全螢幕擋住（列印時隱藏），開啟 fail-closed，登入後每 20 分鐘背景重驗（連線失敗／server_error 不上鎖）。localStorage `cpmEntrySerial`／`cpmEntryClientId`（刻意不用 `cpm.` 前綴，⚙ 清除全部資料不會登出）；登出在 ⚙「🔑 登入序號」。上方 `#licTop` 顯示到期日（剩 14 天內 `.soon` 變紅）。序號框可按 Enter 送出。
- 免費試用序號 `FREE_SERIAL = 'FLf9M6zAX8pe'`（和訓練證書同一組字串，但這邊查的是本工具分頁那一列：2026-11-17 實測到 2027/5/17、人數上限 10）。停用改成 `''`，試算表那列一起處理。
- 首訪警語改在第一次解鎖後才跳（`gateUnlock`）；分享連結 `#p=` 的人也要登入（閘門下仍會先套用分享內容）。
- ⚠ 純前端閘門，懂 DevTools 的人可移除遮罩，已知取捨。github-dashboard `LICENSED_REPOS`、AI 工具導航第 6 欄已標需序號。

## 檔案
- `data.js`：純函式引擎（node 可 require）。`SIZES`／`STYLES`／`PALETTES`／`FONTS`、`wrap`（CJK 逐字、英文整字、標點不放行首、左括號不放行尾）、`fitText`／`fitList`（從大字往下試到放得進框，放不下標 `over`）、**`layout(style, size, data)` 只算區塊位置**（`stackLayout` 直式／方形、`wideLayout` 橫式）、`infoRows`／`feeText`／`dateLine`、`suggestTitles`、`postText`、`encodeShare`／`decodeShare`（不含圖片）、`sanitizeAi`、4 個虛構範例。
- `render.js`：Canvas 2D 繪圖，預覽、縮圖、PNG、列印共用。**不用 SVG 轉圖**（SVG 當圖片時網頁字型會失效）。放不下的區塊在預覽畫紅色虛線框、下載版不畫，但 `warn` 一樣回報。
- `ai.js`：BYOK 7 家，`callLLM` 等複製自 `政府補助認證產生器/shop-opening-checklist/ai.js`。AI 只寫標題／副標／亮點／對象／hashtag，日期費用補助不讓 AI 改；免金鑰可「複製提示詞」→「貼上 AI 回覆」。金鑰存 `cpm.ai`。
- `zip.js`：store 模式 zip，複製自訓練證書產生器 `io.js`。
- `app.js`：畫面。狀態 `cpm.` 前綴：`state`（含 Logo PNG／講師照 JPG dataURL，縮到 600／700px）、`tpls`（我的範本 20 個，不含講師照）、`open`、`fold`、`ai`、`fs`、`warnSeen`、`marquee`。輸入用 `data-b="course.title"` 路徑綁定。測試掛鉤 `window._cpm`。
- QR：cdnjs `qrcodejs/1.0.0` 動態載入，產 1000px canvas，畫時關平滑。A4 QR ≥ 354px（300dpi 的 30mm）、社群圖 ≥ 220px（`qrMin`）。
- 字型：Google Fonts 的 Noto Sans TC（黑體）、Huninn（粉圓，圓體）、LXGW WenKai TC（楷書，手寫筆記版型預設）；畫之前 `document.fonts.load(字型, 實際文字)` 只載需要的子集，最多等 4 秒。

## 版面規則（改 layout 前先看）
- 直式依序：抬頭（Logo＋單位＋角標）→ 標題（講師主打版型時標題＋大頭照並排）→ 副標 →（補助版型）費用大字 → 資訊列 → 亮點 → 適合對象 → 大綱（**只有 A4**）→ 講師小列 → 底部（聯絡＋QR）。權重相加後縮放，內容少時多出來的空間平均分到間距（上限放大 1.5 倍）。
- 方形：資訊列最多 4 條、亮點最多 3 條、不放對象與講師小列。限時動態上留 8.5%、下留 10% 安全區。
- 橫式 1200×630：左 60% 放抬頭／標題／副標／日期時間地點，右邊放 QR（補助版型加費用、講師版型加大頭照）。
- 深色主色塊（pop／subsidy／list，biz 只有抬頭）上的區塊標 `on`，文字改白色。**pop 的斜邊往左下斜，`stackLayout` 在副標後插一段 `spacer` 給斜邊用**（之前斜邊蓋到資訊列）；list 在深色塊上的條紋要用半透明白，不能用 `pal.soft`。
- 費用大字區塊：寬高比 ≥ 3 時左大字右兩行小字，窄的時候三行由上往下（之前三行重疊）。
- 文字寫到「補助」時自動加註「補助資格與金額依計畫規定」（費用區塊、底部、貼文文案）。
- 自訂主色太淺會自動壓暗到白字對比 ≥ 4.5（`palette()`）。

## 驗證
- **改 data.js 跑 `node tools/test_engine.mjs`**：5205 項，含 4 範例 × 6 版型 × 6 尺寸＝144 組合的區塊不出界、不重疊、QR 大小與位置、限動安全區、只有 A4 印大綱。
- `python tools/e2e_poster.py [輸出資料夾]`（先開 8890；線上版設 `CPM_BASE`）：首訪警語、五件套入口、A4 PNG 2480×3508、**6 尺寸 QR 用 jsQR 掃得到**、範例一 36 組合無爆框、ZIP 7 檔、`page.pdf()` A4 1 頁＋A6 傳單 4 格、爆框提醒、表單綁定、標題建議、範本、新海報、AI 沒金鑰／貼上回覆／套用不動費用、分享連結還原、訓練證書帶入、圖片上傳、⚙ 收合區塊、375px 無橫捲、無 console 錯誤。2026-11-17 全過（43 項）；PDF 與各尺寸成品都轉圖目視過。
- e2e 的序號閘門用 `page.route` 假造授權回應（FLf9M6zAX8pe／GOOD 有效、OLD 過期、FULL 額滿、其他查無），不碰真的試算表；2026-11-17 加閘門後全過（63 項）。
- 實體印表機列印、真手機掃紙本 QR、真實 AI 金鑰呼叫未實測。

## 和其他專案的關係
- 「🎓 從訓練證書產生器帶入」：讀同源 `localStorage['tcg.state']`（單位名稱／電話／Logo、課程名稱／起訖日／時數／地點）。**只有上線到同一個 `m255525.github.io` 才讀得到**，本機不同 port 是不同來源、按鈕會藏起來。
- 本機預覽 port **8890**（`.claude/launch.json` 的 `course-poster-maker`）；程式牆已改列 `REPO_META`（線上版）。visitor-badge `m255525.coursepostermaker`。

## 標準配備
跑馬燈（工作區公告 GAS，滑鼠移入暫停，不可關）、⚙ 常用設定（收合：顯示、🤖 AI 設定、我的範本、清除全部資料、關於本工具）、首訪警語＋頁面入口、`manual.html#creator`（改 `tools/manual_body.html` 後跑 `python tools/build_manual.py`，創作者區塊取自賞鳥地圖 `tools/manual_tpl.html`）、PWA（`tools/make_icons.py`；上線改版升 `service-worker.js` 的 `CACHE_NAME`）、訪客計數器。有登入序號閘門（見上）；無浮水印（海報是使用者自己的招生素材）。
