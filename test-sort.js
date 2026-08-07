const filtered = [
  { item: { videoFrameRate: 24, videoBitDepth: "10" } },
  { item: { videoFrameRate: 60, videoBitDepth: "8" } },
  { item: { videoFrameRate: undefined, videoBitDepth: undefined } },
  { item: { videoFrameRate: 30, videoBitDepth: "8" } }
];
const activeSortCol = 'videoFrameRate';
const sortDirection = 'asc';
const sortCache = new Map();
filtered.forEach(row => {
  const { item } = row;
  let val = Number(item.videoFrameRate) || 0;
  sortCache.set(row, { val, normVal: val });
});
filtered.sort((a, b) => {
  const cachedA = sortCache.get(a);
  const cachedB = sortCache.get(b);
  const valA = cachedA?.val !== undefined ? cachedA.val : '';
  const valB = cachedB?.val !== undefined ? cachedB.val : '';
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
console.log(filtered.map(f => f.item.videoFrameRate));
