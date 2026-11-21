"""Render the Russian game script with Kokoro-RU ONNX and eSpeak phonemes."""

import argparse
import json
from pathlib import Path
import subprocess

import lameenc
import numpy as np
import onnxruntime as ort
from piper.phonemize_espeak import ESPEAK_DATA_DIR, EspeakPhonemizer


def pronunciation(phonemizer, text):
    ipa = ' '.join(''.join(clause) for clause in phonemizer.phonemize('ru', text))
    # Preserve the soft final consonant in «ноль» and the stress in «черту́».
    ipa = ipa.replace('nˈoɭ', 'nˈolʲ').replace('tʃʲˈertu', 'tʃʲirtˈu')
    for old, new in {'u"': 'u', 'ɭ': 'l', 'ɵ': 'o', 'ʑ': 'ʒ', 'tʃʲ': 'ʧ', 'dʒ': 'ʤ', '^': ''}.items():
        ipa = ipa.replace(old, new)
    return ipa


def encode(waveform, rate):
    active = np.flatnonzero(np.abs(waveform) > .006)
    if not active.size:
        raise ValueError('The speech model returned silent audio')
    audio = waveform[max(0, active[0] - round(rate * .035)):active[-1] + round(rate * .12)].copy()
    audio *= min(.70 / np.max(np.abs(audio)), .145 / np.sqrt(np.mean(audio ** 2)))
    edge = round(rate * .012)
    audio[:edge] *= np.linspace(0, 1, edge)
    audio[-edge:] *= np.linspace(1, 0, edge)
    pcm = (audio * 32767).astype('<i2').tobytes()
    encoder = lameenc.Encoder()
    encoder.set_in_sample_rate(rate)
    encoder.set_channels(1)
    encoder.set_bit_rate(48)
    encoder.set_quality(2)
    return encoder.encode(pcm) + encoder.flush()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('model_dir', type=Path)
    parser.add_argument('voice', choices=['masha', 'sveta'])
    parser.add_argument('output', type=Path)
    parser.add_argument('keys', nargs='*')
    args = parser.parse_args()
    project = Path(__file__).resolve().parent.parent
    script = json.loads(subprocess.check_output(
        ['node', '-p', "JSON.stringify(require('./curriculum.js'))"], cwd=project, text=True
    ))
    phonemizer = EspeakPhonemizer(ESPEAK_DATA_DIR)
    vocabulary = json.loads((args.model_dir / 'config.json').read_text())['vocab']
    voice = np.fromfile(args.model_dir / f'{args.voice}.bin', dtype=np.float32).reshape(510, 256)
    options = ort.SessionOptions()
    options.intra_op_num_threads = 2
    options.inter_op_num_threads = 1
    session = ort.InferenceSession(
        args.model_dir / 'model_quantized.onnx', sess_options=options, providers=['CPUExecutionProvider']
    )
    args.output.mkdir(parents=True, exist_ok=True)
    for key in args.keys or script:
        ipa = pronunciation(phonemizer, script[key])
        ids = [vocabulary[phone] for phone in ipa]
        waveform = session.run(None, {
            'input_ids': np.array([[0, *ids, 0]], dtype=np.int64),
            'style': voice[len(ids) - 1][None],
            'speed': np.array([.96], dtype=np.float32),
        })[0].reshape(-1)
        (args.output / f'{key}.mp3').write_bytes(encode(waveform, 24000))
        print(key, script[key], ipa, flush=True)


if __name__ == '__main__':
    main()
