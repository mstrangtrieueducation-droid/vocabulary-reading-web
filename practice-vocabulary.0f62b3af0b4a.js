/* Practice Test vocabulary: explanations, usage, related forms and examples. */
(function () {
  const dataNode = document.getElementById('correction-vocabulary-data');
  if (!dataNode) return;
  const data = JSON.parse(dataNode.textContent);
  const root = document.querySelector('.vocabulary-review');
  const tabs = [
    {id: 'meaning', title: 'Từ/cụm từ trọng tâm', hint: 'Hiểu nghĩa theo ngữ cảnh và phân biệt những cách dùng dễ nhầm.'},
    {id: 'usage', title: 'Cấu trúc & cách dùng', hint: 'Học theo cả cụm để dùng đúng trong câu.'},
    {id: 'family', title: 'Word family & phân biệt', hint: 'Nhận biết các dạng từ và phân biệt từ gần nghĩa.'},
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
      button.setAttribute('aria-controls', panel.id);
      button.tabIndex = active ? 0 : -1;
      button.classList.toggle('active', active);
    });
    list.replaceChildren();
    for (const word of words) {
      const card = element('article', 'word-card');
      card.append(element('div', 'word-index', String(data.words.indexOf(word) + 1).padStart(2, '0')));
      const identity = element('div', 'word-identity');
      identity.append(element('p', 'word-meta', word.meta), element('h3', '', word.term));
      const meaning = element('div', 'word-meaning');
      meaning.append(element('p', 'card-label', 'NGHĨA TIẾNG VIỆT'), element('p', '', word.meaning));
      const detail = element('div', 'word-detail');
      const labels = {meaning: 'GIẢI THÍCH & LƯU Ý', usage: 'CẤU TRÚC / CỤM TỪ', family: 'DẠNG TỪ LIÊN QUAN', example: 'VÍ DỤ TỰ SOẠN'};
      detail.append(element('p', 'card-label', labels[selected]));
      detail.append(element('p', selected === 'example' ? 'example' : '', word[selected === 'meaning' ? 'note' : selected]));
      if (selected === 'example') detail.append(element('p', 'translation', word.translation));
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
