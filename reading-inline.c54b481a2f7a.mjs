// Shared paragraph completion renderer. Answer state and grading stay in the lesson.
export function planInline(label, items) {
  if (!label || !items.length || items.some(q => !['text', 'choice'].includes(q.kind) || (q.kind === 'choice' && !q.options?.length) || q.contextTable || q.contextImage || q.sketchMap || q.extensionPrompt || q.wordParts)) return null;
  const parts = label.split(/\n\n+/);
  const byNumber = new Map();
  for (const q of items) {
    // Numbered sentences and short labels identify the same passage blanks.
    // Use the explicit number, never question order or answer-key content.
    const match = q.prompt.match(/^\s*(?:(\d+)[.)](?:\s|$)|(?:gap|blank)\s+(\d+)\b)/i);
    const number = match && Number(match[1] ?? match[2]);
    if (!number || byNumber.has(number)) return null;
    byNumber.set(number, q);
  }
  const used = new Set();
  const paragraphs = parts.map((text, index) => {
    if (index === 0 || /^Word (?:bank|box|parts):/i.test(text)) return [text];
    const chunks = [];
    let offset = 0;
    for (const m of text.matchAll(/\((\d+)\)\s*_+(?:[ \t]+_+)*/g)) {
      const number = Number(m[1]);
      if (!byNumber.has(number) || used.has(number)) return null;
      used.add(number);
      chunks.push(text.slice(offset, m.index), { number, question: byNumber.get(number) });
      offset = m.index + m[0].length;
    }
    chunks.push(text.slice(offset));
    return chunks;
  });
  return paragraphs.some(p => p === null) || used.size !== items.length ? null : paragraphs;
}

export function createInlineGroup(jsxRuntime, isCorrect, displayAnswer, sourceFor) {
  const { jsx, jsxs } = jsxRuntime;
  return function InlineGroup({ label, items, answers, words, setAnswer, setWord, submitted }) {
    const plan = planInline(label, items);
    function gap({ number, question: q }) {
      const value = answers[q.id] ?? '';
      const selected = words[q.id] ?? '';
      const options = q.kind === 'choice' ? q.options : q.wordBank?.map(word => ({ value: word, label: word }));
      const status = submitted ? (isCorrect(q, value) ? 'correct' : 'wrong') : '';
      const hintId = `inline-hint-${q.id}`;
      return jsxs('span', { className: `ri-inline-gap ${status}`, 'data-question-id': q.id, children: [
        jsx('span', { className: 'ri-inline-number', children: `(${number})` }),
        options && jsxs('select', {
          'aria-label': `Blank ${number}: choose a word`, disabled: submitted,
          value: q.requiresForm ? selected : value,
          onChange: event => { setWord(q.id, event.target.value); setAnswer(q.id, event.target.value); },
          children: [jsx('option', { value: '', children: 'Choose a word…' }), ...options.map(option => jsx('option', { value: option.value, children: option.label }, option.value))]
        }),
        q.kind !== 'choice' && (!q.wordBank || q.requiresForm) && jsx('input', {
          'aria-label': `Blank ${number}: ${q.requiresForm ? 'correct form' : 'answer'}`,
          'aria-describedby': q.requiresForm ? hintId : undefined,
          disabled: submitted || Boolean(q.wordBank && !selected),
          autoComplete: 'off', spellCheck: false, value,
          placeholder: q.requiresForm ? 'Correct form…' : 'Your answer…',
          style: { width: `${Math.max(15, Math.min(28, value.length + 4))}ch` },
          onChange: event => setAnswer(q.id, event.target.value)
        }),
        q.requiresForm && jsx('span', { id: hintId, className: 'ri-sr-only', children: 'Choose a word, then type its correct form in this blank.' }),
        submitted && jsx('span', { className: 'ri-inline-status', children: status === 'correct' ? '✓ Correct' : '✗ Incorrect' })
      ] }, q.id);
    }
    return jsxs('div', { className: 'exercise-group ri-inline-group', children: [
      jsxs('div', { className: 'exercise-group-title', children: [
        ...plan.map((chunks, index) => jsxs('p', {
          className: index === 0 ? 'exercise-instruction' : /^Word (?:bank|box|parts):/i.test(String(chunks[0])) ? 'word-bank' : 'exercise-context',
          children: chunks.map(chunk => typeof chunk === 'string' ? chunk : gap(chunk))
        }, index)),
        items.some(q => q.requiresForm && q.wordBank) && jsx('p', { className: 'ri-inline-help', children: 'Chọn từ rồi tự sửa dạng từ ngay trong ô bên cạnh.' })
      ] }),
      submitted && jsx('div', { className: 'ri-inline-feedback', children: items.map(q => jsxs('article', {
        className: `explanation-box ${isCorrect(q, answers[q.id] ?? '') ? 'correct' : 'wrong'}`,
        children: [jsx('h4', { children: q.prompt }),
          jsx('p', { children: `Bạn trả lời: ${displayAnswer(q, answers[q.id] ?? '') || '—'}` }),
          jsx('p', { children: `Đáp án đúng: ${displayAnswer(q, q.answer)}` }),
          jsx('p', { children: q.explanation }), jsx('p', { className: 'answer-source', children: sourceFor(q) })]
      }, q.id)) })
    ] });
  };
}
