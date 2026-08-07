const filtered = [
  { item: { chapterCount: 10 } },
  { item: { chapterCount: 20 } },
  { item: { chapterCount: 0 } },
  { item: { chapterCount: undefined } }
];
const activeSortCol = 'chapterCount';
const sortDirection = 'desc';
const sortCache = new Map();
filtered.forEach(row => {
  const { item } = row;
  let val = item.chapterCount || 0;
  sortCache.set(row, { val, normVal: val });
});
filtered.sort((a, b) => {
  const cachedA = sortCache.get(a);
  const cachedB = sortCache.get(b);
  const valA = cachedA?.val || '';
  const valB = cachedB?.val || '';
  if (typeof valA === 'string' && typeof valB === 'string') {
    return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
  } else {
    const numA = Number(valA) || 0;
    const numB = Number(valB) || 0;
    if (numA < numB) return sortDirection === 'asc' ? -1 : 1;
    if (numA > numB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  }
});
console.log(filtered.map(f => f.item.chapterCount));
