'use strict';

const voiceButton = document.querySelector('#voice-button');
const repeatButton = document.querySelector('#repeat-voice');
const voiceCaption = document.querySelector('#voice-caption');
const voiceStatus = document.querySelector('#voice-status');
const voiceCache = new Map();

let voiceEnabled = true;
let utterance;
let lastVoice;
let replayVoice;
let voiceBlocked = false;
let mediaPlayer;
let mediaPlayback;

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

function withinVoiceTime(work, signal, milliseconds) {
  return new Promise((resolve, reject) => {
    const expired = setTimeout(() => finish(reject, new Error('Audio timed out')), milliseconds);
    function finish(done, value) {
      clearTimeout(expired);
      signal.removeEventListener('abort', cancel);
      done(value);
    }
    function cancel() {
      finish(reject, new DOMException('Audio cancelled', 'AbortError'));
    }
    if (signal.aborted) cancel();
    else signal.addEventListener('abort', cancel, { once: true });
    Promise.resolve(work).then(value => finish(resolve, value), error => finish(reject, error));
  });
}

function stopVoice() {
  utterance?.abort();
  utterance = undefined;
  setJingleDucking(false);
}

function clearVoice() {
  stopVoice();
  lastVoice = undefined;
  replayVoice = undefined;
  voiceCaption.textContent = '';
  voiceStatus.hidden = true;
  repeatButton.hidden = true;
}

function prepareVoiceGesture() {
  voiceBlocked = false;
  showVoiceStatus(false);
}

async function voiceBytes(url, signal) {
  if (url.startsWith('data:')) {
    const raw = atob(url.slice(url.indexOf(',') + 1));
    return Uint8Array.from(raw, char => char.charCodeAt(0)).buffer;
  }
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Audio HTTP ${response.status}`);
  return response.arrayBuffer();
}

async function decodedVoice(context, key, url, signal) {
  if (voiceCache.has(key)) return voiceCache.get(key);
  const bytes = await voiceBytes(url, signal);
  const buffer = await new Promise((resolve, reject) => {
    const pending = context.decodeAudioData(bytes, resolve, reject);
    pending?.then(resolve, reject);
  });
  if (!signal.aborted) {
    if (voiceCache.size >= 24) voiceCache.delete(voiceCache.keys().next().value);
    voiceCache.set(key, buffer);
  }
  return buffer;
}

async function playBuffer(context, key, url, signal, onDuration) {
  const ready = await withinVoiceTime(waitForGameAudio(), signal, 1300);
  if (!ready) throw new Error('Audio is suspended');
  const buffer = await withinVoiceTime(decodedVoice(context, key, url, signal), signal, 2800);
  if (signal.aborted || context.state !== 'running') throw new Error('Audio was interrupted');
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  try {
    onDuration?.(buffer.duration * 1000);
    await withinVoiceTime(new Promise((resolve, reject) => {
      source.onended = resolve;
      try { source.start(); } catch (error) { reject(error); }
    }), signal, buffer.duration * 1000 + 900);
  } finally {
    source.onended = null;
    try { source.stop(); } catch { /* Some engines reject stop on a source that never started. */ }
    source.disconnect();
  }
}

async function playMedia(url, signal, onDuration) {
  mediaPlayer ??= new Audio();
  const player = mediaPlayer;
  const playback = {};
  mediaPlayback = playback;
  const metadata = () => {
    if (Number.isFinite(player.duration)) onDuration?.(player.duration * 1000);
  };
  let onEnd;
  let onError;
  const ended = new Promise((resolve, reject) => {
    onEnd = () => resolve();
    onError = () => reject(new Error('Audio file failed'));
  });
  // Playback may fail before we get to await the media events.
  ended.catch(() => {});
  player.addEventListener('loadedmetadata', metadata, { once: true });
  player.addEventListener('ended', onEnd, { once: true });
  player.addEventListener('error', onError, { once: true });
  try {
    player.src = url;
    await withinVoiceTime(player.play(), signal, 1800);
    const duration = Number.isFinite(player.duration) ? player.duration * 1000 : 6500;
    await withinVoiceTime(ended, signal, duration + 900);
  } finally {
    player.removeEventListener('loadedmetadata', metadata);
    player.removeEventListener('ended', onEnd);
    player.removeEventListener('error', onError);
    if (mediaPlayback === playback) {
      mediaPlayback = undefined;
      player.pause();
    }
  }
}

function rememberVoice(keys, caption, onDuration) {
  const lines = Array.isArray(keys) ? keys : [keys];
  lastVoice = [lines, caption, onDuration];
  const text = caption ?? lines.map(key => voiceScript[key]).join(' ');
  if (voiceCaption.textContent !== text) voiceCaption.textContent = text;
  repeatButton.hidden = false;
  return lines;
}

function showVoiceStatus(show) {
  voiceStatus.hidden = !show;
  repeatButton.textContent = show ? 'Попробовать звук снова' : 'Повторить голос';
  voiceButton.textContent = !voiceEnabled ? 'Голос выключен' : show ? 'Проверить голос' : 'Голос включён';
}

async function say(keys, caption, onDuration) {
  stopVoice();
  const lines = rememberVoice(keys, caption, onDuration);
  if (!voiceEnabled || voiceBlocked) {
    showVoiceStatus(voiceEnabled && voiceBlocked);
    return false;
  }

  const controller = new AbortController();
  utterance = controller;
  const { signal } = controller;
  setJingleDucking(true);
  try {
    const context = jingleContext;
    for (const key of lines) {
      const url = voiceAsset(key);
      // Browsers allow local media URLs in <audio> even when fetch(file:) is blocked.
      const localMediaFile = location.protocol === 'file:' && !url.startsWith('data:');
      if (context && typeof context.decodeAudioData === 'function' && !localMediaFile) {
        await playBuffer(context, key, url, signal, onDuration);
      } else {
        await playMedia(url, signal, onDuration);
      }
      if (signal.aborted) return false;
    }
    showVoiceStatus(false);
    return true;
  } catch {
    if (!signal.aborted) {
      voiceBlocked = true;
      showVoiceStatus(true);
    }
    return false;
  } finally {
    if (utterance === controller) stopVoice();
  }
}

function retryVoice() {
  prepareVoiceGesture();
  initGameAudio();
  if (replayVoice) replayVoice();
  else if (lastVoice) void say(...lastVoice);
}

voiceButton.addEventListener('click', () => {
  if (voiceEnabled && voiceBlocked) {
    retryVoice();
    return;
  }
  voiceEnabled = !voiceEnabled;
  voiceButton.setAttribute('aria-pressed', String(voiceEnabled));
  voiceButton.textContent = voiceEnabled ? 'Голос включён' : 'Голос выключен';
  if (voiceEnabled) retryVoice();
  else {
    stopVoice();
    showVoiceStatus(false);
  }
  document.dispatchEvent(new Event('game-voice-preference'));
});

repeatButton.addEventListener('click', () => {
  if (!voiceEnabled) voiceButton.click();
  else retryVoice();
});
