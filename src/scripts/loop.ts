// The site is a loop: reaching the end and pressing "play again" starts lap 2, 3… The lap is kept
// per browser so the badge and the greeting can say which lap you are on.
const KEY = 'jlp-loop';

export function getLoop(): number {
  try {
    return Math.max(1, parseInt(localStorage.getItem(KEY) || '1', 10) || 1);
  } catch {
    return 1;
  }
}

export function nextLoop(): number {
  const n = getLoop() + 1;
  try {
    localStorage.setItem(KEY, String(n));
  } catch {}
  return n;
}
