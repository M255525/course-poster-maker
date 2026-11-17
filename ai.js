/* 課程招生海報產生器：AI 文案（自備金鑰 BYOK，選用）。
 * 服務商與呼叫方式複製自 政府補助認證產生器/shop-opening-checklist/ai.js。
 * AI 只寫標題、副標、亮點、適合對象、hashtag；日期、費用、補助比例、名額一律用使用者填的，回傳值經 CPM.sanitizeAi 清理。
 * 金鑰只存在這台瀏覽器（localStorage cpm.ai）。沒有金鑰可以「複製提示詞」貼到任何 AI，再把回覆貼回來。 */
(function(){
'use strict';
var D = window.CPM;
var A = {lsJson:function(k, d){ try{ var v = JSON.parse(localStorage.getItem('cpm.' + k)); return v == null ? d : v; }catch(e){ return d; } }};
function geminiModelFix(m){ var r = {'gemini-2.5-flash':'gemini-3.6-flash', 'gemini-2.5-flash-lite':'gemini-3.5-flash-lite', 'gemini-2.5-pro':'gemini-3.8-flash', 'gemini-2.0-flash':'gemini-3.6-flash', 'gemini-2.0-flash-001':'gemini-3.6-flash', 'gemini-2.0-flash-lite':'gemini-3.1-flash-lite', 'gemini-1.5-flash':'gemini-3.6-flash', 'gemini-1.5-pro':'gemini-3.1-pro-preview', 'gemini-3-pro':'gemini-3.1-pro-preview', 'gemini-3-pro-preview':'gemini-3.1-pro-preview', 'gemini-3.5-pro':'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite-preview':'gemini-3.1-flash-lite'}; m = String(m || '').trim().replace(/^models\//, ''); return r[m] || m; }
var PROVIDERS = {
  gemini: {label:'Gemini（Google AI Studio）', vision:true, models:[['gemini-3.5-flash', 'Gemini 3.5 Flash（均衡，推薦）'], ['gemini-3.1-pro-preview', 'Gemini 3.1 Pro 預覽版（最強）'], ['gemini-3.5-flash-lite', 'Gemini 3.5 Flash-Lite（快速省錢）']]},
  openai: {label:'OpenAI', vision:true, url:'https://api.openai.com/v1/chat/completions', models:[['gpt-5-mini', 'GPT-5 mini（均衡，推薦）'], ['gpt-5', 'GPT-5（最強）'], ['gpt-4o-mini', 'GPT-4o mini（快速省錢）']]},
  claude: {label:'Claude（Anthropic）', vision:true, models:[['claude-sonnet-5-5', 'Claude Sonnet 5.5（均衡，推薦）'], ['claude-opus-5-5', 'Claude Opus 5.5（最強）'], ['claude-haiku-5-5', 'Claude Haiku 5.5（快速省錢）']]},
  openrouter: {label:'OpenRouter', vision:true, url:'https://openrouter.ai/api/v1/chat/completions', models:[['openai/gpt-4o-mini', 'OpenAI GPT-4o mini（推薦）'], ['google/gemini-2.5-flash', 'Google Gemini 2.5 Flash'], ['anthropic/claude-sonnet-4.5', 'Anthropic Claude Sonnet 4.5']]},
  xai: {label:'xAI Grok', vision:true, url:'https://api.x.ai/v1/chat/completions', models:[['grok-4', 'Grok 4'], ['grok-3-mini', 'Grok 3 mini（不支援看圖）']]},
  deepseek: {label:'DeepSeek（只支援文字）', vision:false, url:'https://api.deepseek.com/chat/completions', models:[['deepseek-chat', 'DeepSeek Chat（推薦）'], ['deepseek-reasoner', 'DeepSeek Reasoner（推理）']]},
  custom: {label:'自訂（OpenAI 相容端點，例如 Ollama、LM Studio）', vision:true, models:[]}
};
function cfg(){ var c = A.lsJson('ai', {}); if(!PROVIDERS[c.provider]) c.provider = 'gemini'; return c; }
function aiModel(c){ c = c || cfg(); return (c.modelCustom || '').trim() || c.model || ((PROVIDERS[c.provider].models[0]) || [''])[0]; }
function customUrl(base){ base = (base || '').trim().replace(/\/+$/, ''); return /\/chat\/completions$/.test(base) ? base : base + '/chat/completions'; }
function ready(){ var c = cfg(); return c.provider === 'custom' ? !!(c.base || '').trim() && !!aiModel(c) : !!c.key; }
function status(){ var c = cfg(); return ready() ? PROVIDERS[c.provider].label.replace(/（.*/, '') + '・' + aiModel(c) : '未設定'; }

async function callLLM(prompt, images, wantJson, onStatus){
  var c = cfg(), provider = c.provider, model = aiModel(c), key = c.key, url, headers, body, extract;
  images = PROVIDERS[provider].vision === false ? [] : (images || []);
  if(provider === 'claude'){
    url = 'https://api.anthropic.com/v1/messages';
    headers = {'content-type':'application/json', 'x-api-key':key, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true'};
    var content = images.map(function(im){ return {type:'image', source:{type:'base64', media_type:im.mime, data:im.b64}}; });
    content.push({type:'text', text:prompt});
    body = {model:model, max_tokens:4000, messages:[{role:'user', content:content}]};
    extract = function(d){ return (d.content || []).filter(function(b){ return b.type === 'text'; }).map(function(b){ return b.text; }).join(''); };
  } else if(provider !== 'gemini'){
    url = provider === 'custom' ? customUrl(c.base) : PROVIDERS[provider].url;
    headers = {'content-type':'application/json'};
    if(key) headers.authorization = 'Bearer ' + key;
    var msg = images.length ? [{type:'text', text:prompt}].concat(images.map(function(im){ return {type:'image_url', image_url:{url:im.dataUrl}}; })) : prompt;
    body = {model:model, messages:[{role:'user', content:msg}]};
    extract = function(d){ return d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content; };
  } else {
    url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(geminiModelFix(model)) + ':generateContent';
    headers = {'content-type':'application/json', 'x-goog-api-key':key};
    var parts = images.map(function(im){ return {inline_data:{mime_type:im.mime, data:im.b64}}; });
    parts.push({text:prompt});
    body = {contents:[{parts:parts}]};
    if(wantJson) body.generationConfig = {responseMimeType:'application/json'};
    extract = function(d){ var ps = (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || []; return ps.map(function(p){ return p.text || ''; }).join(''); };
  }
  for(var attempt = 1; attempt <= 3; attempt++){
    var resp = await fetch(url, {method:'POST', headers:headers, body:JSON.stringify(body), signal:AbortSignal.timeout(150000)});
    var raw = await resp.text();
    if(resp.ok){ var t = extract(JSON.parse(raw)); if(!t) throw new Error('回應中沒有文字內容'); return t; }
    var em = raw.slice(0, 200);
    try{ var e = JSON.parse(raw); em = (e.error && e.error.message) || e.message || em; }catch(x){}
    if({429:1, 500:1, 503:1, 529:1}[resp.status] && attempt < 3){ if(onStatus) onStatus('服務忙碌（' + resp.status + '），' + attempt * 6 + ' 秒後重試…'); await new Promise(function(r){ setTimeout(r, attempt * 6000); }); continue; }
    throw new Error('HTTP ' + resp.status + '：' + em);
  }
}
function parseJson(txt){ var s = txt.indexOf('{'), e = txt.lastIndexOf('}'); if(s < 0 || e < s) throw new Error('AI 回傳的不是 JSON'); return JSON.parse(txt.slice(s, e + 1)); }
function saveCfg(c){ try{ localStorage.setItem('cpm.ai', JSON.stringify(c)); }catch(e){} }

function facts(st){
  var c = st.course || {}, u = st.unit || {}, r = [];
  r.push('主辦單位：' + (u.name || '（未填）'));
  r.push('課程名稱：' + (c.title || '（未填）'));
  if(c.sub) r.push('目前副標：' + c.sub);
  D.infoRows(c, 6).forEach(function(x){ r.push(x[0] + '：' + x[1]); });
  var p = D.points(c); if(p.length) r.push('目前亮點：' + p.join('；'));
  if(c.who) r.push('適合對象：' + c.who);
  var o = D.outline(c); if(o.length) r.push('課程大綱：' + o.join('；'));
  if(c.spkName) r.push('講師：' + c.spkName + (c.spkTitle ? '（' + c.spkTitle + '）' : ''));
  return r.join('\n');
}
function prompt(st){
  return '你是台灣的課程行銷文案顧問，要幫一張「課程招生海報」寫文案。請遵守：\n' +
    '1. 一律使用繁體中文（台灣用語），口吻親切、具體、短句，不要浮誇或保證效果（不可寫「保證就業」「保證加薪」「保證補助」）。\n' +
    '2. 只能根據下方課程資料寫；日期、費用、補助比例、名額、證書、講師經歷這類事實，資料沒寫就不要寫，也不要自己編數字。\n' +
    '3. 標題 20 字以內、副標 32 字以內、亮點 3～5 條每條 22 字以內、適合對象 40 字以內、hashtag 3～5 個。\n' +
    '4. 只輸出 JSON，格式：{"title":"","sub":"","points":["",""],"who":"","hashtags":["",""]}\n\n' +
    '【課程資料】\n' + facts(st);
}
async function generate(st, onStatus){ return D.sanitizeAi(parseJson(await callLLM(prompt(st), null, true, onStatus))); }
function fromText(t){ return D.sanitizeAi(parseJson(String(t || ''))); }

window.CPMAI = {PROVIDERS:PROVIDERS, cfg:cfg, saveCfg:saveCfg, aiModel:aiModel, ready:ready, status:status, prompt:prompt, generate:generate, fromText:fromText};
})();
