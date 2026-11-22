/* Approach A: browser speechSynthesis (the baseline). This audio does NOT pass through Web Audio,
   so distortion, reverb, bass and gain boosts cannot be applied. Only pitch, rate and volume exist. */
(function () {
  'use strict';
  var LAB = window.LAB, $ = function (id) { return document.getElementById(id); };
  var synth = window.speechSynthesis;

  LAB.rating($('rateA'), 'a');

  if (!synth) {
    $('paneA').insertAdjacentHTML('afterbegin', '<p class="note">speechSynthesis is not available in this browser.</p>');
    LAB.approaches.a = { play: function () { LAB.status('Not available here.'); }, stop: function () {} };
    return;
  }

  function voices() {
    var lang = LAB.lang().slice(0, 2), sel = $('aVoice'), cur = sel.value;
    var list = synth.getVoices().filter(function (v) { return v.lang.toLowerCase().indexOf(lang) === 0; });
    sel.innerHTML = list.length ? list.map(function (v) { return '<option value="' + v.name + '">' + v.name + ' (' + v.lang + ')</option>'; }).join('') : '<option value="">default voice</option>';
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

  LAB.approaches.a = {
    play: function () {
      synth.cancel();
      var u = new SpeechSynthesisUtterance(LAB.message());
      u.lang = LAB.lang();
      u.pitch = +$('aPitch').value; u.rate = +$('aRate').value; u.volume = 1;
      var name = $('aVoice').value;
      if (name) { var v = synth.getVoices().filter(function (x) { return x.name === name; })[0]; if (v) u.voice = v; }
      LAB.status('Speaking...');
      u.onend = u.onerror = function () { LAB.status('Done.'); };
      synth.speak(u);
    },
    stop: function () { synth.cancel(); }
  };
})();
