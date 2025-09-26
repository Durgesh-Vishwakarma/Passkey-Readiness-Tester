// Lightweight in-memory response time tracker
const times: number[] = [];

export function recordResponseTime(ms: number) {
  if (Number.isFinite(ms)) {
    times.push(ms);
    if (times.length > 1000) times.shift();
  }
}

export function getAverageResponseTime(): number | null {
  if (!times.length) return null;
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  return Math.round(avg);
}

export function resetResponseTimes() {
  times.length = 0;
}
