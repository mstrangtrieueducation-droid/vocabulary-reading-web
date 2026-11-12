/**
 * NỀN TẢNG IELTS — máy chủ lưu tiến độ (Apps Script độc lập, dữ liệu nằm trong Google Sheet).
 * - Học sinh: doGet action=load, doPost action=save.
 * - Cô quản trị trên web (trang quản trị): action=admin / detail / create / extend / edit / delete, cần ADMIN_KEY.
 * - ADMIN_KEY chỉ đặt trong bản Apps Script của cô, KHÔNG ghi vào kho mã.
 * Chạy setup() một lần để tạo các tab.
 */
var ADMIN_KEY = 'ĐẶT_MÃ_QUẢN_TRỊ_TRONG_APPS_SCRIPT';
var BASE_URL = 'https://mstrangtrieueducation-droid.github.io/vocabulary-reading-web/dcaa7ee41f2f36d022bf75a486019b75/';
var DAYS = 30;
// Khoá Gemini để chấm phát âm: cất trong Script Properties (Cài đặt dự án → Thuộc tính tập lệnh), tên GEMINI_KEY. Không ghi vào mã.
var GEMINI_MODEL = 'gemini-3.5-flash-lite';
var PASS_SCORE = 75;   // đạt từ 75 điểm
var PH_MIN = 50;       // Azure: có âm nào dưới 50 điểm là chưa đạt
function geminiKey() { return PropertiesService.getScriptProperties().getProperty('GEMINI_KEY') || ''; }
var SHEET_ID = '12ln-A0tPOiinUSRJdkrGxx2bVzv_VcWgItkhi8bmCMc';
var SHEET = 'Học sinh', LOG = 'Nhật ký', DATA = '_data';
var HEAD = ['Mã', 'Họ và tên', 'Lớp', 'Link học', 'Ngày tạo', 'Bắt đầu', 'Hạn chót', 'Trạng thái', 'Tiến độ', 'Đang học', 'Số bài xong', 'Điểm từ vựng TB', 'Điểm ngữ pháp TB', 'Phát âm TB', 'Kiểm tra cuối', 'Từ hay sai', 'Hoạt động gần nhất', 'Ghi chú'];
var KEYS = ['code', 'name', 'cls', 'link', 'created', 'start', 'deadline', 'status', 'progress', 'current', 'done', 'vocab', 'grammar', 'speak', 'final', 'weak', 'last', 'note'];
var COL = {}; HEAD.forEach(function (h, i) { COL[h] = i + 1; });

function setup() {
  var ss = SS();
  var sh = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET, 0);
  sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold').setBackground('#0b123f').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  sh.getRange(2, COL['Tiến độ'], sh.getMaxRows() - 1, 3).setNumberFormat('@');
  var lg = ss.getSheetByName(LOG) || ss.insertSheet(LOG);
  lg.getRange(1, 1, 1, 7).setValues([['Thời gian', 'Mã', 'Họ và tên', 'Bài', 'Phần', 'Điểm', 'Chi tiết']]).setFontWeight('bold').setBackground('#0b123f').setFontColor('#ffffff');
  lg.setFrozenRows(1);
  var dt = ss.getSheetByName(DATA) || ss.insertSheet(DATA);
  dt.getRange(1, 1, 1, 3).setValues([['Mã', 'Tiến độ (JSON)', 'Cập nhật']]);
  dt.hideSheet();
  ss.setSpreadsheetTimeZone('Asia/Ho_Chi_Minh');
  // Quản trị đã chuyển lên web: bỏ các trigger cũ của Sheet để đỡ hạn mức.
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
}

function newCode() {
  var abc = 'abcdefghjkmnpqrstuvwxyz23456789', s = '';
  for (var i = 0; i < 10; i++) s += abc.charAt(Math.floor(Math.random() * abc.length));
  return s;
}
function endOfDay(d) { var x = new Date(d); x.setHours(23, 59, 59, 0); return x; }
function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function iso(v) { return v instanceof Date ? v.toISOString() : (v === '' ? null : v); }

function rows(sh) {
  var last = sh.getLastRow();
  return last < 2 ? [] : sh.getRange(2, 1, last - 1, HEAD.length).getValues();
}
function findIdx(vals, code) {
  if (!code) return -1;
  for (var i = 0; i < vals.length; i++) if (String(vals[i][0]) === code) return i;
  return -1;
}
function rowObj(r) { var o = {}; KEYS.forEach(function (k, i) { o[k] = iso(r[i]); }); return o; }
function liveStatus(r) {
  var st = r[COL['Trạng thái'] - 1], dl = r[COL['Hạn chót'] - 1];
  if (st !== 'Hoàn thành' && dl instanceof Date && Date.now() > dl.getTime()) return 'Hết hạn';
  return st;
}

function readState(code) {
  var dt = SS().getSheetByName(DATA), last = dt.getLastRow();
  if (last < 2) return null;
  var v = dt.getRange(2, 1, last - 1, 2).getValues();
  for (var i = 0; i < v.length; i++) if (String(v[i][0]) === code) { try { return JSON.parse(v[i][1]); } catch (e) { return null; } }
  return null;
}
function writeState(code, state) {
  var dt = SS().getSheetByName(DATA), last = dt.getLastRow(), r = -1;
  if (last >= 2) { var ids = dt.getRange(2, 1, last - 1, 1).getValues(); for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === code) { r = i + 2; break; } }
  if (r < 0) r = last + 1;
  dt.getRange(r, 1, 1, 3).setValues([[code, JSON.stringify(state), new Date()]]);
}
function deleteState(code) {
  var dt = SS().getSheetByName(DATA), last = dt.getLastRow();
  if (last < 2) return;
  var ids = dt.getRange(2, 1, last - 1, 1).getValues();
  for (var i = ids.length - 1; i >= 0; i--) if (String(ids[i][0]) === code) dt.deleteRow(i + 2);
}

function appendLog(code, name, events) {
  var lg = SS().getSheetByName(LOG);
  var out = events.slice(0, 50).map(function (ev) {
    return [ev.at ? new Date(ev.at) : new Date(), code, name, ev.unit === '' || ev.unit == null ? '' : (isNaN(ev.unit) ? ev.unit : 'Bài ' + ev.unit), ev.part || '', ev.score === '' || ev.score == null ? '' : ev.score + '%', String(ev.detail || '').slice(0, 1000)];
  });
  if (out.length) lg.getRange(lg.getLastRow() + 1, 1, out.length, 7).setValues(out);
}

/* ---------------- GET ---------------- */
function doGet(e) {
  var p = e.parameter || {};
  if (p.action === 'admin' || p.action === 'detail') return adminGet(p);
  var code = String(p.hs || '').trim();
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = SS().getSheetByName(SHEET), vals = rows(sh), i = findIdx(vals, code);
    if (i < 0) return json({ ok: false, error: 'notfound' });
    var r = vals[i], start = r[COL['Bắt đầu'] - 1], deadline = r[COL['Hạn chót'] - 1], changed = false;
    if (!(start instanceof Date)) {
      start = new Date(); r[COL['Bắt đầu'] - 1] = start;
      if (!(deadline instanceof Date)) { deadline = new Date(endOfDay(start).getTime() + (DAYS - 1) * 864e5); r[COL['Hạn chót'] - 1] = deadline; }
      r[COL['Trạng thái'] - 1] = 'Đang học'; r[COL['Hoạt động gần nhất'] - 1] = new Date(); changed = true;
      appendLog(code, r[1], [{ unit: '', part: 'Bắt đầu chương trình', score: '', detail: 'Hạn chót ' + Utilities.formatDate(deadline, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy') }]);
    }
    var ls = liveStatus(r); if (ls !== r[COL['Trạng thái'] - 1]) { r[COL['Trạng thái'] - 1] = ls; changed = true; }
    if (changed) sh.getRange(i + 2, 1, 1, HEAD.length).setValues([r]);
    return json({ ok: true, now: new Date().toISOString(), student: { name: r[1], cls: r[2], start: start.toISOString(), deadline: deadline instanceof Date ? deadline.toISOString() : null }, state: readState(code) });
  } finally { lock.releaseLock(); }
}

function adminGet(p) {
  if (p.key !== ADMIN_KEY) return json({ ok: false, error: 'key' });
  var sh = SS().getSheetByName(SHEET), vals = rows(sh);
  if (p.action === 'admin') {
    return json({ ok: true, now: new Date().toISOString(), base: BASE_URL, students: vals.filter(function (r) { return r[0]; }).map(function (r) { var o = rowObj(r); o.status = liveStatus(r); return o; }) });
  }
  var code = String(p.code || ''), i = findIdx(vals, code);
  if (i < 0) return json({ ok: false, error: 'notfound' });
  var lg = SS().getSheetByName(LOG), last = lg.getLastRow(), log = [];
  if (last >= 2) {
    var lv = lg.getRange(2, 1, last - 1, 7).getValues();
    for (var j = lv.length - 1; j >= 0 && log.length < 150; j--) if (String(lv[j][1]) === code) log.push({ at: iso(lv[j][0]), unit: lv[j][3], part: lv[j][4], score: lv[j][5], detail: lv[j][6] });
  }
  var o = rowObj(vals[i]); o.status = liveStatus(vals[i]);
  return json({ ok: true, student: o, state: readState(code), log: log });
}

/* ---------------- POST ---------------- */
function doPost(e) {
  var body; try { body = JSON.parse(e.postData.contents); } catch (x) { return json({ ok: false, error: 'bad' }); }
  if (body.action === 'save') return save(body);
  if (body.action === 'score') return score(body);
  if (body.action === 'aztoken') return azToken(body);
  if (body.key !== ADMIN_KEY) return json({ ok: false, error: 'key' });
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = SS().getSheetByName(SHEET), vals = rows(sh);
    if (body.action === 'create') {
      var name = String(body.name || '').trim(); if (!name) return json({ ok: false, error: 'name' });
      var code = newCode(), r = [];
      HEAD.forEach(function () { r.push(''); });
      r[0] = code; r[1] = name; r[2] = String(body.cls || '').trim(); r[3] = BASE_URL + '?hs=' + code; r[4] = new Date();
      r[COL['Trạng thái'] - 1] = 'Chưa bắt đầu'; r[COL['Tiến độ'] - 1] = "'0%"; r[COL['Ghi chú'] - 1] = String(body.note || '');
      sh.getRange(sh.getLastRow() + 1, 1, 1, HEAD.length).setValues([r]);
      return json({ ok: true, student: rowObj(r) });
    }
    var idx = findIdx(vals, String(body.code || ''));
    if (idx < 0) return json({ ok: false, error: 'notfound' });
    var row = vals[idx];
    if (body.action === 'extend') {
      var d = row[COL['Hạn chót'] - 1], days = Number(body.days) || 7;
      var base = d instanceof Date && d.getTime() > Date.now() ? d : endOfDay(new Date());
      row[COL['Hạn chót'] - 1] = new Date(base.getTime() + days * 864e5);
      if (row[COL['Trạng thái'] - 1] === 'Hết hạn') row[COL['Trạng thái'] - 1] = 'Đang học';
      sh.getRange(idx + 2, 1, 1, HEAD.length).setValues([row]);
      appendLog(row[0], row[1], [{ unit: '', part: 'Cô gia hạn', score: '', detail: '+' + days + ' ngày → ' + Utilities.formatDate(row[COL['Hạn chót'] - 1], 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy') }]);
      var o = rowObj(row); o.status = liveStatus(row);
      return json({ ok: true, student: o });
    }
    if (body.action === 'edit') {
      if (body.name != null) row[1] = String(body.name).trim() || row[1];
      if (body.cls != null) row[2] = String(body.cls).trim();
      if (body.note != null) row[COL['Ghi chú'] - 1] = String(body.note);
      sh.getRange(idx + 2, 1, 1, HEAD.length).setValues([row]);
      return json({ ok: true, student: rowObj(row) });
    }
    if (body.action === 'delete') {
      sh.deleteRow(idx + 2); deleteState(row[0]);
      return json({ ok: true });
    }
    return json({ ok: false, error: 'action' });
  } finally { lock.releaseLock(); }
}

function save(body) {
  var code = String(body.hs || '').trim();
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = SS().getSheetByName(SHEET), vals = rows(sh), i = findIdx(vals, code);
    if (i < 0) return json({ ok: false, error: 'notfound' });
    if (body.state) { var old = readState(code); if (!old || (body.state.updatedAt || 0) >= (old.updatedAt || 0)) writeState(code, body.state); }
    var s = body.summary || {}, r = vals[i];
    var dl = r[COL['Hạn chót'] - 1];
    r[COL['Trạng thái'] - 1] = s.completed ? 'Hoàn thành' : (dl instanceof Date && Date.now() > dl.getTime() ? 'Hết hạn' : 'Đang học');
    r[COL['Tiến độ'] - 1] = "'" + (s.percent || 0) + '%'; r[COL['Đang học'] - 1] = s.current || '';
    r[COL['Số bài xong'] - 1] = "'" + (s.unitsDone || 0) + '/14'; r[COL['Điểm từ vựng TB'] - 1] = s.vocab == null ? '' : s.vocab;
    r[COL['Điểm ngữ pháp TB'] - 1] = s.grammar == null ? '' : s.grammar; r[COL['Phát âm TB'] - 1] = s.speak == null ? '' : s.speak;
    r[COL['Kiểm tra cuối'] - 1] = s.final == null ? '' : s.final; r[COL['Từ hay sai'] - 1] = s.weak || ''; r[COL['Hoạt động gần nhất'] - 1] = new Date();
    sh.getRange(i + 2, 1, 1, HEAD.length).setValues([r]);
    if (body.events && body.events.length) appendLog(code, r[1], body.events);
    return json({ ok: true });
  } finally { lock.releaseLock(); }
}

/* ---------------- Chấm phát âm bằng Gemini ---------------- */
// Chấm 2 bước để máy không "nghe theo đáp án":
//  1) Nghe mù: KHÔNG cho biết từ cần đọc, chỉ ghi lại đúng âm học sinh phát ra (IPA + từ gần nhất).
//  2) So sánh: đưa từ đích + bản nghe mù + ghi âm, chấm khắt khe theo thang điểm cố định.
var P1 = 'You are a strict phonetician. Listen to this recording of a Vietnamese learner saying one English word or a short phrase. ' +
  'Transcribe EXACTLY what was pronounced, sound by sound, including every mistake. Do NOT guess or correct toward the word you think was intended. ' +
  'Notice especially: missing or swallowed final consonants (t, d, k, tʃ, s, z, st…), short vs long vowels (ɪ vs iː), wrong vowel quality, and which syllable is stressed. ' +
  'Return JSON only: {"ipa": "<narrow IPA of what was actually said, with stress mark>", "word": "<the English word(s) it actually sounds like; if it matches no real word, spell it the way it sounds>", "speech": <true if there is any speech>}';
var P2 = 'Bạn là giám khảo phát âm tiếng Anh cho học sinh Việt Nam. Từ cần đọc: "{target}" {ipa}{vi}.\n' +
  'Một chuyên gia đã nghe MÙ (không biết từ cần đọc) và ghi lại: /{hipa}/, nghe giống: "{hword}". Bản nghe mù có thể nhầm giữa các âm gần nhau; hãy nghe lại ghi âm để xác nhận.\n' +
  'KHÔNG tính là lỗi: âm cuối không bật hơi nhưng vẫn có (t̚, k̚, p̚), giọng Anh hay Mỹ (ɑ/ɒ, r cuối), tr đọc gần tʃr, dr gần dʒr, t giữa thành flap, nối âm tự nhiên, lơ lớ nhẹ.\n' +
  'LÀ lỗi thật (phải bắt): mất hẳn phụ âm cuối hoặc cụm cuối (vd cheat thành "chi", interest thành "interes"), đọc thành từ khác, thiếu/thừa âm tiết, sai trọng âm rõ, nguyên âm dài thành ngắn hoặc ngược lại làm đổi từ (beat/bit), sai hẳn phụ âm đầu (tʃ thành ʃ hoặc s rõ ràng).\n' +
  'Thang điểm: đọc đúng (kể cả lơ lớ nhẹ) 85–100; 1 lỗi thật nhẹ 65–74; mất âm cuối hoặc sai trọng âm tối đa 60; thành từ khác hoặc thiếu âm tiết tối đa 35; không có tiếng nói 0–10.\n' +
  'Trả về JSON, không thêm chữ: {"heard": "<từ nghe được>", "score": <0-100>, "errors": [{"sound": "<âm/phần sai>", "fix": "<cách sửa ngắn, tiếng Việt, tối đa 15 từ>"}], "tip": "<1 câu tiếng Việt, tối đa 20 từ>"}\n' +
  'Tối đa 3 lỗi thật, nặng nhất trước. Đọc đúng thì errors=[] và khen ngắn.';
function gem(key, model, parts, maxTok) {
  try { return gem1(key, model, parts, maxTok); }
  catch (e) { if (e && e.error === 'parse') return gem1(key, model, parts, maxTok); throw e; }   // Gemini đôi khi trả JSON cụt → thử lại 1 lần
}
function gem1(key, model, parts, maxTok) {
  var res = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
    method: 'post', contentType: 'application/json', headers: { 'x-goog-api-key': key }, muteHttpExceptions: true,
    payload: JSON.stringify({ contents: [{ role: 'user', parts: parts }], generationConfig: { temperature: 0, responseMimeType: 'application/json', maxOutputTokens: maxTok || 2048 } })
  });
  var st = res.getResponseCode(), txt = res.getContentText();
  if (st !== 200) throw { error: 'gemini', status: st, detail: txt.slice(0, 300) };
  try {
    var j = JSON.parse(txt), t = j.candidates[0].content.parts.map(function (p) { return p.text || ''; }).join('');
    return JSON.parse(t.replace(/^\s*```(json)?|```\s*$/g, '').trim());
  } catch (e) { throw { error: 'parse', detail: txt.slice(0, 300) }; }
}
function fill(t, o) { return t.replace(/\{(\w+)\}/g, function (m, k) { return o[k] == null ? '' : o[k]; }); }
function score(body) {
  var key = geminiKey();
  if (!key) return json({ ok: false, error: 'nokey' });
  var code = String(body.hs || '').trim();
  if (!code || !body.audio || !body.target) return json({ ok: false, error: 'bad' });
  var sh = SS().getSheetByName(SHEET);
  if (findIdx(rows(sh), code) < 0) return json({ ok: false, error: 'notfound' });
  var admin = body.key === ADMIN_KEY;   // chỉ cô (mã quản trị) mới được thử lời dặn khác
  var target = String(body.target).slice(0, 120), ipa = String(body.ipa || '').slice(0, 120), vi = String(body.vi || '').slice(0, 120);
  if (body.engine === 'azure') { var az = scoreAzure(body, target); return json(az.error ? { ok: false, error: az.error, status: az.status, detail: az.detail } : { ok: true, result: az.result }); }
  var model = body.model && /^gemini-[\w.\-]+$/.test(body.model) ? body.model : GEMINI_MODEL;
  var audio = { inlineData: { mimeType: String(body.mime || 'audio/wav').split(';')[0], data: body.audio } };
  var blind, out;
  try {
    blind = gem(key, model, [audio, { text: admin && body.p1 ? body.p1 : P1 }], 1024);
    if (blind && blind.speech === false) out = { heard: '', score: 0, errors: [], tip: 'Máy không nghe thấy tiếng em. Em đọc to và rõ hơn nhé.' };
    else out = gem(key, model, [{ text: fill(admin && body.p2 ? body.p2 : P2, { target: target, ipa: ipa ? '(chuẩn ' + ipa + ')' : '', vi: vi ? ', nghĩa: ' + vi : '', hipa: String(blind.ipa || '').replace(/^\/|\/$/g, ''), hword: blind.word || '' }) }, audio], 2048);
  } catch (e) { return json(e && e.error ? { ok: false, error: e.error, status: e.status, detail: e.detail } : { ok: false, error: 'err', detail: String(e) }); }
  out.score = Math.max(0, Math.min(100, Math.round(Number(out.score) || 0)));
  out.pass = out.score >= PASS_SCORE;
  out.errors = (out.errors || []).slice(0, 3);
  out.heard_ipa = blind.ipa || '';
  if (!out.heard) out.heard = blind.word || '';
  return json({ ok: true, result: out, model: model });
}

// Trình duyệt xin "vé" Azure 10 phút rồi tự gửi ghi âm thẳng sang Azure (nhanh hơn, mã khoá không rời máy chủ).
function azToken(body) {
  var code = String(body.hs || '').trim();
  if (!code) return json({ ok: false, error: 'bad' });
  var cache = CacheService.getScriptCache(), hit = cache.get('aztok');
  var props = PropertiesService.getScriptProperties(), key = props.getProperty('AZURE_KEY'), region = props.getProperty('AZURE_REGION') || 'eastus';
  if (!key) return json({ ok: false, error: 'noazure' });
  if (!hit) {
    var sh = SS().getSheetByName(SHEET);
    if (findIdx(rows(sh), code) < 0) return json({ ok: false, error: 'notfound' });
    var res = UrlFetchApp.fetch('https://' + region + '.api.cognitive.microsoft.com/sts/v1.0/issueToken', { method: 'post', headers: { 'Ocp-Apim-Subscription-Key': key }, payload: '', muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return json({ ok: false, error: 'azure', status: res.getResponseCode() });
    hit = res.getContentText(); cache.put('aztok', hit, 480);   // vé sống 10 phút, giữ 8 phút
  }
  return json({ ok: true, token: hit, region: region });
}

// ---------- Chấm bằng Azure Pronunciation Assessment (máy chuyên chấm phát âm, điểm từng âm) ----------
// Cần Script Properties: AZURE_KEY, AZURE_REGION (mặc định eastus).
var PH_TIP = {
  'iː': 'kéo dài "i" như "iii", miệng cười', 'ɪ': '"i" ngắn, gọn, không kéo dài', 'æ': 'mở miệng rộng, giữa "a" và "e"',
  'ʌ': '"ă" ngắn, miệng thả lỏng', 'ɑ': '"a" mở rộng, hạ hàm', 'ɔ': '"o" tròn môi', 'ə': '"ơ" nhẹ, không nhấn', 'ɚ': '"ơ" rồi cong lưỡi "r"',
  'ɝ': '"ơ" dài, cong lưỡi "r"', 'eɪ': '"ây" trượt từ e sang i', 'aɪ': '"ai" rõ', 'oʊ': '"âu" tròn môi', 'aʊ': '"ao" rõ', 'ɔɪ': '"oi" rõ', 'ʊ': '"u" ngắn', 'uː': '"u" dài, chu môi',
  'θ': 'đặt lưỡi giữa hai răng, thổi hơi (không đọc "th"/"t")', 'ð': 'lưỡi giữa hai răng, rung cổ (không đọc "d")',
  'ʃ': '"s" nặng, chu môi', 'tʃ': '"ch" bật mạnh, chu môi', 'dʒ': '"giơ" bật, chu môi', 'ʒ': 'như "ʃ" nhưng rung cổ',
  't': 'bật âm /t/ rõ, nhất là cuối từ', 'd': 'bật /d/ rõ, rung cổ', 'k': 'bật /k/ cuối từ', 'g': 'bật /g/ rung cổ', 'p': 'bật /p/ có hơi', 'b': '/b/ rung cổ',
  's': 'xì hơi /s/ rõ, nhất là cuối từ', 'z': '/z/ rung như ong kêu', 'v': 'răng trên chạm môi dưới, rung (không đọc "b")', 'f': 'răng trên chạm môi dưới, thổi hơi',
  'i': 'kéo dài "i" như "iii", miệng cười', 'u': '"u" dài, chu môi', 'ɛ': '"e" mở, ngắn', 'ɹ': 'cong lưỡi, không chạm vòm', 'ɔɹ': '"o" rồi cong lưỡi "r"', 'ɑɹ': '"a" rồi cong lưỡi "r"',
  'l': 'đầu lưỡi chạm lợi, cuối từ cũng phải có /l/', 'r': 'cong lưỡi, không chạm vòm', 'n': '/n/ rõ cuối từ', 'm': 'mím môi /m/', 'ŋ': '"ng" cuối, không bật "g"', 'h': 'thở ra nhẹ', 'w': 'chu môi rồi mở', 'j': '"i" lướt nhanh'
};
function scoreAzure(body, target) {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('AZURE_KEY'), region = props.getProperty('AZURE_REGION') || 'eastus';
  if (!key) return { error: 'noazure' };
  var ref = String(target).replace(/\s*[,~·]\s*/g, '. ').replace(/\b(somebody|something|sb|st)\b/g, '$1');
  var cfg = { ReferenceText: ref, GradingSystem: 'HundredMark', Granularity: 'Phoneme', Dimension: 'Comprehensive', EnableMiscue: true, PhonemeAlphabet: 'IPA', NBestPhonemeCount: 3 };
  var url = 'https://' + region + '.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed';
  var t0 = Date.now();
  var res, st, txt;
  for (var tryN = 0; tryN < 3; tryN++) {   // gói Free đôi khi từ chối khi nhiều em chấm cùng lúc → thử lại
    res = UrlFetchApp.fetch(url, {
      method: 'post', muteHttpExceptions: true, contentType: 'audio/wav; codecs=audio/pcm; samplerate=16000',
      headers: { 'Ocp-Apim-Subscription-Key': key, 'Accept': 'application/json', 'Pronunciation-Assessment': Utilities.base64Encode(JSON.stringify(cfg), Utilities.Charset.UTF_8) },
      payload: Utilities.base64Decode(body.audio)
    });
    st = res.getResponseCode(); txt = res.getContentText();
    if (st !== 401 && st !== 429 && st < 500) break;
    Utilities.sleep(600 * (tryN + 1));
  }
  if (st !== 200) return { error: 'azure', status: st, detail: txt.slice(0, 300) };
  var j = JSON.parse(txt);
  if (j.RecognitionStatus !== 'Success' || !j.NBest || !j.NBest.length) return { result: { heard: '', score: 0, pass: false, errors: [], tip: 'Máy không nghe thấy tiếng em. Em đọc to và rõ hơn nhé.', ms: Date.now() - t0 } };
  var nb = j.NBest[0], pa = nb.PronunciationAssessment || nb;
  var acc = Number(pa.AccuracyScore) || 0, comp = Number(pa.CompletenessScore), pron = Number(pa.PronScore) || acc;
  var words = nb.Words || [], errs = [], seen = {}, pmin = 100;
  words.forEach(function (w) {
    var wa = w.PronunciationAssessment || w, et = wa.ErrorType || 'None';
    if (et === 'Omission') { errs.push({ sound: 'thiếu từ "' + w.Word + '"', fix: 'Em đọc đủ cả từ "' + w.Word + '".', s: 0 }); return; }
    if (et === 'Insertion') return;
    (w.Phonemes || []).forEach(function (ph) {
      var sc = Number((ph.PronunciationAssessment || ph).AccuracyScore) || 0, sym = ph.Phoneme;
      if (sc < pmin) pmin = sc;
      if (sc < 60 && !seen[sym]) {
        seen[sym] = 1;
        var nbp = ((ph.PronunciationAssessment || ph).NBestPhonemes || [])[0], heardAs = nbp && nbp.Phoneme && nbp.Phoneme !== sym ? ' (máy nghe như /' + nbp.Phoneme + '/)' : '';
        errs.push({ sound: '/' + sym + '/ trong "' + w.Word + '"' + heardAs, fix: PH_TIP[sym] || 'nghe mẫu và đọc chậm âm này', s: sc });
      }
    });
  });
  errs.sort(function (a, b) { return a.s - b.s; });
  var score = Math.round(isNaN(comp) ? pron : Math.min(pron, comp));
  if (pmin < PH_MIN) score = Math.min(score, 65);   // có 1 âm hỏng hẳn (vd mất âm cuối) thì chưa đạt dù điểm chung cao
  var pass = score >= PASS_SCORE;
  var tip = pass ? (score >= 90 ? 'Rất chuẩn! Tiếp tục nhé.' : 'Đạt rồi, sửa thêm âm được nhắc cho chuẩn hơn.') : (errs.length ? 'Em sửa âm được nhắc rồi đọc lại nhé.' : 'Em đọc rõ và đủ từng âm rồi thử lại nhé.');
  return { result: { heard: nb.Display || nb.Lexical || '', score: score, pass: pass, errors: errs.slice(0, 3).map(function (e) { return { sound: e.sound, fix: e.fix }; }), tip: tip,
    detail: { acc: acc, comp: comp, pron: pron, flu: pa.FluencyScore, ph: words.map(function (w) { return (w.Phonemes || []).map(function (ph) { return ph.Phoneme + ':' + Math.round(Number((ph.PronunciationAssessment || ph).AccuracyScore) || 0); }).join(' '); }).join(' | ') }, ms: Date.now() - t0, engine: 'azure' } };
}

// Chạy một lần sau khi thêm chấm AI để Google hỏi quyền gọi ra ngoài (UrlFetchApp) + đọc Script Properties.
function authorize() { var r = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/', { muteHttpExceptions: true }); Logger.log('fetch ' + r.getResponseCode() + ' · key ' + (geminiKey() ? 'có' : 'CHƯA CÓ')); }

function SS() { return SpreadsheetApp.openById(SHEET_ID); }
