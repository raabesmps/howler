/* Howler audio lab: the guided flow. One question per screen, one primary action.
   Voice A = browser speechSynthesis. Voice C = server TTS file (simulated by samples or an upload) through the effects engine.
   Voice B = the person's own recording through the same engine. Nothing leaves the browser. */
(function () {
  'use strict';
  var LAB = window.LAB, $ = function (id) { return document.getElementById(id); };
  var STEPS = ['intro', 'a', 'c', 'tune', 'b', 'done'];
  var TEXT = {
    pt: { phrase: 'Você nunca atende as minhas ligações.', lang: 'pt-BR', sample: 'pt-short.wav' },
    en: { phrase: 'You never answer my calls.', lang: 'en-US', sample: 'en-short.wav' }
  };
  var NAMES = { clean: 'Limpa', howler: 'Howler', demon: 'Demônio', radio: 'Rádio' };
  var KNOB_NAMES = { depth: 'mais grave', rage: 'mais agressiva', boom: 'graves pesados', echo: 'mais eco', build: 'mais tensão' };
  var TWEAK_STEP = 15, TWEAK_MAX = 3, MAX_REC = 6;
  var synth = window.speechSynthesis;
  var st, handle = null, recorder = null, stream = null, recTimer = 0;

  function fresh() {
    st = {
      step: 0, lang: 'pt', out: 'speaker',
      a: { played: false, score: 0, na: !synth },
      c: { heard: {}, best: '', score: 0, tweaks: { depth: 0, rage: 0, boom: 0, echo: 0, build: 0 }, buffer: null, label: '', loading: null, uploaded: false },
      b: { buffer: null, score: 0, available: false }
    };
  }
  fresh();

  function status(t) { $('status').textContent = t || ''; }
  function meter() { return $('meter'); }

  /* ---------- scales (1 to 5) ---------- */
  document.querySelectorAll('.scale').forEach(function (el) {
    var key = el.dataset.scale, html = '';
    for (var i = 1; i <= 5; i++) html += '<button type="button" data-v="' + i + '" aria-pressed="false" aria-label="Nota ' + i + ' de 5">' + i + '</button>';
    html += '<span class="cap l">nada</span><span class="cap r">muito</span>';
    el.innerHTML = html;
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-v]'); if (!b) return;
      st[key].score = +b.dataset.v;
      Array.prototype.forEach.call(el.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      refreshNav();
    });
  });

  /* ---------- stop everything that makes sound ---------- */
  function stopRec() {
    clearInterval(recTimer);
    if (recorder && recorder.state === 'recording') { try { recorder.stop(); } catch (e) { /* ignore */ } }
  }
  function stopAll() {
    if (handle) { handle.stop(); handle = null; }
    if (synth) synth.cancel();
    stopRec();
    meter().style.width = '0';
    document.querySelectorAll('.play.on, .tile.on').forEach(function (x) { x.classList.remove('on'); });
  }

  /* ---------- navigation ---------- */
  var dots = $('dots');
  STEPS.forEach(function () { dots.appendChild(document.createElement('i')); });

  function refreshNav() {
    var s = STEPS[st.step], ok = true, label = 'Continuar', hint = '';
    if (s === 'intro') label = 'Começar';
    else if (s === 'a') {
      ok = st.a.na || (st.a.played && st.a.score > 0);
      if (!ok) hint = st.a.played ? 'Dê uma nota para continuar.' : 'Toque em Ouvir para continuar.';
    } else if (s === 'c') {
      ok = !!st.c.best && !!st.c.heard[st.c.best] && st.c.score > 0;
      if (!ok) hint = Object.keys(st.c.heard).length === 0 ? 'Toque nas versões para ouvir.' : (!st.c.best ? 'Escolha qual ficou melhor.' : (!st.c.heard[st.c.best] ? 'Ouça a versão que você escolheu.' : 'Dê uma nota para continuar.'));
    } else if (s === 'tune') label = 'Está bom assim';
    else if (s === 'b') {
      if (!st.b.available) label = 'Pular';
      else { ok = !!(st.b.buffer && st.b.score > 0); if (!ok) hint = st.b.buffer ? 'Dê uma nota para continuar.' : 'Grave um recado para continuar.'; }
    } else if (s === 'done') label = 'Copiar resultado';
    $('next').textContent = label;
    $('next').disabled = !ok;
    $('back').style.visibility = st.step === 0 ? 'hidden' : 'visible';
    if (hint && !handle && !(synth && synth.speaking)) status(hint);
  }

  function show(i) {
    stopAll();
    st.step = i;
    STEPS.forEach(function (s, k) { document.querySelector('[data-step="' + s + '"]').hidden = k !== i; });
    $('stepLabel').textContent = 'Passo ' + (i + 1) + ' de ' + STEPS.length;
    Array.prototype.forEach.call(dots.children, function (d, k) { d.className = k < i ? 'on' : (k === i ? 'now' : ''); });
    status('');
    var fn = enter[STEPS[i]]; if (fn) fn();
    refreshNav();
    window.scrollTo(0, 0);
  }

  $('next').addEventListener('click', function () {
    LAB.audio();
    if (STEPS[st.step] === 'done') { copyResult(); return; }
    show(st.step + 1);
  });
  $('back').addEventListener('click', function () { if (st.step > 0) show(st.step - 1); });
  $('restart').addEventListener('click', function () { location.reload(); });

  /* ---------- intro ---------- */
  $('langChoice').addEventListener('click', function (e) {
    var b = e.target.closest('[data-lang]'); if (!b) return;
    st.lang = b.dataset.lang;
    Array.prototype.forEach.call(this.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    $('phrase').textContent = TEXT[st.lang].phrase;
    if (!st.c.uploaded) { st.c.buffer = null; st.c.loading = null; }
  });
  $('outChoice').addEventListener('click', function (e) {
    var b = e.target.closest('[data-out]'); if (!b) return;
    st.out = b.dataset.out;
    Array.prototype.forEach.call(this.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); });
  });

  /* ---------- voice A ---------- */
  $('aPlay').addEventListener('click', function () {
    var btn = this;
    LAB.audio();
    if (!synth) { status('Este navegador não tem voz embutida.'); return; }
    stopAll();
    var u = new SpeechSynthesisUtterance(TEXT[st.lang].phrase);
    u.lang = TEXT[st.lang].lang; u.pitch = 0.1; u.rate = 0.8; u.volume = 1;
    var v = synth.getVoices().filter(function (x) { return x.lang.toLowerCase().indexOf(u.lang.slice(0, 2)) === 0; })[0];
    if (v) u.voice = v;
    u.onstart = function () { btn.classList.add('on'); status('Tocando...'); };
    u.onend = u.onerror = function () { btn.classList.remove('on'); status(''); st.a.played = true; refreshNav(); };
    st.a.played = true;
    synth.speak(u);
    refreshNav();
  });

  /* ---------- voice C: load the sample (or the upload) ---------- */
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
    if (st.c.buffer) return Promise.resolve(st.c.buffer);
    if (st.c.loading) return st.c.loading;
    var file = TEXT[st.lang].sample;
    status('Carregando a voz...');
    st.c.loading = getFile('samples/' + file, 3).then(LAB.decode).then(function (b) {
      st.c.buffer = b; st.c.label = file; st.c.loading = null; status(''); return b;
    }).catch(function (e) { st.c.loading = null; status('Não consegui carregar a voz: ' + (e && e.message || e)); return null; });
    return st.c.loading;
  }
  $('cFile').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    LAB.audio();
    status('Lendo ' + f.name + '...');
    f.arrayBuffer().then(LAB.decode).then(function (b) {
      st.c.buffer = b; st.c.label = f.name; st.c.uploaded = true;
      $('cFileInfo').textContent = 'Usando o seu áudio: ' + f.name + ' (' + b.duration.toFixed(1) + ' s).';
      status('');
    }).catch(function (err) { status('Este navegador não consegue ler esse arquivo: ' + err); });
  });

  function playBuffer(buffer, opts, onEnd) {
    if (handle) handle.stop();
    handle = LAB.play(buffer, { raw: opts && opts.raw, meter: meter(), onEnd: function () { handle = null; if (onEnd) onEnd(); refreshNav(); } });
    status('Tocando...');
  }

  document.getElementById('tiles').addEventListener('click', function (e) {
    var tile = e.target.closest('.tile'); if (!tile) return;
    LAB.audio();
    var name = tile.dataset.preset;
    stopAll();
    loadSample().then(function (b) {
      if (!b) return;
      LAB.fx.setPreset(name);
      tile.classList.add('on', 'heard');
      st.c.heard[name] = true;
      playBuffer(b, {}, function () { tile.classList.remove('on'); });
      refreshNav();
    });
  });
  $('bestChoice').addEventListener('click', function (e) {
    var b = e.target.closest('[data-best]'); if (!b) return;
    st.c.best = b.dataset.best;
    Array.prototype.forEach.call(this.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    refreshNav();
  });

  /* ---------- the recipe: chosen version + the person's one-tap tweaks ---------- */
  function applyRecipe() {
    LAB.fx.setPreset(st.c.best || 'howler');
    Object.keys(st.c.tweaks).forEach(function (k) { if (st.c.tweaks[k]) LAB.fx.tweak(k, st.c.tweaks[k] * TWEAK_STEP); });
  }
  function paintTweaks() {
    Array.prototype.forEach.call($('tweaks').children, function (b) {
      var k = b.dataset.knob; if (k === 'undo') return;
      var n = st.c.tweaks[k], em = b.querySelector('em');
      em.textContent = n ? n + ' de ' + TWEAK_MAX : '';
      b.classList.toggle('has', n > 0);
    });
  }
  function playRecipe() {
    LAB.audio();
    applyRecipe();
    loadSample().then(function (b) { if (b) playBuffer(b, {}); });
  }
  $('tweaks').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-knob]'); if (!b) return;
    var k = b.dataset.knob;
    if (k === 'undo') { Object.keys(st.c.tweaks).forEach(function (x) { st.c.tweaks[x] = 0; }); }
    else if (st.c.tweaks[k] < TWEAK_MAX) st.c.tweaks[k]++;
    paintTweaks();
    stopAll();
    playRecipe();
  });
  $('tunePlay').addEventListener('click', function () { stopAll(); playRecipe(); });

  /* ---------- voice B: record, then play through the same recipe ---------- */
  var canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  function pickMime() {
    var list = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'];
    for (var i = 0; i < list.length; i++) if (MediaRecorder.isTypeSupported(list[i])) return list[i];
    return '';
  }
  $('bRec').addEventListener('click', function () {
    var btn = this;
    if (recorder && recorder.state === 'recording') { stopRec(); return; }
    LAB.audio();
    if (handle) handle.stop();
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }).then(function (s) {
      var chunks = [], mime = pickMime(), startedAt = Date.now();
      stream = s;
      recorder = mime ? new MediaRecorder(s, { mimeType: mime }) : new MediaRecorder(s);
      recorder.ondataavailable = function (ev) { if (ev.data && ev.data.size) chunks.push(ev.data); };
      recorder.onstop = function () {
        stream.getTracks().forEach(function (t) { t.stop(); }); // release the mic right away
        clearInterval(recTimer);
        btn.classList.remove('on'); btn.querySelector('span').textContent = 'Gravar de novo';
        var blob = new Blob(chunks, { type: recorder.mimeType || mime });
        status('Preparando a gravação...');
        blob.arrayBuffer().then(LAB.decode).then(function (b) {
          st.b.buffer = b; st.b.score = 0;
          $('bAfter').hidden = false; $('bRate').hidden = false;
          Array.prototype.forEach.call(document.querySelectorAll('[data-scale=b] button'), function (x) { x.setAttribute('aria-pressed', 'false'); });
          status('Gravei ' + b.duration.toFixed(1) + ' s. Ouça e dê uma nota.'); refreshNav();
        }).catch(function (err) { status('Não consegui ler a gravação: ' + err); });
      };
      recorder.start();
      btn.classList.add('on'); btn.querySelector('span').textContent = 'Parar';
      recTimer = setInterval(function () {
        var secs = (Date.now() - startedAt) / 1000;
        status('Gravando ' + secs.toFixed(1) + ' s (máximo ' + MAX_REC + ')');
        if (secs >= MAX_REC) stopRec();
      }, 100);
    }).catch(function (err) { status('O microfone está bloqueado ou indisponível (' + (err && err.name) + ').'); });
  });
  function playB(raw) {
    if (!st.b.buffer) return;
    stopAll();
    applyRecipe();
    playBuffer(st.b.buffer, { raw: raw });
  }
  $('bPlayFx').addEventListener('click', function () { LAB.audio(); playB(false); });
  $('bPlayRaw').addEventListener('click', function () { LAB.audio(); playB(true); });

  /* ---------- entering each step ---------- */
  var enter = {
    c: function () { loadSample(); },
    tune: function () {
      if (!st.c.best) st.c.best = 'howler';
      paintTweaks(); loadSample();
    },
    b: function () {
      st.b.available = canRecord && window.isSecureContext;
      var warn = $('bWarn');
      warn.hidden = st.b.available;
      $('bRec').hidden = !st.b.available;
      if (!window.isSecureContext) warn.textContent = 'O navegador só libera o microfone em https. Como esta página abriu por http, vou pular a gravação. As outras duas vozes já bastam para a decisão.';
      else if (!canRecord) warn.textContent = 'Este navegador não tem gravação de voz. Vou pular esta parte.';
    },
    done: function () {
      var rows = [
        ['Idioma', st.lang === 'pt' ? 'Português' : 'English'],
        ['Ouviu pelo', st.out === 'phones' ? 'Fone' : 'Alto-falante'],
        ['Voz A (celular)', st.a.na ? 'indisponível' : (st.a.score + ' de 5')],
        ['Voz C (servidor)', NAMES[st.c.best] + ', ' + st.c.score + ' de 5'],
        ['Ajustes finos', tweakText()],
        ['Voz B (sua voz)', st.b.buffer ? st.b.score + ' de 5' : 'pulada']
      ];
      $('summary').innerHTML = rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('');
    }
  };

  function tweakText() {
    var parts = Object.keys(st.c.tweaks).filter(function (k) { return st.c.tweaks[k]; }).map(function (k) { return KNOB_NAMES[k] + ' x' + st.c.tweaks[k]; });
    return parts.length ? parts.join(', ') : 'nenhum';
  }

  /* ---------- result ---------- */
  function resultText() {
    applyRecipe();
    var lines = [
      '## Howler audio lab result', '',
      '- Language: ' + st.lang + ', listened through: ' + st.out,
      '- Voice A (browser speechSynthesis): ' + (st.a.na ? 'unavailable' : st.a.score + '/5 scary'),
      '- Voice C (server TTS file, ' + (st.c.uploaded ? 'uploaded: ' + st.c.label : 'sample: ' + st.c.label) + '): best version "' + st.c.best + '", ' + st.c.score + '/5 scary',
      '- Tweaks on top of it: ' + tweakText(),
      '- Voice B (own recording): ' + (st.b.buffer ? st.b.score + '/5 scary' : 'skipped'),
      '- Final recipe: ' + JSON.stringify(LAB.getSettings()),
      '', '```', LAB.deviceText(), '```'
    ];
    return lines.join('\n');
  }
  function copyResult() {
    var text = resultText();
    var pre = $('exportOut');
    if (!pre) { pre = document.createElement('pre'); pre.id = 'exportOut'; pre.className = 'hint'; pre.style.cssText = 'white-space:pre-wrap;word-break:break-word;font-size:12px;margin-top:16px'; document.querySelector('[data-step=done]').appendChild(pre); }
    pre.textContent = text;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { status('Copiado! Cole no chat.'); }, function () { status('Não consegui copiar. Selecione o texto abaixo e copie.'); });
    } else status('Selecione o texto abaixo e copie.');
  }

  show(0);
})();
