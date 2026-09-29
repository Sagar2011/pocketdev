// Native Web Audio: repeating knocks/typing and a one-shot completion chime.
window.createActivitySounds = function () {
  let context, current = '', epoch = 0, timer;
  const sources = new Set();
  function stop() {
    current = ''; epoch++;
    clearTimeout(timer);
    for (const source of sources) { source.stop(); source.disconnect(); }
    sources.clear();
  }
  async function play(state, round, token) {
    try {
      context ||= new AudioContext();
      await context.resume();
      if (token !== epoch) return;
      const done = state === 'done', knock = state === 'permission';
      const volume = knock ? Math.min(0.4 + round * 0.2, 0.8) : done ? 0.12 : 0.18;
      const duration = done ? 0.3 : knock ? 0.12 : 0.04;
      for (const [index, delay] of (done ? [0, 0.16] : knock ? [0, 0.23] : [0]).entries()) {
        const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) {
          const time = i / context.sampleRate;
          const signal = done ? Math.sin(2 * Math.PI * (index ? 880 : 660) * time)
            : knock ? 0.55 * Math.sin(2 * Math.PI * 180 * time) * Math.exp(-time / 0.022)
              + 0.2 * Math.sin(2 * Math.PI * 470 * time) * Math.exp(-time / 0.007)
              + 0.65 * (Math.random() * 2 - 1) * Math.exp(-time / 0.012)
            : Math.random() * 2 - 1;
          const attack = knock ? Math.min(1, time / 0.001) : 1;
          samples[i] = signal * attack * (knock ? 1 : Math.exp(-i / (samples.length / 7)));
        }
        // A short, damped wooden impact: no sustained pitched ringing.
        if (knock) {
          let peak = 0;
          for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
          if (peak) for (let i = 0; i < samples.length; i++) samples[i] *= 0.95 / peak;
        }
        const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
        source.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = knock ? 2200 : done ? 2400 : 5000; gain.gain.value = volume;
        source.connect(filter); filter.connect(gain); gain.connect(context.destination);
        sources.add(source);
        source.onended = () => { sources.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect(); };
        source.start(context.currentTime + delay);
      }
    } catch { /* Audio unavailable: the visible status still works. */ }
    if (token === epoch && state !== 'done') timer = setTimeout(() => play(state, round + 1, token), state === 'permission' ? 6000 : 160 + Math.random() * 160);
  }
  return {
    update(state, prefs) {
      const enabled = state === 'permission' ? prefs.sound : state === 'working' ? prefs.workingSound : state === 'done' ? prefs.doneSound : false;
      const next = enabled ? state : '';
      if (next === current) return;
      stop(); current = next;
      if (next) play(next, 0, epoch);
    },
    stop
  };
};
