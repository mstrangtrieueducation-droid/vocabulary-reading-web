/* Reading 2 vocabulary notes: source-specific lookup guidance and four study tabs. */
(function () {
  const dataNode = document.getElementById('correction-vocabulary-data');
  if (!dataNode) return;
  const data = JSON.parse(dataNode.textContent);
  const root = document.querySelector('.vocabulary-review');
  const tabs = [
    {id: 'meaning', title: 'Từ/cụm từ trọng tâm', hint: 'Tra đúng nghĩa, ghi cấu trúc và phân biệt những cách dùng dễ nhầm.'},
    {id: 'usage', title: 'Cách dùng trong văn học thuật', hint: 'Ghi cả cấu trúc và cụm từ đi kèm; đọc lưu ý trước khi thay bằng từ gần nghĩa.'},
    {id: 'family', title: 'Word family & phân biệt', hint: 'Họ từ, biến đổi số nhiều và từ liên quan được ghi rõ; không coi mọi từ gần nghĩa là cùng họ.'},
    {id: 'example', title: 'Ví dụ trong văn cảnh', hint: 'Ví dụ tự soạn kèm nghĩa tiếng Việt; đối chiếu cách dùng rồi tự viết một câu mới.'},
  ];
  let selected = 'meaning';
  const input = root.querySelector('.search input');
  const panel = root.querySelector('[role=tabpanel]');
  const list = root.querySelector('.word-list');
  const buttons = [...root.querySelectorAll('[role=tab]')];
  function element(tag, className, value) {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (value !== undefined) item.textContent = value;
    return item;
  }
  function render() {
    const query = input.value.trim().toLocaleLowerCase('vi');
    const words = data.words.filter(word => !query || Object.values(word).flat().some(value => String(value).toLocaleLowerCase('vi').includes(query)));
    const current = tabs.find(tab => tab.id === selected);
    panel.id = 'panel-' + selected;
    panel.setAttribute('aria-labelledby', 'tab-' + selected);
    panel.querySelector('.section-heading h2').textContent = (query ? words.length + '/' : '') + data.words.length + ' ' + current.title.toLocaleLowerCase('vi');
    panel.querySelector('.section-heading > div > p:last-child').textContent = current.hint;
    buttons.forEach(button => {
      const active = button.id === 'tab-' + selected;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      button.classList.toggle('active', active);
    });
    list.replaceChildren();
    for (const word of words) {
      const card = element('article', 'word-card');
      card.append(element('div', 'word-index', String(data.words.indexOf(word) + 1).padStart(2, '0')));
      const identity = element('div', 'word-identity');
      identity.append(element('p', 'word-meta', word.meta), element('h3', '', word.term));
      const links = element('div', 'lookup-links');
      links.append(element('span', '', 'Tra Cambridge'));
      for (const term of word.lookupTerms) {
        const link = element('a', '', term.replaceAll('-', ' ') + ' ↗');
        link.href = 'https://dictionary.cambridge.org/dictionary/english/' + encodeURIComponent(term.replaceAll(' ', '-'));
        link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.setAttribute('aria-label', 'Tra ' + term.replaceAll('-', ' ') + ' trên Cambridge (mở thẻ mới)');
        links.append(link);
      }
      identity.append(links);
      const meaning = element('div', 'word-meaning');
      meaning.append(element('p', 'card-label', 'NGHĨA TIẾNG VIỆT'), element('p', '', word.meaning));
      const detail = element('div', 'word-detail');
      const labels = {meaning: 'GỢI Ý TRA CỨU · ĐIỂM CẦN GHI', usage: 'CẤU TRÚC / CỤM TỪ', family: 'HỌ TỪ / DẠNG TỪ / PHÂN BIỆT', example: 'VÍ DỤ TỰ SOẠN'};
      detail.append(element('p', 'card-label', labels[selected]));
      detail.append(element('p', selected === 'example' ? 'example' : '', word[selected === 'meaning' ? 'note' : selected]));
      if (selected === 'example') detail.append(element('p', 'translation', word.translation));
      if (selected === 'usage') {
        detail.append(element('p', 'card-label detail-subtitle', 'CHỌN ĐÚNG CÁCH DÙNG'), element('p', '', word.note));
      }
      card.append(identity, meaning, detail);
      list.append(card);
    }
    panel.querySelector('.empty')?.remove();
    if (!words.length) panel.append(element('p', 'empty', 'Không tìm thấy nội dung phù hợp.'));
  }
  function choose(index, focus) {
    const normalized = (index + tabs.length) % tabs.length;
    selected = tabs[normalized].id;
    render();
    if (focus) buttons[normalized].focus();
  }
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => choose(index, false));
    button.addEventListener('keydown', event => {
      const target = {ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1}[event.key];
      if (target !== undefined) { event.preventDefault(); choose(target, true); }
    });
  });
  input.addEventListener('input', render);
  render();
})();
