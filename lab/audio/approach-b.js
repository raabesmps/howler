/* Approach B: the sender's own recorded voice (MediaRecorder), decoded to a buffer and run through the effects chain.
   The recording never leaves the browser in this lab. In the product it would have to be uploaded (privacy: see ADR-002). */
(function () {
  'use strict';
  var LAB = window.LAB, $ = function (id) { return document.getElementById(id); };
  var MAX_SECONDS = 8;
  var recorder = null, stream = null, chunks = [], buffer = null, handle = null, timer = 0, startedAt = 0;

  LAB.rating($('rateB'), 'b');

  var canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  if (!window.isSecureContext) {
    $('bWarn').hidden = false;
    $('bWarn').textContent = 'The microphone only works on https:// or localhost, and this page was opened over plain http, so recording is blocked by the browser. Tabs A and C work normally.';
  } else if (!canRecord) {
    $('bWarn').hidden = false;
    $('bWarn').textContent = 'This browser has no MediaRecorder or microphone access.';
  }
  if (!canRecord || !window.isSecureContext) $('bRec').disabled = true;

  function pickMime() {
    var list = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'];
    for (var i = 0; i < list.length; i++) if (MediaRecorder.isTypeSupported(list[i])) return list[i];
    return '';
  }
  function stopRecording() { clearInterval(timer); if (recorder && recorder.state !== 'inactive') recorder.stop(); }

  $('bRec').addEventListener('click', function () {
    if (recorder && recorder.state === 'recording') { stopRecording(); return; }
    LAB.audio();
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }).then(function (s) {
      stream = s; chunks = []; buffer = null;
      var mime = pickMime();
      recorder = mime ? new MediaRecorder(s, { mimeType: mime }) : new MediaRecorder(s);
      recorder.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      recorder.onstop = function () {
        stream.getTracks().forEach(function (t) { t.stop(); }); // release the mic right away
        $('bRec').textContent = 'Record again'; $('bRec').classList.remove('rec');
        var blob = new Blob(chunks, { type: recorder.mimeType || mime });
        LAB.status('Decoding (' + (blob.type || 'unknown type') + ')...');
        blob.arrayBuffer().then(LAB.decode).then(function (b) {
          buffer = b;
          LAB.status('Recorded ' + b.duration.toFixed(1) + ' s. Press Play.');
        }).catch(function (err) { LAB.status('Could not decode this recording: ' + err); });
      };
      recorder.start();
      startedAt = Date.now();
      $('bRec').textContent = 'Stop recording'; $('bRec').classList.add('rec');
      timer = setInterval(function () {
        var s = (Date.now() - startedAt) / 1000;
        LAB.status('Recording ' + s.toFixed(1) + ' s (max ' + MAX_SECONDS + ')');
        if (s >= MAX_SECONDS) stopRecording();
      }, 100);
    }).catch(function (err) { LAB.status('Microphone blocked or unavailable: ' + (err && err.name)); });
  });

  LAB.approaches.b = {
    play: function (raw) {
      if (!buffer) { LAB.status('Record something first.'); return; }
      if (handle) handle.stop();
      handle = LAB.play(buffer, { raw: raw, meter: LAB.meter, onEnd: function () { LAB.status('Done.'); } });
      LAB.status(raw ? 'Playing the raw recording' : 'Playing with the sound controls');
    },
    stop: function () { if (handle) handle.stop(); }
  };
})();
