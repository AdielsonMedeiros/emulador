export function unlockAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (AudioCtx) {
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
  }
}

