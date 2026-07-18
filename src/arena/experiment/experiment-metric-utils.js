export function incrementMetricCount(counts, key, amount = 1) {
  counts.set(key, (counts.get(key) ?? 0) + amount);
}

export function createSortedMetricCountRecord(counts) {
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => (
    left < right ? -1 : left > right ? 1 : 0
  )));
}

export function metricRatioOrNull(numerator, denominator) {
  return denominator === 0 ? null : numerator / denominator;
}
