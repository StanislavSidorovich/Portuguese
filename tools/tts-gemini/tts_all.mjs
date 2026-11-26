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
    style: 'Polite, businesslike coastal hotel receptionist, unhurried and clear at ~80-85% normal pace for language learners, European Portuguese (Lisbon).',
    atempo: 0.88 // 12% slower as requested
  },
  joao: {
    voice: 'pt-pt-advisor-6',
    style: 'Friendly, natural everyday urban Portuguese man, unhurried ~80-85% normal pace, every word clear for beginners, European Portuguese (Lisbon).',
    atempo: 0.88
  },
  narrador: {
    voice: 'pt-pt-storyteller-1',
    style: 'Warm, calm, articulate audiobook narrator for beginners, ~85% normal pace, clear pronunciation without artificial pauses between words, European Portuguese (Lisbon).'
  },
  empregado: {
    voice: 'pt-pt-advisor-5',
    style: 'Friendly, welcoming Lisbon cafe waiter, unhurried yet natural ~80-85% normal pace, clearly intelligible for learners, European Portuguese (Lisbon).',
    atempo: 0.88
  },
  cliente: {
    voice: 'pt-pt-assistant-2',
    style: 'Calm, polite everyday cafe customer, unhurried ~80-85% normal pace, clear pronunciation, European Portuguese (Lisbon).',
    atempo: 0.88
  }
};

// Parse gemini-prompt.md tables
function parsePromptMd(mdPath) {
  const lines = fs.readFileSync(mdPath, 'utf8').split(/\r?\n/);
  const items = [];
  let section = '';
  for (const line of lines) {
    if (line.startsWith('### ')) {
      section = line.slice(4).trim();
      continue;
    }
    if (!section || !line.startsWith('|')) continue;
    const cols = line.split('|').slice(1, -1).map(c => c.trim());
    if (cols.length < 2) continue;
    if (cols[0] === 'id' || cols[0].startsWith('---')) continue;

    if (cols.length === 2 && section.includes('narrador')) {
      items.push({ id: cols[0], role: 'narrador', text: cols[1] });
    } else if (cols.length === 3) {
      items.push({ id: cols[0], role: cols[1], text: cols[2] });
    }
  }
  return items;
}

const forceIds = new Set(process.argv.slice(2));
const items = parsePromptMd(path.resolve('gemini-prompt.md'));
console.log(`Parsed ${items.length} items from gemini-prompt.md`);

async function synthesizeToMp3(item) {
  const outMp3 = path.resolve(`${item.id}.mp3`);
  if (fs.existsSync(outMp3) && !forceIds.has(item.id)) {
    console.log(`Skipping existing ${item.id}.mp3`);
    return;
  }

  const cfg = VOICES[item.role];
  if (!cfg) throw new Error(`Unknown role: ${item.role}`);

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
      speech_config: [{ voice: cfg.voice }]
    }
  };

  let res;
  for (let attempt = 1; attempt <= 3; attempt++) {
    res = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (res.ok) break;
    const errText = await res.text();
    if (attempt === 3) throw new Error(`TTS API error for ${item.id} (${res.status}): ${errText}`);
    await new Promise(r => setTimeout(r, 1500 * attempt));
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
    throw new Error(`No audio data in response for ${item.id}`);
  }

  const tmpWav = path.resolve(`_tmp_${item.id}.wav`);
  fs.writeFileSync(tmpWav, Buffer.from(audioB64, 'base64'));

  const filters = [];
  if (cfg.atempo) filters.push(`atempo=${cfg.atempo}`);
  filters.push('adelay=200:all=1', 'apad=pad_dur=0.3');

  try {
    execFileSync('ffmpeg', [
      '-y',
      '-i', tmpWav,
      '-af', filters.join(','),
      '-ac', '1',
      '-ar', '44100',
      '-c:a', 'libmp3lame',
      '-b:a', '64k',
      outMp3
    ], { stdio: 'pipe' });
  } finally {
    if (fs.existsSync(tmpWav)) fs.unlinkSync(tmpWav);
  }

  console.log(`Generated ${item.id}.mp3 (${item.role} -> ${cfg.voice}${cfg.atempo ? `, atempo=${cfg.atempo}` : ''})`);
}

// Run with concurrency 3
const queue = [...items];
async function worker() {
  while (queue.length > 0) {
    const item = queue.shift();
    await synthesizeToMp3(item);
  }
}

await Promise.all([worker(), worker(), worker()]);
console.log('All done!');
