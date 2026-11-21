'use strict';

const voiceButton = document.querySelector('#voice-button');
const repeatButton = document.querySelector('#repeat-voice');
const voiceCaption = document.querySelector('#voice-caption');
const voicePlayer = new Audio();
voicePlayer.preload = 'auto';

let voiceEnabled = true;
let utterance;
let lastVoice;
let replayVoice;

function voiceAsset(key) {
  return `assets/voice/${key}.mp3`;
}

function waitForScreen(milliseconds, signal) {
  return new Promise(resolve => {
    if (signal.aborted) {
      resolve(false);
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', cancel);
      resolve(true);
    }, milliseconds);
    function cancel() {
      clearTimeout(timer);
      resolve(false);
    }
    signal.addEventListener('abort', cancel, { once: true });
  });
}

function stopVoice() {
  utterance?.abort();
  utterance = undefined;
  voicePlayer.pause();
  setJingleDucking(false);
}

function clearVoice() {
  stopVoice();
  lastVoice = undefined;
  replayVoice = undefined;
  voiceCaption.textContent = '';
  repeatButton.hidden = true;
}

function playVoiceFile(key, signal, onDuration) {
  return new Promise(resolve => {
    if (signal.aborted) {
      resolve(false);
      return;
    }
    const timeout = setTimeout(() => finish(false), 12000);
    function finish(success) {
      clearTimeout(timeout);
      voicePlayer.removeEventListener('ended', ended);
      voicePlayer.removeEventListener('error', error);
      voicePlayer.removeEventListener('loadedmetadata', metadata);
      signal.removeEventListener('abort', error);
      resolve(success);
    }
    const ended = () => finish(true);
    const error = () => finish(false);
    const metadata = () => {
      if (onDuration && Number.isFinite(voicePlayer.duration)) onDuration(voicePlayer.duration * 1000);
    };
    voicePlayer.addEventListener('ended', ended);
    voicePlayer.addEventListener('error', error);
    if (onDuration) voicePlayer.addEventListener('loadedmetadata', metadata, { once: true });
    signal.addEventListener('abort', error, { once: true });
    voicePlayer.src = voiceAsset(key);
    voicePlayer.play().catch(error);
  });
}

function rememberVoice(keys, caption) {
  const lines = Array.isArray(keys) ? keys : [keys];
  lastVoice = [lines, caption];
  const text = caption ?? lines.map(key => voiceScript[key]).join(' ');
  if (voiceCaption.textContent !== text) voiceCaption.textContent = text;
  repeatButton.hidden = false;
  return lines;
}

async function say(keys, caption, onDuration) {
  stopVoice();
  const lines = rememberVoice(keys, caption);
  if (!voiceEnabled) return false;

  const controller = new AbortController();
  utterance = controller;
  setJingleDucking(true);
  try {
    for (const key of lines) {
      if (!await playVoiceFile(key, controller.signal, onDuration)) return false;
    }
    return true;
  } finally {
    if (utterance === controller) stopVoice();
  }
}

voiceButton.addEventListener('click', () => {
  voiceEnabled = !voiceEnabled;
  voiceButton.setAttribute('aria-pressed', String(voiceEnabled));
  voiceButton.textContent = voiceEnabled ? 'Голос включён' : 'Голос выключен';
  if (!voiceEnabled) stopVoice();
  else if (replayVoice) replayVoice();
  else if (lastVoice) void say(...lastVoice);
});

repeatButton.addEventListener('click', () => {
  if (!voiceEnabled) voiceButton.click();
  else if (replayVoice) replayVoice();
  else if (lastVoice) void say(...lastVoice);
});
