/* Approach A: browser speechSynthesis (the baseline). This audio does NOT pass through Web Audio,
   so distortion, reverb, bass and gain boosts cannot be applied. Only pitch, rate and volume exist. */
(function () {
  'use strict';
  var LAB = window.LAB, $ = function (id) { return document.getElementById(id); };
  var synth = window.speechSynthesis;

  var root = $('cardA');
  if (!synth) {
    root.querySelector('[data-body]').innerHTML = '<p class="note">speechSynthesis is not available in this browser.</p>';
    LAB.rating($('rateA'), 'a');
    return;
  }

  function voices() {
    var lang = LAB.lang().slice(0, 2), sel = $('aVoice'), cur = sel.value;
    var list = synth.getVoices().filter(function (v) { return v.lang.toLowerCase().indexOf(lang) === 0; });
    sel.innerHTML = list.length ? list.map(function (v, i) { return '<option value="' + v.name + '">' + v.name + ' (' + v.lang + ')</option>'; }).join('') : '<option value="">default voice</option>';
    if (cur) sel.value = cur;
  }
  synth.addEventListener('voiceschanged', voices);
  $('lang').addEventListener('change', voices);
  voices();

  function bind(id, out, fmt) {
    var el = $(id), o = $(out);
    var f = function () { o.textContent = fmt(+el.value); };
    el.addEventListener('input', f); f();
  }
  bind('aPitch', 'aPitchV', function (v) { return v.toFixed(2); });
  bind('aRate', 'aRateV', function (v) { return v.toFixed(2); });
  bind('aVol', 'aVolV', function (v) { return Math.round(v * 100) + '%'; });

  $('aPlay').addEventListener('click', function () {
    LAB.audio();
    synth.cancel();
    var u = new SpeechSynthesisUtterance(LAB.message());
    u.lang = LAB.lang();
    u.pitch = +$('aPitch').value; u.rate = +$('aRate').value; u.volume = +$('aVol').value;
    var name = $('aVoice').value;
    if (name) { var v = synth.getVoices().filter(function (x) { return x.name === name; })[0]; if (v) u.voice = v; }
    $('aState').textContent = 'speaking...';
    u.onend = u.onerror = function () { $('aState').textContent = 'done'; };
    synth.speak(u);
  });
  $('aStop').addEventListener('click', function () { synth.cancel(); $('aState').textContent = 'stopped'; });
  $('aPreset').addEventListener('click', function () {
    $('aPitch').value = 0.1; $('aRate').value = 0.8; $('aVol').value = 1;
    ['aPitch', 'aRate', 'aVol'].forEach(function (id) { $(id).dispatchEvent(new Event('input')); });
  });

  LAB.rating($('rateA'), 'a');
})();
