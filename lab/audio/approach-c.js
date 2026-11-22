/* Approach C: a voice file generated on the server (neural TTS in the real product), run through the same effects chain.
   In this checkpoint the "server" is simulated: bundled sample files made with offline Windows voices (not neural, so
   expect a flat read), plus an upload field so any real TTS output (ElevenLabs, OpenAI, Google...) can be tried here. */
(function () {
  'use strict';
  var LAB = window.LAB, $ = function (id) { return document.getElementById(id); };
  var buffer = null, handle = null, label = '', loading = null;

  LAB.rating($('rateC'), 'c');

  function useBuffer(b, name) { buffer = b; label = name; LAB.status('Loaded ' + name + ' (' + b.duration.toFixed(1) + ' s). Press Play.'); return b; }

  // The simple dev server (python -m http.server) sometimes stalls one response body. Give each try 4 s, then retry.
  function getFile(url, tries) {
    var ctrl = new AbortController(), t = setTimeout(function () { ctrl.abort(); }, 4000);
    return fetch(url, { signal: ctrl.signal, cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.arrayBuffer();
    }).then(function (ab) { clearTimeout(t); return ab; }, function (e) {
      clearTimeout(t);
      if (tries > 1) return getFile(url, tries - 1);
      throw e;
    });
  }

  function loadSample() {
    LAB.audio();
    var file = $('cSample').value;
    LAB.status('Loading ' + file + '...');
    loading = getFile('samples/' + file, 3).then(LAB.decode).then(function (b) { return useBuffer(b, file); })
      .catch(function (e) { LAB.status('Could not load the sample: ' + (e && e.message || e)); });
    return loading;
  }
  $('cSample').addEventListener('change', function () { buffer = null; loadSample(); });

  $('cFile').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    LAB.audio();
    LAB.status('Decoding ' + f.name + '...');
    f.arrayBuffer().then(LAB.decode).then(function (b) { useBuffer(b, f.name); })
      .catch(function (err) { LAB.status('This browser cannot decode that file: ' + err); });
  });

  function play(raw) {
    if (handle) handle.stop();
    handle = LAB.play(buffer, { raw: raw, meter: LAB.meter, onEnd: function () { LAB.status('Done.'); } });
    LAB.status(raw ? 'Playing raw: ' + label : 'Playing with the sound controls');
  }

  LAB.approaches.c = {
    onShow: function () { if (!buffer) loadSample(); },
    play: function (raw) {
      if (buffer) { play(raw); return; }
      (loading || loadSample()).then(function () { if (buffer) play(raw); });
    },
    stop: function () { if (handle) handle.stop(); }
  };
})();
