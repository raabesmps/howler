/* Howler audio lab: shared plumbing (audio context, device info). The guided flow lives in wizard.js. */
(function () {
  'use strict';
  var LAB = window.LAB = { ctx: null, getSettings: function () { return {}; } };

  /* ---------- audio context (created on a tap: needed on iOS and Android) ---------- */
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

  /* ---------- device info (goes into the exported result) ---------- */
  function mimeSupport() {
    if (!window.MediaRecorder) return 'MediaRecorder not available';
    return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/wav']
      .filter(function (m) { return MediaRecorder.isTypeSupported(m); }).join(', ') || 'none';
  }
  LAB.deviceText = function () {
    var v = ('speechSynthesis' in window) ? window.speechSynthesis.getVoices().length : 0;
    return [
      'userAgent: ' + navigator.userAgent,
      'secure context (https or localhost): ' + window.isSecureContext,
      'Web Audio: ' + !!(window.AudioContext || window.webkitAudioContext) + (LAB.ctx ? ', sampleRate ' + LAB.ctx.sampleRate + ', state ' + LAB.ctx.state : ''),
      'speechSynthesis: ' + ('speechSynthesis' in window) + ', voices: ' + v,
      'getUserMedia: ' + !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      'MediaRecorder types: ' + mimeSupport()
    ].join('\n');
  };
})();
