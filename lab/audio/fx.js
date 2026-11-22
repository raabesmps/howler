/* The effects chain shared by approaches B and C.
   source -> pitch (playbackRate) -> distortion (WaveShaper) -> bass shelf -> compressor
          -> dry/wet reverb (Convolver) -> tremolo (LFO on gain) -> volume ramp -> master -> limiter -> analyser -> speakers */
(function () {
  'use strict';
  var LAB = window.LAB, $ = function (id) { return document.getElementById(id); };

  var SPEC = [
    { k: 'pitch',      label: 'Pitch (cents, also changes speed)', min: -1200, max: 400, step: 25,   fmt: function (v) { return (v > 0 ? '+' : '') + v + ' c'; } },
    { k: 'drive',      label: 'Distortion',                        min: 0,     max: 100, step: 1,    fmt: function (v) { return v + ''; } },
    { k: 'bass',       label: 'Bass boost (dB)',                   min: 0,     max: 18,  step: 1,    fmt: function (v) { return '+' + v + ' dB'; } },
    { k: 'comp',       label: 'Compression (squash dynamics)',     min: 0,     max: 100, step: 1,    fmt: function (v) { return v + '%'; } },
    { k: 'reverbMix',  label: 'Reverb mix',                        min: 0,     max: 100, step: 1,    fmt: function (v) { return v + '%'; } },
    { k: 'reverbSize', label: 'Room size (seconds)',               min: 0.3,   max: 5,   step: 0.1,  fmt: function (v) { return v.toFixed(1) + ' s'; } },
    { k: 'rampStart',  label: 'Volume ramp: start level',          min: 0,     max: 100, step: 1,    fmt: function (v) { return v + '%'; } },
    { k: 'rampTime',   label: 'Volume ramp: time to full (s)',     min: 0,     max: 3,   step: 0.1,  fmt: function (v) { return v.toFixed(1) + ' s'; } },
    { k: 'tremRate',   label: 'Tremolo speed (Hz)',                min: 1,     max: 20,  step: 0.5,  fmt: function (v) { return v + ' Hz'; } },
    { k: 'tremDepth',  label: 'Tremolo depth',                     min: 0,     max: 100, step: 1,    fmt: function (v) { return v + '%'; } },
    { k: 'master',     label: 'Master volume',                     min: 0,     max: 100, step: 1,    fmt: function (v) { return v + '%'; } }
  ];

  var PRESETS = {
    clean:  { pitch: 0,     drive: 0,  bass: 0,  comp: 0,  reverbMix: 0,  reverbSize: 1,   rampStart: 100, rampTime: 0,   tremRate: 6,  tremDepth: 0,  master: 70 },
    howler: { pitch: -450,  drive: 35, bass: 9,  comp: 60, reverbMix: 35, reverbSize: 2.2, rampStart: 20,  rampTime: 0.7, tremRate: 9,  tremDepth: 22, master: 75 },
    demon:  { pitch: -900,  drive: 65, bass: 14, comp: 80, reverbMix: 50, reverbSize: 3.4, rampStart: 10,  rampTime: 1.0, tremRate: 13, tremDepth: 35, master: 70 },
    radio:  { pitch: -150,  drive: 55, bass: 0,  comp: 70, reverbMix: 10, reverbSize: 0.6, rampStart: 60,  rampTime: 0.2, tremRate: 4,  tremDepth: 10, master: 70 }
  };

  var P = {};
  Object.keys(PRESETS.howler).forEach(function (k) { P[k] = PRESETS.howler[k]; });
  LAB.getSettings = function () { return JSON.parse(JSON.stringify(P)); };

  /* ---------- UI ---------- */
  function buildPanel() {
    var host = $('fxPanel'); if (!host) return;
    var html = '<h3>Effects (used by B and C)</h3><div class="row" id="fxPresets">';
    Object.keys(PRESETS).forEach(function (n) { html += '<button type="button" class="btn ghost" data-preset="' + n + '">' + n + '</button>'; });
    html += '</div>';
    SPEC.forEach(function (s) {
      html += '<label for="fx_' + s.k + '">' + s.label + ' <b id="fxv_' + s.k + '"></b></label>' +
        '<input id="fx_' + s.k + '" type="range" min="' + s.min + '" max="' + s.max + '" step="' + s.step + '">';
    });
    html += '<p class="note">Changes apply the next time you press play. Master volume is capped by a limiter, but start low on headphones.</p>';
    host.innerHTML = html;
    SPEC.forEach(function (s) {
      var el = $('fx_' + s.k);
      el.addEventListener('input', function () { P[s.k] = +el.value; $('fxv_' + s.k).textContent = s.fmt(P[s.k]); });
    });
    host.querySelector('#fxPresets').addEventListener('click', function (e) {
      var b = e.target.closest('[data-preset]'); if (!b) return;
      Object.keys(PRESETS[b.dataset.preset]).forEach(function (k) { P[k] = PRESETS[b.dataset.preset][k]; });
      sync();
    });
    sync();
  }
  function sync() {
    SPEC.forEach(function (s) { var el = $('fx_' + s.k); el.value = P[s.k]; $('fxv_' + s.k).textContent = s.fmt(P[s.k]); });
  }

  /* ---------- DSP helpers ---------- */
  function driveCurve(amount) {
    var n = 2048, c = new Float32Array(n), k = amount * 2.2, deg = Math.PI / 180;
    for (var i = 0; i < n; i++) { var x = (i * 2) / n - 1; c[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x)); }
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

  LAB.decode = function (arrayBuffer) {
    var ctx = LAB.audio();
    return new Promise(function (res, rej) { ctx.decodeAudioData(arrayBuffer, res, rej); });
  };

  buildPanel();
})();
