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
/* Chạy tay (hàm đầu tiên trong tệp = hàm mặc định khi bấm Chạy): cập nhật ngay cột CÂY TỪ VỰNG ở mọi sổ lớp. */
function stCayTuVungNgay() { CacheService.getScriptCache().remove('st_books'); stSyncRT(true); }
var ST_SCHEDULE = '1NHZ6N2fp-ptJ9p7_HN65fFSs-A_lohiGVTwndm3ud6Q';
var ST_MAIN = 'THEO DÕI TOÀN DIỆN';
var ST_PA_TAB = 'LUYỆN PHÁT ÂM';
var ST_RT_TAB = 'CÂY TỪ VỰNG';
var ST_TZ = 'Asia/Ho_Chi_Minh';

function stKey(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'D')
    .replace(/\s+/g, ' ').trim().toUpperCase()
    .replace(/\s+(NEW\b.*|(HV )?MOI\s+\d.*)$/, '').replace(/\s*[\(\[].*$/, '').replace(/\s+\d{1,2}\/\d{1,2}(\/\d{2,4})?$/, '').trim();   // sổ ghi "TÊN new 31/10/2026"
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
/* Cây từ vựng IELTS (chương trình riêng, ít nhất 2 ngày tưới 1 lần). Trạng thái JSON (cột 11) có lw = ngày tưới gần nhất,
   ngày tính như trang web: floor((giờ UTC + 7h) / 1 ngày). Ghi lại mỗi khi có lượt lưu mới HOẶC sang ngày mới (để "trễ N ngày" tự tăng). */
var ST_RT_TOTAL = 702, ST_RT_RHYTHM = 2;
function stDay(t) { return Math.floor((t + 7 * 3600e3) / 864e5); }
function stDayStr(d) { return Utilities.formatDate(new Date(d * 864e5), 'UTC', 'dd/MM'); }
/* Cột "CÂY TỪ VỰNG" trên tab chính THEO DÕI TOÀN DIỆN (Cô 14/11: "lưu vào theo dõi toàn diện luôn").
   Một cột riêng ở tận cùng bên phải (không chèn giữa, nên không làm lệch cột của các bài khác); tìm lại theo tiêu đề dòng 1.
   Chỉ ghi vào ô của cột này, đúng dòng học sinh (khớp tên với cột B); học sinh chưa vào cây ghi "— CHƯA VÀO CÂY". */
var ST_RT_HEAD = 'CÂY TỪ VỰNG';
function stMainRT(ss, cells) {
  var sh = ss.getSheetByName(ST_MAIN); if (!sh || sh.getLastRow() < 6) return;
  var lastCol = sh.getLastColumn(), head = sh.getRange(1, 1, 5, lastCol).getDisplayValues(), col = 0;
  for (var c = lastCol - 1; c >= 0 && !col; c--) for (var r = 0; r < 5; r++) {
    var t = stKey(head[r][c]); if (t === stKey(ST_RT_HEAD) || t.indexOf('IT NHAT 2 NGAY TUOI 1 LAN') >= 0) { col = c + 1; break; }
  }
  var maxCol = sh.getMaxColumns();
  if (!col) { sh.insertColumnAfter(maxCol); col = maxCol + 1; }   // sau cả cột đệm trống của nhóm cuối
  else if (col < maxCol) {   // bản đầu chèn trước cột đệm của nhóm Speaking: dời cột này ra tận cùng, trả cột đệm về nhóm
    var right = sh.getRange(1, col + 1, sh.getMaxRows(), maxCol - col).getDisplayValues();
    if (right.every(function (r) { return r.every(function (v) { return v === ''; }); })) {
      sh.moveColumns(sh.getRange(1, col, 1, 1), maxCol + 1); var sp = col; col = maxCol;
      var prev = sh.getRange(1, sp - 1).getMergedRanges()[0];
      if (prev && prev.getNumRows() === 1 && prev.getRow() === 1 && prev.getLastColumn() === sp - 1 && !sh.getRange(1, sp).isPartOfMerge()) {
        var c0 = prev.getColumn(); prev.breakApart(); sh.getRange(1, c0, 1, sp - c0 + 1).merge();
      }
    }
  }
  // cột mới chèn sau cùng có thể dính vào ô gộp tiêu đề của nhóm bên trái: tách ra, gộp lại nhóm đó như cũ (không gồm cột này)
  var hr = sh.getRange(1, col, 5, 1), merged = hr.getMergedRanges();
  if (merged.length) {
    merged.forEach(function (m) {
      var r0 = m.getRow(), c0 = m.getColumn(), nr = m.getNumRows(), nc = m.getNumColumns();
      m.breakApart();
      if (c0 < col && nc > 1) { var keep = sh.getRange(r0, c0, nr, col - c0); if (keep.getNumRows() * keep.getNumColumns() > 1) keep.merge(); }
    });
  }
  if (stKey(sh.getRange(1, col).getDisplayValue()) !== stKey(ST_RT_HEAD)) {
    hr.setValues([[ST_RT_HEAD], ['TỰ LUYỆN · ÍT NHẤT 2 NGÀY TƯỚI 1 LẦN'], ['NHỊP TƯỚI · TIẾN ĐỘ'], ['🌳 Vườn từ vựng trên dashboard'], ['Tự động cập nhật mỗi giờ']])
      .setFontWeight('bold').setWrap(true).setHorizontalAlignment('center').setVerticalAlignment('middle').setBackground('#e8f8ee').setFontColor('#0b5d36');
    sh.setColumnWidth(col, 230);
  }
  var n = sh.getLastRow() - 5, names = sh.getRange(6, 1, n, 2).getDisplayValues(), cur = sh.getRange(6, col, n, 1).getValues(), out = [], changed = false;
  for (var i = 0; i < n; i++) {
    var a = String(names[i][0]).trim(), b = String(names[i][1]).trim(), v = cur[i][0];
    if (/^\d+$/.test(a) && b) { v = cells[stKey(b)] || '— CHƯA VÀO CÂY'; }
    if (v !== cur[i][0]) changed = true; out.push([v]);
  }
  if (changed) sh.getRange(6, col, n, 1).setValues(out).setWrap(true).setVerticalAlignment('top');
  var old = ss.getSheetByName(ST_RT_TAB); if (old && ss.getSheets().length > 1) ss.deleteSheet(old);   // tab riêng cũ (do máy tạo) không dùng nữa
}

function stSyncRT(force) {
  var P = PropertiesService.getScriptProperties();
  if (!P.getProperty('RT_SHEET_ID')) return;
  var sh = rtSS().getSheetByName(RT_TAB), last = sh.getLastRow();
  var v = last < 2 ? [] : sh.getRange(2, 1, last - 1, 11).getValues(), data = {}, newest = 0, today = stDay(Date.now());
  v.forEach(function (r) {
    var cls = String(r[0]).trim().toUpperCase(), name = String(r[1]).replace(/\s+/g, ' ').trim();
    if (!/^IELTS \d+$/.test(cls) || stKey(name).length < 5) return;
    if (r[9] instanceof Date) newest = Math.max(newest, r[9].getTime());
    var st = {}; try { st = JSON.parse(r[10]) || {}; } catch (e) {}
    var lw = +st.lw || 0; if (!lw && st.days) Object.keys(st.days).forEach(function (d) { lw = Math.max(lw, +d || 0); });
    (data[cls] = data[cls] || {})[stKey(name)] = { name: name, r: r, lw: lw, n: +st.n || (st.days ? Object.keys(st.days).length : 0) };
  });
  var stamp = newest + '|' + today;
  if (force !== true && newest && stamp === P.getProperty('ST_RT_LAST')) return;   // không có gì mới, cùng ngày
  var books = stBooks();
  Object.keys(books).forEach(function (cls) {   // mọi lớp IELTS có sổ: em chưa vào cây cũng thấy "— CHƯA VÀO CÂY"
    try {
      var ss = SpreadsheetApp.openById(books[cls]), mine = data[cls] || {};
      var cells = {};
      Object.keys(mine).forEach(function (key) {
        var x = mine[key], r = x.r, lw = x.lw, due = lw + ST_RT_RHYTHM, status;
        if (!lw) status = '🌱 ĐÃ VÀO CÂY · chưa tưới lần nào';
        else if (lw === today) status = '✅ ĐÃ TƯỚI HÔM NAY';
        else if (today <= due) status = today === due ? '⏰ ĐÚNG NHỊP · hạn hôm nay' : '✅ ĐÚNG NHỊP';
        else status = '⚠️ TRỄ ' + (today - due) + ' NGÀY';
        cells[key] = status + (lw ? '\nTưới gần nhất: ' + stDayStr(lw) + ' · hạn tiếp: ' + stDayStr(due) : '') +
          '\nĐã gieo ' + (+r[3] || 0) + '/' + ST_RT_TOTAL + ' từ · cần ôn ' + (+r[4] || 0) + ' · nhớ chắc ' + ((+r[6] || 0) + (+r[7] || 0)) + '\nĐã tưới ' + x.n + ' lần';
      });
      stMainRT(ss, cells);
    } catch (e) { console.log('stSyncRT ' + cls + ': ' + e); }
  });
  P.setProperty('ST_RT_LAST', stamp);
}

/* Chạy 1 lần trong trình soạn thảo: cài trigger mỗi giờ cho Cây từ vựng + ghi lần đầu cả hai tab. */
function stSetup() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'stHourly') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('stHourly').timeBased().everyHours(1).create();
  CacheService.getScriptCache().remove('st_books');
  stSyncPA(null); stSyncRT(true);
}
function stHourly() { stSyncRT(false); }
