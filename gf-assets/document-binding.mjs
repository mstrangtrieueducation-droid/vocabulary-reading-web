// A lesson must bind to the exact Unit and document role. Never fall back to another Unit.
export function normalizeUnit(value) {
  const match = String(value).trim().match(/^(?:unit\s*)?(\d+)(?:[._](\d+))?$/i);
  if (!match) throw new Error(`Invalid Grammar Unit: ${value}`);
  return String(Number(match[1])) + (match[2] ? '.' + Number(match[2]) : '');
}

export function classifyDocument(title) {
  const plain = String(title).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const match = plain.match(/^unit\s+(\d+(?:[._]\d+)?)\s*[_–—-]\s*(li thuyet|ly thuyet|kiem tra)\s*$/);
  if (!match) throw new Error(`Unclassified Grammar document: ${title}`);
  return {unit: normalizeUnit(match[1]), role: match[2] === 'kiem tra' ? 'test' : 'theory'};
}

export function resolveDocument(record, unit, role) {
  const actual = classifyDocument(record.title);
  if (actual.unit !== normalizeUnit(unit) || actual.role !== role || !/^[\w-]+$/.test(record.id || '')) {
    throw new Error(`Grammar document mismatch: Unit ${unit}, ${role}`);
  }
  return record.id;
}

export function selectDocument(catalog, unit, role) {
  const matches = catalog.filter(record => {
    const actual = classifyDocument(record.title);
    return actual.unit === normalizeUnit(unit) && actual.role === role;
  });
  if (matches.length !== 1) throw new Error(`Expected one Grammar document: Unit ${unit}, ${role}; found ${matches.length}`);
  resolveDocument(matches[0], unit, role);
  return matches[0];
}
