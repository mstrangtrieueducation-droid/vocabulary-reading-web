/* ======================================================================
   CÂY TỪ VỰNG HỌC THUẬT (IELTS Reading tự luyện) — lưu cây của từng học sinh + bảng theo dõi cho cô.
   Tệp riêng trong dự án Apps Script "Nền tảng IELTS". Trang web: vocabulary-reading-web/dab51bda4e22754ff9e263b66c755077/
   - doGet action=rt&name=…&cls=…  → trả trạng thái cây (Code.gs gọi rtGet).
   - doPost {action:'rt_save', name, cls, state, sum} → lưu (Code.gs gọi rtSave).
   Bảng tự tạo ở lần lưu đầu: "CÂY TỪ VỰNG HỌC THUẬT — THEO DÕI" (cùng thư mục với Form Nền tảng).
   ====================================================================== */
var RT_TAB = 'Học sinh';
var RT_HEAD = ['Lớp', 'Họ và tên', 'Bài đã gieo', 'Số từ', 'Cần ôn / mới', 'Đang lớn', 'Nhớ chắc', 'Ra quả', 'Ngày liền', 'Cập nhật', 'Trạng thái (JSON)'];
function rtSS() {
  var P = PropertiesService.getScriptProperties(), id = P.getProperty('RT_SHEET_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) {} }
  var ss = SpreadsheetApp.create('CÂY TỪ VỰNG HỌC THUẬT — THEO DÕI');
  ss.setSpreadsheetTimeZone('Asia/Ho_Chi_Minh');
  var sh = ss.getSheets()[0]; sh.setName(RT_TAB);
  sh.getRange(1, 1, 1, RT_HEAD.length).setValues([RT_HEAD]).setFontWeight('bold').setBackground('#0b123f').setFontColor('#ffffff');
  sh.setFrozenRows(1); sh.setColumnWidth(2, 200); sh.hideColumns(RT_HEAD.length);
  P.setProperty('RT_SHEET_ID', ss.getId());
  try { DriveApp.getFileById(ss.getId()).moveTo(DriveApp.getFileById(P.getProperty('NT_FORM_ID')).getParents().next()); } catch (e) {}
  return ss;
}
function rtNorm(s) { return String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim().toUpperCase(); }
function rtFind(sh, name, cls) {
  var last = sh.getLastRow(); if (last < 2) return -1;
  var v = sh.getRange(2, 1, last - 1, 2).getValues();
  for (var i = 0; i < v.length; i++) if (rtNorm(v[i][0]) === cls && rtNorm(v[i][1]) === name) return i + 2;
  return -1;
}
function rtGet(p) {
  var name = rtNorm(p.name), cls = rtNorm(p.cls);
  if (name.length < 5 || !cls) return json({ ok: false, error: 'name' });
  if (!PropertiesService.getScriptProperties().getProperty('RT_SHEET_ID')) return json({ ok: true, state: null });
  var sh = rtSS().getSheetByName(RT_TAB), r = rtFind(sh, name, cls);
  if (r < 0) return json({ ok: true, state: null });
  var st = null; try { st = JSON.parse(sh.getRange(r, RT_HEAD.length).getValue()); } catch (e) {}
  return json({ ok: true, state: st });
}
function rtSave(body) {
  var name = String(body.name || '').replace(/\s+/g, ' ').trim(), cls = String(body.cls || '').trim();
  if (rtNorm(name).length < 5 || !/^(IELTS|FIGHTER) \d+$/.test(cls)) return json({ ok: false, error: 'name' });   // FIGHTER: Cây từ vựng FIGHTER (3ef8b052…)
  var st = body.state, txt = JSON.stringify(st || {});
  if (!st || typeof st !== 'object' || txt.length > 45000) return json({ ok: false, error: 'state' });
  var s = body.sum || {}, lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = rtSS().getSheetByName(RT_TAB), r = rtFind(sh, rtNorm(name), rtNorm(cls));
    if (r > 0) { var old = null; try { old = JSON.parse(sh.getRange(r, RT_HEAD.length).getValue()); } catch (e) {} if (old && +old.t > +st.t) return json({ ok: true, stale: true }); }
    var row = [cls, name, +s.passages || 0, +s.words || 0, +s.due || 0, +s.grow || 0, +s.sure || 0, +s.fruit || 0, +s.streak || 0, new Date(), txt];
    if (r < 0) sh.appendRow(row); else sh.getRange(r, 1, 1, row.length).setValues([row]);
    return json({ ok: true });
  } finally { lock.releaseLock(); }
}
