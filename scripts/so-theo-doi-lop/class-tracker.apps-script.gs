/* ======================================================================
   GHI ĐIỂM VÀO SỔ LỚP — tệp "SoTheoDoiLop.gs" trong dự án Apps Script "Nền tảng IELTS".
   Sổ của mỗi lớp = file "IELTS xx_THEO DÕI TOÀN DIỆN" (danh sách ở Schedule › AUTO_LOP_THEO_DOI).
   Ghi vào 2 TAB RIÊNG ở cuối sổ, KHÔNG đụng tab "THEO DÕI TOÀN DIỆN" (tab đó do hệ thống nhận bài/dashboard quản lý):
     • "LUYỆN PHÁT ÂM" — điểm cao nhất, số lần nộp, giờ nộp của từng bài PRON-xxx (tự cập nhật ngay sau mỗi lượt chấm).
     • "CÂY TỪ VỰNG"   — tiến độ Cây từ vựng học thuật của từng em (tự cập nhật mỗi giờ).
   Hàng = danh sách lớp lấy từ tab "THEO DÕI TOÀN DIỆN" (cột B); tên học sinh gõ lệch dấu/hoa thường vẫn khớp;
   tên không có trong sổ được liệt kê riêng ở cuối ("Tên chưa khớp sổ") để cô sửa.
   Chạy 1 lần: stSetup()  (cài trigger mỗi giờ + ghi lần đầu cho mọi lớp).
   ====================================================================== */
var ST_SCHEDULE = '1NHZ6N2fp-ptJ9p7_HN65fFSs-A_lohiGVTwndm3ud6Q';
var ST_MAIN = 'THEO DÕI TOÀN DIỆN';
var ST_PA_TAB = 'LUYỆN PHÁT ÂM';
var ST_RT_TAB = 'CÂY TỪ VỰNG';
var ST_TZ = 'Asia/Ho_Chi_Minh';

function stKey(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'D')
    .replace(/\s+/g, ' ').trim().toUpperCase();
}
function stTime(d) { return d instanceof Date ? Utilities.formatDate(d, ST_TZ, 'dd/MM/yyyy HH:mm') : ''; }

/* Lớp → ID sổ (đọc Schedule › AUTO_LOP_THEO_DOI, nhớ 6 giờ). */
function stBooks() {
  var c = CacheService.getScriptCache(), hit = c.get('st_books');
  if (hit) return JSON.parse(hit);
  var sh = SpreadsheetApp.openById(ST_SCHEDULE).getSheetByName('AUTO_LOP_THEO_DOI'), map = {};
  if (sh && sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 2).getDisplayValues().forEach(function (r) {
    var cls = String(r[0]).replace(/\s+/g, ' ').trim().toUpperCase(), id = String(r[1]).trim();
    if (/^IELTS \d+$/.test(cls) && /^[-\w]{25,}$/.test(id)) map[cls] = id;
  });
  c.put('st_books', JSON.stringify(map), 21600);
  return map;
}

/* Danh sách lớp trong sổ: [{no, name, group}] theo đúng thứ tự trên tab THEO DÕI TOÀN DIỆN. */
function stRoster(ss) {
  var sh = ss.getSheetByName(ST_MAIN), out = [];
  if (!sh || sh.getLastRow() < 6) return out;
  var group = '';
  sh.getRange(6, 1, sh.getLastRow() - 5, 2).getDisplayValues().forEach(function (r) {
    var a = String(r[0]).trim(), b = String(r[1]).replace(/\s+/g, ' ').trim();
    if (/^IELTS\s*\d+(\.\d+)?$/i.test(a) && !b) { group = a.toUpperCase(); return; }
    if (/^\d+$/.test(a) && b) out.push({ no: +a, name: b, group: group });
  });
  return out;
}

/* Ghi đè trọn tab riêng (chỉ tab có tên đúng ST_PA_TAB / ST_RT_TAB). */
function stWriteTab(ss, tab, note, head, rows, widths) {
  if (tab !== ST_PA_TAB && tab !== ST_RT_TAB) throw new Error('TAB_NOT_ALLOWED');
  var sh = ss.getSheetByName(tab) || ss.insertSheet(tab, ss.getNumSheets());
  sh.clear();
  var n = head.length, need = rows.length + 2;
  if (sh.getMaxColumns() < n) sh.insertColumnsAfter(sh.getMaxColumns(), n - sh.getMaxColumns());
  if (sh.getMaxRows() < need) sh.insertRowsAfter(sh.getMaxRows(), need - sh.getMaxRows());
  sh.getRange(1, 1).setValue(note).setFontStyle('italic').setFontColor('#5b6475');
  sh.getRange(2, 1, 1, n).setValues([head]).setFontWeight('bold').setBackground('#0b123f').setFontColor('#ffffff')
    .setWrap(true).setVerticalAlignment('middle').setHorizontalAlignment('center');
  if (rows.length) sh.getRange(3, 1, rows.length, n).setValues(rows).setWrap(true).setVerticalAlignment('top');
  sh.setFrozenRows(2); sh.setFrozenColumns(Math.min(3, n));
  (widths || []).forEach(function (w, i) { if (w && i < n) sh.setColumnWidth(i + 1, w); });
  return sh;
}

/* Ghép danh sách lớp + người nộp: tên khớp sổ theo đúng thứ tự sổ; tên lạ xếp cuối. */
function stRows(roster, byKey) {
  var used = {}, list = [];
  roster.forEach(function (s) { var k = stKey(s.name); used[k] = 1; list.push({ no: s.no, name: s.name, group: s.group, d: byKey[k] || null }); });
  Object.keys(byKey).sort().forEach(function (k) {
    if (!used[k]) list.push({ no: '', name: byKey[k].name, group: 'Tên chưa khớp sổ', d: byKey[k] });
  });
  return list;
}

/* ---------------- LUYỆN PHÁT ÂM ---------------- */
function stPaCell(x) {
  if (!x) return '';
  var t = x.attempts + ' lần · ' + stTime(x.last);
  if (x.best === null) return (x.pending ? '⏳ Đang chờ chấm' : '⚠️ Lỗi chấm — cô xem tay') + '\n' + t;
  if (x.best >= PA_PASS) return '✅ ĐẠT ' + x.best + '/100\n' + t;
  if (x.invalid && x.best <= 30) return '⚠️ Video không hợp lệ — nộp lại\n' + t;
  return '🔁 CHƯA ĐẠT ' + x.best + '/100\n' + t;
}
function stSyncPA(onlyClasses) {
  if (!PropertiesService.getScriptProperties().getProperty('PA_SHEET_ID')) return;
  var sh = paSheet(), last = sh.getLastRow(); if (last < 2) return;
  var v = sh.getRange(2, 1, last - 1, PA_HEAD.length).getValues(), data = {};
  v.forEach(function (r) {
    var cls = String(r[3]).replace(/\s+/g, ' ').trim().toUpperCase(), name = String(r[2]).replace(/\s+/g, ' ').trim(), code = String(r[4]).trim().toUpperCase();
    if (!/^IELTS \d+$/.test(cls) || stKey(name).length < 5 || !/^PRON-\d{3}$/.test(code)) return;
    var C = data[cls] = data[cls] || { codes: {}, people: {} }, k = stKey(name);
    var p = C.people[k] = C.people[k] || { name: name, items: {} };
    var x = p.items[code] = p.items[code] || { best: null, attempts: 0, last: null, pending: false, invalid: false };
    C.codes[code] = 1; x.attempts++;
    if (r[0] instanceof Date && (!x.last || r[0] > x.last)) x.last = r[0];
    if (r[6] === 'Đã chấm' && r[7] !== '') {
      var sc = +r[7], inv = false; try { inv = !!JSON.parse(r[10]).invalid; } catch (e) {}
      if (x.best === null || sc > x.best) { x.best = sc; x.invalid = inv; }
    } else if (/Chờ chấm|Đang chấm|thử lại/.test(String(r[6]))) x.pending = true;
  });
  var books = stBooks(), want = onlyClasses ? onlyClasses.map(function (c) { return String(c).toUpperCase(); }) : Object.keys(data);
  want.forEach(function (cls) {
    var C = data[cls]; if (!C || !books[cls]) return;
    try {
      var ss = SpreadsheetApp.openById(books[cls]), codes = Object.keys(C.codes).sort();
      var list = stRows(stRoster(ss), C.people), rows = list.map(function (s) {
        var it = s.d ? s.d.items : {}, done = 0, sum = 0, n = 0;
        codes.forEach(function (c) { var x = it[c]; if (x && x.best !== null) { n++; sum += x.best; if (x.best >= PA_PASS) done++; } });
        return [s.no, s.name, s.group, s.d ? done + '/' + codes.length : '', n ? Math.round(sum / n) : '']
          .concat(codes.map(function (c) { return stPaCell(it[c]); }));
      });
      var head = ['STT', 'HỌ TÊN HỌC VIÊN', 'NHÓM', 'SỐ BÀI ĐẠT', 'ĐIỂM TB'].concat(codes);
      var w = [40, 190, 90, 80, 70]; codes.forEach(function () { w.push(150); });
      stWriteTab(ss, ST_PA_TAB, 'Tự động từ máy chấm Luyện phát âm IELTS (đạt từ ' + PA_PASS + ' điểm; ô = điểm cao nhất của các lần nộp). Cập nhật ' + stTime(new Date()) + '. Không sửa tay — sẽ bị ghi đè.', head, rows, w);
    } catch (e) { console.log('stSyncPA ' + cls + ': ' + e); }
  });
}

/* ---------------- CÂY TỪ VỰNG ---------------- */
function stSyncRT(force) {
  var P = PropertiesService.getScriptProperties();
  if (!P.getProperty('RT_SHEET_ID')) return;
  var sh = rtSS().getSheetByName(RT_TAB), last = sh.getLastRow(); if (last < 2) return;
  var v = sh.getRange(2, 1, last - 1, 10).getValues(), data = {}, newest = 0;
  v.forEach(function (r) {
    var cls = String(r[0]).trim().toUpperCase(), name = String(r[1]).replace(/\s+/g, ' ').trim();
    if (!/^IELTS \d+$/.test(cls) || stKey(name).length < 5) return;
    if (r[9] instanceof Date) newest = Math.max(newest, r[9].getTime());
    (data[cls] = data[cls] || {})[stKey(name)] = { name: name, r: r };
  });
  if (force !== true && newest && String(newest) === P.getProperty('ST_RT_LAST')) return;   // không có gì mới
  var books = stBooks();
  Object.keys(data).forEach(function (cls) {
    if (!books[cls]) return;
    try {
      var ss = SpreadsheetApp.openById(books[cls]), today = Utilities.formatDate(new Date(), ST_TZ, 'dd/MM/yyyy');
      var rows = stRows(stRoster(ss), data[cls]).map(function (s) {
        if (!s.d) return [s.no, s.name, s.group, '— chưa vào cây', '', '', '', '', '', '', ''];
        var r = s.d.r, when = r[9] instanceof Date ? r[9] : null;
        var watered = when && Utilities.formatDate(when, ST_TZ, 'dd/MM/yyyy') === today ? '✅ hôm nay' : '';
        return [s.no, s.name, s.group, +r[2] || 0, +r[3] || 0, +r[5] || 0, +r[6] || 0, +r[7] || 0, +r[8] || 0, stTime(when), watered];
      });
      stWriteTab(ss, ST_RT_TAB, 'Tự động từ Cây từ vựng học thuật (IELTS Reading). Cập nhật ' + stTime(new Date()) + ' (mỗi giờ). Không sửa tay — sẽ bị ghi đè.',
        ['STT', 'HỌ TÊN HỌC VIÊN', 'NHÓM', 'BÀI ĐÃ GIEO', 'SỐ TỪ', 'ĐANG LỚN', 'NHỚ CHẮC', 'RA QUẢ', 'NGÀY LIỀN', 'TƯỚI GẦN NHẤT', 'HÔM NAY'],
        rows, [40, 190, 90, 80, 70, 80, 80, 70, 80, 130, 90]);
    } catch (e) { console.log('stSyncRT ' + cls + ': ' + e); }
  });
  if (newest) P.setProperty('ST_RT_LAST', String(newest));
}

/* Chạy 1 lần trong trình soạn thảo: cài trigger mỗi giờ cho Cây từ vựng + ghi lần đầu cả hai tab. */
function stSetup() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'stHourly') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('stHourly').timeBased().everyHours(1).create();
  CacheService.getScriptCache().remove('st_books');
  stSyncPA(null); stSyncRT(true);
}
function stHourly() { stSyncRT(false); }
