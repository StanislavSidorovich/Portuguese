import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Load .env
const envPath = path.resolve('.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY not found');
  process.exit(1);
}

const VOICES = {
  rececionista: {
    voice: 'pt-pt-assistant-7',
    style: 'Polite, businesslike coastal hotel receptionist, slightly brisk yet clear at ~85-90% normal pace for language learners, European Portuguese (Lisbon).'
  },
  joao: {
    voice: 'pt-pt-advisor-6',
    style: 'Friendly, natural everyday urban Portuguese man, ~85-90% normal pace, every word clear for beginners, European Portuguese (Lisbon).'
  },
  narrador: {
    voice: 'pt-pt-storyteller-1',
    style: 'Warm, calm, articulate audiobook narrator for beginners, ~85-90% normal pace, clear pronunciation without artificial pauses between words, European Portuguese (Lisbon).'
  },
  empregado: {
    voice: 'pt-pt-advisor-5',
    style: 'Friendly, welcoming Lisbon cafe waiter, naturally brisk yet clearly intelligible for learners, European Portuguese (Lisbon).'
  },
  cliente: {
    voice: 'pt-pt-assistant-2',
    style: 'Calm, polite everyday cafe customer, ~85-90% normal pace, clear pronunciation, European Portuguese (Lisbon).'
  }
};

const PILOT_ITEMS = [
  { id: 'rev08-d-01', role: 'rececionista', text: 'Boa tarde! Faz favor?' },
  { id: 'rev08-d-02', role: 'joao', text: 'Boa tarde. A chave do quarto dois, por favor.' }
];

async function synthesizeToMp3(item) {
  const cfg = VOICES[item.role];
  const body = {
    model: 'gemini-3.8-flash-tts',
    input: [{
      type: 'user_input',
      content: [{
        type: 'text',
        text: item.text,
        annotations: [{
          type: 'speech_metadata',
          style: cfg.style
        }]
      }]
    }],
    response_format: { type: 'audio' },
    generation_config: {
      speech_config: [
        { voice: cfg.voice }
      ]
    }
  };

  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error(`TTS API error (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  let audioB64 = data.output_audio?.data
    || data.outputs?.find(o => o.type === 'audio')?.data;

  if (!audioB64 && Array.isArray(data.steps)) {
    for (const step of data.steps) {
      if (step.type === 'model_output' && Array.isArray(step.content)) {
        const audioBlock = step.content.find(c => c.type === 'audio' && c.data);
        if (audioBlock) audioB64 = audioBlock.data;
      }
    }
  }

  if (!audioB64) {
    throw new Error(`No audio data in response for ${item.id}: ${JSON.stringify(data).slice(0, 500)}`);
  }

  const tmpWav = path.resolve(`_tmp_${item.id}.wav`);
  const outMp3 = path.resolve(`${item.id}.mp3`);
  fs.writeFileSync(tmpWav, Buffer.from(audioB64, 'base64'));

  try {
    // 0.2s leading silence, 0.3s trailing silence, mono, 44.1 kHz, 64 kbps MP3
    execFileSync('ffmpeg', [
      '-y',
      '-i', tmpWav,
      '-af', 'adelay=200:all=1,apad=pad_dur=0.3',
      '-ac', '1',
      '-ar', '44100',
      '-c:a', 'libmp3lame',
      '-b:a', '64k',
      outMp3
    ], { stdio: 'pipe' });
  } finally {
    if (fs.existsSync(tmpWav)) fs.unlinkSync(tmpWav);
  }

  const probe = execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration,bit_rate:stream=channels,sample_rate,codec_name',
    '-of', 'json',
    outMp3
  ], { encoding: 'utf8' });

  console.log(`Generated ${item.id}.mp3 (${cfg.voice}):`, JSON.parse(probe));
}

for (const item of PILOT_ITEMS) {
  await synthesizeToMp3(item);
}
