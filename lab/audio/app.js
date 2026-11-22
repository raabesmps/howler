/* Howler audio lab: shared plumbing (tabs, play bar, audio unlock, scoring, export). */
(function () {
  'use strict';
  var LAB = window.LAB = { ctx: null, approaches: {}, tab: 'a', getSettings: function () { return {}; } };
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- audio context (created on the first tap: needed on iOS and Android) ---------- */
  LAB.audio = function () {
    if (!LAB.ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      LAB.ctx = new AC();
      // classic iOS unlock: play one silent sample inside the gesture
      var b = LAB.ctx.createBuffer(1, 1, 22050), s = LAB.ctx.createBufferSource();
      s.buffer = b; s.connect(LAB.ctx.destination); s.start(0);
    }
    if (LAB.ctx.state !== 'running' && LAB.ctx.resume) LAB.ctx.resume().catch(function () { /* offline contexts (tests) cannot resume */ });
    return LAB.ctx;
  };

  LAB.status = function (t) { $('status').textContent = t; };
  LAB.meter = $('meter');
  LAB.message = function () { return $('msg').value.trim() || 'You never answer my calls.'; };
  LAB.lang = function () { return $('lang').value; };

  /* ---------- tabs ---------- */
  function showTab(t) {
    Object.keys(LAB.approaches).forEach(function (k) { if (LAB.approaches[k].stop) LAB.approaches[k].stop(); });
    LAB.tab = t;
    ['a', 'b', 'c'].forEach(function (k) {
      $('pane' + k.toUpperCase()).hidden = k !== t;
      $('tab' + k.toUpperCase()).setAttribute('aria-selected', String(k === t));
    });
    $('sound').hidden = t === 'a';
    $('raw').hidden = t === 'a';
    LAB.meter.style.width = '0';
    LAB.status('Ready.');
    if (LAB.approaches[t] && LAB.approaches[t].onShow) LAB.approaches[t].onShow();
  }
  document.querySelector('.tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-tab]'); if (b) showTab(b.dataset.tab);
  });

  /* ---------- play bar ---------- */
  function current() { return LAB.approaches[LAB.tab]; }
  $('play').addEventListener('click', function () { LAB.audio(); var a = current(); if (a) a.play(false); });
  $('raw').addEventListener('click', function () { LAB.audio(); var a = current(); if (a) a.play(true); });
  $('stop').addEventListener('click', function () { var a = current(); if (a && a.stop) a.stop(); LAB.meter.style.width = '0'; LAB.status('Stopped.'); });

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
  document.querySelector('details.more').addEventListener('toggle', refreshDevice);
  if ('speechSynthesis' in window) window.speechSynthesis.addEventListener('voiceschanged', refreshDevice);

  /* ---------- scoring (localStorage only; wrapped because it can throw in private mode) ---------- */
  var KEY = 'howler-lab-v1';
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* scores live only until reload */ } }
  var memory = load();
  var CRITERIA = [['scary', 'Is it scary?'], ['speaker', 'Good on the phone speaker?'], ['phones', 'Good with headphones?']];

  LAB.rating = function (root, key) {
    memory[key] = memory[key] || {};
    var html = '';
    CRITERIA.forEach(function (c) {
      html += '<p>' + c[1] + '</p><div class="stars" role="group" aria-label="' + c[1] + '" data-c="' + c[0] + '">';
      for (var i = 1; i <= 5; i++) html += '<button type="button" data-v="' + i + '" aria-pressed="' + (memory[key][c[0]] === i) + '">' + i + '</button>';
      html += '</div>';
    });
    html += '<textarea rows="2" data-notes aria-label="Notes" placeholder="Notes (optional)"></textarea>';
    root.innerHTML = html;
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
    lines.push('Sound controls last used: ' + JSON.stringify(LAB.getSettings()));
    var text = lines.join('\n'), out = $('exportOut');
    out.textContent = text; out.hidden = false;
    var done = function () { $('exportState').textContent = 'Copied. Paste it in the chat.'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { $('exportState').textContent = 'Could not copy. Select the text below and copy it.'; });
    else $('exportState').textContent = 'Select the text below and copy it.';
  });
})();
