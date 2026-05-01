export function speakSignal(data, symbol) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const name = symbol
    .replace('.NS', '').replace('.BO', '')
    .replace('-USD', '').replace(/-/g, ' ');
  const action = data.signal.toLowerCase();
  const slText = data.sl
    ? `Stop loss at ${data.sl}, that is ${data.slPct} percent below.`
    : '';
  const targets = data.targets.map((t, i) => `target ${i + 1} at ${t.price}`).join(', ');
  const luxText = [];
  if (data.lux?.sfp) luxText.push(`${data.lux.sfp} swing failure pattern detected`);
  if (data.lux?.bullOB) luxText.push(`bullish order block support at ${data.lux.bullOB.bottom}`);
  if (data.lux?.bearOB) luxText.push(`bearish order block resistance at ${data.lux.bearOB.top}`);
  const parts = [
    `${action} signal for ${name}.`,
    `Current price ${data.price}.`,
    slText,
    targets ? targets + '.' : '',
    ...luxText,
  ].filter(Boolean);
  const u = new SpeechSynthesisUtterance(parts.join(' '));
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}
