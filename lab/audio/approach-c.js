/* Approach C: a voice file generated on the server (neural TTS in the real product), run through the same effects chain.
   In this checkpoint the "server" is simulated: bundled sample files made with offline Windows voices (not neural, so
   expect a flat read), plus an upload field so any real TTS output (ElevenLabs, OpenAI, Google...) can be tried here. */
(function () {
  'use strict';
  var LAB = window.LAB, $ = function (id) { return document.getElementById(id); };
  var buffer = null, handle = null, label = '';

  LAB.rating($('rateC'), 'c');
  function setState(t) { $('cState').textContent = t; }

  function useBuffer(b, name) {
    buffer = b; label = name;
    $('cPlay').disabled = $('cRaw').disabled = false;
    setState('ready: ' + name + ', ' + b.duration.toFixed(1) + ' s, ' + b.sampleRate + ' Hz');
  }

  $('cLoad').addEventListener('click', function () {
    LAB.audio();
    var file = $('cSample').value;
    setState('loading ' + file + '...');
    fetch('samples/' + file).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.arrayBuffer();
    }).then(LAB.decode).then(function (b) { useBuffer(b, file); })
      .catch(function (e) { setState('could not load the sample: ' + e.message); });
  });

  $('cFile').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    LAB.audio();
    setState('decoding ' + f.name + '...');
    f.arrayBuffer().then(LAB.decode).then(function (b) { useBuffer(b, f.name); })
      .catch(function (err) { setState('this browser cannot decode that file: ' + err); });
  });

  function play(raw) {
    if (!buffer) return;
    if (handle) handle.stop();
    handle = LAB.play(buffer, { raw: raw, meter: $('cMeter'), onEnd: function () { setState('done'); } });
    setState(raw ? 'playing raw: ' + label : 'playing with effects: ' + label);
  }
  $('cPlay').addEventListener('click', function () { play(false); });
  $('cRaw').addEventListener('click', function () { play(true); });
  $('cStop').addEventListener('click', function () { if (handle) handle.stop(); setState('stopped'); });
})();
