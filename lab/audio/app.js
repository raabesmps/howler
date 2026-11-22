/* Howler audio lab: shared plumbing (audio unlock, device info, scoring, export). */
(function () {
  'use strict';
  var LAB = window.LAB = { ctx: null, approaches: {}, getSettings: function () { return {}; } };
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- audio unlock (needs a user gesture on iOS and Android) ---------- */
  LAB.audio = function () {
    if (!LAB.ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      LAB.ctx = new AC();
    }
    if (LAB.ctx.state !== 'running' && LAB.ctx.resume) LAB.ctx.resume().catch(function () { /* offline contexts (tests) cannot resume */ });
    return LAB.ctx;
  };

  function unlock() {
    var ctx = LAB.audio();
    if (!ctx) { $('unlockState').textContent = 'Web Audio not supported'; return; }
    // a silent one-sample buffer is the classic iOS unlock
    var b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource();
    s.buffer = b; s.connect(ctx.destination); s.start(0);
    ctx.resume().then(refreshState);
    // speechSynthesis also needs a gesture on iOS: speak an empty utterance
    if ('speechSynthesis' in window) {
      var u = new SpeechSynthesisUtterance(' '); u.volume = 0; window.speechSynthesis.speak(u);
    }
    refreshState();
    refreshDevice();
  }
  function refreshState() {
    var el = $('unlockState'), on = LAB.ctx && LAB.ctx.state === 'running';
    el.textContent = on ? 'unlocked (' + LAB.ctx.sampleRate + ' Hz)' : 'locked';
    el.className = 'badge' + (on ? ' ok' : '');
  }
  $('unlock').addEventListener('click', unlock);

  /* ---------- device info ---------- */
  function mimeSupport() {
    if (!window.MediaRecorder) return 'MediaRecorder not available';
    return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/wav']
      .filter(function (m) { return MediaRecorder.isTypeSupported(m); }).join(', ') || 'none';
  }
  function deviceText() {
    var v = ('speechSynthesis' in window) ? window.speechSynthesis.getVoices().length : 0;
    return [
      'userAgent: ' + navigator.userAgent,
      'secure context (https or localhost): ' + window.isSecureContext,
      'Web Audio: ' + !!(window.AudioContext || window.webkitAudioContext) + (LAB.ctx ? ', sampleRate ' + LAB.ctx.sampleRate + ', state ' + LAB.ctx.state : ''),
      'speechSynthesis: ' + ('speechSynthesis' in window) + ', voices: ' + v,
      'getUserMedia: ' + !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      'MediaRecorder types: ' + mimeSupport()
    ].join('\n');
  }
  function refreshDevice() { $('deviceInfo').textContent = deviceText(); }
  refreshDevice();
  if ('speechSynthesis' in window) window.speechSynthesis.addEventListener('voiceschanged', refreshDevice);

  /* ---------- message ---------- */
  LAB.message = function () { return $('msg').value.trim() || 'You never answer my calls.'; };
  LAB.lang = function () { return $('lang').value; };

  /* ---------- scoring (saved in localStorage only; wrapped because it can throw) ---------- */
  var KEY = 'howler-lab-v1';
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* private mode: scores live only until reload */ } }
  var memory = load();

  var CRITERIA = [
    ['scary', 'Is it scary?'],
    ['speaker', 'Sounds good on the phone speaker?'],
    ['phones', 'Sounds good with headphones?']
  ];

  LAB.rating = function (root, key) {
    memory[key] = memory[key] || {};
    var html = '<h3>Your score (1 to 5)</h3>';
    CRITERIA.forEach(function (c) {
      html += '<p>' + c[1] + '</p><div class="stars" role="group" aria-label="' + c[1] + '" data-c="' + c[0] + '">';
      for (var i = 1; i <= 5; i++) html += '<button type="button" data-v="' + i + '" aria-pressed="' + (memory[key][c[0]] === i) + '">' + i + '</button>';
      html += '</div>';
    });
    html += '<label>Notes<textarea rows="2" data-notes></textarea></label>';
    root.classList.add('rate'); root.innerHTML = html;
    root.querySelector('[data-notes]').value = memory[key].notes || '';
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-v]'); if (!b) return;
      var c = b.parentNode.dataset.c, v = +b.dataset.v;
      memory[key][c] = v;
      Array.prototype.forEach.call(b.parentNode.children, function (x) { x.setAttribute('aria-pressed', String(+x.dataset.v === v)); });
      save(memory);
    });
    root.querySelector('[data-notes]').addEventListener('input', function (e) { memory[key].notes = e.target.value; save(memory); });
  };

  /* ---------- export ---------- */
  var NAMES = { a: 'A. speechSynthesis', b: 'B. recorded voice + effects', c: 'C. server TTS file + effects' };
  $('exportBtn').addEventListener('click', function () {
    var lines = ['## Howler audio lab results', '', '```', deviceText(), '```', ''];
    ['a', 'b', 'c'].forEach(function (k) {
      var m = memory[k] || {};
      lines.push('### ' + NAMES[k]);
      CRITERIA.forEach(function (c) { lines.push('- ' + c[1] + ' ' + (m[c[0]] || 'not scored') + '/5'); });
      lines.push('- Notes: ' + (m.notes || '(none)'), '');
    });
    lines.push('Effects settings used: ' + JSON.stringify(LAB.getSettings()));
    var text = lines.join('\n'), out = $('exportOut');
    out.textContent = text; out.hidden = false;
    var done = function () { $('exportState').textContent = 'Copied. Paste it in the chat.'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { $('exportState').textContent = 'Could not copy. Select the text below and copy it.'; });
    else $('exportState').textContent = 'Select the text below and copy it.';
  });
})();
