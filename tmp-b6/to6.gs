/** Tổ chức lại thẻ bài học Buổi 6 (14/11/2026): 1 bài học duy nhất để HS chép; màu navy gọn. */
function to6() {
  const URL6 = 'https://raw.githubusercontent.com/mstrangtrieueducation-droid/vocabulary-reading-web/fc4557a/tmp-b6/b6v2.json';
  const J = JSON.parse(UrlFetchApp.fetch(URL6).getContentText());
  const d = DocumentApp.openById('1XotQGSfQ0MODgKDr_i_gMPIqDabGuhlAw-FWb1f0rik');
  const b = d.getTab('t.l43csdeg50w7').asDocumentTab().getBody();
  if (b.getText().indexOf('13. HAI NGUYÊN TẮC') >= 0) { Logger.log('đã làm rồi'); return; }
  const imgs = b.getImages();
  if (imgs.length !== 1) throw new Error('ảnh: ' + imgs.length);
  const blob = imgs[0].getBlob(), iw = imgs[0].getWidth(), ih = imgs[0].getHeight();
  const NAVY = '#1f3864', LIGHT = '#e8eef7', GREY = '#f3f5f8', WARN = '#fdf5e1', BORDER = '#c5d0e0', TXT = '#1f2937';
  const W = b.getPageWidth() - b.getMarginLeft() - b.getMarginRight();

  b.appendParagraph('');
  while (b.getNumChildren() > 1) b.removeChild(b.getChild(0));
  const first = b.getChild(0).asParagraph();

  const md = (s) => { let o = ''; const r = []; s.split('**').forEach((p, i) => { if (i % 2 && p.length) r.push([o.length, o.length + p.length - 1]); o += p; }); return [o, r]; };
  const fill = (p, s, o) => {
    o = o || {};
    const [t, r] = md(s);
    p.setText(t);
    p.setHeading(DocumentApp.ParagraphHeading.NORMAL);
    p.setSpacingBefore(o.sb || 0).setSpacingAfter(o.sa === undefined ? 4 : o.sa).setLineSpacing(1.15);
    if (!t.length) return p;
    const e = p.editAsText();
    e.setFontFamily('Calibri').setFontSize(o.size || 11).setForegroundColor(o.color || TXT)
      .setBold(!!o.bold).setItalic(!!o.italic).setUnderline(false);
    e.setBackgroundColor(0, t.length - 1, null);
    r.forEach(([x, y]) => e.setBold(x, y, true));
    return p;
  };
  const box = (lines, bg, o) => {
    const t = b.appendTable([['']]);
    t.setBorderColor(o.border || bg).setBorderWidth(o.border ? 1 : 0);
    const c = t.getCell(0, 0);
    c.setBackgroundColor(bg).setPaddingTop(o.pt || 6).setPaddingBottom(o.pt || 6).setPaddingLeft(10).setPaddingRight(10);
    lines.forEach((ln, i) => {
      const p = i ? c.appendParagraph('') : c.getChild(0).asParagraph();
      fill(p, ln[0], Object.assign({ sa: i === lines.length - 1 ? 0 : 3 }, ln[1]));
    });
    b.appendParagraph('').setSpacingAfter(0).editAsText().setFontSize(4);
    return t;
  };
  const tbl = (rows, ws) => {
    const t = b.appendTable(rows.map((r) => r.map(() => '')));
    t.setBorderColor(BORDER).setBorderWidth(1);
    rows.forEach((r, i) => r.forEach((x, j) => {
      const c = t.getCell(i, j);
      c.setPaddingTop(3).setPaddingBottom(3).setPaddingLeft(6).setPaddingRight(6);
      const p = fill(c.getChild(0).asParagraph(), x, { size: 10.5, sa: 0 });
      if (i === 0) { c.setBackgroundColor(LIGHT); if (p.getText().length) p.editAsText().setBold(true).setForegroundColor(NAVY); }
      else if (j === 0) { c.setBackgroundColor(GREY); if (p.getText().length) p.editAsText().setBold(true); }
    }));
    if (ws) ws.forEach((w, j) => t.setColumnWidth(j, Math.round(W * w)));
    b.appendParagraph('').setSpacingAfter(0).editAsText().setFontSize(4);
    return t;
  };

  let n = 0;
  J.blocks.forEach((k) => {
    n++;
    const ty = k[0];
    if (ty === 'banner') {
      box([[k[1], { size: 10, bold: true, color: '#c9d6ec' }], [k[2], { size: 20, bold: true, color: '#ffffff' }]], NAVY, { pt: 12 });
    } else if (ty === 'note') {
      box([[k[1], { size: 10.5 }]], LIGHT, { border: '#b8c7df' });
    } else if (ty === 'warn') {
      box([[k[1], { size: 10.5 }]], WARN, { border: '#ecd9a6' });
    } else if (ty === 'read') {
      box([[k[1], { size: 9.5, bold: true, color: '#6b7280' }]].concat(k[2].map((x) => [x, { size: 10, color: '#4b5563', italic: true }])), GREY, { border: '#d9dee6' });
    } else if (ty === 'h2') {
      b.appendParagraph('').setSpacingAfter(0).editAsText().setFontSize(6);
      box([[k[1], { size: 12.5, bold: true, color: '#ffffff' }]], NAVY, { pt: 5 });
    } else if (ty === 'h3') {
      fill(b.appendParagraph(''), k[1], { bold: true, color: NAVY, size: 11.5, sb: 6, sa: 3 });
    } else if (ty === 'p') {
      fill(b.appendParagraph(''), k[1]);
    } else if (ty === 'ex') {
      const p = fill(b.appendParagraph(''), k[1], { italic: true, color: NAVY });
      p.setIndentStart(18).setIndentFirstLine(18);
    } else if (ty === 'li') {
      const li = b.appendListItem('');
      fill(li, k[1], { sa: 2 });
      li.setGlyphType(DocumentApp.GlyphType.BULLET);
    } else if (ty === 'img') {
      const p = b.appendParagraph('');
      const im = p.appendInlineImage(blob);
      const w = Math.min(460, W);
      im.setWidth(w).setHeight(Math.round(ih * w / iw));
      p.setAlignment(DocumentApp.HorizontalAlignment.CENTER).setSpacingAfter(6);
    } else if (ty === 'tbl') {
      tbl(k[1], k[2]);
    } else throw new Error('kiểu lạ ' + ty);
  });
  b.removeChild(first);
  const cnt = b.getNumChildren();
  d.saveAndClose();
  Logger.log('xong ' + n + ' khối; con=' + cnt);
}

