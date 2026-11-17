/* 課程招生海報產生器：Canvas 2D 繪圖（預覽、縮圖、PNG、列印共用同一支）。
   位置由 data.js 的 layout() 決定，這裡負責上色、裝飾、把字縮到放得進框。不用任何外部素材。 */
(function(root){
'use strict';
var P = root.CPM;
var NAMES = {head:'主辦單位', title:'課程名稱', sub:'副標', fee:'費用', info:'時間地點費用', points:'課程亮點', who:'適合對象', outline:'課程大綱', speaker:'講師', photo:'講師', foot:'聯絡資訊', qrbox:'報名 QR', contact:'聯絡資訊'};

function rr(ctx, x, y, w, h, r){ r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function onCol(bg){ return P.lum(bg) > .42 ? '#1A1A1A' : '#FFFFFF'; }

/* opts: {data, size, scale, imgs:{logo, photo, qr}, preview}；回傳 {warn:[區塊名稱], layout} */
function draw(ctx, opts){
  var data = opts.data, look = data.look || {}, c = data.course || {}, u = data.unit || {};
  var L = P.layout(look.style, opts.size, data), W = L.W, H = L.H, st = L.style;
  var pal = P.palette(look.pal, look.color), F = P.FONTS[look.font] || P.FONTS.hei, imgs = opts.imgs || {};
  var warn = [], sc = opts.scale || 1;
  ctx.save();
  ctx.setTransform(sc, 0, 0, sc, 0, 0);
  ctx.textBaseline = 'alphabetic';
  function font(s, w){ return (w || F.bw) + ' ' + s + 'px ' + F.f; }
  function meas(w){ return function(t, s){ ctx.font = font(s, w); return ctx.measureText(t).width; }; }
  function txt(t, x, y, s, w, col, align){ ctx.font = font(s, w); ctx.fillStyle = col; ctx.textAlign = align || 'left'; ctx.fillText(t, x, y); }
  function over(b){ if(warn.indexOf(NAMES[b.t]) < 0) warn.push(NAMES[b.t]); if(opts.preview){ ctx.save(); ctx.setLineDash([W * .01, W * .006]); ctx.lineWidth = Math.max(2, W * .003); ctx.strokeStyle = '#E00000'; ctx.strokeRect(b.x, b.y, b.w, b.h); ctx.restore(); } }
  var ink = pal.ink, c1 = pal.c1, c2 = pal.c2;
  function tc(b){ return b.on ? '#FFFFFF' : ink; }
  function ac(b){ return b.on ? c2 : c1; }

  /* ---------- 底色與裝飾 ---------- */
  var hero = L.hero;
  if(st === 'note'){
    ctx.fillStyle = '#FBF8EF'; ctx.fillRect(0, 0, W, H);
    var step = Math.round(Math.min(W, H) * .045);
    ctx.strokeStyle = 'rgba(80,130,190,.18)'; ctx.lineWidth = Math.max(1, W * .0012);
    for(var ly = step * 2; ly < H; ly += step){ ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(W, ly); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(214,72,72,.35)'; ctx.lineWidth = Math.max(1.5, W * .002);
    ctx.beginPath(); ctx.moveTo(L.pad * .55, 0); ctx.lineTo(L.pad * .55, H); ctx.stroke();
  } else { ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, H); }
  if(hero){
    if(hero.light){ ctx.fillStyle = pal.soft; ctx.fillRect(hero.x, hero.y, hero.w, hero.h); ctx.fillStyle = c2; ctx.fillRect(hero.x, hero.y + hero.h - Math.max(4, H * .006), hero.w, Math.max(4, H * .006)); }
    else if(st === 'pop'){
      ctx.fillStyle = c1; ctx.beginPath();
      // 斜邊一律在文字外側：直式往左下斜（右邊剛好蓋到副標底），橫式右邊從 67% 斜到 61%（文字只到 60%）
      if(L.shape === 'wide'){ ctx.moveTo(0, 0); ctx.lineTo(W * .67, 0); ctx.lineTo(W * .61, H); ctx.lineTo(0, H); }
      else { ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, hero.h); ctx.lineTo(0, hero.h + H * .025); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = c2; ctx.globalAlpha = .38;
      var dr = Math.min(W, H) * .006, dg = dr * 5.5, x0 = (L.shape === 'wide' ? hero.w * .62 : W * .7);
      for(var dx = x0; dx < (L.shape === 'wide' ? hero.w * .86 : W - dg); dx += dg) for(var dy = dg; dy < Math.min(hero.h * .75, H * .2); dy += dg){ ctx.beginPath(); ctx.arc(dx, dy, dr, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = pal.soft; ctx.beginPath(); ctx.arc(L.shape === 'wide' ? W * .97 : W * .02, H * .985, Math.min(W, H) * .16, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = c1; ctx.fillRect(hero.x, hero.y, hero.w, hero.h);
      if(st === 'subsidy'){
        ctx.save(); ctx.beginPath(); ctx.rect(hero.x, hero.y, hero.w, hero.h); ctx.clip();
        ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = Math.min(W, H) * .02;
        for(var sx = -H; sx < W + H; sx += Math.min(W, H) * .07){ ctx.beginPath(); ctx.moveTo(sx, hero.y + hero.h); ctx.lineTo(sx + hero.h, hero.y); ctx.stroke(); }
        ctx.restore();
      }
      if(st === 'biz'){ ctx.fillStyle = c2; ctx.fillRect(hero.x, hero.y + hero.h, hero.w, Math.max(4, H * .005)); }
      if(st === 'list'){ ctx.fillStyle = c2; ctx.fillRect(hero.x, hero.y + hero.h - Math.max(5, H * .007), hero.w, Math.max(5, H * .007)); }
    }
  }

  /* ---------- 區塊 ---------- */
  L.blocks.forEach(function(b){
    var f, i, yy;
    if(b.t === 'head'){
      var x = b.x, hh = b.h;
      if(imgs.logo){ var lw = Math.min(hh * 2.4, imgs.logo.width / imgs.logo.height * hh); if(b.on){ ctx.fillStyle = '#FFFFFF'; rr(ctx, x - hh * .08, b.y - hh * .08, lw + hh * .16, hh * 1.16, hh * .12); ctx.fill(); } ctx.drawImage(imgs.logo, x, b.y, lw, hh); x += lw + hh * .35; }
      var tagW = 0;
      if(c.tag){
        var ts = hh * .46; ctx.font = font(ts, 700); tagW = ctx.measureText(c.tag).width + ts * 1.6;
        var tbg = b.on ? c2 : c1;
        ctx.fillStyle = tbg; rr(ctx, b.x + b.w - tagW, b.y + hh * .1, tagW, hh * .8, hh * .4); ctx.fill();
        txt(c.tag, b.x + b.w - tagW / 2, b.y + hh * .5 + ts * .36, ts, 700, onCol(tbg), 'center');
      }
      if(u.name){
        f = P.fitText(u.name, b.x + b.w - x - tagW - hh * .3, hh, {max:hh * .55, min:hh * .25, maxLines:2, lh:1.15, measure:meas(700)});
        yy = b.y + (hh - f.lines.length * f.size * 1.15) / 2 + f.size * .92;
        f.lines.forEach(function(l, k){ txt(l, x, yy + k * f.size * 1.15, f.size, 700, b.on ? '#FFFFFF' : c1); });
        if(f.over) over(b);
      }
    }
    else if(b.t === 'title'){
      var tt = c.title || (opts.preview ? '（請輸入課程名稱）' : '');
      f = P.fitText(tt, b.w, b.h, {max:Math.min(b.h / 1.18, W * (L.shape === 'wide' ? .075 : .115)), min:b.h * .12, maxLines:3, lh:1.18, measure:meas(F.tw)});
      yy = b.y + (b.h - f.lines.length * f.size * 1.18) / 2 + f.size * .95;
      var col = b.on ? '#FFFFFF' : (st === 'note' ? ink : c1);
      if(st === 'note' && f.lines.length){ // 紙膠帶
        ctx.save(); ctx.translate(b.x + f.size * .2, yy - f.size * 1.05); ctx.rotate(-.12); ctx.fillStyle = P.mix(c2, '#ffffff', .25); ctx.globalAlpha = .7; ctx.fillRect(0, 0, f.size * 2.2, f.size * .55); ctx.restore();
      }
      f.lines.forEach(function(l, k){ txt(l, b.x, yy + k * f.size * 1.18, f.size, F.tw, c.title ? col : 'rgba(127,127,127,.6)'); });
      if(f.over) over(b);
    }
    else if(b.t === 'sub'){
      f = P.fitText(c.sub, b.w, b.h, {max:b.h * .62, min:b.h * .2, maxLines:2, lh:1.25, measure:meas(F.bw)});
      yy = b.y + (b.h - f.lines.length * f.size * 1.25) / 2 + f.size * .95;
      f.lines.forEach(function(l, k){ txt(l, b.x, yy + k * f.size * 1.25, f.size, F.bw, b.on ? 'rgba(255,255,255,.93)' : ink); });
      if(f.over) over(b);
    }
    else if(b.t === 'fee'){
      var fbg = c2, fcol = onCol(fbg), note = P.cut(c.feeNote, 20), big = c.feeAfter ? P.money(c.feeAfter) : P.money(c.fee);
      var lab = /補助/.test(note) ? '自付' : (c.feeAfter ? '優惠價' : '費用');
      ctx.fillStyle = fbg; rr(ctx, b.x, b.y, b.w, b.h, b.h * .16); ctx.fill();
      var orig = c.feeAfter && c.fee ? '原價 ' + P.money(c.fee) : '', nt = note ? note + (/補助/.test(note) ? '（資格依計畫規定）' : '') : '';
      function strike(t, x, y, s, align){ if(!t) return; txt(t, x, y, s, 700, fcol, align); ctx.font = font(s, 700); var tw2 = ctx.measureText(t).width, x0 = align === 'right' ? x - tw2 : x; ctx.strokeStyle = fcol; ctx.lineWidth = Math.max(2, s * .1); ctx.beginPath(); ctx.moveTo(x0, y - s * .32); ctx.lineTo(x0 + tw2, y - s * .32); ctx.stroke(); }
      var pad = Math.min(b.h, b.w) * .14, inner = b.w - pad * 2, ih = b.h - pad * 2;
      if(b.w / b.h >= 3){ // 橫長：左邊大字自付金額，右邊兩行小字（原價、說明）
        f = P.fitText(lab + ' ' + big, inner * .56, ih, {max:ih * .7, min:ih * .2, maxLines:1, measure:meas(900)});
        txt(f.lines[0] || '', b.x + pad, b.y + b.h / 2 + f.size * .36, f.size, 900, fcol);
        var rw2 = inner * .42, rx2 = b.x + b.w - pad, rs = Math.min(ih * .3, f.size * .5);
        var g1 = orig ? P.fitText(orig, rw2, rs * 1.2, {max:rs, min:rs * .4, maxLines:1, measure:meas(700)}) : null;
        var g2 = nt ? P.fitText(nt, rw2, ih * .55, {max:rs, min:rs * .35, maxLines:2, lh:1.2, measure:meas(700)}) : null;
        var tot = (g1 ? g1.size * 1.3 : 0) + (g2 ? g2.lines.length * g2.size * 1.2 : 0), ry = b.y + (b.h - tot) / 2;
        if(g1){ strike(g1.lines[0], rx2, ry + g1.size, g1.size, 'right'); ry += g1.size * 1.3; }
        if(g2) g2.lines.forEach(function(l, k){ txt(l, rx2, ry + g2.size * (1 + k * 1.2), g2.size, 700, fcol, 'right'); });
      } else { // 窄：三行由上往下
        var s1 = ih * .17, s3 = ih * .14, y0 = b.y + pad;
        if(orig){ strike(orig, b.x + pad, y0 + s1, s1); y0 += s1 * 1.35; }
        var bh = b.y + b.h - pad - (nt ? s3 * 1.5 : 0) - y0;
        f = P.fitText(lab + ' ' + big, inner, bh, {max:bh * .85, min:bh * .2, maxLines:1, measure:meas(900)});
        txt(f.lines[0] || '', b.x + pad, y0 + (bh + f.size * .72) / 2, f.size, 900, fcol);
        if(nt){ var g = P.fitText(nt, inner, s3 * 1.3, {max:s3, min:s3 * .4, maxLines:1, measure:meas(700)}); txt(g.lines[0] || '', b.x + pad, b.y + b.h - pad, g.size, 700, fcol); }
      }
      if(f.over) over(b);
    }
    else if(b.t === 'info'){
      var rows = P.infoRows(c, L.shape === 'wide' ? 6 : (L.shape === 'square' ? 4 : 6));
      if(L.shape === 'wide') rows = rows.filter(function(r){ return r[0] !== '名額' && r[0] !== '截止'; }).slice(0, 3);
      f = P.fitList(rows.map(function(r){ return r[1]; }), b.w, b.h, {max:b.h / rows.length * .62, min:b.h * .03, lh:1.28, gap:.5, indent:3.6, measure:meas(F.bw)});
      var s = f.size, lh = s * 1.28, gp = s * .5, yb = b.y + (b.h - f.height) / 2;
      f.items.forEach(function(ls, k){
        var rh = ls.length * lh;
        if(st === 'list'){ ctx.fillStyle = b.on ? (k % 2 ? 'rgba(255,255,255,0)' : 'rgba(255,255,255,.1)') : (k % 2 ? pal.bg : pal.soft); ctx.fillRect(b.x - s * .3, yb - gp * .5, b.w + s * .6, rh + gp); }
        var pbg = ac(b);
        ctx.fillStyle = pbg; rr(ctx, b.x, yb + (lh - s * 1.3) / 2, s * 3, s * 1.3, s * .3); ctx.fill();
        txt(rows[k][0], b.x + s * 1.5, yb + (lh - s * 1.3) / 2 + s * .98, s * .82, 700, onCol(pbg), 'center');
        ls.forEach(function(l, j){ txt(l, b.x + s * 3.6, yb + j * lh + s * 1.02, s, (rows[k][0] === '費用' || rows[k][0] === '日期') ? 700 : F.bw, tc(b)); });
        yb += rh + gp;
      });
      if(f.over) over(b);
    }
    else if(b.t === 'points'){
      var pts = P.points(c, L.shape === 'square' ? 3 : 5), ib = b;
      if(st === 'note'){
        ctx.save(); ctx.translate(b.x + b.w / 2, b.y + b.h / 2); ctx.rotate(-.012);
        ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = W * .012; ctx.shadowOffsetY = W * .004;
        ctx.fillStyle = '#FFF1A8'; ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); ctx.restore();
        ib = {x:b.x + b.w * .05, y:b.y + b.h * .08, w:b.w * .9, h:b.h * .84, t:'points'};
      }
      f = P.fitList(pts, ib.w, ib.h, {max:ib.h / pts.length * .6, min:ib.h * .03, lh:1.3, gap:.45, indent:1.7, measure:meas(F.bw)});
      s = f.size; lh = s * 1.3; yb = ib.y + (ib.h - f.height) / 2;
      f.items.forEach(function(ls){
        var cy = yb + lh / 2, r = s * .52;
        ctx.fillStyle = st === 'note' ? c1 : c2; ctx.beginPath(); ctx.arc(ib.x + r, cy, r, 0, 7); ctx.fill();
        ctx.strokeStyle = onCol(st === 'note' ? c1 : c2); ctx.lineWidth = Math.max(1.5, s * .13); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(ib.x + r * .52, cy + r * .02); ctx.lineTo(ib.x + r * .88, cy + r * .4); ctx.lineTo(ib.x + r * 1.5, cy - r * .38); ctx.stroke();
        ls.forEach(function(l, j){ txt(l, ib.x + s * 1.7, yb + j * lh + s * 1.02, s, F.bw === 400 && st !== 'note' ? 400 : (F.tw >= 700 ? 700 : F.bw), ink); });
        yb += ls.length * lh + s * .45;
      });
      if(f.over) over(b);
    }
    else if(b.t === 'who'){
      f = P.fitList([c.who], b.w, b.h, {max:b.h * .55, min:b.h * .15, lh:1.25, indent:5, measure:meas(F.bw)});
      s = f.size; yb = b.y + (b.h - f.height) / 2;
      ctx.fillStyle = pal.soft; rr(ctx, b.x, yb + (s * 1.25 - s * 1.3) / 2, s * 4.4, s * 1.3, s * .3); ctx.fill();
      txt('適合對象', b.x + s * 2.2, yb + (s * 1.25 - s * 1.3) / 2 + s * .98, s * .82, 700, c1, 'center');
      f.items[0].forEach(function(l, j){ txt(l, b.x + s * 5, yb + j * s * 1.25 + s * 1.0, s, F.bw, ink); });
      if(f.over) over(b);
    }
    else if(b.t === 'outline'){
      var ol = P.outline(c).map(function(t){ return t.replace(/\s*[｜|]\s*(\d+(?:\.\d+)?)\s*$/, '（$1 小時）'); });
      var hs = Math.min(b.h * .16, W * .022);
      txt('課程大綱', b.x, b.y + hs, hs, 700, c1);
      ctx.fillStyle = c2; ctx.fillRect(b.x, b.y + hs * 1.3, hs * 4, Math.max(2, hs * .1));
      var cols = ol.length > 5 ? 2 : 1, half = Math.ceil(ol.length / cols), cw = (b.w - (cols - 1) * W * .03) / cols, top = b.y + hs * 1.7, ah = b.h - hs * 1.7;
      var fs = [];
      for(i = 0; i < cols; i++) fs.push(P.fitList(ol.slice(i * half, (i + 1) * half).map(function(t, k){ return t; }), cw, ah, {max:ah / half * .62, min:ah * .03, lh:1.25, gap:.3, indent:1.8, measure:meas(F.bw)}));
      var os = Math.min.apply(null, fs.map(function(x){ return x.size; }));
      for(i = 0; i < cols; i++){
        var g2 = P.fitList(ol.slice(i * half, (i + 1) * half), cw, ah, {max:os, min:os, lh:1.25, gap:.3, indent:1.8, measure:meas(F.bw)});
        yb = top; var xx = b.x + i * (cw + W * .03);
        g2.items.forEach(function(ls, k){ txt((i * half + k + 1) + '.', xx, yb + os, os, 700, c1); ls.forEach(function(l, j){ txt(l, xx + os * 1.8, yb + j * os * 1.25 + os, os, F.bw, ink); }); yb += ls.length * os * 1.25 + os * .3; });
        if(g2.over) over(b);
      }
    }
    else if(b.t === 'speaker'){
      var d = b.h; avatar(b.x + d / 2, b.y + d / 2, d / 2);
      var nx = b.x + d * 1.25, nw = b.w - d * 1.25;
      f = P.fitText(c.spkName ? '講師　' + c.spkName : '', nw, b.h * .55, {max:b.h * .4, min:b.h * .15, maxLines:1, measure:meas(700)});
      txt(f.lines[0] || '', nx, b.y + b.h * .46, f.size, 700, c1);
      var g3 = P.fitText(c.spkTitle || '', nw, b.h * .4, {max:b.h * .28, min:b.h * .12, maxLines:1, measure:meas(F.bw)});
      txt(g3.lines[0] || '', nx, b.y + b.h * .86, g3.size, F.bw, ink);
      if(f.over || g3.over) over(b);
    }
    else if(b.t === 'photo'){
      var nh = c.spkName ? Math.min(b.h * .26, b.w * .32) : 0, dd = Math.min(b.w, b.h - nh);
      var cx = b.x + b.w / 2, cy2 = b.y + dd / 2;
      ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(cx, cy2, dd / 2, 0, 7); ctx.fill();
      avatar(cx, cy2, dd / 2 * .9);
      if(nh){
        f = P.fitText(c.spkName, b.w, nh * .55, {max:nh * .46, min:nh * .15, maxLines:1, measure:meas(700)});
        txt(f.lines[0] || '', cx, b.y + dd + nh * .5, f.size, 700, c1, 'center');
        var g4 = P.fitText(c.spkTitle || '', b.w, nh * .45, {max:nh * .3, min:nh * .12, maxLines:2, lh:1.15, measure:meas(F.bw)});
        g4.lines.forEach(function(l, k){ txt(l, cx, b.y + dd + nh * .56 + g4.size * (1 + k * 1.15), g4.size, F.bw, ink, 'center'); });
        if(f.over || g4.over) over(b);
      }
    }
    else if(b.t === 'foot' || b.t === 'contact'){
      if(b.t === 'foot'){ ctx.fillStyle = pal.soft; ctx.fillRect(b.x, b.y - Math.max(2, H * .002), b.w, Math.max(2, H * .002)); }
      var cl = P.contactLines(u), ttl = cl.length ? '報名洽詢' : (u.name ? '主辦單位' : '');
      var items = (u.name && b.t === 'foot' ? [u.name] : []).concat(cl);
      if(/補助/.test(c.feeNote || '')) items.push('※ 補助資格與金額依計畫規定');
      var tw = b.tw || b.w, ty = b.y + (b.t === 'foot' ? b.h * .08 : 0);
      if(items.length){
        var hs2 = Math.min(b.h * .14, W * (L.shape === 'wide' ? .028 : .04));
        if(ttl){ txt(ttl, b.x, ty + hs2, hs2, 700, c1); }
        var ah2 = b.h - (ty - b.y) - hs2 * 1.6;
        f = P.fitList(items, tw, ah2, {max:Math.min(ah2 / items.length * .7, hs2 * .9), min:ah2 * .04, lh:1.3, gap:.15, measure:meas(F.bw)});
        yb = ty + hs2 * 1.6;
        f.items.forEach(function(ls, k){ ls.forEach(function(l, j){ txt(l, b.x, yb + j * f.size * 1.3 + f.size, f.size, k === 0 && u.name && b.t === 'foot' ? 700 : F.bw, /^※/.test(l) ? P.mix(ink, '#ffffff', .35) : ink); }); yb += ls.length * f.size * 1.3 + f.size * .15; });
        if(f.over) over(b);
      }
    }
    if(b.qr) drawQR(b.qr, b.on);
  });

  function avatar(cx, cy, r){
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.closePath(); ctx.clip();
    if(imgs.photo){ var im = imgs.photo, m = Math.min(im.width, im.height); ctx.drawImage(im, (im.width - m) / 2, (im.height - m) * .3, m, m, cx - r, cy - r, r * 2, r * 2); }
    else {
      ctx.fillStyle = pal.soft; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      if(c.spkName){ ctx.font = font(r * .9, 700); ctx.fillStyle = c1; ctx.textAlign = 'center'; ctx.fillText(Array.from(c.spkName)[0], cx, cy + r * .32); }
      else { ctx.fillStyle = P.mix(c1, '#ffffff', .6); ctx.beginPath(); ctx.arc(cx, cy - r * .2, r * .36, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(cx, cy + r * .75, r * .65, r * .5, 0, 0, 7); ctx.fill(); }
    }
    ctx.restore();
  }
  function drawQR(q, on){
    var cap = P.cut(c.qrCap || '掃描報名', 10), capS = q.s * .12;
    ctx.fillStyle = '#FFFFFF'; rr(ctx, q.x, q.y, q.s, q.s, q.s * .05); ctx.fill();
    if(on || st === 'note'){ ctx.strokeStyle = P.mix(ink, '#ffffff', .8); ctx.lineWidth = Math.max(1, q.s * .006); ctx.stroke(); }
    var qz = q.s * .07;
    if(imgs.qr){ ctx.imageSmoothingEnabled = false; ctx.drawImage(imgs.qr, q.x + qz, q.y + qz, q.s - qz * 2, q.s - qz * 2); ctx.imageSmoothingEnabled = true; }
    else { ctx.fillStyle = '#DDDDDD'; ctx.fillRect(q.x + qz, q.y + qz, q.s - qz * 2, q.s - qz * 2); txt('QR', q.x + q.s / 2, q.y + q.s / 2 + q.s * .06, q.s * .16, 700, '#888888', 'center'); }
    var capCol = on && L.shape === 'wide' ? '#FFFFFF' : c1;
    txt('▲ ' + cap, q.x + q.s / 2, q.y + q.s + capS * 1.25, capS, 700, capCol, 'center');
  }
  ctx.restore();
  return {warn:warn, layout:L};
}

root.CPMR = {draw:draw, NAMES:NAMES};
})(typeof window !== 'undefined' ? window : globalThis);
