/* ======================================================================
   LUYỆN PHÁT ÂM IELTS (50 tuần, PRON-001…PRON-050) — tự chấm video bằng Gemini.
   Tệp riêng trong dự án Apps Script "Nền tảng IELTS" (dùng chung GEMINI_KEY, geminiUpload, geminiCall, usageOf).
   - paSetup(): chạy 1 lần — tạo Form "IELTS | NỘP VIDEO LUYỆN PHÁT ÂM", bảng kết quả, trigger.
     Câu "Tải video" thêm tay trong Form (FormApp không tạo được câu tải tệp).
   - paOnSubmit: Form gửi → xếp hàng. paGradeQueue (5 phút/lần + 60 s sau khi nộp): chấm từng video.
   - doGet action=pa&name=…&cls=… → trang học sinh hiện điểm, nhận xét (Code.gs gọi paGet).
   Nội dung chấm lấy từ data.js của trang web, nên sửa bài trên web là máy chấm theo bài mới.
   ====================================================================== */
var PA_DATA_URL = 'https://mstrangtrieueducation-droid.github.io/vocabulary-reading-web/bd0dce6f2a3925450d119b2133aea9db/data.js';
var PA_PASS = 80;   // đạt từ 80 điểm; chưa đạt thì luyện lại và nộp lại
var PA_RES = 'Kết quả';
var PA_HEAD = ['Thời gian nộp', 'Mã phản hồi', 'Họ và tên', 'Lớp', 'Mã bài', 'Mã tệp', 'Trạng thái', 'Điểm', 'Kết luận', 'Nhận xét', 'Chi tiết (JSON)', 'Số lần thử', 'Chấm lúc', 'Chi phí (USD)', 'Video'];
var PA_Q = ['Họ và tên', 'Lớp', 'Mã bài'];

function paProps() { return PropertiesService.getScriptProperties(); }
function paSS() { return SpreadsheetApp.openById(paProps().getProperty('PA_SHEET_ID')); }
function paSheet() {
  var ss = paSS(), sh = ss.getSheetByName(PA_RES);
  if (!sh) {
    sh = ss.insertSheet(PA_RES, 0);
    sh.getRange(1, 1, 1, PA_HEAD.length).setValues([PA_HEAD]).setFontWeight('bold').setBackground('#0b123f').setFontColor('#ffffff');
    sh.setFrozenRows(1); sh.setColumnWidth(3, 200); sh.setColumnWidth(10, 380); sh.setColumnWidth(11, 120);
  }
  return sh;
}

function paSetup() {
  var P = paProps(), form = null, id = P.getProperty('PA_FORM_ID');
  if (id) { try { form = FormApp.openById(id); } catch (e) { form = null; } }
  var folder = null;
  try { folder = DriveApp.getFileById(P.getProperty('NT_FORM_ID')).getParents().next(); } catch (e) {}
  if (!P.getProperty('PA_SHEET_ID')) {
    var ss = SpreadsheetApp.create('LUYỆN PHÁT ÂM IELTS — KẾT QUẢ CHẤM');
    ss.setSpreadsheetTimeZone('Asia/Ho_Chi_Minh');
    P.setProperty('PA_SHEET_ID', ss.getId());
    if (folder) DriveApp.getFileById(ss.getId()).moveTo(folder);
  }
  if (!form) {
    form = FormApp.create('IELTS | NỘP VIDEO LUYỆN PHÁT ÂM');
    form.setTitle('IELTS | NỘP VIDEO LUYỆN PHÁT ÂM');
    form.setDescription('Bài tự luyện phát âm hằng tuần (PRON-001 → PRON-050).\nEm quay màn hình bước 4 "Nộp bài" trên trang Luyện phát âm IELTS, đọc to 3 câu trả lời trong khung vàng, rồi tải 1 video lên đây.\nHọ tên, lớp và mã bài đã được điền sẵn — em không sửa.');
    PA_Q.forEach(function (t) { form.addTextItem().setTitle(t).setRequired(true); });
    form.setConfirmationMessage('Cô đã nhận video. Máy sẽ chấm trong khoảng 5–15 phút; điểm và nhận xét hiện ngay trong bài trên trang Luyện phát âm IELTS. Đạt từ ' + PA_PASS + ' điểm; chưa đạt thì em luyện lại và nộp lại nhé.');
    form.setAllowResponseEdits(false); form.setLimitOneResponsePerUser(false); form.setCollectEmail(false);
    form.setDestination(FormApp.DestinationType.SPREADSHEET, P.getProperty('PA_SHEET_ID'));
    P.setProperty('PA_FORM_ID', form.getId());
    if (folder) DriveApp.getFileById(form.getId()).moveTo(folder);
  }
  paSheet();
  ScriptApp.getProjectTriggers().forEach(function (t) { if (['paOnSubmit', 'paGradeQueue'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('paOnSubmit').forForm(form).onFormSubmit().create();
  var tr = ScriptApp.newTrigger('paGradeQueue').timeBased().everyMinutes(5).create();
  P.setProperty('PA_TRIGGER_ID', tr.getUniqueId());
  Logger.log('Form sửa: ' + form.getEditUrl());
  Logger.log('Form nộp: ' + form.getPublishedUrl());
  Logger.log('Bảng kết quả: ' + paSS().getUrl());
  Logger.log(JSON.stringify(paFormInfo()));
}

function paFormInfo() {
  var id = paProps().getProperty('PA_FORM_ID'); if (!id) return null;
  var form = FormApp.openById(id), r = form.createResponse(), items = form.getItems(), map = {};
  items.forEach(function (it) { var t = it.getTitle(); if (PA_Q.indexOf(t) >= 0 && it.getType() === FormApp.ItemType.TEXT) r.withItemResponse(it.asTextItem().createResponse('__' + PA_Q.indexOf(t) + '__')); });
  var url = r.toPrefilledUrl();
  PA_Q.forEach(function (t, i) { var m = url.match(new RegExp('(entry\\.\\d+)=__' + i + '__')); if (m) map[t] = m[1]; });
  var hasFile = items.some(function (it) { return it.getType() === FormApp.ItemType.FILE_UPLOAD; });
  return { url: form.getPublishedUrl(), edit: form.getEditUrl(), sheet: paSS().getUrl(), entries: map, hasFileUpload: hasFile };
}

function paItem(resp, title) {
  var out = null;
  resp.getItemResponses().forEach(function (ir) { if (ir.getItem().getTitle() === title) out = ir.getResponse(); });
  return out;
}
function paOnSubmit(e) {
  var resp = e && e.response; if (!resp) return;
  var files = [];
  resp.getItemResponses().forEach(function (ir) { if (ir.getItem().getType() === FormApp.ItemType.FILE_UPLOAD) files = files.concat(ir.getResponse() || []); });
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    paSheet().appendRow([resp.getTimestamp(), resp.getId(), String(paItem(resp, 'Họ và tên') || '').replace(/\s+/g, ' ').trim(), String(paItem(resp, 'Lớp') || '').trim(),
      String(paItem(resp, 'Mã bài') || '').trim().toUpperCase(), files.join(','), files.length ? 'Chờ chấm' : 'Không có video', '', '', '', '', 0, '', '', files.length ? 'https://drive.google.com/file/d/' + files[0] + '/view' : '']);
  } finally { lock.releaseLock(); }
  try { ScriptApp.newTrigger('paGradeQueue').timeBased().after(60 * 1000).create(); } catch (x) {}
}

/* Hàng chờ riêng (không giữ khoá chung của dự án để bài Nền tảng vẫn chấm song song). */
function paGradeQueue() {
  var P = paProps(), busy = +P.getProperty('PA_BUSY') || 0;
  if (Date.now() - busy < 6 * 60 * 1000) return;
  P.setProperty('PA_BUSY', String(Date.now()));
  var t0 = Date.now();
  try {
    var keep = P.getProperty('PA_TRIGGER_ID');   // dọn các trigger "chấm sau 60 s" đã chạy
    ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'paGradeQueue' && t.getUniqueId() !== keep) { try { ScriptApp.deleteTrigger(t); } catch (x) {} } });
    var sh = paSheet(), last = sh.getLastRow(); if (last < 2) return;
    var v = sh.getRange(2, 1, last - 1, PA_HEAD.length).getValues();
    for (var i = 0; i < v.length && Date.now() - t0 < 150000; i++) {
      var st = v[i][6], tries = +v[i][11] || 0;
      if (!(st === 'Chờ chấm' || (st === 'Lỗi, thử lại' && tries < 3))) continue;
      sh.getRange(i + 2, 7).setValue('Đang chấm'); SpreadsheetApp.flush();
      var res;
      try { res = paGradeVideo(v[i]); } catch (e) { res = { err: String(e && e.message || e).slice(0, 300) }; }
      if (res.err) { sh.getRange(i + 2, 7, 1, 8).setValues([[tries + 1 >= 3 ? 'Lỗi — cô xem tay' : 'Lỗi, thử lại', '', '', '', JSON.stringify({ error: res.err }), tries + 1, new Date(), '']]); continue; }
      sh.getRange(i + 2, 7, 1, 8).setValues([['Đã chấm', res.score, res.pass ? 'Đạt' : 'Chưa đạt — luyện lại và nộp lại', res.summary || '', JSON.stringify(res), tries + 1, new Date(), res.usage ? res.usage.usd : '']]);
    }
  } finally { P.deleteProperty('PA_BUSY'); }
}

/* ---------- nội dung bài: lấy từ data.js của trang web ---------- */
function paClean(s) { return String(s).replace(/\*/g, '').replace(/‿/g, ' ').replace(/\s*[↗↘]/g, '').replace(/([,.;:!?])?\s+\/\s+/g, function (m, p) { return (p || ',') + ' '; }).replace(/\s+/g, ' ').trim(); }
function paWordAt(t, a, b) { while (a > 0 && /[A-Za-zé'’]/.test(t[a - 1])) a--; while (b < t.length && /[A-Za-zé'’]/.test(t[b])) b++; return t.slice(a, b); }
function paLesson(code) {
  var m = String(code || '').match(/PRON-(\d{3})/i); if (!m) return null;
  var w = +m[1], cache = CacheService.getScriptCache(), key = 'pa-l-' + w, hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  var t = UrlFetchApp.fetch(PA_DATA_URL + '?v=' + Date.now(), { muteHttpExceptions: true }).getContentText();
  var i = t.indexOf('window.PA_DATA='); if (i < 0) return null;
  var j = t.indexOf(';\n', i), D = JSON.parse(t.slice(i + 15, j > 0 ? j : t.lastIndexOf(']') + 1));
  var L = D.filter(function (x) { return x.w === w; })[0]; if (!L) return null;
  var sents = [], focus = [];
  L.q.forEach(function (q) { q.s.forEach(function (s) {
    sents.push(paClean(s.t));
    (s.m || []).forEach(function (x) { if (x[3]) { var wd = paWordAt(s.t, x[0], x[1]).replace(/[’']s$/, ''); if (wd && focus.indexOf(wd.toLowerCase()) < 0) focus.push(wd.toLowerCase()); } });
  }); });
  var out = { w: w, code: L.code, s: L.s, t: L.t, x: L.x, sents: sents, focus: focus.slice(0, 20) };
  cache.put(key, JSON.stringify(out), 21600);
  return out;
}

/* ---------- Gemini nghe video ---------- */
function paGradeVideo(r) {
  var key = geminiKey(); if (!key) return { err: 'Chưa có GEMINI_KEY' };
  var fileId = String(r[5]).split(',')[0]; if (!fileId) return { err: 'Không có video' };
  var L = paLesson(r[4]); if (!L) return { err: 'Không rõ mã bài ' + r[4] };
  var f = DriveApp.getFileById(fileId), size = f.getSize(), mime = f.getMimeType() || 'video/mp4';
  if (size > 1500 * 1024 * 1024) return { err: 'Video quá nặng (' + Math.round(size / 1048576) + ' MB)' };
  var uri = geminiUpload(key, fileId, size, mime, 'pa-' + L.code + '-' + Date.now());
  try {
    var prompt = 'Bạn là giáo viên phát âm tiếng Anh (chuẩn Anh–Anh, giọng mẫu của bài là giọng Anh), chấm bài cho học sinh Việt Nam luyện IELTS Speaking. Video là bản quay màn hình: học sinh mở trang "Luyện phát âm IELTS", bước 4 "Nộp bài" của ' + L.code + ' (Tuần ' + L.w + ', chủ đề ' + L.t + ') và ĐỌC TO 3 câu trả lời Speaking Part 1 trong khung vàng.\n' +
      'Học sinh: "' + r[2] + '", lớp ' + r[3] + '.\nTRỌNG TÂM TUẦN NÀY: ' + L.s + '.\n' + (L.x || []).join('\n') + '\n' +
      'CÁC CÂU PHẢI ĐỌC (theo thứ tự):\n' + L.sents.map(function (s, i) { return (i + 1) + '. ' + s; }).join('\n') + '\n' +
      (L.focus.length ? 'TỪ CÓ ÂM TRỌNG TÂM (chấm riêng từng từ): ' + L.focus.join(', ') + '\n' : '') +
      'Cách chấm: (1) Màn hình có đúng trang bài ' + L.code + ' không; có giọng HỌC SINH đọc không (giọng máy / giọng mẫu phát từ trang web không tính). (2) Nghe THẬT KỸ từng câu theo thứ tự, KHÔNG đoán theo văn bản: câu "ok" khi đọc đủ từ, rõ âm cuối, đúng trọng âm từ, nối âm và ngắt nghỉ tự nhiên; có lỗi rõ ràng → "wrong" (ghi lỗi cụ thể); bỏ câu hoặc không nghe thấy → "missing". ' +
      'Bắt lỗi hay gặp của người Việt: nuốt âm cuối (/t/ /d/ /k/ /s/ /z/ /l/…), -s/-ed sai, /θ/ /ð/ thành t/d, /ʃ/ thành s, /tʃ/ /dʒ/ sai, nguyên âm dài/ngắn, nguyên âm đôi đọc thành đơn, sai trọng âm, đọc từng từ rời rạc, lên giọng cuối câu trần thuật.\n' +
      (L.focus.length ? '(3) Với TỪNG từ trọng tâm: nghe em đọc âm trọng tâm đúng chưa → "ok" / "wrong" (ghi "heard" = IPA của đúng cái em phát ra) / "missing" nếu không đọc.\n' : '') +
      'Viết NHẬN XÉT BẰNG TIẾNG VIỆT, ngắn, cụ thể, xưng "em", tập trung vào âm trọng tâm của tuần.\n' +
      'Trả về JSON đúng mẫu: {"screen_ok": true/false, "voice_ok": true/false, "score": 0-100, "summary": "1–2 câu nhận xét chung", "sentences": [{"i": số câu, "st": "ok" | "wrong" | "missing", "issue": "lỗi cụ thể nếu wrong", "fix": "cách sửa ngắn"}], "focus": [{"w": "từ", "heard": "/IPA em đọc/", "st": "ok" | "wrong" | "missing", "fix": "cách sửa ngắn"}], "tips": ["tối đa 3 lời khuyên ưu tiên"]}. "sentences" PHẢI có đủ ' + L.sents.length + ' câu' + (L.focus.length ? ', "focus" đủ ' + L.focus.length + ' từ' : ', "focus" để []') + '.';
    var body = { contents: [{ role: 'user', parts: [{ file_data: { mime_type: mime, file_uri: uri }, video_metadata: { fps: 0.25 } }, { text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 8192, mediaResolution: 'MEDIA_RESOLUTION_LOW',
        thinkingConfig: { thinkingLevel: 'low', includeThoughts: false },
        responseFormat: { text: { mimeType: 'APPLICATION_JSON', schema: paSchema() } } } };
    var call = geminiCall(key, body), res = call.r;
    if (res.getResponseCode() === 400 && /video_metadata|fps/i.test(res.getContentText())) { delete body.contents[0].parts[0].video_metadata; call = geminiCall(key, body); res = call.r; }
    if (res.getResponseCode() === 400 && /responseFormat|schema|thinking/i.test(res.getContentText())) {
      body.generationConfig = { temperature: 0.2, maxOutputTokens: 8192, mediaResolution: 'MEDIA_RESOLUTION_LOW', responseMimeType: 'application/json' };
      call = geminiCall(key, body); res = call.r;
    }
    if (res.getResponseCode() !== 200) return { err: 'Gemini ' + res.getResponseCode() + ' ' + res.getContentText().slice(0, 200) };
    var j = JSON.parse(res.getContentText()), t = j.candidates[0].content.parts.map(function (p) { return p.text || ''; }).join('');
    var out = JSON.parse(t.replace(/^\s*```(json)?|```\s*$/g, '').trim());
    out = paFinish(out, L); out.usage = usageOf(j, call.tier); return out;
  } finally { try { UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/' + uri.split('/v1beta/')[1], { method: 'delete', headers: { 'x-goog-api-key': key }, muteHttpExceptions: true }); } catch (x) {} }
}
function paSchema() {
  var S = { type: 'string' }, B = { type: 'boolean' }, I = { type: 'integer' }, ST = { type: 'string', enum: ['ok', 'wrong', 'missing'] };
  var obj = function (p) { return { type: 'object', properties: p, required: Object.keys(p) }; };
  return obj({ screen_ok: B, voice_ok: B, score: I, summary: S,
    sentences: { type: 'array', items: obj({ i: I, st: ST, issue: S, fix: S }) },
    focus: { type: 'array', items: obj({ w: S, heard: S, st: ST, fix: S }) },
    tips: { type: 'array', items: S } });
}
// Điểm tính từ từng câu / từng từ (không tin con số tổng của máy): câu 70%, từ trọng tâm 30%. Sai: câu 0,5 điểm, từ 0,3; thiếu: 0.
function paFinish(out, L) {
  var S = out.sentences || [], F = out.focus || [], nS = L.sents.length, nF = L.focus.length, sp = 0, fp = 0, sents = [], bad = [], miss = [];
  for (var q = 1; q <= nS; q++) {
    var x = S.filter(function (y) { return +y.i === q; })[0], st = x ? String(x.st || 'ok') : 'missing';
    if (st === 'ok') { sp += 1; sents.push({ i: q, ok: true }); }
    else if (st === 'missing') { miss.push('Câu ' + q); sents.push({ i: q, ok: false, miss: true, issue: 'Em chưa đọc câu này', fix: '' }); }
    else { sp += 0.5; sents.push({ i: q, ok: false, issue: x.issue || '', fix: x.fix || '' }); }
  }
  L.focus.forEach(function (w) {
    var y = F.filter(function (z) { return String(z.w || '').toLowerCase().replace(/[^a-z'’]/g, '') === w.replace(/[^a-z'’]/g, ''); })[0], st = y ? String(y.st || 'ok') : 'ok';
    if (st === 'ok') fp += 1; else if (st === 'wrong') { fp += 0.3; bad.push({ w: w, heard: y.heard || '', fix: y.fix || '' }); } else bad.push({ w: w, heard: '', fix: 'Em chưa đọc từ này' });
  });
  var calc = nF ? Math.round(70 * sp / Math.max(1, nS) + 30 * fp / nF) : Math.round(100 * sp / Math.max(1, nS));
  out.score = Math.min(calc, Math.max(0, Math.min(100, Math.round(+out.score || calc))));
  out.sentences = sents; out.focus = bad; out.missing = miss;
  if (out.screen_ok === false || out.voice_ok === false) {
    out.score = Math.min(out.score, 30); out.invalid = true; out.sentences = []; out.focus = []; out.missing = [];
    out.summary = (out.voice_ok === false ? 'Video chưa nghe rõ giọng em đọc (giọng máy hoặc không có tiếng). ' : 'Video chưa quay đúng trang Nộp bài của ' + L.code + '. ') + 'Em quay lại và nộp lại nhé.';
  }
  out.pass = out.score >= PA_PASS; out.code = L.code; out.model = GEMINI_VIDEO_MODEL;
  return out;
}

/* ---------- trang học sinh: doGet action=pa ---------- */
function paNorm(s) { return String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim().toUpperCase(); }
function paGet(p) {
  var name = paNorm(p.name), cls = paNorm(p.cls);
  if (name.length < 5 || !cls) return json({ ok: false, error: 'name' });
  if (!paProps().getProperty('PA_SHEET_ID')) return json({ ok: true, results: [] });
  var sh = paSheet(), last = sh.getLastRow(), out = [];
  if (last >= 2) sh.getRange(2, 1, last - 1, PA_HEAD.length).getValues().forEach(function (r) {
    if (paNorm(r[2]) !== name || paNorm(r[3]) !== cls) return;
    var fb = null; if (r[6] === 'Đã chấm') { try { fb = JSON.parse(r[10]); } catch (e) {} }
    if (fb) fb = { summary: fb.summary || '', sentences: fb.sentences || [], focus: fb.focus || [], tips: (fb.tips || []).slice(0, 3), invalid: !!fb.invalid };
    out.push({ code: String(r[4]), at: iso(r[0]), status: r[6], score: r[7] === '' ? null : +r[7], pass: r[6] === 'Đã chấm' ? +r[7] >= PA_PASS : null, fb: fb, gradedAt: iso(r[12]) });
  });
  return json({ ok: true, pass: PA_PASS, results: out });
}
