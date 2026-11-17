/* 課程招生海報產生器：純函式引擎（不碰 DOM，node 也能 require 測試）
   尺寸、版型、配色、文字斷行與自動縮字、版面配置（各區塊的位置）、日期與費用文字、標題建議、貼文文案、分享連結、AI 回傳清理、範例。
   畫圖在 render.js；這裡只算「放在哪裡、多大」。 */
(function(root){
'use strict';

const clone = (o) => JSON.parse(JSON.stringify(o));
const cut = (s, n) => Array.from(String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')).slice(0, n).join('');
const FW = (s) => String(s == null ? '' : s).replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/　/g, ' ');

/* ---------- 尺寸（像素） ---------- */
const SIZES = {
  a4:   {n:'A4 直式', s:'列印・張貼（300dpi）', w:2480, h:3508, file:'A4'},
  ig45: {n:'IG 貼文 4:5', s:'1080×1350', w:1080, h:1350, file:'IG貼文'},
  ig11: {n:'方形 1:1', s:'IG／FB 貼文 1080×1080', w:1080, h:1080, file:'方形'},
  story:{n:'限時動態', s:'IG／FB 限動 1080×1920', w:1080, h:1920, file:'限時動態'},
  fb:   {n:'橫式封面', s:'FB 貼文／活動封面 1200×630', w:1200, h:630, file:'橫式'},
  line: {n:'LINE 圖片', s:'LINE 官方帳號 1040×1040', w:1040, h:1040, file:'LINE'},
};
const SIZE_ORDER = ['a4', 'ig45', 'ig11', 'story', 'fb', 'line'];
function shapeOf(W, H){ const r = W / H; return r >= 1.4 ? 'wide' : (H / W >= 1.15 ? 'tall' : 'square'); }

/* ---------- 版型 ---------- */
const STYLES = {
  biz:    {n:'簡潔商務', s:'上方色帶・資訊清楚', font:'hei'},
  pop:    {n:'活力色塊', s:'斜切大色塊・圓點', font:'hei'},
  speaker:{n:'講師主打', s:'講師大頭照放大', font:'hei'},
  subsidy:{n:'補助優惠', s:'自付金額大大的', font:'hei'},
  list:   {n:'清單資訊', s:'表格式・放得下大綱', font:'hei'},
  note:   {n:'手寫筆記', s:'筆記紙・紙膠帶・便利貼', font:'kai'},
};
const STYLE_ORDER = ['biz', 'pop', 'speaker', 'subsidy', 'list', 'note'];
const HERO_DARK = {pop:1, subsidy:1, list:1}; // 標題壓在深色主色塊上（白字）

/* ---------- 配色 ---------- */
const PALETTES = {
  navy:  {n:'海軍藍', c1:'#1F3A68', c2:'#F2B134', bg:'#FFFFFF', soft:'#EAF0F8', ink:'#1E2430'},
  orange:{n:'活力橘', c1:'#D9480F', c2:'#1E3A5F', bg:'#FFF8F0', soft:'#FFE6D2', ink:'#2A211B'},
  green: {n:'森林綠', c1:'#2F7A4B', c2:'#E9B949', bg:'#FAF7EF', soft:'#E3F0E6', ink:'#1F2A22'},
  berry: {n:'莓果紅', c1:'#B3245A', c2:'#2CB1BC', bg:'#FFF7FA', soft:'#FBE1EB', ink:'#2A1C22'},
  violet:{n:'葡萄紫', c1:'#5B3FA8', c2:'#FF8A3D', bg:'#FBFAFF', soft:'#ECE6FA', ink:'#221D33'},
  ink:   {n:'墨黑', c1:'#222222', c2:'#E63946', bg:'#FFFFFF', soft:'#F0F0F0', ink:'#111111'},
};
const PAL_ORDER = ['navy', 'orange', 'green', 'berry', 'violet', 'ink'];
function hexRgb(h){ const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if(!m) return null; const n = parseInt(m[1], 16); return [n >> 16, n >> 8 & 255, n & 255]; }
function mix(h, w, t){ const a = hexRgb(h), b = hexRgb(w); if(!a || !b) return h; return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
function lum(h){ const c = hexRgb(h); if(!c) return 1; const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); }
// 自訂主色：太淺的顏色當主色會讓白字看不清楚，壓暗到對比 ≥ 4.5
function palette(key, custom){
  const p = Object.assign({}, PALETTES[key] || PALETTES.navy);
  if(hexRgb(custom)){
    let c = custom.toLowerCase(), i = 0;
    while((1.05) / (lum(c) + .05) < 4.5 && i++ < 20) c = mix(c, '#000000', .12);
    p.c1 = c; p.soft = mix(c, '#ffffff', .88);
  }
  return p;
}

const FONTS = {
  hei:  {n:'黑體', f:'"Noto Sans TC","Microsoft JhengHei","PingFang TC",sans-serif', tw:900, bw:500, load:['900', '700', '500'], fam:'Noto Sans TC'},
  round:{n:'圓體', f:'"Huninn","jf open 粉圓","Microsoft JhengHei",sans-serif', tw:400, bw:400, load:['400'], fam:'Huninn'},
  kai:  {n:'手寫楷書', f:'"LXGW WenKai TC","DFKai-SB","標楷體",serif', tw:700, bw:400, load:['700', '400'], fam:'LXGW WenKai TC'},
};

/* ---------- 日期 ---------- */
// 接受 2026-12-05、2026/12/5、115/12/5、1151205、20261205
function parseDate(v){
  if(v == null) return '';
  let s = FW(v).trim(); if(!s) return '';
  let y, m, d, mm;
  if((mm = s.match(/^(?:民國|中華民國)?\s*(\d{2,4})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})\s*日?/))){ y = +mm[1]; m = +mm[2]; d = +mm[3]; }
  else if((mm = s.match(/^(\d{2,3})(\d{2})(\d{2})$/))){ y = +mm[1]; m = +mm[2]; d = +mm[3]; }
  else if((mm = s.match(/^(\d{4})(\d{2})(\d{2})$/))){ y = +mm[1]; m = +mm[2]; d = +mm[3]; }
  else return '';
  if(y < 1000) y += 1911;
  const t = new Date(Date.UTC(y, m - 1, d));
  if(t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d || y < 1900 || y > 2200) return '';
  return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}
const WK = '日一二三四五六';
function md(iso, withYear){ const s = parseDate(iso); if(!s) return ''; const [y, m, d] = s.split('-').map(Number); const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); return (withYear ? y + '/' : '') + m + '/' + d + '（' + WK[w] + '）'; }
// 2026/12/5（六）～2027/1/9（六）・每週六；同一年只寫一次年份
function dateLine(c){
  const a = parseDate(c.dateStart), b = parseDate(c.dateEnd);
  let s = '';
  if(a){ s = md(a, true); if(b && b !== a) s += '～' + md(b, b.slice(0, 4) !== a.slice(0, 4)); }
  const wk = cut(c.weekly, 20).trim();
  return [s, wk].filter(Boolean).join('・');
}

/* ---------- 費用 ---------- */
function money(v){
  const s = FW(v).trim(); if(!s) return '';
  if(/^\d[\d,]*$/.test(s)) return Number(s.replace(/,/g, '')).toLocaleString('en-US') + ' 元';
  return cut(s, 20);
}
function isFree(v){ const s = FW(v).trim(); return s === '0' || s === '免費' || /^免費/.test(s); }
function feeText(c){
  if(isFree(c.fee)) return '免費' + (c.feeNote ? '（' + cut(c.feeNote, 20) + '）' : '');
  const f = money(c.fee), a = money(c.feeAfter);
  if(!f && !a) return '';
  const n = cut(c.feeNote, 20);
  if(f && a) return /補助/.test(n) ? f + '（' + n + '，自付 ' + a + '）' : a + '（' + (n || '優惠價') + '，原價 ' + f + '）';
  return (f || a) + (c.feeNote ? '（' + cut(c.feeNote, 20) + '）' : '');
}

/* ---------- 內容整理 ---------- */
function lines(s, n, len){ return String(s == null ? '' : s).split(/\r?\n/).map((x) => cut(x.replace(/^\s*(?:[-*•・●○◆▶✓✔]|\d+[.、)）])\s*/, '').trim(), len || 60)).filter(Boolean).slice(0, n || 99); }
function points(c, n){ return lines(c.points, Math.min(5, n || 5), 40); }
function outline(c){ return lines(c.outline, 12, 50); }
function timeLine(c){ const t = cut(c.time, 30).trim(), h = FW(c.hours).trim(); return [t, h ? '共 ' + h + (/^\d+(\.\d+)?$/.test(h) ? ' 小時' : '') : ''].filter(Boolean).join('・'); }
// 資訊列：[標籤, 文字]
function infoRows(c, max){
  const r = [];
  const dl = dateLine(c); if(dl) r.push(['日期', dl]);
  const tl = timeLine(c); if(tl) r.push(['時間', tl]);
  if(c.place) r.push([c.online ? '線上' : '地點', cut(c.place, 60)]);
  const f = feeText(c); if(f) r.push(['費用', f]);
  if(FW(c.seats).trim()) r.push(['名額', cut(FW(c.seats).trim(), 20) + (/^\d+$/.test(FW(c.seats).trim()) ? ' 名' : '')]);
  if(parseDate(c.deadline)) r.push(['截止', '報名至 ' + md(c.deadline)]);
  return r.slice(0, max || 6);
}
function contactLines(u){
  const r = [];
  if(u.tel) r.push('電話 ' + cut(u.tel, 30));
  if(u.line) r.push('LINE ' + cut(u.line, 30));
  if(u.email) r.push(cut(u.email, 50));
  if(u.web) r.push(cut(u.web, 60).replace(/^https?:\/\//, ''));
  return r;
}

/* ---------- 文字斷行與自動縮字（measure(text, size) 由呼叫端提供） ---------- */
const NO_START = '，。、；：！？）」』】〕》〉…‥・,.;:!?)]}%';
const NO_END = '（「『【〔《〈([{';
function tokens(s){ return String(s).match(/[A-Za-z0-9@#%&+\-_.\/:'’,]+|\s+|[\s\S]/gu) || []; }
function wrap(text, maxW, size, measure){
  const out = [];
  String(text == null ? '' : text).split('\n').forEach((para) => {
    let line = '';
    tokens(para).forEach((t) => {
      if(/^\s+$/.test(t) && !line) return;
      const tryL = line + t;
      if(measure(tryL, size) <= maxW || !line){
        if(measure(t, size) > maxW && !line){ // 太長的英文字逐字切
          Array.from(t).forEach((ch) => { if(line && measure(line + ch, size) > maxW){ out.push(line); line = ''; } line += ch; });
        } else line = tryL;
        return;
      }
      if(NO_START.indexOf(t) >= 0){ line += t; return; } // 標點不放行首
      let carry = '';
      if(line.length > 1 && NO_END.indexOf(line.slice(-1)) >= 0){ carry = line.slice(-1); line = line.slice(0, -1); } // 左括號不放行尾
      out.push(line.replace(/\s+$/, ''));
      line = (carry + t).replace(/^\s+/, '');
      if(measure(line, size) > maxW){ let l2 = ''; Array.from(line).forEach((ch) => { if(l2 && measure(l2 + ch, size) > maxW){ out.push(l2); l2 = ''; } l2 += ch; }); line = l2; }
    });
    out.push(line.replace(/\s+$/, ''));
  });
  return out;
}
// 從 max 往下試，直到放得進 w×h；放不下時回傳 min 字級並標 over
function fitText(text, w, h, o){
  const lh = o.lh || 1.25, min = Math.max(4, o.min || 10), maxLines = o.maxLines || 99;
  let size = Math.max(min, o.max || 40);
  for(;;){
    const ls = wrap(text, w, size, o.measure);
    const fits = ls.length <= maxLines && ls.length * size * lh <= h + .5;
    if(fits || size <= min) return {size, lines:ls, over:!fits};
    size = Math.max(min, size - Math.max(1, Math.round(size * .05)));
  }
}
// 多段文字一起縮（亮點清單、資訊列）：indent＝每段左邊保留的寬度（以字級倍數計）
function fitList(items, w, h, o){
  const lh = o.lh || 1.3, gap = o.gap == null ? .45 : o.gap, ind = o.indent || 0, min = Math.max(4, o.min || 10);
  let size = Math.max(min, o.max || 40);
  for(;;){
    const ws = items.map((t) => wrap(t, Math.max(size, w - ind * size), size, o.measure));
    const n = ws.reduce((a, l) => a + l.length, 0);
    const tot = n * size * lh + Math.max(0, items.length - 1) * gap * size;
    if(tot <= h + .5 || size <= min) return {size, items:ws, over:tot > h + .5, height:tot};
    size = Math.max(min, size - Math.max(1, Math.round(size * .05)));
  }
}

/* ---------- 版面配置 ---------- */
// 回傳 {W, H, shape, hero, blocks:[{t, x, y, w, h, on}]}；QR 有 qr:{x,y,s}
function qrMin(sizeKey){ return sizeKey === 'a4' ? 354 : 220; } // A4 300dpi 下 30mm；社群圖 220px
function layout(style, sizeKey, data){
  const S = SIZES[sizeKey] || SIZES.a4, W = S.w, H = S.h, sh = shapeOf(W, H);
  const c = data.course || {}, u = data.unit || {};
  style = STYLES[style] ? style : 'biz';
  const hasQR = !!String(c.url || '').trim();
  const hasSpk = !!(c.spkName || c.spkPhoto);
  const L = sh === 'wide' ? wideLayout(style, sizeKey, W, H, c, u, hasQR, hasSpk) : stackLayout(style, sizeKey, sh, W, H, c, u, hasQR, hasSpk);
  L.W = W; L.H = H; L.shape = sh; L.style = style; L.size = sizeKey;
  const dark = HERO_DARK[style] || style === 'biz';
  L.blocks.forEach((b) => { b.on = !!(dark && L.hero && b.y + b.h <= L.hero.y + L.hero.h + 1 && b.x + b.w <= L.hero.x + L.hero.w + 1 && (style !== 'biz' || b.t === 'head')); });
  return L;
}
function stackLayout(style, sizeKey, sh, W, H, c, u, hasQR, hasSpk){
  const p = Math.round(W * .06), sq = sh === 'square';
  let top = p, bottom = H - p;
  if(sizeKey === 'story'){ top = Math.round(H * .085); bottom = H - Math.round(H * .1); } // 限動上下有 App 介面，留安全區
  const rows = infoRows(c, sq ? 4 : 6), pts = points(c, sq ? 3 : 5), ol = sizeKey === 'a4' ? outline(c) : [];
  const fee = style === 'subsidy' && !!(c.fee || c.feeAfter) && !isFree(c.fee);
  const secs = [{t:'head', w:sq ? .07 : .052}];
  if(style === 'speaker' && hasSpk) secs.push({t:'titleRow', w:sq ? .3 : .25});
  else secs.push({t:'title', w:sq ? .2 : .16});
  if(c.sub) secs.push({t:'sub', w:sq ? .06 : .045});
  if(style === 'pop') secs.push({t:'spacer', w:.035}); // 留給斜切色塊的斜邊，不放字
  if(fee) secs.push({t:'fee', w:sq ? .13 : .1});
  if(rows.length) secs.push({t:'info', w:rows.length * (sq ? .05 : .034) + .01});
  if(pts.length) secs.push({t:'points', w:pts.length * (sq ? .05 : .036) + .01});
  if(c.who && !sq) secs.push({t:'who', w:.045});
  if(ol.length) secs.push({t:'outline', w:Math.min(.17, ol.length * .022 + .03)});
  if(hasSpk && style !== 'speaker' && !sq) secs.push({t:'speaker', w:.06});
  const qs = Math.max(qrMin(sizeKey), Math.round(W * (sq ? .2 : .19)));
  const footH = hasQR ? Math.round(qs * 1.2) : Math.round(H * (sq ? .1 : .075));
  const gap = Math.round(H * (sq ? .018 : .014));
  const avail = bottom - top - footH - gap * secs.length;
  const sumW = secs.reduce((a, s) => a + s.w, 0);
  const k = Math.min(avail / (sumW * H), 1.5);
  const used = secs.reduce((a, s) => a + Math.round(s.w * H * k), 0);
  const extra = Math.max(0, avail - used) / (secs.length + 1); // 內容少時把多出來的空間平均分到間距
  const blocks = [];
  let y = top + extra * .5;
  const x = p, w = W - 2 * p;
  secs.forEach((s) => {
    const h = Math.round(s.w * H * k);
    if(s.t === 'titleRow'){
      const tw = Math.round(w * .58);
      blocks.push({t:'title', x, y, w:tw, h});
      blocks.push({t:'photo', x:x + Math.round(w * .62), y, w:w - Math.round(w * .62), h});
    } else if(s.t !== 'spacer') blocks.push({t:s.t, x, y, w, h});
    y += h + gap + extra;
  });
  const fy = bottom - footH;
  const foot = {t:'foot', x, y:fy, w, h:footH};
  if(hasQR){ foot.qr = {x:x + w - qs, y:fy, s:qs}; foot.tw = w - qs - Math.round(W * .04); }
  else foot.tw = w;
  blocks.push(foot);
  // 主色塊：biz 只蓋抬頭；pop／subsidy 蓋到副標；list 蓋到標題；speaker、note 不用深色塊
  const titleB = blocks.find((b) => b.t === 'title'), subB = blocks.find((b) => b.t === 'sub'), headB = blocks[0];
  let hero = null;
  if(style === 'biz') hero = {x:0, y:0, w:W, h:headB.y + headB.h + Math.round(gap * .6)};
  else if(style === 'pop' || style === 'subsidy') hero = {x:0, y:0, w:W, h:(subB || titleB).y + (subB || titleB).h + Math.round(gap * .7)};
  else if(style === 'list') hero = {x:0, y:0, w:W, h:titleB.y + titleB.h + Math.round(gap * .7)};
  else if(style === 'speaker') hero = {x:0, y:0, w:W, h:(subB || titleB).y + (subB || titleB).h + Math.round(gap * .7), light:true};
  return {hero, blocks, pad:p};
}
function wideLayout(style, sizeKey, W, H, c, u, hasQR, hasSpk){
  const p = Math.round(H * .07), lx = p, lw = Math.round(W * .6) - p, rx = Math.round(W * .64), rw = W - p - rx;
  const rows = infoRows(c, 6).filter((r) => r[0] !== '名額' && r[0] !== '截止').slice(0, 3);
  const secs = [{t:'head', w:.1}, {t:'title', w:.3}];
  if(c.sub) secs.push({t:'sub', w:.09});
  if(rows.length) secs.push({t:'info', w:rows.length * .085 + .01});
  const gap = Math.round(H * .03), avail = H - 2 * p - gap * (secs.length - 1);
  const sumW = secs.reduce((a, s) => a + s.w, 0), k = Math.min(avail / (sumW * H), 1.4);
  const used = secs.reduce((a, s) => a + Math.round(s.w * H * k), 0), extra = Math.max(0, avail - used) / (secs.length + 1);
  const blocks = [];
  let y = p + extra;
  secs.forEach((s) => { const h = Math.round(s.w * H * k); blocks.push({t:s.t, x:lx, y, w:lw, h}); y += h + gap + extra; });
  const qs = Math.max(qrMin(sizeKey), Math.round(Math.min(rw * .62, H * .4)));
  const fee = style === 'subsidy' && !!(c.fee || c.feeAfter) && !isFree(c.fee);
  if(style === 'speaker' && hasSpk){
    const ph = hasQR ? Math.round(H - 2 * p - qs * 1.2 - gap) : H - 2 * p;
    blocks.push({t:'photo', x:rx, y:p, w:rw, h:ph});
    if(hasQR) blocks.push({t:'qrbox', x:rx, y:H - p - Math.round(qs * 1.2), w:rw, h:Math.round(qs * 1.2), qr:{x:rx + Math.round((rw - qs) / 2), y:H - p - Math.round(qs * 1.2), s:qs}});
  } else {
    const fh = fee ? Math.round(H * .26) : 0, qh = hasQR ? Math.round(qs * 1.2) : 0, tot = fh + qh + (fee && hasQR ? gap : 0);
    let yy = Math.round((H - tot) / 2);
    if(fee){ blocks.push({t:'fee', x:rx, y:yy, w:rw, h:fh}); yy += fh + gap; }
    if(hasQR) blocks.push({t:'qrbox', x:rx, y:yy, w:rw, h:qh, qr:{x:rx + Math.round((rw - qs) / 2), y:yy, s:qs}});
    if(!fee && !hasQR) blocks.push({t:'contact', x:rx, y:Math.round(H * .3), w:rw, h:Math.round(H * .4)});
  }
  let hero = null;
  if(style === 'biz') hero = {x:0, y:0, w:W, h:blocks[0].y + blocks[0].h + Math.round(gap * .5)};
  else if(style === 'pop' || style === 'subsidy' || style === 'list') hero = {x:0, y:0, w:Math.round(W * .62), h:H};
  else if(style === 'speaker') hero = {x:0, y:0, w:Math.round(W * .62), h:H, light:true};
  return {hero, blocks, pad:p};
}
// 測試用：兩塊是否重疊（qrbox／foot 的 QR 都在自己的框內）
function overlap(a, b){ return a.x < b.x + b.w - .5 && b.x < a.x + a.w - .5 && a.y < b.y + b.h - .5 && b.y < a.y + a.h - .5; }

/* ---------- 規則式文案 ---------- */
function core(t){ return cut(String(t || '').replace(/[（(][^）)]*[）)]/g, '').replace(/(實務|入門|進階|培訓|研習)?(班|課程|工作坊|講座|體驗課|課)$/, '').trim(), 20) || '這門課'; }
function suggestTitles(c){
  const k = core(c.title), h = FW(c.hours).trim(), out = [];
  if(/^\d+(\.\d+)?$/.test(h)) out.push(h + ' 小時學會' + k);
  out.push('零基礎也能上手的' + k);
  out.push(k + '：從入門到實戰');
  out.push(c.feeAfter && c.feeNote ? cut(c.feeNote, 10) + '｜' + k : '限額招生｜' + k);
  out.push('下班後的' + k + '充電課');
  if(c.online) out.push('在家就能上的' + k);
  return out.filter((v, i, a) => a.indexOf(v) === i).slice(0, 6);
}
const COMMON_POINTS = ['老師帶著做，當天完成作品', '小班教學，有問題隨時問', '課後提供講義與練習檔', '用真實案例練習，回去馬上用得到', '結訓頒發結業證書', '不需要任何基礎'];
function hashtags(c){
  const k = core(c.title).replace(/[\s｜:：、，,.!！?？]/g, '');
  const t = ['#' + k, '#課程招生'];
  if(c.online) t.push('#線上課程');
  if(/補助/.test(c.feeNote || '')) t.push('#政府補助課程');
  if(isFree(c.fee)) t.push('#免費講座');
  t.push('#學習');
  return t.filter((v, i, a) => a.indexOf(v) === i);
}
function postText(data){
  const c = data.course || {}, u = data.unit || {}, r = [];
  r.push('【' + (c.tag || '招生中') + '】' + (c.title || '課程名稱'));
  if(c.sub) r.push(c.sub);
  r.push('');
  infoRows(c, 6).forEach((x) => r.push('▸ ' + x[0] + '：' + x[1]));
  const pts = points(c);
  if(pts.length){ r.push(''); r.push('課程亮點'); pts.forEach((x) => r.push('✔ ' + x)); }
  if(c.who){ r.push(''); r.push('適合對象：' + c.who); }
  if(c.spkName) r.push('講師：' + c.spkName + (c.spkTitle ? '（' + c.spkTitle + '）' : ''));
  if(c.url){ r.push(''); r.push('👉 報名：' + c.url); }
  const cl = contactLines(u); if(cl.length || u.name){ r.push(''); r.push('主辦：' + (u.name || '') + (cl.length ? '｜' + cl.join('｜') : '')); }
  if(/補助/.test(c.feeNote || '')) r.push('※ 補助資格與金額依計畫規定');
  r.push(''); r.push(hashtags(c).join(' '));
  return r.join('\n');
}

/* ---------- 分享連結（不含圖片） ---------- */
function b64e(s){ if(typeof Buffer !== 'undefined') return Buffer.from(s, 'utf-8').toString('base64'); const b = new TextEncoder().encode(s); let t = ''; b.forEach((x) => { t += String.fromCharCode(x); }); return btoa(t); }
function b64d(s){ if(typeof Buffer !== 'undefined') return Buffer.from(s, 'base64').toString('utf-8'); const t = atob(s); return new TextDecoder().decode(Uint8Array.from(t, (ch) => ch.charCodeAt(0))); }
const C_KEYS = ['title', 'sub', 'tag', 'dateStart', 'dateEnd', 'weekly', 'time', 'hours', 'place', 'online', 'fee', 'feeAfter', 'feeNote', 'seats', 'deadline', 'url', 'qrCap', 'points', 'who', 'outline', 'spkName', 'spkTitle'];
const U_KEYS = ['name', 'tel', 'line', 'email', 'web'];
function pick(o, ks){ const r = {}; ks.forEach((k) => { if(o && o[k] != null && o[k] !== '') r[k] = o[k]; }); return r; }
function encodeShare(st){
  const o = {v:1, u:pick(st.unit, U_KEYS), c:pick(st.course, C_KEYS), l:pick(st.look, ['style', 'pal', 'color', 'font']), s:st.size};
  return b64e(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodeShare(s){
  try{
    const o = JSON.parse(b64d(String(s).replace(/-/g, '+').replace(/_/g, '/')));
    if(!o || o.v !== 1) return null;
    const st = blank();
    U_KEYS.forEach((k) => { if(o.u && o.u[k] != null) st.unit[k] = cut(o.u[k], 80); });
    C_KEYS.forEach((k) => { if(o.c && o.c[k] != null) st.course[k] = k === 'online' ? !!o.c[k] : cut(o.c[k], k === 'outline' || k === 'points' ? 900 : 200); });
    if(o.l){ if(STYLES[o.l.style]) st.look.style = o.l.style; if(PALETTES[o.l.pal]) st.look.pal = o.l.pal; if(hexRgb(o.l.color)) st.look.color = o.l.color; if(FONTS[o.l.font]) st.look.font = o.l.font; }
    if(SIZES[o.s]) st.size = o.s;
    return st;
  }catch(e){ return null; }
}

/* ---------- AI 回傳清理 ---------- */
function clean(s, n){ return cut(String(s == null ? '' : s).replace(/[*#`>_~]+/g, '').replace(/^\s*[-•・]\s*/, '').replace(/\s+/g, ' ').trim(), n); }
function sanitizeAi(o){
  o = o && typeof o === 'object' ? o : {};
  const arr = (v) => Array.isArray(v) ? v : (typeof v === 'string' ? v.split(/\n/) : []);
  return {
    title: clean(o.title, 26),
    sub: clean(o.sub, 40),
    points: arr(o.points).map((x) => clean(x, 30)).filter(Boolean).slice(0, 5),
    who: clean(o.who, 60),
    hashtags: arr(o.hashtags).map((x) => clean(String(x).replace(/^#?/, ''), 16)).filter(Boolean).slice(0, 6).map((x) => '#' + x),
  };
}

/* ---------- 範例（全部虛構） ---------- */
function blank(){
  return {
    unit:{name:'', logo:'', tel:'', line:'', email:'', web:''},
    course:{title:'', sub:'', tag:'招生中', dateStart:'', dateEnd:'', weekly:'', time:'', hours:'', place:'', online:false, fee:'', feeAfter:'', feeNote:'', seats:'', deadline:'', url:'', qrCap:'掃描報名', points:'', who:'', outline:'', spkName:'', spkTitle:'', spkPhoto:''},
    look:{style:'biz', pal:'navy', color:'', font:'hei'},
    size:'a4',
  };
}
const EXAMPLES = [
  {id:'tims', n:'產投補助課程', s:'補助優惠版型・海軍藍', st:{
    unit:{name:'臺灣示範職業訓練協會', tel:'(02)2345-6789', line:'@demo-train', email:'service@demo-train.example', web:''},
    course:{title:'AI 辦公室應用實務班', sub:'用生成式 AI 做簡報、報表與文案，每週省下好幾個小時', tag:'招生中', dateStart:'2026-12-05', dateEnd:'2027-01-09', weekly:'每週六', time:'09:00–16:00', hours:'36', place:'臺北市中正區示範路 100 號 3 樓', online:false,
      fee:'8000', feeAfter:'1600', feeNote:'結訓補助 80%', seats:'30', deadline:'2026-11-28', url:'https://example.com/signup/ai-office', qrCap:'掃描報名',
      points:'從零開始，帶你做出第一份 AI 簡報\n報表整理、會議紀錄、文案一次學會\n每堂課都有實作練習檔\n小班 30 人，助教協助操作', who:'想用 AI 提升工作效率的在職勞工（需具勞保等投保身分）',
      outline:'生成式 AI 基本觀念與提示詞寫法｜6\nAI 簡報製作實作｜6\nAI 試算表與報表整理｜6\n會議紀錄與公文寫作｜6\n社群文案與圖片生成｜6\n綜合實作與成果發表｜6', spkName:'陳映如', spkTitle:'示範數位顧問有限公司 資深講師', spkPhoto:''},
    look:{style:'subsidy', pal:'navy', color:'', font:'hei'}, size:'a4'}},
  {id:'talk', n:'免費講座', s:'講師主打版型・活力橘', st:{
    unit:{name:'示範青年創業協會', tel:'(02)2950-1234', line:'', email:'', web:'demo-startup.example'},
    course:{title:'小店社群經營入門講座', sub:'讓老客人一直回來的 5 個方法', tag:'免費報名', dateStart:'2026-12-12', dateEnd:'', weekly:'', time:'14:00–16:00', hours:'2', place:'新北市板橋區示範路 8 號 創業基地 B1', online:false,
      fee:'免費', feeAfter:'', feeNote:'', seats:'50', deadline:'2026-12-10', url:'https://example.com/signup/shop-talk', qrCap:'掃描報名',
      points:'貼文怎麼寫，客人才會留言\n會員經營不用花大錢\n現場 Q&A，帶你的問題來', who:'開店 3 年內的小店老闆、想開店的人', outline:'',
      spkName:'王巧心', spkTitle:'示範行銷工作室 創辦人', spkPhoto:''},
    look:{style:'speaker', pal:'orange', color:'', font:'hei'}, size:'ig45'}},
  {id:'online', n:'線上直播課', s:'活力色塊版型・莓果紅', st:{
    unit:{name:'示範數位教育學會', tel:'', line:'@demo-edu', email:'hello@demo-edu.example', web:''},
    course:{title:'一個下午學會做社群圖', sub:'免費設計工具＋版面公式，新手也能做出專業感', tag:'線上直播', dateStart:'2026-12-19', dateEnd:'', weekly:'', time:'13:30–17:00', hours:'3.5', place:'線上直播（開課前寄連結）', online:true,
      fee:'990', feeAfter:'790', feeNote:'早鳥價 12/10 前', seats:'80', deadline:'2026-12-17', url:'https://example.com/signup/social-design', qrCap:'掃描報名',
      points:'3 個版面公式，照套就好看\n配色與字型的挑法\n現場做出 3 張貼文圖\n提供 20 個練習範本', who:'小編、小店老闆、想自己做圖的上班族', outline:'',
      spkName:'林予安', spkTitle:'示範設計 視覺講師', spkPhoto:''},
    look:{style:'pop', pal:'berry', color:'', font:'hei'}, size:'ig11'}},
  {id:'craft', n:'手作體驗課', s:'手寫筆記版型・森林綠', st:{
    unit:{name:'示範社區大學', tel:'(03)555-0123', line:'', email:'', web:''},
    course:{title:'咖啡手沖入門體驗課', sub:'從磨豆到沖煮，帶一杯自己沖的咖啡回家', tag:'小班招生', dateStart:'2027-01-16', dateEnd:'', weekly:'', time:'10:00–12:30', hours:'2.5', place:'新竹市東區示範街 25 號 2 樓教室', online:false,
      fee:'1200', feeAfter:'', feeNote:'含豆子與材料', seats:'12', deadline:'2027-01-10', url:'https://example.com/signup/coffee', qrCap:'掃描報名',
      points:'一人一套器材，自己動手沖\n認識 3 種產區的風味\n帶走 100g 咖啡豆', who:'喜歡咖啡、想在家沖出好咖啡的人', outline:'',
      spkName:'張允中', spkTitle:'示範咖啡教室 講師', spkPhoto:''},
    look:{style:'note', pal:'green', color:'', font:'kai'}, size:'line'}},
];

const API = {SIZES, SIZE_ORDER, STYLES, STYLE_ORDER, PALETTES, PAL_ORDER, FONTS, HERO_DARK, shapeOf, palette, mix, lum, hexRgb,
  parseDate, md, dateLine, money, isFree, feeText, timeLine, infoRows, contactLines, points, outline, lines,
  wrap, fitText, fitList, layout, overlap, qrMin, suggestTitles, COMMON_POINTS, hashtags, postText,
  encodeShare, decodeShare, sanitizeAi, blank, EXAMPLES, clone, cut, core};
if(typeof module === 'object' && module.exports) module.exports = API;
root.CPM = API;
})(typeof window !== 'undefined' ? window : globalThis);
