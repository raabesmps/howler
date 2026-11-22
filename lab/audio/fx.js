/* The sound controls and the effects chain shared by approaches B and C.
   source -> pitch (playbackRate) -> distortion (WaveShaper) -> bass shelf -> compressor
          -> dry/wet reverb (Convolver) -> tremolo (LFO on gain) -> volume ramp -> master -> limiter -> analyser -> speakers

   People see six plain-language knobs (K). They are turned into the raw parameters (P) the chain uses.
   The "Advanced" panel edits P directly. */
(function () {
  'use strict';
  var LAB = window.LAB, $ = function (id) { return document.getElementById(id); };

  /* ---------- the six simple knobs ---------- */
  var KNOBS = [
    { k: 'depth',  label: 'Depth',    hint: 'high ↔ deep monster' },
    { k: 'rage',   label: 'Rage',     hint: 'clean ↔ aggressive' },
    { k: 'boom',   label: 'Boom',     hint: 'thin ↔ heavy bass' },
    { k: 'echo',   label: 'Echo',     hint: 'dry ↔ big room' },
    { k: 'build',  label: 'Build-up', hint: 'instant ↔ whisper, then explodes' },
    { k: 'volume', label: 'Volume',   hint: 'quiet ↔ loud' }
  ];
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
  LAB.getSettings = function () { return { knobs: JSON.parse(JSON.stringify(K)), raw: JSON.parse(JSON.stringify(P)) }; };

  /* ---------- advanced: the raw parameters ---------- */
  var RAW = [
    { k: 'pitch',      label: 'Pitch (cents; also changes speed)', min: -1200, max: 400, step: 25,  fmt: function (v) { return (v > 0 ? '+' : '') + v + ' c'; } },
    { k: 'drive',      label: 'Distortion',                        min: 0, max: 100, step: 1,   fmt: function (v) { return v + ''; } },
    { k: 'bass',       label: 'Bass boost (dB)',                   min: 0, max: 18,  step: 1,   fmt: function (v) { return '+' + v + ' dB'; } },
    { k: 'comp',       label: 'Compression',                       min: 0, max: 100, step: 1,   fmt: function (v) { return v + '%'; } },
    { k: 'reverbMix',  label: 'Reverb mix',                        min: 0, max: 100, step: 1,   fmt: function (v) { return v + '%'; } },
    { k: 'reverbSize', label: 'Room size (s)',                     min: 0.3, max: 5, step: 0.1, fmt: function (v) { return v.toFixed(1) + ' s'; } },
    { k: 'rampStart',  label: 'Volume ramp: start level',          min: 0, max: 100, step: 1,   fmt: function (v) { return v + '%'; } },
    { k: 'rampTime',   label: 'Volume ramp: time to full (s)',     min: 0, max: 3,   step: 0.1, fmt: function (v) { return v.toFixed(1) + ' s'; } },
    { k: 'tremRate',   label: 'Tremolo speed (Hz)',                min: 1, max: 20,  step: 0.5, fmt: function (v) { return v + ' Hz'; } },
    { k: 'tremDepth',  label: 'Tremolo depth',                     min: 0, max: 100, step: 1,   fmt: function (v) { return v + '%'; } },
    { k: 'master',     label: 'Master volume',                     min: 0, max: 100, step: 1,   fmt: function (v) { return v + '%'; } }
  ];

  /* ---------- UI ---------- */
  function buildUI() {
    var html = '';
    KNOBS.forEach(function (n) {
      html += '<div class="knob"><label for="kn_' + n.k + '">' + n.label + ' <b id="knv_' + n.k + '"></b></label>' +
        '<input id="kn_' + n.k + '" type="range" min="0" max="100" step="1"><small>' + n.hint + '</small></div>';
    });
    $('knobs').innerHTML = html;
    KNOBS.forEach(function (n) {
      $('kn_' + n.k).addEventListener('input', function () {
        K[n.k] = +this.value; derive(); syncView(); markPreset(null);
      });
    });

    var adv = '<p class="note">These change the same sound as the knobs above, but one by one. Moving a knob above resets them.</p>';
    RAW.forEach(function (s) {
      adv += '<div class="knob"><label for="rw_' + s.k + '">' + s.label + ' <b id="rwv_' + s.k + '"></b></label>' +
        '<input id="rw_' + s.k + '" type="range" min="' + s.min + '" max="' + s.max + '" step="' + s.step + '"></div>';
    });
    $('advanced').innerHTML = adv;
    RAW.forEach(function (s) {
      $('rw_' + s.k).addEventListener('input', function () { P[s.k] = +this.value; $('rwv_' + s.k).textContent = s.fmt(P[s.k]); markPreset(null); });
    });

    $('chips').addEventListener('click', function (e) {
      var b = e.target.closest('[data-preset]'); if (!b) return;
      applyPreset(b.dataset.preset);
    });
    applyPreset('howler');
  }
  function syncView() {
    KNOBS.forEach(function (n) { $('kn_' + n.k).value = K[n.k]; $('knv_' + n.k).textContent = K[n.k]; });
    RAW.forEach(function (s) { $('rw_' + s.k).value = P[s.k]; $('rwv_' + s.k).textContent = s.fmt(P[s.k]); });
  }
  function markPreset(name) {
    Array.prototype.forEach.call($('chips').children, function (c) { c.setAttribute('aria-pressed', String(c.dataset.preset === name)); });
  }
  function applyPreset(name) {
    Object.keys(PRESETS[name]).forEach(function (k) { K[k] = PRESETS[name][k]; });
    derive(); syncView(); markPreset(name);
  }

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

  buildUI();
})();
