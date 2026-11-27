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

// Роль в таблице промпта = роль с полом: суффикс -f / -m.
// Пол голоса — из API (`GET /v1beta/voices?language_code=pt-PT`, поле gender), см. check_voices.mjs.
// Правило: в одном диалоге у двух собеседников голоса РАЗНЫЕ (проверяется ниже), а пол
// голоса = пол говорящего (по .speaker и по формам obrigado/obrigada, cansado/cansada).
const VOICES = {
  'narradora-f': {
    gender: 'female', voice: 'pt-pt-storyteller-1',
    style: 'Warm, calm, articulate audiobook narrator for beginners, ~85% normal pace, clear pronunciation without artificial pauses between words, European Portuguese (Lisbon).'
  },
  'joao-m': {
    gender: 'male', voice: 'pt-pt-advisor-6', atempo: 0.88,
    style: 'Friendly, natural everyday urban Portuguese man (João, ~30), unhurried ~80-85% normal pace, every word clear for beginners, European Portuguese (Lisbon).'
  },
  'ana-f': {
    gender: 'female', voice: 'pt-pt-tutor-1', atempo: 0.88,
    style: 'Young Portuguese-speaking woman (Ana, ~24, a student), warm and natural, unhurried ~80-85% normal pace, every word clear for beginners, European Portuguese (Lisbon).'
  },
  'maria-f': {
    gender: 'female', voice: 'pt-pt-concierge-2', atempo: 0.88,
    style: 'Bright, friendly mature Portuguese woman (Maria, a neighbour, ~55), unhurried ~80-85% normal pace, every word clear for beginners, European Portuguese (Lisbon).'
  },
  'empregada-f': { // рецепционистка отеля / продавщица в магазине / официантка
    gender: 'female', voice: 'pt-pt-assistant-7', atempo: 0.88,
    style: 'Polite, businesslike Portuguese woman working behind a counter (hotel receptionist, shop assistant), unhurried and clear at ~80-85% normal pace for language learners, European Portuguese (Lisbon).'
  },
  'senhora-f': { // незнакомая пожилая женщина на улице
    gender: 'female', voice: 'pt-pt-csagent-2', atempo: 0.88,
    style: 'Kind, approachable elderly Portuguese lady (~65) helping a stranger, unhurried ~80-85% normal pace, every word clear for beginners, European Portuguese (Lisbon).'
  },
  'empregado-m': { // официант / продавец
    gender: 'male', voice: 'pt-pt-advisor-5', atempo: 0.88,
    style: 'Friendly, welcoming Lisbon cafe waiter (~50), unhurried yet natural ~80-85% normal pace, clearly intelligible for learners, European Portuguese (Lisbon).'
  },
  'cliente-m': { // посетитель кафе, говорит о себе в мужском роде (obrigado)
    gender: 'male', voice: 'pt-pt-assistant-2', atempo: 0.88,
    style: 'Calm, polite everyday cafe customer (a man, ~32), unhurried ~80-85% normal pace, clear pronunciation, European Portuguese (Lisbon).'
  },
  'homem-m': { // незнакомый мужчина (прохожий, сосед)
    gender: 'male', voice: 'pt-pt-tutor-7', atempo: 0.88,
    style: 'Polite, calm Portuguese man (~44) speaking to a stranger, unhurried ~80-85% normal pace, every word clear for beginners, European Portuguese (Lisbon).'
  }
};
// Старые имена ролей из партий 1–2 (рецепционистка и официант — те же голоса).
const ALIASES = { narrador: 'narradora-f', rececionista: 'empregada-f', joao: 'joao-m', empregado: 'empregado-m', cliente: 'cliente-m' };
for (const [old, now] of Object.entries(ALIASES)) VOICES[old] = VOICES[now];

// Два разных говорящих — два разных голоса: одинаковый voice у разных ролей запрещён.
{
  const seen = new Map();
  for (const [role, cfg] of Object.entries(VOICES)) {
    if (ALIASES[role]) continue;
    if (seen.has(cfg.voice)) throw new Error(`Голос ${cfg.voice} у двух ролей: ${seen.get(cfg.voice)} и ${role}`);
    seen.set(cfg.voice, role);
  }
}

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

    if (cols.length === 2 && /narrador|narradora/.test(section)) {
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

  console.log(`Generated ${item.id}.mp3 (${item.role} [${cfg.gender}] -> ${cfg.voice}${cfg.atempo ? `, atempo=${cfg.atempo}` : ''})`);
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
