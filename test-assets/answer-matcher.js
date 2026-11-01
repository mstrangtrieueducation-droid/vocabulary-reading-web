(function (root) {
  'use strict';
  const normalize = value => String(value ?? '').normalize('NFKC').trim().toLowerCase()
    .replace(/[’‘]/g, "'").replace(/[.!?]+$/g, '').trim().replace(/\s+/g, ' ');
  const option = value => String(value ?? '').trim().match(/^([A-D])\s*[.):\-]\s*(\S[\s\S]*)$/i);
  const noArticle = value => /^(?:ø|∅|[-–—]|no article)$/i.test(normalize(value));
  const sameContent = (left, right) => normalize(left) === normalize(right) || (noArticle(left) && noArticle(right));
  function matches(solution, submitted, equivalent = (a,b) => normalize(a) === normalize(b)) {
    const accepted = solution.acceptedAnswers || [];
    if (!String(submitted ?? '').trim()) return false;
    if (accepted.some(answer => equivalent(answer,submitted))) return true;
    // Only expand an explicitly labelled choice whose key is accepted.
    // A grammatical article 'a' is not automatically a multiple-choice answer.
    const display = option(solution.displayAnswer);
    if (!display || !accepted.length || !accepted.every(answer => /^[A-D]$/i.test(String(answer).trim()))) return false;
    if (!accepted.some(answer => normalize(answer) === normalize(display[1]))) return false;
    const entered = option(submitted);
    if (entered) return normalize(entered[1]) === normalize(display[1]) && sameContent(entered[2],display[2]);
    return sameContent(submitted,display[2]);
  }
  root.MTTAnswerMatcher = Object.freeze({matches});
  if (typeof module === 'object' && module.exports) module.exports = root.MTTAnswerMatcher;
})(typeof globalThis !== 'undefined' ? globalThis : this);
