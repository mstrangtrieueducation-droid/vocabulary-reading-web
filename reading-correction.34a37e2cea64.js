/* Native GitHub version of the original four-tab vocabulary notes.
   Data and text come unchanged from the existing Reading 2 correction pages. */
(function () {
  const dataNode = document.getElementById('correction-vocabulary-data');
  if (!dataNode) return;
  const data = JSON.parse(dataNode.textContent);
  const root = document.querySelector('.vocabulary-review');
  const tabs = [
    {id: 'meaning', title: 'Từ/cụm từ trọng tâm', hint: 'Nhận diện từ loại và nghĩa chính.'},
    {id: 'usage', title: 'Cách dùng trong văn học thuật', hint: 'Chú ý cấu trúc, sắc thái và collocation đi kèm.'},
    {id: 'family', title: 'Word family & từ gần nghĩa', hint: 'Mở rộng vốn từ nhưng không thay thế máy móc trong mọi ngữ cảnh.'},
    {id: 'example', title: 'Ví dụ Academic Reading & Writing', hint: 'Đọc trong ngữ cảnh rồi tự đặt thêm một câu mới.'},
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
    const words = data.words.filter(word => !query || Object.values(word).some(value => value.toLocaleLowerCase('vi').includes(query)));
    const current = tabs.find(tab => tab.id === selected);
    panel.id = 'panel-' + selected;
    panel.setAttribute('aria-labelledby', 'tab-' + selected);
    panel.querySelector('.section-heading h2').textContent = data.words.length + ' ' + current.title.toLocaleLowerCase('vi');
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
      const meaning = element('div', 'word-meaning');
      meaning.append(element('p', 'card-label', 'NGHĨA TIẾNG VIỆT'), element('p', '', word.meaning));
      const detail = element('div', 'word-detail');
      const labels = {meaning: 'GHI NHỚ NHANH', usage: 'CÁCH DÙNG / LƯU Ý', family: 'WORD FAMILY / TỪ GẦN NGHĨA', example: 'VÍ DỤ HỌC THUẬT TRONG VĂN CẢNH'};
      detail.append(element('p', 'card-label', labels[selected]));
      const paragraph = element('p', selected === 'example' ? 'example' : '');
      if (selected === 'meaning') paragraph.append('Ghi lại ', element('strong', '', word.term), ' cùng từ loại và nghĩa chính: ', element('strong', '', word.meaning), '.');
      else paragraph.textContent = word[selected];
      detail.append(paragraph);
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
