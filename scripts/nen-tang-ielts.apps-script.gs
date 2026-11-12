/**
 * NỀN TẢNG IELTS — Sheet theo dõi (Apps Script gắn với Google Sheet).
 * - Tab "Học sinh": gõ Họ và tên (cột B) vào dòng trống → tự sinh Mã + Link học.
 * - Học sinh mở link lần đầu → bắt đầu tính 30 ngày, tự ghi Hạn chót.
 * - Mọi lần học được ghi vào tab "Nhật ký"; điểm & tiến độ cập nhật trên tab "Học sinh".
 * - Gia hạn: sửa ô "Hạn chót" hoặc chọn dòng → menu Nền tảng IELTS → Gia hạn thêm 7 ngày.
 * Dự án Apps Script độc lập: chạy setup() một lần để tạo tab và cài trigger onEdit/onOpen cho Sheet.
 */
var BASE_URL = 'https://mstrangtrieueducation-droid.github.io/vocabulary-reading-web/dcaa7ee41f2f36d022bf75a486019b75/';
var DAYS = 30;
var SHEET_ID = '12ln-A0tPOiinUSRJdkrGxx2bVzv_VcWgItkhi8bmCMc';
var SHEET = 'Học sinh', LOG = 'Nhật ký', DATA = '_data';
var HEAD = ['Mã', 'Họ và tên', 'Lớp', 'Link học', 'Ngày tạo', 'Bắt đầu', 'Hạn chót', 'Trạng thái', 'Tiến độ', 'Đang học', 'Số bài xong', 'Điểm từ vựng TB', 'Điểm ngữ pháp TB', 'Phát âm TB', 'Kiểm tra cuối', 'Từ hay sai', 'Hoạt động gần nhất', 'Ghi chú'];
var COL = {}; HEAD.forEach(function (h, i) { COL[h] = i + 1; });

function setup() {
  var ss = SS();
  var sh = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET, 0);
  sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold').setBackground('#0b123f').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  sh.setColumnWidth(COL['Họ và tên'], 190); sh.setColumnWidth(COL['Link học'], 330); sh.setColumnWidth(COL['Từ hay sai'], 280);
  sh.getRange(2, COL['Ngày tạo'], 999, 3).setNumberFormat('dd/MM/yyyy');
  sh.getRange(2, COL['Hoạt động gần nhất'], 999, 1).setNumberFormat('dd/MM/yyyy HH:mm');
  var lg = ss.getSheetByName(LOG) || ss.insertSheet(LOG);
  lg.getRange(1, 1, 1, 7).setValues([['Thời gian', 'Mã', 'Họ và tên', 'Bài', 'Phần', 'Điểm', 'Chi tiết']]).setFontWeight('bold').setBackground('#0b123f').setFontColor('#ffffff');
  lg.setFrozenRows(1); lg.getRange(2, 1, 999, 1).setNumberFormat('dd/MM/yyyy HH:mm');
  var dt = ss.getSheetByName(DATA) || ss.insertSheet(DATA);
  dt.getRange(1, 1, 1, 3).setValues([['Mã', 'Tiến độ (JSON)', 'Cập nhật']]);
  dt.hideSheet();
  var s1 = ss.getSheetByName('Trang tính1') || ss.getSheetByName('Sheet1'); if (s1 && ss.getSheets().length > 3) ss.deleteSheet(s1);
  ss.rename('NỀN TẢNG IELTS — THEO DÕI HỌC SINH');
  ss.setSpreadsheetTimeZone('Asia/Ho_Chi_Minh');
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('onEditTrigger').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('onOpen').forSpreadsheet(ss).onOpen().create();
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Nền tảng IELTS')
    .addItem('Tạo link cho học sinh mới', 'menuNewStudent')
    .addItem('Gia hạn thêm 7 ngày (dòng đang chọn)', 'menuExtend')
    .addItem('Tạo lại link còn thiếu', 'fillMissing')
    .addToUi();
}

function onEditTrigger(e) {
  var sh = e.range.getSheet();
  if (sh.getName() !== SHEET || e.range.getRow() < 2) return;
  if (e.range.getColumn() <= COL['Họ và tên'] && e.range.getLastColumn() >= COL['Họ và tên']) fillMissing();
}

function newCode() {
  var abc = 'abcdefghjkmnpqrstuvwxyz23456789', s = '';
  for (var i = 0; i < 10; i++) s += abc.charAt(Math.floor(Math.random() * abc.length));
  return s;
}

function fillMissing() {
  var sh = SS().getSheetByName(SHEET);
  var last = sh.getLastRow(); if (last < 2) return;
  var v = sh.getRange(2, 1, last - 1, HEAD.length).getValues();
  for (var r = 0; r < v.length; r++) {
    var name = String(v[r][COL['Họ và tên'] - 1]).trim();
    if (!name || v[r][0]) continue;
    var code = newCode();
    sh.getRange(r + 2, 1).setValue(code);
    sh.getRange(r + 2, COL['Link học']).setValue(BASE_URL + '?hs=' + code);
    sh.getRange(r + 2, COL['Ngày tạo']).setValue(new Date());
    sh.getRange(r + 2, COL['Trạng thái']).setValue('Chưa bắt đầu');
    sh.getRange(r + 2, COL['Tiến độ']).setValue('0%');
  }
}

function menuNewStudent() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('Học sinh mới', 'Họ và tên (có thể thêm lớp sau dấu |, ví dụ: Nguyễn An | IELTS 50)', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var parts = r.getResponseText().split('|'), name = parts[0].trim(); if (!name) return;
  var sh = SS().getSheetByName(SHEET);
  var row = sh.getLastRow() + 1;
  sh.getRange(row, COL['Họ và tên']).setValue(name);
  if (parts[1]) sh.getRange(row, COL['Lớp']).setValue(parts[1].trim());
  fillMissing();
  ui.alert('Link của ' + name + ':\n\n' + sh.getRange(row, COL['Link học']).getValue() + '\n\n30 ngày bắt đầu tính từ lúc học sinh mở link lần đầu.');
}

function menuExtend() {
  var sh; try { sh = SpreadsheetApp.getActiveSheet(); } catch (x) { sh = null; }
  if (!sh || sh.getName() !== SHEET) return SpreadsheetApp.getUi().alert('Chọn một dòng ở tab "Học sinh" (hoặc sửa trực tiếp ô Hạn chót).');
  var row = sh.getActiveRange().getRow(); if (row < 2) return;
  var c = sh.getRange(row, COL['Hạn chót']), d = c.getValue();
  var base = d instanceof Date && d.getTime() > Date.now() ? d : endOfDay(new Date());
  c.setValue(new Date(base.getTime() + 7 * 864e5));
  if (sh.getRange(row, COL['Trạng thái']).getValue() === 'Hết hạn') sh.getRange(row, COL['Trạng thái']).setValue('Đang học');
}

function endOfDay(d) { var x = new Date(d); x.setHours(23, 59, 59, 0); return x; }
function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function findRow(sh, code) {
  if (!code) return -1;
  var last = sh.getLastRow(); if (last < 2) return -1;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === code) return i + 2;
  return -1;
}

function readState(code) {
  var dt = SS().getSheetByName(DATA);
  var r = findRow(dt, code);
  if (r < 0) return null;
  try { return JSON.parse(dt.getRange(r, 2).getValue()); } catch (e) { return null; }
}

function writeState(code, state) {
  var dt = SS().getSheetByName(DATA);
  var r = findRow(dt, code); if (r < 0) r = dt.getLastRow() + 1;
  dt.getRange(r, 1, 1, 3).setValues([[code, JSON.stringify(state), new Date()]]);
}

function doGet(e) {
  var code = String((e.parameter || {}).hs || '').trim();
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = SS().getSheetByName(SHEET);
    var row = findRow(sh, code);
    if (row < 0) return json({ ok: false, error: 'notfound' });
    var start = sh.getRange(row, COL['Bắt đầu']).getValue();
    var deadline = sh.getRange(row, COL['Hạn chót']).getValue();
    if (!(start instanceof Date)) {
      start = new Date();
      sh.getRange(row, COL['Bắt đầu']).setValue(start);
      if (!(deadline instanceof Date)) { deadline = new Date(endOfDay(start).getTime() + (DAYS - 1) * 864e5); sh.getRange(row, COL['Hạn chót']).setValue(deadline); }
      sh.getRange(row, COL['Trạng thái']).setValue('Đang học');
      sh.getRange(row, COL['Hoạt động gần nhất']).setValue(new Date());
      appendLog(code, sh.getRange(row, COL['Họ và tên']).getValue(), [{ unit: '', part: 'Bắt đầu chương trình', score: '', detail: 'Hạn chót ' + Utilities.formatDate(deadline, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy') }]);
    }
    var status = sh.getRange(row, COL['Trạng thái']).getValue();
    if (status !== 'Hoàn thành' && deadline instanceof Date && Date.now() > deadline.getTime() && status !== 'Hết hạn') sh.getRange(row, COL['Trạng thái']).setValue('Hết hạn');
    return json({ ok: true, now: new Date().toISOString(), student: { name: sh.getRange(row, COL['Họ và tên']).getValue(), cls: sh.getRange(row, COL['Lớp']).getValue(), start: start.toISOString(), deadline: deadline instanceof Date ? deadline.toISOString() : null }, state: readState(code) });
  } finally { lock.releaseLock(); }
}

function doPost(e) {
  var body; try { body = JSON.parse(e.postData.contents); } catch (x) { return json({ ok: false, error: 'bad' }); }
  if (body.action !== 'save') return json({ ok: false, error: 'action' });
  var code = String(body.hs || '').trim();
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = SS().getSheetByName(SHEET);
    var row = findRow(sh, code);
    if (row < 0) return json({ ok: false, error: 'notfound' });
    var old = readState(code);
    if (body.state && (!old || (body.state.updatedAt || 0) >= (old.updatedAt || 0))) writeState(code, body.state);
    var s = body.summary || {};
    var deadline = sh.getRange(row, COL['Hạn chót']).getValue();
    var status = s.completed ? 'Hoàn thành' : (deadline instanceof Date && Date.now() > deadline.getTime() ? 'Hết hạn' : 'Đang học');
    var vals = {};
    vals['Trạng thái'] = status; vals['Tiến độ'] = (s.percent || 0) + '%'; vals['Đang học'] = s.current || '';
    vals['Số bài xong'] = (s.unitsDone || 0) + '/14'; vals['Điểm từ vựng TB'] = s.vocab; vals['Điểm ngữ pháp TB'] = s.grammar;
    vals['Phát âm TB'] = s.speak; vals['Kiểm tra cuối'] = s.final; vals['Từ hay sai'] = s.weak || ''; vals['Hoạt động gần nhất'] = new Date();
    for (var k in vals) sh.getRange(row, COL[k]).setValue(vals[k] == null ? '' : vals[k]);
    if (body.events && body.events.length) appendLog(code, sh.getRange(row, COL['Họ và tên']).getValue(), body.events);
    return json({ ok: true });
  } finally { lock.releaseLock(); }
}

function appendLog(code, name, events) {
  var lg = SS().getSheetByName(LOG);
  var rows = events.slice(0, 50).map(function (ev) {
    return [ev.at ? new Date(ev.at) : new Date(), code, name, ev.unit === '' || ev.unit == null ? '' : (isNaN(ev.unit) ? ev.unit : 'Bài ' + ev.unit), ev.part || '', ev.score === '' || ev.score == null ? '' : ev.score + '%', String(ev.detail || '').slice(0, 1000)];
  });
  if (rows.length) lg.getRange(lg.getLastRow() + 1, 1, rows.length, 7).setValues(rows);
}

function SS() { return SpreadsheetApp.openById(SHEET_ID); }
