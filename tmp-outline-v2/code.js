/**
 * Ms Trang Trieu Education — cập nhật Doc IELTS Writing Task 2 (07/11/2026).
 * Sửa chữ (chỉ khi chuỗi xuất hiện đúng 1 lần trong cả Doc) và thay ảnh sơ đồ outline
 * (chỉ khi số ảnh trong Doc khớp số ảnh đã đối chiếu). Bản lưu trước khi sửa nằm trong
 * thư mục "Bản lưu IELTS Viết Task 2 trước khi sửa (07-11-2026)".
 */
const JOBS_URL = 'https://raw.githubusercontent.com/mstrangtrieueducation-droid/vocabulary-reading-web/main/tmp-outline-v2/jobs.json';

function allTabs_(doc) {
  const out = [];
  const walk = (tabs) => tabs.forEach((t) => { out.push(t); walk(t.getChildTabs()); });
  walk(doc.getTabs());
  return out;
}
function esc_(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function findAll_(bodies, c) {
  const re = esc_(c), hits = [];
  bodies.forEach((b) => { let r = null; while ((r = b.findText(re, r))) hits.push(r); });
  return hits;
}
function images_(bodies) {
  const out = [];
  bodies.forEach((b) => b.getImages().forEach((i) => out.push(i)));
  return out;
}

/** Chỉ đọc: kiểm tra số ảnh và số lần xuất hiện của từng chuỗi, không sửa gì. */
function dryRun() { process_(false); }
/** Sửa thật. Chạy lại nếu log báo TIME (mỗi Doc chỉ sửa một lần). */
function runAll() { process_(true); }
/** Xoá dấu "đã sửa" để có thể chạy lại từ đầu. */
function resetProgress() { PropertiesService.getScriptProperties().deleteAllProperties(); }

function process_(apply) {
  const J = JSON.parse(UrlFetchApp.fetch(JOBS_URL + '?t=' + Date.now()).getContentText());
  const P = PropertiesService.getScriptProperties();
  const t0 = Date.now(), log = [];
  for (const id of Object.keys(J.docs)) {
    if (apply && P.getProperty('done_' + id)) { log.push('DONE ' + id); continue; }
    if (Date.now() - t0 > 4.5 * 60 * 1000) { log.push('TIME — chạy lại runAll'); break; }
    const job = J.docs[id];
    const doc = DocumentApp.openById(id);
    const bodies = allTabs_(doc).map((t) => t.asDocumentTab().getBody());
    const r = { id: id, name: doc.getName().slice(0, 40), text: [], img: [] };
    (job.text || []).forEach(([c, p]) => {
      const h = findAll_(bodies, c);
      if (h.length !== 1) { r.text.push('SKIP' + h.length + ': ' + c.slice(0, 50)); return; }
      if (!apply) { r.text.push('ok'); return; }
      const e = h[0].getElement().asText();
      const s = h[0].getStartOffset(), en = h[0].getEndOffsetInclusive();
      e.insertText(en + 1, p);
      e.deleteText(s, en);
      r.text.push('ok');
    });
    if (job.images) {
      const imgs = images_(bodies);
      if (imgs.length !== job.images.count) {
        r.img.push('COUNT ' + imgs.length + ' != ' + job.images.count + ' — bỏ qua ảnh');
      } else if (!apply) {
        const bad = job.images.items.filter(([i, u, aspect]) => aspect && Math.abs(imgs[i].getHeight() / imgs[i].getWidth() - aspect) > 0.04).map(x => x[0]);
        r.img.push('count ok ' + imgs.length + ', sẽ thay ' + job.images.items.length + (bad.length ? ', lệch tỉ lệ: ' + bad.join(',') : ''));
      } else {
        job.images.items.forEach(([i, url, aspect]) => {
          const old = imgs[i];
          const a = old.getHeight() / old.getWidth();
          if (aspect && Math.abs(a - aspect) > 0.04) { r.img.push('ASPECT ' + i + ' ' + a.toFixed(3) + ' != ' + aspect); return; }
          const par = old.getParent();
          const idx = par.getChildIndex(old);
          const w = old.getWidth();
          const blob = UrlFetchApp.fetch(url).getBlob();
          const ni = par.insertInlineImage(idx, blob);
          const nw = ni.getWidth(), nh = ni.getHeight();
          ni.setWidth(w).setHeight(Math.round(w * nh / nw));
          try { ni.setAltTitle(old.getAltTitle() || 'Outline'); ni.setAltDescription(old.getAltDescription() || ''); } catch (err) {}
          old.removeFromParent();
          r.img.push(i);
        });
      }
    }
    if (apply) { doc.saveAndClose(); P.setProperty('done_' + id, '1'); }
    log.push(JSON.stringify(r));
  }
  Logger.log(log.join('\n'));
  return log;
}
