'use strict';

// Chorus melody, expressed as MIDI pitches with lengths in beats.
const jingleBells = [
  [64,1],[64,1],[64,2],[64,1],[64,1],[64,2],
  [64,1],[67,1],[60,1.5],[62,.5],[64,3.5],[0,.5],
  [65,1],[65,1],[65,1.5],[65,.5],[65,1],[64,1],[64,1],[64,.5],[64,.5],
  [64,1],[62,1],[62,1],[64,1],[62,2],[67,2],
  [64,1],[64,1],[64,2],[64,1],[64,1],[64,2],
  [64,1],[67,1],[60,1.5],[62,.5],[64,3.5],[0,.5],
  [65,1],[65,1],[65,1.5],[65,.5],[65,1],[64,1],[64,1],[64,.5],[64,.5],
  [67,1],[67,1],[65,1],[62,1],[60,3.5],[0,.5],
];

function createJingleBuffer(context) {
  const beat = .375;
  const rate = context.sampleRate;
  const beats = jingleBells.reduce((sum, [, length]) => sum + length, 0);
  const buffer = context.createBuffer(2, Math.round(beats * beat * rate), rate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  function note(pitch, start, duration, volume, pan, voice) {
    const first = Math.round(start * beat * rate);
    const length = Math.min(Math.round(duration * beat * rate), buffer.length - first);
    const phaseStep = 2 * Math.PI * 440 * 2 ** ((pitch - 69) / 12) / rate;
    const leftGain = volume * Math.sqrt((1 - pan) / 2);
    const rightGain = volume * Math.sqrt((1 + pan) / 2);
    for (let i = 0; i < length; i += 1) {
      const time = i / rate;
      const edge = Math.min(1, time / .006, (length - i) / (rate * .03));
      const sample = edge * voice(phaseStep * i, time);
      left[first + i] += leftGain * sample;
      right[first + i] += rightGain * sample;
    }
  }

  function glockenspiel(phase, time) {
    return .82 * Math.sin(phase) * Math.exp(-time * 6)
      + .14 * Math.sin(phase * 2.01) * Math.exp(-time * 12)
      + .09 * Math.sin(phase * 3.94) * Math.exp(-time * 21);
  }

  function pluck(phase, time) {
    return (.7 * Math.sin(phase) + .24 * Math.sin(phase * 2) + .06 * Math.sin(phase * 3))
      * Math.exp(-time * 13);
  }

  function sleighBell(phase, time) {
    return (.44 * Math.sin(phase) + .34 * Math.sin(phase * 1.47) + .22 * Math.sin(phase * 2.29))
      * Math.exp(-time * 24);
  }

  let start = 0;
  jingleBells.forEach(([pitch, duration]) => {
    if (pitch) {
      note(pitch + 12, start, Math.min(duration * 1.05, 2.5), .23, .1, glockenspiel);
      note(pitch, start, Math.min(duration, .85), .085, -.18, pluck);
    }
    start += duration;
  });

  const c = [48, 55, 60, 64, 67];
  const f = [53, 48, 60, 65, 69];
  const g7 = [43, 50, 59, 62, 65];
  const d7 = [50, 45, 60, 62, 66];
  const chords = [c, c, c, c, f, c, d7, g7, c, c, c, c, f, c, g7, c];
  chords.forEach(([root, fifth, ...chord], bar) => {
    const downbeat = bar * 4;
    note(root, downbeat, .9, .115, 0, pluck);
    note(fifth, downbeat + 2, .9, .09, 0, pluck);
    for (const offbeat of [1, 3]) {
      chord.forEach(pitch => note(pitch, downbeat + offbeat, .64, .048, -.5, pluck));
    }
  });

  for (let eighth = 0; eighth < beats * 2; eighth += 1) {
    const accent = eighth % 4 === 2;
    note(accent ? 94 : 96 + eighth % 3, eighth / 2, .43, accent ? .046 : .024, accent ? -.3 : .55, sleighBell);
  }
  return buffer;
}

let jingleContext;
let jingleBuffer;
let jingleSource;

async function setJinglePlaying(playing) {
  if (!playing) {
    if (jingleSource) jingleSource.stop();
    jingleSource = undefined;
    return false;
  }
  if (jingleSource) return true;
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return false;
  let source;
  try {
    jingleContext ??= new Audio();
    jingleBuffer ??= createJingleBuffer(jingleContext);
    source = jingleContext.createBufferSource();
    source.buffer = jingleBuffer;
    source.loop = true;
    source.connect(jingleContext.destination);
    source.start();
    jingleSource = source;
    await jingleContext.resume();
    return jingleSource === source && jingleContext.state === 'running';
  } catch {
    if (source && jingleSource === source) {
      source.stop();
      jingleSource = undefined;
    }
    return false;
  }
}
