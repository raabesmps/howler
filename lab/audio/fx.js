/* The effects engine shared by approaches B and C (no UI here).
   source -> pitch (playbackRate) -> distortion (WaveShaper) -> bass shelf -> compressor
          -> dry/wet reverb (Convolver) -> tremolo (LFO on gain) -> volume ramp -> master -> limiter -> analyser -> speakers

   A "recipe" is six knobs (K, 0..100) plus shake. They are turned into the raw parameters (P) the chain uses.
   The page never shows the raw parameters: people pick a starting recipe and nudge it ("more deep", "more echo"). */
(function () {
  'use strict';
  var LAB = window.LAB;

  var PRESETS = {
    clean:  { depth: 0,  rage: 0,  boom: 0,  echo: 0,  build: 0,  volume: 70, shake: 0 },
    howler: { depth: 38, rage: 35, boom: 50, echo: 35, build: 80, volume: 75, shake: 22 },
    demon:  { depth: 75, rage: 65, boom: 78, echo: 60, build: 90, volume: 70, shake: 35 },
    radio:  { depth: 12, rage: 55, boom: 0,  echo: 10, build: 40, volume: 70, shake: 10 }
  };

  var K = {}, P = {};
  function derive() {
    P.pitch = -Math.round((K.depth * 12) / 25) * 25;
    P.drive = K.rage;
    P.comp = Math.min(100, K.rage * 0.6 + K.boom * 0.3);
    P.bass = Math.round(K.boom * 0.18);
    P.reverbMix = K.echo;
    P.reverbSize = +(0.6 + K.echo * 0.03).toFixed(1);
    P.rampStart = Math.round(100 - K.build * 0.9);
    P.rampTime = +(K.build * 0.015).toFixed(1);
    P.master = K.volume;
    P.tremDepth = K.shake;
    P.tremRate = +(6 + K.shake * 0.1).toFixed(1);
  }

  LAB.fx = {
    presets: Object.keys(PRESETS),
    setPreset: function (name) { Object.keys(PRESETS[name]).forEach(function (k) { K[k] = PRESETS[name][k]; }); derive(); },
    tweak: function (knob, delta) { K[knob] = Math.max(0, Math.min(100, K[knob] + delta)); derive(); },
    knobs: function () { return JSON.parse(JSON.stringify(K)); }
  };
  LAB.getSettings = function () { return { knobs: JSON.parse(JSON.stringify(K)), raw: JSON.parse(JSON.stringify(P)) }; };
  LAB.fx.setPreset('howler');

  /* ---------- DSP helpers ---------- */
  function driveCurve(amount) {
    // odd length so that input 0 maps exactly to the middle sample (output 0): an even length leaves a DC offset
    var n = 2049, c = new Float32Array(n), k = amount * 2.2, deg = Math.PI / 180;
    for (var i = 0; i < n; i++) { var x = (i * 2) / (n - 1) - 1; c[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x)); }
    return c;
  }
  function impulse(ctx, seconds, decay) {
    var rate = ctx.sampleRate, len = Math.max(1, Math.floor(rate * seconds)), ir = ctx.createBuffer(2, len, rate);
    for (var ch = 0; ch < 2; ch++) {
      var d = ir.getChannelData(ch);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return ir;
  }

  /* ---------- play a decoded buffer through the chain (or raw) ---------- */
  LAB.play = function (buffer, opts) {
    opts = opts || {};
    var ctx = LAB.audio(); if (!ctx || !buffer) return null;
    var now = ctx.currentTime + 0.05, p = P;
    var src = ctx.createBufferSource(); src.buffer = buffer;
    var analyser = ctx.createAnalyser(); analyser.fftSize = 512;
    var end = buffer.duration;
    var last;

    if (opts.raw) {
      last = ctx.createGain(); last.gain.value = 0.8;
      src.connect(last);
    } else {
      src.playbackRate.value = Math.pow(2, p.pitch / 1200);
      end = buffer.duration / src.playbackRate.value;

      var shaper = ctx.createWaveShaper(); shaper.oversample = '4x';
      if (p.drive > 0) shaper.curve = driveCurve(p.drive);
      var bass = ctx.createBiquadFilter(); bass.type = 'lowshelf'; bass.frequency.value = 220; bass.gain.value = p.bass;
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -6 - (p.comp / 100) * 34; comp.ratio.value = 1 + (p.comp / 100) * 19;
      comp.attack.value = 0.003; comp.release.value = 0.18; comp.knee.value = 6;
      var makeup = ctx.createGain(); makeup.gain.value = 1 + (p.comp / 100) * 0.8;

      var dry = ctx.createGain(), wet = ctx.createGain(), conv = ctx.createConvolver(), mix = ctx.createGain();
      dry.gain.value = 1 - (p.reverbMix / 100) * 0.6; wet.gain.value = (p.reverbMix / 100) * 1.2;
      conv.buffer = impulse(ctx, p.reverbSize, 2.6);
      end += p.reverbMix > 0 ? p.reverbSize : 0;

      var trem = ctx.createGain(), lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
      var depth = p.tremDepth / 100;
      trem.gain.value = 1 - depth / 2; lfo.frequency.value = p.tremRate; lfoGain.gain.value = depth / 2;
      lfo.connect(lfoGain); lfoGain.connect(trem.gain); lfo.start(now); lfo.stop(now + end + 0.2);

      var ramp = ctx.createGain();
      ramp.gain.setValueAtTime(p.rampStart / 100, now);
      if (p.rampTime > 0) ramp.gain.linearRampToValueAtTime(1, now + p.rampTime);

      var master = ctx.createGain(); master.gain.value = p.master / 100;

      src.connect(shaper); shaper.connect(bass); bass.connect(comp); comp.connect(makeup);
      makeup.connect(dry); makeup.connect(conv); conv.connect(wet); dry.connect(mix); wet.connect(mix);
      mix.connect(trem); trem.connect(ramp); ramp.connect(master);
      last = master;
    }

    var limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3; limiter.ratio.value = 20; limiter.attack.value = 0.001; limiter.release.value = 0.1; limiter.knee.value = 0;
    last.connect(limiter); limiter.connect(analyser); analyser.connect(ctx.destination);

    var done = false, raf = 0, buf = new Uint8Array(analyser.fftSize);
    function finish() { if (done) return; done = true; cancelAnimationFrame(raf); if (opts.meter) opts.meter.style.width = '0'; if (opts.onEnd) opts.onEnd(); }
    function tick() {
      if (done) return;
      analyser.getByteTimeDomainData(buf);
      var peak = 0; for (var i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128) / 128);
      if (opts.meter) opts.meter.style.width = Math.min(100, peak * 140) + '%';
      raf = requestAnimationFrame(tick);
    }
    src.onended = function () { setTimeout(finish, opts.raw ? 0 : Math.max(0, (end - buffer.duration / src.playbackRate.value) * 1000)); };
    src.start(now);
    tick();
    return { stop: function () { try { src.stop(); } catch (e) { /* already stopped */ } finish(); }, seconds: end };
  };

  // Decode on an offline context: it does not depend on the output context having been resumed by a tap,
  // which can leave decodeAudioData pending while the main context is still "suspended".
  LAB.decode = function (arrayBuffer) {
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    var ctx = OAC ? new OAC(1, 1, 44100) : LAB.audio();
    return new Promise(function (res, rej) { ctx.decodeAudioData(arrayBuffer, res, rej); });
  };
})();
