/* 課程招生海報產生器：畫面
   狀態存 localStorage（cpm. 前綴）：state（含 Logo／講師照片 dataURL）、tpls（我的範本，不含講師照片）、open、ai、fs、warnSeen、marquee。 */
(function(){
'use strict';
var P = window.CPM, R = window.CPMR, Z = window.CPMZIP, AI = window.CPMAI;
var PFX = 'cpm.', ONLINE = 'https://m255525.github.io/course-poster-maker/';
var $ = function(id){ return document.getElementById(id); };
function lsGet(k){ try{ return localStorage.getItem(PFX + k); }catch(e){ return null; } }
function lsSet(k, v){ try{ localStorage.setItem(PFX + k, v); return true; }catch(e){ return false; } }
function lsDel(k){ try{ localStorage.removeItem(PFX + k); }catch(e){} }
function lsJson(k, d){ try{ var v = JSON.parse(lsGet(k)); return v == null ? d : v; }catch(e){ return d; } }
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]; }); }
var standalone = window.matchMedia && matchMedia('(display-mode: standalone)').matches;

/* ---------- 狀態 ---------- */
function merge(saved){
  var b = P.blank();
  if(saved && typeof saved === 'object'){
    ['unit', 'course', 'look'].forEach(function(k){ if(saved[k]) Object.keys(b[k]).forEach(function(f){ if(saved[k][f] != null) b[k][f] = saved[k][f]; }); });
    if(P.SIZES[saved.size]) b.size = saved.size;
  }
  return b;
}
var S = merge(lsJson('state', null));
var TPLS = lsJson('tpls', []);
var OPEN = lsJson('open', {ex:true, course:true});
var firstRun = !lsGet('state');
function save(){ if(!lsSet('state', JSON.stringify(S))){ var t = JSON.parse(JSON.stringify(S)); t.course.spkPhoto = ''; lsSet('state', JSON.stringify(t)); toast('瀏覽器空間不足，講師照片這次不會記住'); } }
function getPath(p){ var a = p.split('.'), o = S; for(var i = 0; i < a.length - 1; i++) o = o[a[i]]; return o[a[a.length - 1]]; }
function setPath(p, v){ var a = p.split('.'), o = S; for(var i = 0; i < a.length - 1; i++) o = o[a[i]]; o[a[a.length - 1]] = v; }

var toastT;
function toast(s){ var t = document.querySelector('.toast'); if(!t){ t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = s; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(function(){ t.hidden = true; }, 3000); }
function openModal(h){ $('modalBox').innerHTML = h; $('modal').classList.add('show'); }
function closeModal(){ $('modal').classList.remove('show'); }
function download(blob, name){ var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
function safeName(s){ return String(s || '海報').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 30) || '海報'; }
function copyText(t, msg){
  function fb(){ var ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); }catch(e){} ta.remove(); }
  if(navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).catch(fb); else fb();
  toast(msg || '已複製');
}

/* ---------- 圖片與 QR ---------- */
var IMG = {logo:null, photo:null, qr:null}, SRC = {logo:'', photo:'', qr:''};
function loadImg(src){ return new Promise(function(ok){ if(!src) return ok(null); var im = new Image(); im.onload = function(){ ok(im); }; im.onerror = function(){ ok(null); }; im.src = src; }); }
var qrLib = null;
function loadQRLib(){
  if(window.QRCode) return Promise.resolve();
  if(!qrLib) qrLib = new Promise(function(ok, no){ var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'; s.onload = ok; s.onerror = function(){ qrLib = null; no(new Error('QR 元件載入失敗（需要網路）')); }; document.head.appendChild(s); });
  return qrLib;
}
async function qrCanvas(text){
  await loadQRLib();
  var box = $('qrTmp'); box.innerHTML = '';
  new window.QRCode(box, {text:text, width:1000, height:1000, colorDark:'#000000', colorLight:'#FFFFFF', correctLevel:window.QRCode.CorrectLevel.M});
  return box.querySelector('canvas');
}
var qrErr = '';
async function assets(){
  if(SRC.logo !== S.unit.logo){ SRC.logo = S.unit.logo; IMG.logo = await loadImg(S.unit.logo); }
  if(SRC.photo !== S.course.spkPhoto){ SRC.photo = S.course.spkPhoto; IMG.photo = await loadImg(S.course.spkPhoto); }
  var url = String(S.course.url || '').trim();
  if(SRC.qr !== url){
    SRC.qr = url; IMG.qr = null; qrErr = '';
    if(url){ try{ IMG.qr = await qrCanvas(url); }catch(e){ qrErr = e.message; SRC.qr = ''; } }
  }
}
var fontReady = {};
async function fonts(){
  var F = P.FONTS[S.look.font] || P.FONTS.hei, c = S.course, u = S.unit;
  var text = [u.name, u.tel, u.line, u.email, u.web, c.title, c.sub, c.tag, c.points, c.who, c.outline, c.spkName, c.spkTitle, c.qrCap, c.feeNote, c.place, c.weekly, c.time, '日期時間地點費用名額截止線上報名洽詢主辦單位適合對象課程大綱講師原價自付優惠價共小時元名至補助資格與金額依計畫規定掃描請輸入課程名稱▲※，（）～・0123456789/:–'].join('');
  var key = S.look.font + '|' + text;
  if(fontReady[key] || !document.fonts || !document.fonts.load) return;
  var jobs = F.load.map(function(w){ return document.fonts.load(w + ' 40px "' + F.fam + '"', text).catch(function(){}); });
  await Promise.race([Promise.all(jobs), new Promise(function(r){ setTimeout(r, 4000); })]);
  fontReady[key] = true;
}

/* ---------- 繪製 ---------- */
var LAST = {warn:[]}, drawing = null, again = false;
function drawTo(canvas, size, scale, preview){
  var L = P.layout(S.look.style, size, S);
  canvas.width = Math.round(L.W * scale); canvas.height = Math.round(L.H * scale);
  return R.draw(canvas.getContext('2d'), {data:S, size:size, scale:scale, imgs:IMG, preview:preview});
}
async function redraw(){
  if(drawing){ again = true; return drawing; }
  drawing = (async function(){
    do {
      again = false;
      await assets(); await fonts();
      var cv = $('poster'); if(!cv) break;
      var sz = P.SIZES[S.size], stage = $('stage');
      var maxW = Math.max(200, stage.clientWidth - (innerWidth < 480 ? 36 : 56)), maxH = Math.max(320, innerHeight * .78);
      var cssW = Math.min(maxW, maxH * sz.w / sz.h, sz.w), dpr = Math.min(2, window.devicePixelRatio || 1);
      var res = drawTo(cv, S.size, cssW * dpr / sz.w, true);
      cv.style.width = cssW + 'px';
      LAST = res;
      document.querySelectorAll('canvas[data-thumb]').forEach(function(t){
        var keep = S.look.style; S.look.style = t.dataset.thumb;
        try{ drawTo(t, S.size, 132 * dpr / sz.w, false); } finally { S.look.style = keep; }
      });
      showInfo();
    } while(again);
    drawing = null;
  })();
  return drawing;
}
var rT;
function soon(){ clearTimeout(rT); rT = setTimeout(redraw, 160); }
function showInfo(){
  var el = $('pvinfo'); if(!el) return;
  var sz = P.SIZES[S.size], h = '<span>📐 ' + esc(sz.n) + '　' + sz.w + '×' + sz.h + ' px</span>';
  var a = [];
  if(LAST.warn && LAST.warn.length) a.push('<div class="alert warn">✂ 文字太多、已縮到最小還放不下：' + esc(LAST.warn.join('、')) + '（預覽上紅色虛線框）。請刪減文字，或換成 A4／IG 貼文等較大的尺寸。</div>');
  if(!String(S.course.url || '').trim()) a.push('<div class="alert warn">沒有填「報名網址」，海報上不會有 QR code。</div>');
  else if(qrErr) a.push('<div class="alert bad">' + esc(qrErr) + '，QR code 先用灰色方塊代替。</div>');
  else if(!/^https?:\/\//i.test(String(S.course.url).trim())) a.push('<div class="alert warn">報名網址建議以 https:// 開頭，手機掃了才會直接打開網頁。</div>');
  if(S.size === 'story') a.push('<div class="alert ok">限時動態上下各留了一段空白，避免被 App 的頭像和回覆框蓋住。</div>');
  el.innerHTML = h + a.join('');
}
function fullCanvas(size){ var cv = document.createElement('canvas'); var r = drawTo(cv, size || S.size, 1, false); cv._warn = r.warn; return cv; }
function blobOf(cv){ return new Promise(function(ok){ cv.toBlob(ok, 'image/png'); }); }

/* ---------- 版面 ---------- */
function card(id, no, title, sv, body){ return '<details class="card" data-card="' + id + '"' + (OPEN[id] ? ' open' : '') + '><summary><span class="no">' + no + '</span>' + title + '<span class="sv" data-sv="' + id + '">' + esc(sv) + '</span></summary><div class="cb">' + body + '</div></details>'; }
function inp(path, label, o){
  o = o || {}; var v = getPath(path);
  var a = ' data-b="' + path + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + (o.list ? ' list="' + o.list + '"' : '') + (o.max ? ' maxlength="' + o.max + '"' : '');
  var field = o.rows ? '<textarea rows="' + o.rows + '"' + a + '>' + esc(v) + '</textarea>' : '<input type="' + (o.type || 'text') + '"' + a + ' value="' + esc(v) + '"' + (o.mode ? ' inputmode="' + o.mode + '"' : '') + '>';
  return '<label class="fld">' + label + field + (o.hint ? '<span class="hint">' + o.hint + '</span>' : '') + '</label>';
}
function imgBox(path, label, round){
  var v = getPath(path);
  return '<div class="imgbox">' + label + (v ? '<img src="' + v + '" alt=""' + (round ? ' class="round"' : '') + '>' : '<span class="ph" aria-hidden="true">＋</span>') +
    '<label>' + (v ? '換一張' : '上傳圖片') + '<input type="file" accept="image/png,image/jpeg,image/webp" data-img="' + path + '" hidden></label>' + (v ? '<button type="button" data-delimg="' + path + '">移除</button>' : '') + '</div>';
}
function sums(){
  var c = S.course, u = S.unit;
  return {ex:TPLS.length ? '我的範本 ' + TPLS.length + ' 個' : '', unit:u.name, course:c.title, when:P.dateLine(c), fee:P.feeText(c), pts:P.points(c).length + ' 條亮點', spk:c.spkName, sign:c.url ? '有 QR' : '未填網址', ai:AI.status()};
}
function updateSums(){ var s = sums(); Object.keys(s).forEach(function(k){ var e = document.querySelector('[data-sv="' + k + '"]'); if(e) e.textContent = s[k]; }); }
function certData(){ try{ var t = JSON.parse(localStorage.getItem('tcg.state')); return t && ((t.unit && t.unit.name) || (t.course && t.course.name)) ? t : null; }catch(e){ return null; } }

var aiOut = null, aiMsg = '';
function renderPanel(){
  var s = sums(), c = S.course;
  var h = card('ex', '例', '範例與我的範本', s.ex,
      '<div class="exs">' + P.EXAMPLES.map(function(e){ return '<button type="button" class="ex" data-ex="' + e.id + '">' + esc(e.n) + '<small>' + esc(e.s) + '</small></button>'; }).join('') + '</div>' +
      '<div class="stack"><button type="button" class="btn alt sm" data-act="new">🆕 新海報（保留主辦單位）</button>' + (certData() ? '<button type="button" class="btn alt sm" data-act="cert">🎓 從訓練證書產生器帶入</button>' : '') + (MK ? '<button type="button" class="btn alt sm" data-act="mkPick">📥 從課程專案帶入</button><button type="button" class="btn alt sm" data-act="mkOut">📤 存成課程專案</button>' : '') + '<button type="button" class="btn alt sm" data-act="saveTpl">💾 存成我的範本</button></div>' +
      (TPLS.length ? '<div>' + TPLS.map(function(t, i){ return '<div class="tpl"><b>' + esc(t.name) + '</b><button type="button" class="btn alt sm" data-tpl="' + i + '">套用</button><button type="button" class="btn alt sm" data-deltpl="' + i + '" aria-label="刪除範本 ' + esc(t.name) + '">🗑</button></div>'; }).join('') + '</div>' : '<p class="small">把常用的主辦單位、配色、版型存起來，下次開新課程直接套用（講師照片不會存進範本）。</p>')) +
    card('unit', '1', '主辦單位', s.unit,
      inp('unit.name', '單位名稱', {ph:'例如：臺灣示範職業訓練協會', max:40}) + imgBox('unit.logo', 'Logo') +
      '<div class="row2">' + inp('unit.tel', '電話', {ph:'(02)2345-6789', max:30, mode:'tel'}) + inp('unit.line', 'LINE ID', {ph:'@yourline', max:30}) + '</div>' +
      '<div class="row2">' + inp('unit.email', 'Email', {ph:'service@…', max:50, type:'email'}) + inp('unit.web', '網站（選填）', {ph:'www.…', max:60}) + '</div>') +
    card('course', '2', '課程名稱與標語', s.course,
      inp('course.title', '課程名稱（海報最大的字）', {ph:'例如：AI 辦公室應用實務班', max:40}) +
      '<div class="stack"><button type="button" class="btn alt sm" data-act="suggest">💡 給我標題建議</button></div><div class="chips" id="sugg"></div>' +
      inp('course.sub', '副標（一句話說明學了有什麼用）', {ph:'例如：用 AI 做簡報、報表與文案', max:50}) +
      '<div class="row2">' + inp('course.tag', '角標', {list:'tagList', max:8, hint:'右上角的小標籤'}) + inp('course.qrCap', 'QR 下方的字', {max:10}) + '</div>' +
      '<datalist id="tagList"><option>招生中</option><option>熱烈招生</option><option>免費報名</option><option>早鳥優惠</option><option>名額有限</option><option>最後倒數</option><option>線上直播</option><option>小班招生</option></datalist>') +
    card('when', '3', '時間地點', s.when,
      '<div class="row2">' + inp('course.dateStart', '開課日', {type:'date'}) + inp('course.dateEnd', '結訓日（一天的課可空白）', {type:'date'}) + '</div>' +
      '<div class="row2">' + inp('course.weekly', '上課星期（選填）', {ph:'例如：每週六', max:20}) + inp('course.time', '上課時間', {ph:'09:00–16:00', max:30}) + '</div>' +
      '<div class="row2">' + inp('course.hours', '總時數', {ph:'36', max:8, mode:'decimal'}) + '<label class="chk"><input type="checkbox" data-b="course.online"' + (c.online ? ' checked' : '') + '>線上課程</label></div>' +
      inp('course.place', c.online ? '上課方式（平台）' : '上課地點', {ph:c.online ? '例如：線上直播（開課前寄連結）' : '例如：臺北市中正區示範路 100 號 3 樓', max:60})) +
    card('fee', '4', '費用與名額', s.fee,
      '<div class="row2">' + inp('course.fee', '費用（免費就寫「免費」）', {ph:'8000', max:20}) + inp('course.feeAfter', '補助後／優惠價（選填）', {ph:'1600', max:20}) + '</div>' +
      inp('course.feeNote', '費用說明（選填）', {ph:'例如：結訓補助 80%、早鳥價 12/10 前、含材料費', max:20, hint:'寫到「補助」時，海報會自動加註「補助資格與金額依計畫規定」。補助比例請照計畫公告填寫。'}) +
      '<div class="row2">' + inp('course.seats', '名額', {ph:'30', max:10}) + inp('course.deadline', '報名截止日', {type:'date'}) + '</div>') +
    card('pts', '5', '課程亮點與對象', s.pts,
      inp('course.points', '課程亮點（一行一條，最多 5 條）', {rows:5, ph:'從零開始，帶你做出第一份 AI 簡報\n每堂課都有實作練習檔', hint:'方形和 LINE 尺寸只顯示前 3 條。'}) +
      '<div class="chips">' + P.COMMON_POINTS.map(function(t){ return '<button type="button" class="chip" data-pt="' + esc(t) + '">＋ ' + esc(t) + '</button>'; }).join('') + '</div>' +
      inp('course.who', '適合對象', {ph:'例如：想用 AI 提升工作效率的在職勞工', max:60}) +
      inp('course.outline', '課程大綱（選填，只有 A4 版會印出）', {rows:5, ph:'生成式 AI 基本觀念｜6\nAI 簡報製作實作｜6', hint:'一行一個單元；行尾加「｜6」會印成「（6 小時）」。'})) +
    card('spk', '6', '講師', s.spk,
      '<div class="row2">' + inp('course.spkName', '講師姓名', {max:20}) + inp('course.spkTitle', '頭銜', {ph:'例如：示範顧問公司 資深講師', max:30}) + '</div>' +
      imgBox('course.spkPhoto', '講師照片', true) + '<p class="small">照片會自動裁成圓形。請用本人同意使用的照片。沒有照片時，畫面會放姓名的第一個字。</p>') +
    card('sign', '7', '報名方式', s.sign,
      inp('course.url', '報名網址（自動產生 QR code）', {ph:'https://forms.gle/…', max:300, type:'url'}) +
      '<p class="small">可以填 Google 表單、報名系統或 LINE 加好友連結。印刷前請用手機實際掃一次。</p>') +
    card('ai', '✨', 'AI 幫我寫文案（選用）', s.ai,
      '<div class="aibox"><p class="small">AI 只寫標題、副標、亮點和適合對象；日期、費用、補助比例照你填的，不讓 AI 改。</p>' +
      '<div class="stack" style="margin-top:.45rem"><button type="button" class="btn mg sm" data-act="aiGo">✨ AI 幫我寫</button><button type="button" class="btn alt sm" data-act="aiCopy">📋 複製提示詞（免金鑰）</button><button type="button" class="btn alt sm" data-act="aiPaste">📥 貼上 AI 回覆</button></div>' +
      '<p class="small" id="aiMsg">' + esc(aiMsg) + '</p>' + aiResultHtml() + '</div>');
  $('panel').innerHTML = h;
}
function aiResultHtml(){
  if(!aiOut) return '';
  var o = aiOut;
  return '<div class="airesult">' + (o.title ? '<div><b>標題：</b>' + esc(o.title) + '</div>' : '') + (o.sub ? '<div><b>副標：</b>' + esc(o.sub) + '</div>' : '') +
    (o.points.length ? '<div><b>亮點：</b><ul>' + o.points.map(function(p){ return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></div>' : '') + (o.who ? '<div><b>適合對象：</b>' + esc(o.who) + '</div>' : '') + (o.hashtags.length ? '<div><b>Hashtag：</b>' + esc(o.hashtags.join(' ')) + '</div>' : '') +
    '<div class="stack" style="margin-top:.4rem"><button type="button" class="btn sm" data-aiapply="all">全部套用</button><button type="button" class="btn alt sm" data-aiapply="title">只套用標題</button><button type="button" class="btn alt sm" data-aiapply="points">只套用亮點</button></div><p class="small">AI 內容僅供參考，請自己再看一次。</p></div>';
}
function sizeIcon(k){ var s = P.SIZES[k], m = 18 / Math.max(s.w, s.h); return '<i style="width:' + Math.round(s.w * m) + 'px;height:' + Math.round(s.h * m) + 'px"></i>'; }
function renderBar(){
  var look = S.look;
  $('bar').innerHTML =
    '<div class="sizes" role="group" aria-label="尺寸"><span class="lbl">尺寸</span>' + P.SIZE_ORDER.map(function(k){ return '<button type="button" class="sz" data-size="' + k + '" aria-pressed="' + (S.size === k) + '" title="' + esc(P.SIZES[k].s) + '">' + sizeIcon(k) + esc(P.SIZES[k].n) + '</button>'; }).join('') + '</div>' +
    '<div class="styles" role="group" aria-label="版型">' + P.STYLE_ORDER.map(function(k){ return '<button type="button" class="sty" data-style="' + k + '" aria-pressed="' + (look.style === k) + '" title="' + esc(P.STYLES[k].s) + '"><canvas data-thumb="' + k + '" aria-hidden="true"></canvas>' + esc(P.STYLES[k].n) + '</button>'; }).join('') + '</div>' +
    '<div class="pals" role="group" aria-label="配色"><span class="lbl">配色</span>' + P.PAL_ORDER.map(function(k){ var p = P.PALETTES[k]; return '<button type="button" class="pal" data-pal="' + k + '" aria-pressed="' + (look.pal === k && !look.color) + '" title="' + esc(p.n) + '" aria-label="' + esc(p.n) + '" style="background:' + p.c1 + '"><span style="background:' + p.c2 + '"></span></button>'; }).join('') +
    '<label class="small" style="display:flex;align-items:center;gap:.3rem">自訂主色<input type="color" data-color value="' + esc(look.color || P.PALETTES[look.pal].c1) + '"></label>' + (look.color ? '<button type="button" class="btn alt sm" data-act="nocolor">還原</button>' : '') +
    '<span class="lbl" style="margin-left:.4rem">字型</span><select data-font aria-label="字型">' + Object.keys(P.FONTS).map(function(k){ return '<option value="' + k + '"' + (look.font === k ? ' selected' : '') + '>' + esc(P.FONTS[k].n) + '</option>'; }).join('') + '</select></div>';
}
function render(){
  $('app').innerHTML = '<div class="top"><h1><span class="reg" aria-hidden="true"></span><span>課程招生海報產生器 <small>A4 海報・IG／FB／LINE 社群圖・報名 QR</small></span></h1>' +
    '<span class="cmyk" aria-hidden="true"><i style="background:var(--cy)"></i><i style="background:var(--mg)"></i><i style="background:var(--ye)"></i><i style="background:var(--k);box-shadow:0 0 0 1px #fff"></i></span>' +
    '<button class="ibtn lictop" type="button" id="licTop" data-act="settings" hidden></button><a class="ibtn" href="manual.html">📖 操作手冊</a><button class="ibtn" type="button" data-act="settings" aria-label="常用設定">⚙</button></div>' +
    '<p class="warn-line">補助比例、名額、日期請照實填寫；資料只存在這台瀏覽器。<button type="button" data-act="warn">⚠ 使用警語</button></p>' +
    '<div class="work"><div class="panel" id="panel"></div>' +
    '<div class="pv"><div class="bar" id="bar"></div>' +
    '<div class="stage" id="stage"><div class="sheet"><span class="crop tl"></span><span class="crop tr"></span><span class="crop bl"></span><span class="crop br"></span><canvas id="poster" role="img" aria-label="海報預覽"></canvas></div></div>' +
    '<div class="bar"><div class="pvinfo" id="pvinfo"></div><div class="exports">' +
      '<button type="button" class="btn mg" data-act="png">⬇ 下載 PNG</button><button type="button" class="btn cy" data-act="zip">📦 全部尺寸 ZIP</button>' +
      '<button type="button" class="btn" data-act="printA4">🖨 列印 A4 海報</button><button type="button" class="btn" data-act="printA6">🖨 A6 傳單（一張印 4 份）</button>' +
      '<button type="button" class="btn alt" data-act="post">📋 複製貼文文案</button><button type="button" class="btn alt" data-act="share">🔗 分享連結</button></div></div></div></div>' + footer();
  renderPanel(); renderBar(); redraw(); showLicTop();
}
function footer(){
  return '<footer class="foot">👤 創作者 Mark Tsai（蔡豐全）<a href="mailto:tsaimark@gmail.com">tsaimark@gmail.com</a><br><a href="manual.html">📖 操作手冊</a><a href="manual.html#creator">👤 創作者資訊</a><a href="#" data-act="warn">⚠ 使用警語</a>' +
    (standalone ? '' : '<a href="#" data-act="install">📲 加入主畫面</a>') +
    '<br><img src="https://visitor-badge.laobi.icu/badge?page_id=m255525.coursepostermaker" alt="訪客次數" height="20" loading="lazy" style="vertical-align:middle;margin-top:.4rem"></footer>';
}

/* ---------- 動作 ---------- */
function readImg(file, max, keepPng){
  return new Promise(function(ok, no){
    if(!file || !/^image\//.test(file.type)) return no(new Error('請選 PNG、JPG 或 WebP 圖片'));
    var fr = new FileReader();
    fr.onload = function(){ var im = new Image(); im.onload = function(){ var k = Math.min(1, max / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); var x = cv.getContext('2d'); if(!keepPng){ x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); } x.drawImage(im, 0, 0, cv.width, cv.height); ok(keepPng ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', .86)); }; im.onerror = function(){ no(new Error('讀不懂這張圖片')); }; im.src = fr.result; };
    fr.onerror = function(){ no(new Error('讀檔失敗')); };
    fr.readAsDataURL(file);
  });
}
function apply(st, keepUnit){
  var u = S.unit; S = merge(P.clone(st));
  if(keepUnit) S.unit = u;
  save(); render();
}
function loadExample(id){ var e = P.EXAMPLES.filter(function(x){ return x.id === id; })[0]; if(!e) return; var st = P.clone(e.st); st.unit.logo = ''; apply(st); toast('已載入範例「' + e.n + '」（內容全部虛構）'); }
function fromCert(){
  var t = certData(); if(!t) return;
  var u = t.unit || {}, c = t.course || {};
  if(u.name) S.unit.name = u.name; if(u.tel) S.unit.tel = u.tel; if(u.logo) S.unit.logo = u.logo;
  if(c.name) S.course.title = c.name; if(c.start) S.course.dateStart = P.parseDate(c.start); if(c.end) S.course.dateEnd = P.parseDate(c.end);
  if(c.hours) S.course.hours = String(c.hours); if(c.place) S.course.place = c.place;
  save(); render(); toast('已帶入訓練證書產生器的單位與課程資料');
}
/* ---------- 課程專案（course-link.js；沒有也照常運作）：只讀寫課程基本資料，不碰學員名單 ---------- */
var MK = window.MKCourse && window.MKCourse.store ? window.MKCourse : null;
function mkId(){ var id = lsGet('mk'); return id && MK && MK.store.get(id) ? id : ''; }
function mkPickHtml(){
  var list = MK.store.list(), cur = mkId();
  return '<h2>📥 從課程專案帶入</h2><p class="small">課程專案是同一台電腦上各辦訓工具共用的課程資料（出席簽到 QR、訓練證書產生器…）。會帶入課程名稱、日期、時數、地點、報名網址、主辦單位、講師；海報只用課程資料，<b>不會讀學員名單</b>。</p>' +
    (list.length ? '<div class="stack" style="flex-direction:column;align-items:stretch">' + list.map(function(d){ return '<button type="button" class="btn alt" data-mkin="' + esc(d.id) + '">' + esc(MKCourse.label(d)) + ' <small>' + esc(MKCourse.when(d)) + (cur === d.id ? '・目前連結' : '') + '</small></button>'; }).join('') + '</div>' : '<p>這台電腦還沒有課程專案。可以按「📤 存成課程專案」用這張海報的課程建立一個。</p>') +
    '<div class="stack"><label class="btn alt">📂 開啟課程專案檔（.json）<input type="file" id="mkFile" accept=".json,application/json" hidden></label><button type="button" class="btn alt" data-act="close">取消</button></div>';
}
function mkApply(id){
  var d = MK.store.get(id); if(!d){ toast('找不到這個課程專案'); return; }
  var c = d.course;
  if(c.title) S.course.title = c.title + (c.term ? ' ' + c.term : ''); if(c.start) S.course.dateStart = c.start; if(c.end) S.course.dateEnd = c.end;
  if(c.hours !== '') S.course.hours = String(c.hours); if(c.place) S.course.place = c.place; if(c.url) S.course.url = c.url;
  if(c.org) S.unit.name = c.org; if(c.teacher) S.course.spkName = c.teacher;
  lsSet('mk', d.id); closeModal(); save(); render(); toast('已帶入課程專案「' + c.title + '」');
}
function mkExport(){
  var c = S.course, course = {title:c.title, start:c.dateStart, end:c.dateEnd, hours:c.hours, place:c.place, url:c.url, org:S.unit.name, teacher:c.spkName};
  Object.keys(course).forEach(function(k){ if(course[k] === '' || course[k] == null) delete course[k]; });
  if(!course.title){ toast('請先填課程名稱'); return; }
  var doc = MK.store.save(mkId() || null, {course:course}, null);
  if(!doc){ toast('存不進這台電腦（瀏覽器空間不足或封鎖網站資料）'); return; }
  lsSet('mk', doc.id);
  openModal('<h2>📤 已存成課程專案</h2><p>「' + esc(MKCourse.label(doc)) + '」</p><p class="small">出席簽到 QR、訓練證書產生器按「📥 從課程專案帶入」就能用同一份課程資料；招生成效追蹤也能接著用。名單之後在出席簽到 QR 匯入即可。再按一次會更新同一個課程專案。</p><div class="stack"><button type="button" class="btn" data-act="close">好</button></div>');
}
function preparePrint(mode){
  var pa = $('printArea'); pa.innerHTML = '';
  var src = fullCanvas('a4').toDataURL('image/png');
  if(mode === 'a6'){ pa.innerHTML = '<div class="pg"><div class="grid4">' + [0, 1, 2, 3].map(function(){ return '<img alt="" src="' + src + '">'; }).join('') + '</div><span class="cut v"></span><span class="cut h"></span></div>'; }
  else pa.innerHTML = '<div class="pg"><img alt="" src="' + src + '"></div>';
  return Promise.all(Array.prototype.map.call(pa.querySelectorAll('img'), function(im){ return im.decode ? im.decode().catch(function(){}) : null; }));
}
async function doPrint(mode){
  toast('準備列印…'); await redraw(); await preparePrint(mode);
  setTimeout(function(){ window.print(); }, 60);
}
async function zipAll(){
  await redraw();
  var files = [], name = safeName(S.course.title);
  for(var i = 0; i < P.SIZE_ORDER.length; i++){
    var k = P.SIZE_ORDER[i], b = await blobOf(fullCanvas(k));
    files.push({name:name + '_' + P.SIZES[k].file + '_' + P.SIZES[k].w + 'x' + P.SIZES[k].h + '.png', data:new Uint8Array(await b.arrayBuffer())});
  }
  files.push({name:name + '_貼文文案.txt', data:P.postText(S)});
  return Z.zipStore(files);
}
function shareUrl(){ return (location.protocol === 'file:' ? ONLINE : location.origin + location.pathname) + '#p=' + P.encodeShare(S); }

async function aiGo(){
  if(!AI.ready()){ toast('請先到「⚙ 常用設定 → 🤖 AI 設定」填入金鑰；沒有金鑰可以按「複製提示詞」'); openSettings('ai'); return; }
  aiMsg = 'AI 思考中…（約 10～30 秒）'; $('aiMsg').textContent = aiMsg;
  try{ aiOut = await AI.generate(S, function(m){ $('aiMsg').textContent = m; }); aiMsg = '完成。'; }
  catch(e){ aiMsg = '失敗：' + (e && e.message || e); }
  OPEN.ai = true; renderPanel();
}
function aiApply(k){
  if(!aiOut) return;
  if((k === 'all' || k === 'title') && aiOut.title) S.course.title = aiOut.title;
  if(k === 'all' && aiOut.sub) S.course.sub = aiOut.sub;
  if((k === 'all' || k === 'points') && aiOut.points.length) S.course.points = aiOut.points.join('\n');
  if(k === 'all' && aiOut.who) S.course.who = aiOut.who;
  save(); renderPanel(); soon(); toast('已套用');
}

var WARN_HTML = '<h2>⚠ 使用警語</h2><ul>' +
  '<li>海報上的課程、日期、費用、<b>補助比例與資格</b>、名額都由你填寫並自行負責。政府補助課程請照計畫公告填寫，不要寫成「保證補助」「保證錄取」；寫到「補助」時海報會自動加註「補助資格與金額依計畫規定」。</li>' +
  '<li>Logo、講師照片請用<b>你有權使用</b>的圖片；放別人的照片要先取得本人同意。不得冒用政府機關、學校或其他單位的名稱與標誌。</li>' +
  '<li>QR code 會連到你填的報名網址。<b>印刷或發布前，請用手機實際掃一次</b>，並逐字核對日期、時間、金額。</li>' +
  '<li>資料（含圖片）只存在這台瀏覽器，不會上傳。使用「AI 幫我寫」時，課程文字會送到你在 ⚙ 選的 AI 服務；AI 寫的文案請自己再看一次。</li>' +
  '<li>內建字型（思源黑體、粉圓、霞鶩文楷）都是開源字型，可以商用；範例中的單位、講師、網址全部虛構。</li></ul>';
function showWarn(){ openModal(WARN_HTML + '<div class="stack"><button type="button" class="btn" data-act="close">我知道了</button></div>'); }
function sec(id, title, val, body){ return '<details class="set-sec" data-sec="' + id + '"><summary><span class="sst">' + title + '</span><span class="ssv">' + esc(val) + '</span></summary><div class="set-body">' + body + '</div></details>'; }
function aiSettings(){
  var c = AI.cfg(), pv = AI.PROVIDERS[c.provider];
  return '<label class="fld">AI 服務<select data-aicfg="provider">' + Object.keys(AI.PROVIDERS).map(function(k){ return '<option value="' + k + '"' + (c.provider === k ? ' selected' : '') + '>' + esc(AI.PROVIDERS[k].label) + '</option>'; }).join('') + '</select></label>' +
    (c.provider === 'custom' ? '<label class="fld">端點網址<input data-aicfg="base" value="' + esc(c.base || '') + '" placeholder="http://localhost:11434/v1"></label>' : '') +
    '<label class="fld">API 金鑰' + (c.provider === 'custom' ? '（沒有可空白）' : '') + '<input type="password" data-aicfg="key" value="' + esc(c.key || '') + '" autocomplete="off" spellcheck="false"></label>' +
    (pv.models.length ? '<label class="fld">模型<select data-aicfg="model">' + pv.models.map(function(m){ return '<option value="' + m[0] + '"' + (AI.aiModel(c) === m[0] ? ' selected' : '') + '>' + esc(m[1]) + '</option>'; }).join('') + '</select></label>' : '') +
    '<label class="fld">自訂模型名稱（選填）<input data-aicfg="modelCustom" value="' + esc(c.modelCustom || '') + '"></label>' +
    '<p class="small">金鑰只存在這台瀏覽器。公用電腦用完請清空。</p><div class="stack"><button type="button" class="btn red sm" data-act="aiClear">清除金鑰</button></div>';
}
function openSettings(openId){
  var xl = lsGet('fs') === 'xl';
  var h = '<div class="top"><h2 style="flex:1 1 0">⚙ 常用設定</h2><button type="button" class="btn alt sm" data-act="foldall">全部展開／收合</button></div>' +
    sec('lic', '🔑 登入序號', gateOpen ? (gateExp(LICINFO) ? '到期日 ' + expText(gateExp(LICINFO)) : '已登入') : '', '<span id="licBadge" class="lic ' + gateInfo.cls + '">' + esc(gateInfo.text) + '</span><div><span id="headcountBadge" class="lic ' + gateInfo.hcls + '">' + esc(gateInfo.head) + '</span></div><div class="stack"><button type="button" class="btn alt" data-act="logout">登出</button></div><p class="small">登出後這台電腦要重新輸入序號；海報內容、範本、AI 設定不會刪掉。</p>') +
    sec('view', '顯示', xl ? '大字' : '標準字', '<div class="stack"><button type="button" class="btn' + (xl ? ' alt' : '') + '" data-fontsize="m">標準字</button><button type="button" class="btn' + (xl ? '' : ' alt') + '" data-fontsize="xl">大字</button></div><p class="small">只影響操作畫面，不影響海報。</p>') +
    sec('ai', '🤖 AI 設定', AI.status(), aiSettings()) +
    sec('tpl', '我的範本', TPLS.length + ' 個', '<p class="small">在「例 範例與我的範本」存檔和套用。</p>' + (TPLS.length ? '<div class="stack"><button type="button" class="btn red sm" data-act="wipeTpl">刪除全部範本</button></div>' : '')) +
    sec('wipe', '🧹 清除全部資料', '', '<p class="small">清掉海報內容、Logo、講師照片、範本與 AI 金鑰（登入序號不會清掉，要登出請到上方「登入序號」）。</p><div class="stack"><button type="button" class="btn red" data-act="wipeAll">清除全部資料</button></div>') +
    sec('about', '關於本工具', '', '<p>👤 創作者 Mark Tsai（蔡豐全）<br><a href="mailto:tsaimark@gmail.com">tsaimark@gmail.com</a></p><div class="stack"><a class="btn alt" href="manual.html">📖 操作手冊</a><a class="btn alt" href="manual.html#creator">👤 創作者資訊</a><button type="button" class="btn alt" data-act="warn">⚠ 使用警語</button>' +
      (standalone ? '' : '<button type="button" class="btn alt" data-act="install">📲 加入主畫面</button>') + '</div><p class="small" style="margin-top:.5rem">訪客數 <img src="https://visitor-badge.laobi.icu/badge?page_id=m255525.coursepostermaker" alt="訪客次數" height="20" loading="lazy" style="vertical-align:middle"></p>') +
    '<div class="stack"><button type="button" class="btn" data-act="close">關閉</button></div>';
  openModal(h);
  var open = lsJson('fold', []);
  if(typeof openId === 'string' && open.indexOf(openId) < 0) open.push(openId);
  document.querySelectorAll('.set-sec').forEach(function(d){ d.open = open.indexOf(d.dataset.sec) >= 0; d.addEventListener('toggle', saveFold); });
}
function saveFold(){ var o = []; document.querySelectorAll('.set-sec').forEach(function(d){ if(d.open) o.push(d.dataset.sec); }); lsSet('fold', JSON.stringify(o)); }
function applyView(){ document.documentElement.dataset.fs = lsGet('fs') === 'xl' ? 'xl' : 'm'; }
function install(){
  if(window._dp){ window._dp.prompt(); window._dp = null; return; }
  openModal('<h2>📲 加入主畫面</h2><ul><li><b>電腦（Chrome／Edge）</b>：網址列右邊的安裝圖示。</li><li><b>iPhone／iPad（Safari）</b>：「分享」→「加入主畫面」。</li><li><b>Android（Chrome）</b>：右上角「⋮」→「安裝應用程式」。</li></ul><div class="stack"><button type="button" class="btn" data-act="close">知道了</button></div>');
}

var ACT = {
  close:closeModal, warn:showWarn, settings:openSettings, install:install,
  logout:function(){ closeModal(); gateLogout(); },
  foldall:function(){ var ds = document.querySelectorAll('.set-sec'), any = Array.prototype.some.call(ds, function(d){ return !d.open; }); ds.forEach(function(d){ d.open = any; }); saveFold(); },
  'new':function(){ lsDel('mk'); var st = P.blank(); st.look = S.look; st.size = S.size; apply(st, true); toast('已開新海報，主辦單位與版型保留'); },
  cert:fromCert,
  mkPick:function(){ openModal(mkPickHtml()); }, mkOut:mkExport,
  saveTpl:function(){ openModal('<h2>💾 存成我的範本</h2><label class="fld">範本名稱<input id="tplName" maxlength="30" value="' + esc(S.unit.name || S.course.title || '我的範本') + '"></label><p class="small">會存主辦單位、Logo、課程內容、配色版型；講師照片不存。最多 20 個。</p><div class="stack"><button type="button" class="btn" data-act="tplOk">存檔</button><button type="button" class="btn alt" data-act="close">取消</button></div>'); setTimeout(function(){ var e = $('tplName'); if(e){ e.focus(); e.select(); } }, 30); },
  tplOk:function(){ var n = P.cut(($('tplName') || {}).value || '', 30).trim() || '我的範本'; var t = P.clone(S); t.course.spkPhoto = ''; TPLS = TPLS.filter(function(x){ return x.name !== n; }); TPLS.unshift({name:n, st:t}); TPLS = TPLS.slice(0, 20); if(!lsSet('tpls', JSON.stringify(TPLS))){ TPLS.shift(); toast('瀏覽器空間不足，存不下（Logo 圖太大？）'); } else toast('已存成範本「' + n + '」'); closeModal(); renderPanel(); },
  wipeTpl:function(){ TPLS = []; lsDel('tpls'); toast('已刪除全部範本'); closeModal(); renderPanel(); },
  wipeAll:function(){ openModal('<h2>🧹 清除全部資料？</h2><p>海報內容、Logo、講師照片、範本、AI 金鑰都會刪掉，不能復原。</p><div class="stack"><button type="button" class="btn red" data-act="wipeOk">確定清除</button><button type="button" class="btn alt" data-act="close">取消</button></div>'); },
  wipeOk:function(){ ['state', 'tpls', 'ai', 'open', 'fold'].forEach(lsDel); S = P.blank(); TPLS = []; OPEN = {ex:true, course:true}; aiOut = null; closeModal(); render(); toast('已清除'); },
  suggest:function(){ $('sugg').innerHTML = P.suggestTitles(S.course).map(function(t){ return '<button type="button" class="chip" data-title="' + esc(t) + '">' + esc(t) + '</button>'; }).join(''); },
  nocolor:function(){ S.look.color = ''; save(); renderBar(); redraw(); },
  png:async function(){ await redraw(); var cv = fullCanvas(S.size); download(await blobOf(cv), safeName(S.course.title) + '_' + P.SIZES[S.size].file + '.png'); toast('已下載 ' + P.SIZES[S.size].n + ' PNG'); },
  zip:async function(){ toast('打包 6 種尺寸中…'); download(await zipAll(), safeName(S.course.title) + '_招生海報.zip'); toast('已下載 ZIP（6 種尺寸＋貼文文案）'); },
  printA4:function(){ doPrint('a4'); }, printA6:function(){ doPrint('a6'); },
  post:function(){ copyText(P.postText(S), '已複製貼文文案，可以貼到 FB、IG、LINE'); },
  share:function(){ var u = shareUrl(); openModal('<h2>🔗 分享連結</h2><p class="small">別人打開這個連結，會看到同一張海報的文字與版型（Logo、講師照片不會帶過去）。</p><textarea readonly id="shareBox">' + esc(u) + '</textarea><div class="stack"><button type="button" class="btn" data-act="shareCopy">複製連結</button><button type="button" class="btn alt" data-act="close">關閉</button></div>'); },
  shareCopy:function(){ copyText($('shareBox').value, '已複製分享連結'); },
  aiGo:aiGo,
  aiCopy:function(){ copyText(AI.prompt(S), '已複製提示詞，貼到 ChatGPT／Gemini／Claude，再把回覆貼回來'); },
  aiPaste:function(){ openModal('<h2>📥 貼上 AI 回覆</h2><p class="small">把 AI 回的 JSON（大括號 { } 那一段）整段貼進來。</p><textarea id="aiPasteBox" placeholder="{&quot;title&quot;:&quot;…&quot;}"></textarea><div class="stack"><button type="button" class="btn" data-act="aiPasteOk">讀取</button><button type="button" class="btn alt" data-act="close">取消</button></div>'); },
  aiPasteOk:function(){ try{ aiOut = AI.fromText($('aiPasteBox').value); aiMsg = '已讀取 AI 回覆。'; closeModal(); OPEN.ai = true; renderPanel(); }catch(e){ toast('讀不懂：' + e.message); } },
  aiClear:function(){ lsDel('ai'); closeModal(); openSettings('ai'); updateSums(); toast('已清除金鑰'); },
};

document.addEventListener('click', function(e){
  var t = e.target.closest('[data-act],[data-ex],[data-tpl],[data-deltpl],[data-size],[data-style],[data-pal],[data-pt],[data-title],[data-delimg],[data-aiapply],[data-fontsize],[data-mkin]');
  if(!t) return;
  if(t.tagName === 'A' && t.getAttribute('href') === '#') e.preventDefault();
  var d = t.dataset;
  if(d.act && ACT[d.act]){ e.preventDefault(); ACT[d.act](); return; }
  if(d.mkin){ mkApply(d.mkin); return; }
  if(d.ex){ loadExample(d.ex); return; }
  if(d.tpl){ var tp = TPLS[+d.tpl]; if(tp){ var st = P.clone(tp.st); st.course.spkPhoto = ''; apply(st); toast('已套用範本「' + tp.name + '」'); } return; }
  if(d.deltpl){ TPLS.splice(+d.deltpl, 1); lsSet('tpls', JSON.stringify(TPLS)); renderPanel(); return; }
  if(d.size){ S.size = d.size; save(); renderBar(); redraw(); return; }
  if(d.style){ S.look.style = d.style; if(d.style === 'note' && S.look.font === 'hei') S.look.font = 'kai'; else if(d.style !== 'note' && S.look.font === 'kai') S.look.font = 'hei'; save(); renderBar(); redraw(); return; }
  if(d.pal){ S.look.pal = d.pal; S.look.color = ''; save(); renderBar(); redraw(); return; }
  if(d.pt){ var ps = P.lines(S.course.points, 99); if(ps.length >= 5){ toast('亮點最多 5 條'); return; } if(ps.indexOf(d.pt) < 0) ps.push(d.pt); S.course.points = ps.join('\n'); save(); var ta = document.querySelector('[data-b="course.points"]'); if(ta) ta.value = S.course.points; updateSums(); soon(); return; }
  if(d.title){ S.course.title = d.title; save(); var ti = document.querySelector('[data-b="course.title"]'); if(ti) ti.value = d.title; updateSums(); soon(); return; }
  if(d.delimg){ setPath(d.delimg, ''); save(); renderPanel(); soon(); return; }
  if(d.aiapply){ aiApply(d.aiapply); return; }
  if(d.fontsize){ lsSet('fs', d.fontsize); applyView(); openSettings(); return; }
});
document.addEventListener('input', function(e){
  var t = e.target;
  if(t.dataset.b){ setPath(t.dataset.b, t.type === 'checkbox' ? t.checked : t.value); save(); updateSums(); soon(); if(t.dataset.b === 'course.online') renderPanel(); return; }
  if(t.hasAttribute('data-color')){ S.look.color = t.value; save(); soon(); var nb = document.querySelector('[data-act="nocolor"]'); if(!nb) renderBar(); return; }
  if(t.dataset.aicfg){ var c = AI.cfg(); c[t.dataset.aicfg] = t.value; if(t.dataset.aicfg === 'provider'){ c.model = ''; } AI.saveCfg(c); updateSums(); if(t.dataset.aicfg === 'provider'){ openSettings('ai'); } return; }
});
document.addEventListener('change', function(e){
  var t = e.target;
  if(t.id === 'mkFile' && t.files[0]){ var mf = new FileReader(); mf.onload = function(){ t.value = ''; var r = MKCourse.fromText(mf.result); if(r.error){ toast(r.error); return; } var last = null; r.docs.forEach(function(x){ last = MK.store.put(x) || last; }); if(!last){ toast('存不進這台電腦（瀏覽器空間不足或封鎖網站資料）'); return; } if(r.docs.length === 1) mkApply(last.id); else openModal(mkPickHtml()); }; mf.readAsText(t.files[0]); return; }
  if(t.hasAttribute('data-font')){ S.look.font = t.value; save(); redraw(); return; }
  if(t.dataset.img && t.files && t.files[0]){
    var logo = t.dataset.img === 'unit.logo';
    readImg(t.files[0], logo ? 600 : 700, logo).then(function(u){ setPath(t.dataset.img, u); save(); renderPanel(); soon(); }).catch(function(err){ toast(err.message); });
  }
});
document.addEventListener('toggle', function(e){ var d = e.target; if(d.classList && d.classList.contains('card')){ OPEN[d.dataset.card] = d.open; lsSet('open', JSON.stringify(OPEN)); } }, true);
$('modal').addEventListener('click', function(e){ if(e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && $('modal').classList.contains('show')) closeModal(); });
window.addEventListener('resize', function(){ clearTimeout(rT); rT = setTimeout(redraw, 200); });
window.addEventListener('afterprint', function(){ $('printArea').innerHTML = ''; });

/* ---------- 跑馬燈（工作區共用公告，不可關） ---------- */
function initMarquee(){
  var URL_ = "https://script.google.com/macros/s/AKfycbwKX0DNNbY8y4nf90BFTHtxgfqJcHHcZasRrgycl4QAe52_hkjMWSkYk4xOsqU-JPCROw/exec";
  var REFRESH = 20 * 60 * 1000, bar = $('marqueeBar'), track = $('marqueeTrack'), lastKey = null;
  function appendText(c, text){ var re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, li = 0, m; while((m = re.exec(text))){ if(m.index > li) c.appendChild(document.createTextNode(text.slice(li, m.index))); var a = document.createElement('a'); a.href = m[2]; a.textContent = m[1]; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.style.color = 'inherit'; a.style.textDecoration = 'underline'; c.appendChild(a); li = re.lastIndex; } if(li < text.length) c.appendChild(document.createTextNode(text.slice(li))); }
  function renderM(items){
    if(!items || !items.length) return;
    var k = JSON.stringify(items); if(k === lastKey) return; lastKey = k; track.innerHTML = '';
    var fr = document.createDocumentFragment();
    function pass(){ items.forEach(function(it, i){ if(i > 0) fr.appendChild(document.createTextNode('　★　')); appendText(fr, String(it)); }); }
    pass(); fr.appendChild(document.createTextNode('　★　')); pass(); track.appendChild(fr);
    bar.classList.add('show'); document.body.classList.add('has-marquee');
    track.style.animationDuration = Math.max(track.scrollWidth / 2 / 60, 12) + 's';
  }
  function fetchM(){ fetch(URL_, {method:'POST', body:JSON.stringify({serial:''})}).then(function(r){ return r.json(); }).then(function(d){ if(d && Array.isArray(d.marquee) && d.marquee.length){ lsSet('marquee', JSON.stringify(d.marquee)); renderM(d.marquee); } }).catch(function(){}); }
  renderM(lsJson('marquee', [])); fetchM(); setInterval(fetchM, REFRESH);
}

window.addEventListener('beforeinstallprompt', function(e){ e.preventDefault(); window._dp = e; });
if('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('service-worker.js').catch(function(){});
function checkHash(){
  var m = location.hash.match(/^#p=([A-Za-z0-9_-]+)/);
  if(!m) return false;
  var st = P.decodeShare(m[1]);
  history.replaceState(null, '', location.pathname + location.search);
  if(st){ apply(st); toast('已載入分享的海報（Logo 與講師照片需要自己補上）'); return true; }
  toast('分享連結不完整，讀不出來'); return false;
}
window.addEventListener('hashchange', checkHash);

/* ---------- 登入序號閘門（2026-11-17，複製自訓練證書產生器） ----------
   序號在試算表「辦訓相關」的分頁「課程招生海報產生器」，和訓練證書產生器共用同一支 Apps Script（請求帶 sheet 指定分頁）。
   開啟時 fail-closed：驗證沒通過就整個工具都不能用。已登入後的背景重驗只有連線失敗或 server_error 不上鎖（正在排版不要被打斷），
   序號過期、查無序號才上鎖。序號存 cpmEntrySerial（刻意不用 cpm. 前綴，⚙ 清除資料不會登出）。 */
var LICENSE_CHECK_URL = 'https://script.google.com/macros/s/AKfycbw2qz-sTKRVkVHGQZLTj73xlJdDiaHG8eNexjAN9XWMrly5BnxVcP8dC0qE3kADHeIl/exec';
var LICENSE_SHEET = '課程招生海報產生器';
var SERIAL_KEY = 'cpmEntrySerial', CLIENT_KEY = 'cpmEntryClientId', RECHECK_MS = 20 * 60 * 1000;
// 公開在登入頁的免費試用序號（使用者 2026-11-17 指定，和訓練證書產生器同一組；試算表那一列：到 2027/5/17、人數上限 10）。停用時改成 '' 就不顯示。
var FREE_SERIAL = 'FLf9M6zAX8pe';
function rawGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function rawSet(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
function rawDel(k){ try{ localStorage.removeItem(k); }catch(e){} }
var gateOpen = false, LICINFO = null;
var gateInfo = {cls:'', text:'尚未驗證', hcls:'', head:''};
var REASON_LABEL = {
  missing_serial:'請輸入登入序號',
  serial_not_found:'查無此序號，請確認有沒有打錯',
  expired:'這組序號已經過期了',
  network_error:'連不上網路，請確認網路後再按一次確認',
  server_error:'驗證暫時失敗，請等一下再試'
};
function clientId(){
  var id = rawGet(CLIENT_KEY);
  if(!id){ id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2); rawSet(CLIENT_KEY, id); }
  return id;
}
function gateStatus(cls, text){
  gateInfo.cls = cls; gateInfo.text = text;
  var e = $('entryGateStatus'); e.className = 'lic ' + cls; e.textContent = text;
  var b = $('licBadge'); if(b){ b.className = 'lic ' + cls; b.textContent = text; }
}
function gateHead(l){
  var limited = l && typeof l.headcountLimit === 'number', free = l && l.valid && !limited, left = limited ? Math.max(l.headcountRemaining || 0, 0) : 0;
  gateInfo.head = !l ? '' : free ? '此序號不限登入人數' : limited ? '此序號還可登入 ' + left + ' 人（上限 ' + l.headcountLimit + ' 人）' : '';
  gateInfo.hcls = free || left > 0 ? 'ok' : 'bad';
  var g = $('entryGateHeadcount'); g.textContent = l && l.reason === 'headcount_exceeded' ? gateInfo.head : '';
  var b = $('headcountBadge'); if(b){ b.className = 'lic ' + gateInfo.hcls; b.textContent = gateInfo.head; }
}
function checkLicense(serial, attempt, renew){
  attempt = attempt || 1;
  if(!LICENSE_CHECK_URL) return Promise.reject(new Error('尚未設定授權伺服器'));
  var ctl = window.AbortController ? new AbortController() : null, tm = ctl && setTimeout(function(){ ctl.abort(); }, 20000);
  // Apps Script 不回應 OPTIONS 預檢，所以不設 Content-Type
  return fetch(LICENSE_CHECK_URL, {method:'POST', body:JSON.stringify({serial:serial, sheet:LICENSE_SHEET, clientId:clientId(), renew:!!renew}), signal:ctl ? ctl.signal : undefined}).catch(function(){
    throw new Error(REASON_LABEL.network_error);
  }).then(function(r){
    clearTimeout(tm);
    if(!r.ok) throw new Error(REASON_LABEL.server_error);
    return r.text();
  }).then(function(t){
    var d; try{ d = JSON.parse(t); }catch(e){ d = null; }
    if(!d || typeof d.valid !== 'boolean'){
      if(attempt < 3) return checkLicense(serial, attempt + 1, renew);
      throw new Error(REASON_LABEL.server_error);
    }
    return d;
  });
}
// 到期日：後端回傳結束日期當天 00:00（台北）的 ISO，當天結束前都有效。用瀏覽器本地日期顯示、算剩幾天。
function gateExp(l){
  if(!l || !l.expiresAt) return null;
  var e = new Date(l.expiresAt); if(isNaN(e)) return null;
  var end = new Date(e.getFullYear(), e.getMonth(), e.getDate()), t = new Date(Date.now()), today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  return {y:end.getFullYear(), m:end.getMonth() + 1, d:end.getDate(), left:Math.max(Math.round((end - today) / 86400000), 0)};
}
function expText(x){ return x.y + '/' + x.m + '/' + x.d; }
function gateDays(l){
  var x = gateExp(l); if(!x) return '序號有效';
  return '序號有效，可以用到 ' + expText(x) + '（還有 ' + x.left + ' 天）';
}
function showLicTop(){
  var el = $('licTop'); if(!el) return;
  var x = gateExp(LICINFO);
  el.hidden = !gateOpen || !LICINFO;
  if(el.hidden) return;
  el.className = 'ibtn lictop' + (x && x.left <= 14 ? ' soon' : '');
  el.innerHTML = x ? '🔑 序號到期日 <b>' + expText(x) + '</b><small>（還有 ' + x.left + ' 天）</small>' : '🔑 序號有效';
  el.title = '登入序號的使用期限' + (typeof LICINFO.headcountLimit === 'number' ? '；此序號同時最多 ' + LICINFO.headcountLimit + ' 人登入' : '') + '。點一下看詳細';
}
function gateUnlock(l){
  LICINFO = l; gateStatus('ok', '✓ ' + gateDays(l)); gateHead(l);
  $('entryGate').classList.add('hidden');
  var first = !gateOpen; gateOpen = true; showLicTop();
  if(first){
    redraw(); // 閘門擋著時畫的預覽可能還沒拿到字型，解鎖後重畫一次
    if(!lsGet('warnSeen')){ showWarn(); lsSet('warnSeen', '1'); } // 首訪警語改在第一次解鎖後才跳
  }
}
function gateLock(text, l){
  gateOpen = false; LICINFO = null; showLicTop();
  gateStatus('bad', '✗ ' + text); gateHead(l && l.reason === 'headcount_exceeded' ? l : null);
  closeModal(); $('entryGate').classList.remove('hidden');
}
function gateRun(serial, renew){
  if(!serial){ gateLock(REASON_LABEL.missing_serial); return Promise.resolve(); }
  return checkLicense(serial, 1, renew).then(function(l){
    if(l.valid) gateUnlock(l);
    else if(l.reason === 'server_error' && gateOpen) return;
    else gateLock(REASON_LABEL[l.reason] || l.message || '序號驗證失敗', l);
  }).catch(function(e){ if(!gateOpen) gateLock(e.message); });
}
function gateRenew(){ var s = rawGet(SERIAL_KEY); if(s && gateOpen) gateRun(s, true); }
function gateRelease(serial){
  if(!serial || !navigator.sendBeacon || !LICENSE_CHECK_URL) return;
  try{ navigator.sendBeacon(LICENSE_CHECK_URL, new Blob([JSON.stringify({serial:serial, sheet:LICENSE_SHEET, clientId:clientId(), release:true})], {type:'text/plain'})); }catch(e){}
}
function gateLogout(){
  gateRelease(rawGet(SERIAL_KEY)); rawDel(SERIAL_KEY);
  $('entryGateSerial').value = ''; gateLock('已登出，請輸入登入序號');
}
function initGate(){
  var input = $('entryGateSerial'), btn = $('btnEntryGateConfirm');
  btn.onclick = function(){ var s = input.value.trim(); rawSet(SERIAL_KEY, s); gateStatus('', '驗證中…'); gateRun(s, false); };
  input.addEventListener('keydown', function(e){ if(e.key === 'Enter') btn.click(); });
  if(FREE_SERIAL){
    $('gateFreeCode').textContent = FREE_SERIAL;
    $('btnGateFree').onclick = function(){ input.value = FREE_SERIAL; btn.click(); };
    $('btnGateFreeCopy').onclick = function(){
      var b = $('btnGateFreeCopy'), done = function(){ b.textContent = '已複製 ✓'; setTimeout(function(){ b.textContent = '複製序號'; }, 2000); }; // toast 會被閘門蓋住，所以改按鈕文字
      var fb = function(){ var t = document.createElement('textarea'); t.value = FREE_SERIAL; document.body.appendChild(t); t.select(); try{ document.execCommand('copy'); }catch(e){} t.remove(); done(); };
      if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(FREE_SERIAL).then(done, fb); else fb();
    };
  } else $('gateFree').hidden = true;
  function maskSerial(hide){ // 預設隱藏，免得旁人看到；要核對時才按顯示
    var t = $('btnEntryGateToggle');
    input.type = hide ? 'password' : 'text';
    t.textContent = hide ? '👁 顯示' : '🙈 隱藏'; t.setAttribute('aria-pressed', String(!hide)); t.setAttribute('aria-label', hide ? '顯示序號' : '隱藏序號');
  }
  $('btnEntryGateToggle').onclick = function(){ maskSerial(input.type === 'text'); };
  btn.addEventListener('click', function(){ maskSerial(true); });
  input.value = rawGet(SERIAL_KEY) || '';
  if(input.value){ gateStatus('', '驗證中…'); gateRun(input.value, false); }
  setInterval(gateRenew, RECHECK_MS);
  window.addEventListener('pagehide', function(){ gateRelease(rawGet(SERIAL_KEY)); }); // 送不出去也沒關係，後端 40 分鐘逾時兜底
}

applyView();
if(firstRun && !location.hash){ var e0 = P.clone(P.EXAMPLES[0].st); S = merge(e0); save(); }
render(); initMarquee(); checkHash(); initGate();
window._cpm = {get gateOpen(){ return gateOpen; }, get S(){ return S; }, redraw:redraw, fullCanvas:fullCanvas, preparePrint:preparePrint, loadExample:loadExample, zipAll:zipAll, get LAST(){ return LAST; }, shareUrl:shareUrl, setPath:function(p, v){ setPath(p, v); save(); return redraw(); }, ACT:ACT};
})();
