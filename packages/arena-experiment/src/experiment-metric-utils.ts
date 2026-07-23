export function incrementMetricCount(
  counts: Map<string, number>,
  key: string,
  amount = 1,
): void {
  counts.set(key, (counts.get(key) ?? 0) + amount);
}

export function createSortedMetricCountRecord(
  counts: ReadonlyMap<string, number>,
): Record<string, number> {
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => (
    left < right ? -1 : left > right ? 1 : 0
  )));
}

export function metricRatioOrNull(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}
