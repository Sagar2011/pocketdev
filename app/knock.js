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
      const volume = knock ? Math.min(0.12 + round * 0.11, 0.34) : done ? 0.12 : 0.035;
      const duration = done ? 0.3 : knock ? 0.09 : 0.025;
      for (const [index, delay] of (done ? [0, 0.16] : knock ? [0, 0.18] : [0]).entries()) {
        const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) {
          const signal = done ? Math.sin(2 * Math.PI * (index ? 880 : 660) * i / context.sampleRate) : Math.random() * 2 - 1;
          samples[i] = signal * Math.exp(-i / (samples.length / 7));
        }
        const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
        source.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = knock ? 950 : 2400; gain.gain.value = volume;
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
