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
var GEMINI_MODEL = 'gemini-2.5-flash';
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
function score(body) {
  var key = geminiKey();
  if (!key) return json({ ok: false, error: 'nokey' });
  var code = String(body.hs || '').trim();
  if (!code || !body.audio || !body.target) return json({ ok: false, error: 'bad' });
  var sh = SS().getSheetByName(SHEET);
  if (findIdx(rows(sh), code) < 0) return json({ ok: false, error: 'notfound' });
  var target = String(body.target).slice(0, 120), ipa = String(body.ipa || '').slice(0, 120), vi = String(body.vi || '').slice(0, 120);
  var prompt = 'Bạn là giáo viên phát âm tiếng Anh (giọng Mỹ) cho học sinh Việt Nam trình độ B1. Học sinh được yêu cầu đọc to: "' + target + '"' +
    (ipa ? ' (phiên âm ' + ipa + ')' : '') + (vi ? ', nghĩa: ' + vi : '') + '.\n' +
    'Nghe đoạn ghi âm và chấm. Trả về JSON đúng schema, không thêm chữ nào khác:\n' +
    '{"heard": "<chữ bạn nghe được, tiếng Anh>", "score": <0-100>, "pass": <true/false>, "errors": [{"sound": "<âm hoặc phần sai, ví dụ /iː/ hoặc âm cuối /t/ hoặc trọng âm>", "fix": "<cách sửa ngắn gọn bằng tiếng Việt, tối đa 15 từ>"}], "tip": "<1 câu khen hoặc nhắc bằng tiếng Việt, tối đa 20 từ>"}\n' +
    'Quy tắc: pass=true khi người nghe bản ngữ hiểu đúng từ này và không sai trọng âm (score >= 70). Nếu ghi âm không có tiếng nói hoặc là từ khác hẳn: score <= 30, pass=false, errors=[], tip nói rõ máy không nghe thấy từ cần đọc. Tối đa 3 errors, ưu tiên lỗi nặng nhất. Không bịa lỗi khi phát âm đã tốt.';
  var req = {
    contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: String(body.mime || 'audio/webm').split(';')[0], data: body.audio } }] }],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json', maxOutputTokens: 400 }
  };
  var model = body.model && /^gemini-[\w.\-]+$/.test(body.model) ? body.model : GEMINI_MODEL;
  var res = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
    method: 'post', contentType: 'application/json', headers: { 'x-goog-api-key': key }, payload: JSON.stringify(req), muteHttpExceptions: true
  });
  var st = res.getResponseCode(), txt = res.getContentText();
  if (st !== 200) return json({ ok: false, error: 'gemini', status: st, detail: txt.slice(0, 300) });
  var out;
  try {
    var j = JSON.parse(txt), t = j.candidates[0].content.parts.map(function (p) { return p.text || ''; }).join('');
    out = JSON.parse(t.replace(/^```json|```$/g, '').trim());
  } catch (e) { return json({ ok: false, error: 'parse', detail: txt.slice(0, 300) }); }
  out.score = Math.max(0, Math.min(100, Math.round(Number(out.score) || 0)));
  out.pass = !!out.pass && out.score >= 60;
  out.errors = (out.errors || []).slice(0, 3);
  return json({ ok: true, result: out, model: model });
}

function SS() { return SpreadsheetApp.openById(SHEET_ID); }
