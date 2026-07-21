/** Beep curto via Web Audio — sem dependência externa. */

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!sharedCtx) sharedCtx = new AC();
    return sharedCtx;
  } catch {
    return null;
  }
}

export function playRiskSoundAlert(level: 'warn' | 'critico' = 'warn'): void {
  const ctx = getCtx();
  if (!ctx) return;
  void ctx.resume().catch(() => undefined);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = level === 'critico' ? 880 : 660;
  gain.gain.value = 0.0001;
  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + (level === 'critico' ? 0.35 : 0.18));
  osc.start(now);
  osc.stop(now + (level === 'critico' ? 0.4 : 0.22));
}
