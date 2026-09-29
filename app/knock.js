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
      const volume = knock ? Math.min(0.4 + round * 0.2, 0.8) : done ? 0.12 : 0.035;
      const duration = done ? 0.3 : knock ? 0.14 : 0.025;
      for (const [index, delay] of (done ? [0, 0.16] : knock ? [0, 0.18] : [0]).entries()) {
        const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) {
          const time = i / context.sampleRate;
          const signal = done ? Math.sin(2 * Math.PI * (index ? 880 : 660) * time)
            : knock ? 0.55 * Math.sin(2 * Math.PI * 320 * time) + 0.25 * Math.sin(2 * Math.PI * 730 * time) + 0.2 * (Math.random() * 2 - 1)
            : Math.random() * 2 - 1;
          const attack = knock ? Math.min(1, time / 0.001) : 1;
          samples[i] = signal * attack * Math.exp(-i / (samples.length / (knock ? 4 : 7)));
        }
        const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
        source.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = knock ? 1800 : 2400; gain.gain.value = volume;
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
