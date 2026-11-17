// node tools/test_engine.mjs —— 引擎（data.js）、zip、AI 回傳清理測試
import {createRequire} from 'module';
const require = createRequire(import.meta.url);
const P = require('../data.js');
const Z = require('../zip.js');
let n = 0, bad = 0;
function ok(c, msg){ n++; if(!c){ bad++; console.log('✗ ' + msg); } }
function eq(a, b, msg){ ok(JSON.stringify(a) === JSON.stringify(b), msg + '：得到 ' + JSON.stringify(a) + '，應為 ' + JSON.stringify(b)); }
const M = (t, s) => Array.from(t).length * s; // 假的量字：一個字＝字級寬

// 日期
eq(P.parseDate('2026/12/5'), '2026-12-05', '西元斜線');
eq(P.parseDate('115/12/05'), '2026-12-05', '民國');
eq(P.parseDate('1151205'), '2026-12-05', '民國七碼');
eq(P.parseDate('2026-02-30'), '', '不存在的日期');
eq(P.md('2026-12-05'), '12/5（六）', '月日星期');
eq(P.dateLine({dateStart:'2026-12-05', dateEnd:'2027-01-09', weekly:'每週六'}), '2026/12/5（六）～2027/1/9（六）・每週六', '跨年寫年份');
eq(P.dateLine({dateStart:'2026-12-05', dateEnd:'2026-12-26'}), '2026/12/5（六）～12/26（六）', '同年只寫一次');
eq(P.dateLine({dateStart:'2026-12-05', dateEnd:'2026-12-05'}), '2026/12/5（六）', '同一天');
eq(P.dateLine({}), '', '沒日期');

// 費用
eq(P.money('8000'), '8,000 元', '千分位');
eq(P.money('８０００'), '8,000 元', '全形數字');
eq(P.feeText({fee:'免費'}), '免費', '免費');
eq(P.feeText({fee:'0'}), '免費', '0 元＝免費');
eq(P.feeText({fee:'8000', feeAfter:'1600', feeNote:'結訓補助 80%'}), '8,000 元（結訓補助 80%，自付 1,600 元）', '補助');
eq(P.feeText({fee:'990', feeAfter:'790', feeNote:'早鳥價 12/10 前'}), '790 元（早鳥價 12/10 前，原價 990 元）', '早鳥');
eq(P.feeText({fee:'1200', feeNote:'含材料'}), '1,200 元（含材料）', '附註');
eq(P.feeText({}), '', '沒費用');
eq(P.timeLine({time:'09:00–16:00', hours:'36'}), '09:00–16:00・共 36 小時', '時間＋時數');

// 內容整理
eq(P.points({points:'- 第一\n2. 第二\n\n✔ 第三\n四\n五\n六'}), ['第一', '第二', '第三', '四', '五'], '亮點去符號、最多 5 條');
eq(P.points({points:'a\nb\nc\nd'}, 3).length, 3, '方形只取 3 條');
eq(P.infoRows({dateStart:'2026-12-05', place:'線上', online:true, seats:'30', deadline:'2026-11-28'}).map((r) => r[0]), ['日期', '線上', '名額', '截止'], '資訊列順序與線上標籤');
eq(P.contactLines({tel:'02', web:'https://a.example'}), ['電話 02', 'a.example'], '聯絡資訊去 https');

// 斷行
const w1 = P.wrap('這是一個測試，看看標點會不會放在行首。', 9, 1, M);
ok(w1.every((l) => '，。'.indexOf(l[0]) < 0), '標點不放行首 ' + JSON.stringify(w1));
const w2 = P.wrap('看（括號）', 2, 1, M);
ok(w2.every((l) => l.slice(-1) !== '（'), '左括號不放行尾 ' + JSON.stringify(w2));
eq(P.wrap('AI Office', 20, 1, M), ['AI Office'], '英文一行');
ok(P.wrap('Supercalifragilistic', 5, 1, M).every((l) => l.length <= 5), '超長英文字逐字切');
eq(P.wrap('一\n二', 10, 1, M), ['一', '二'], '換行');
const f1 = P.fitText('一二三四五六七八九十', 100, 30, {max:40, min:5, lh:1, measure:M});
ok(!f1.over && f1.lines.length * f1.size <= 30 && f1.lines.every((l) => M(l, f1.size) <= 100), '自動縮字放得下 ' + f1.size);
const f2 = P.fitText('一二三四五六七八九十'.repeat(20), 50, 10, {max:40, min:5, lh:1, measure:M});
ok(f2.over && f2.size === 5, '放不下時標 over');
const f3 = P.fitList(['一二三', '四五六七八九十'], 40, 100, {max:30, min:4, indent:1, measure:M});
ok(!f3.over && f3.height <= 100, '清單一起縮');

// 版面：所有範例 × 版型 × 尺寸，區塊在畫布內、不重疊、QR 夠大
let combos = 0;
P.EXAMPLES.forEach((ex) => P.STYLE_ORDER.forEach((st) => P.SIZE_ORDER.forEach((sz) => {
  combos++;
  const L = P.layout(st, sz, ex.st), b = L.blocks, tag = ex.id + '/' + st + '/' + sz;
  ok(L.W === P.SIZES[sz].w && L.H === P.SIZES[sz].h, tag + ' 尺寸');
  b.forEach((x) => ok(x.x >= 0 && x.y >= 0 && x.x + x.w <= L.W + 1 && x.y + x.h <= L.H + 1 && x.h > 0 && x.w > 0, tag + ' ' + x.t + ' 在畫布內'));
  for(let i = 0; i < b.length; i++) for(let j = i + 1; j < b.length; j++) ok(!P.overlap(b[i], b[j]), tag + ' ' + b[i].t + '／' + b[j].t + ' 不重疊');
  const q = b.filter((x) => x.qr);
  ok(q.length === 1, tag + ' 有一個 QR');
  q.forEach((x) => { ok(x.qr.s >= P.qrMin(sz), tag + ' QR 大小 ' + x.qr.s); ok(x.qr.x >= x.x - .5 && x.qr.x + x.qr.s <= x.x + x.w + .5 && x.qr.y >= x.y - .5 && x.qr.y + x.qr.s <= x.y + x.h + .5, tag + ' QR 在自己的框內'); });
  ok(b.some((x) => x.t === 'title'), tag + ' 有標題');
  if(sz === 'story') ok(b.every((x) => x.y >= L.H * .08 && x.y + x.h <= L.H * .91), tag + ' 限動安全區');
  if(sz !== 'a4') ok(!b.some((x) => x.t === 'outline'), tag + ' 只有 A4 印大綱');
})));
ok(combos === 144, '144 種組合');
eq(P.layout('subsidy', 'a4', P.EXAMPLES[0].st).blocks.filter((b) => b.t === 'fee').length, 1, '補助版型有費用大字');
eq(P.layout('subsidy', 'a4', P.EXAMPLES[1].st).blocks.filter((b) => b.t === 'fee').length, 0, '免費課程不放費用大字');
eq(P.layout('speaker', 'a4', P.EXAMPLES[1].st).blocks.filter((b) => b.t === 'photo').length, 1, '講師版型放大頭照');
const noUrl = P.clone(P.EXAMPLES[0].st); noUrl.course.url = '';
P.SIZE_ORDER.forEach((sz) => ok(!P.layout('biz', sz, noUrl).blocks.some((b) => b.qr), sz + ' 沒網址就沒有 QR'));
const empty = P.blank();
P.STYLE_ORDER.forEach((st) => P.SIZE_ORDER.forEach((sz) => ok(P.layout(st, sz, empty).blocks.length >= 2, '空白資料也排得出來 ' + st + '/' + sz)));
const pop = P.layout('pop', 'a4', P.EXAMPLES[2].st), info = pop.blocks.find((b) => b.t === 'info');
ok(info.y > pop.hero.h + pop.H * .025, '活力色塊斜邊不壓到資訊列');
const lst = P.layout('list', 'fb', P.EXAMPLES[0].st);
ok(lst.blocks.filter((b) => b.t === 'info')[0].on, '橫式清單資訊在深色塊上標 on');

// 配色
ok(P.lum(P.palette('navy', '#ffff66').c1) < P.lum('#ffff66'), '太淺的自訂色會加深');
ok((1.05) / (P.lum(P.palette('navy', '#ffee00').c1) + .05) >= 4.5, '加深後白字對比 ≥ 4.5');
eq(P.palette('navy', 'abc').c1, P.PALETTES.navy.c1, '不合法顏色不套用');

// 文案
const tt = P.suggestTitles({title:'AI 辦公室應用實務班', hours:'36'});
ok(tt[0] === '36 小時學會AI 辦公室應用' && tt.length >= 4, '標題建議 ' + JSON.stringify(tt));
const post = P.postText(P.EXAMPLES[0].st);
ok(post.indexOf('https://example.com/signup/ai-office') > 0 && post.indexOf('補助資格與金額依計畫規定') > 0 && post.indexOf('#') > 0, '貼文文案含連結、補助註記、hashtag');
ok(P.postText(P.EXAMPLES[1].st).indexOf('補助資格') < 0, '沒補助不加註記');

// 分享連結
const st0 = P.clone(P.EXAMPLES[0].st); st0.unit.logo = 'data:image/png;base64,AAAA'; st0.course.spkPhoto = 'data:x';
const enc = P.encodeShare(st0);
ok(/^[A-Za-z0-9_-]+$/.test(enc), '分享碼是網址安全字元');
ok(enc.indexOf('AAAA') < 0, '不含圖片');
const dec = P.decodeShare(enc);
eq(dec.course.title, st0.course.title, '還原標題');
eq(dec.course.points, st0.course.points, '還原亮點（含換行）');
eq(dec.look.style, 'subsidy', '還原版型');
eq(dec.size, 'a4', '還原尺寸');
eq(dec.unit.logo, '', '不帶 Logo');
eq(P.decodeShare('亂碼!!'), null, '壞掉的分享碼');

// AI 回傳清理
const ai = P.sanitizeAi({title:'**' + '超'.repeat(40) + '**', points:['- 一', '', '二', '三', '四', '五', '六'], hashtags:['#AI', '課程'], who:123});
ok(ai.title.length <= 26 && ai.title.indexOf('*') < 0, '標題截斷去星號');
eq(ai.points, ['一', '二', '三', '四', '五'], '亮點最多 5 條');
eq(ai.hashtags, ['#AI', '#課程'], 'hashtag 補 #');
eq(P.sanitizeAi(null).points, [], '空回傳');

// zip
eq(Z.crc32(new TextEncoder().encode('hello')).toString(16), '3610a686', 'CRC32');

// 範例完整
P.EXAMPLES.forEach((e) => { ok(e.st.course.title && e.st.course.url && e.st.unit.name && P.STYLES[e.st.look.style] && P.SIZES[e.st.size], '範例 ' + e.id + ' 欄位完整'); ok(/example/.test(e.st.course.url), '範例 ' + e.id + ' 用虛構網址'); });

console.log((bad ? '✗ ' : '✓ ') + (n - bad) + '/' + n + ' 項通過');
process.exit(bad ? 1 : 0);
