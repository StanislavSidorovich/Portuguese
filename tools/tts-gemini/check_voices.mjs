import fs from 'node:fs';
import path from 'node:path';

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

async function listVoices(params) {
  const url = new URL('https://generativelanguage.googleapis.com/v1beta/voices');
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach(val => url.searchParams.append(k, val));
    else if (v !== undefined) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    headers: { 'x-goog-api-key': apiKey }
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

const ptPt = await listVoices({ language_code: 'pt-PT', page_size: 100 });
console.log('pt-PT voices:', JSON.stringify(ptPt.voices?.map(v => ({
  id: v.id, name: v.display_name, lang: v.language_code, accent: v.accent, gender: v.gender, pitch: v.pitch, desc: v.description
})) || [], null, 2));

const ptAll = await listVoices({ search: 'Portuguese', page_size: 100 });
console.log('Portuguese search:', JSON.stringify(ptAll.voices?.map(v => ({
  id: v.id, name: v.display_name, lang: v.language_code, accent: v.accent, gender: v.gender, pitch: v.pitch, desc: v.description
})) || [], null, 2));
