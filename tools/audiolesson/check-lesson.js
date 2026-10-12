'use strict';

/*
 * Проверка сценария аудиоурока до озвучки.
 *
 *   node tools/audiolesson/check-lesson.js tools/audiolesson/lessons/comer.txt
 *
 * Озвучка стоит минуты и уходит в чужой сервис, а ошибку на слух потом не
 * найти поиском по файлу — поэтому всё, что ловится текстом, ловится здесь:
 *   · разметка: каждая строка — реплика, пауза, заголовок или комментарий;
 *   · в русской реплике нет латиницы — русский голос её коверкает;
 *   · в португальской нет кириллицы;
 *   · португальская реплика либо дословно взята из сцены DIALOGS или
 *     сочетаний пакета, либо собрана из слов курса и пакетов Situações —
 *     то же правило, что у текстов (проверки 3 и 10 в check.js).
 * Последнее заодно не пускает бразильские формы: в словаре курса их нет.
 */

const fs = require('fs');
const path = require('path');
const { buildVocab, buildStrip, makeLookup, PT_WORD } = require('../lib-vocab');

const VOICES = new Set(['R', 'P', 'W']);

// Словарь бразильский герундий не ловит: «vendo» — честное «я продаю» от
// vender. Поэтому -ando/-endo/-indo запрещены отдельно, а настоящие слова
// с таким концом вносятся сюда руками.
const GERUND = /(ando|endo|indo)$/;
const NOT_GERUND = new Set(['quando', 'lindo', 'vindo']);

function parseLesson(src) {
  const items = [], errors = [];
  src.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim(), n = i + 1;
    if (!line || line.startsWith('# ') || line === '#') return;
    if (line.startsWith('## ')) { items.push({ n, kind: 'head', text: line.slice(3) }); return; }
    let m = line.match(/^\[(\d+(?:\.\d+)?)\]$/);
    if (m) { items.push({ n, kind: 'pause', sec: Number(m[1]) }); return; }
    m = line.match(/^([A-Z])(-?):\s+(.+)$/);
    if (m && VOICES.has(m[1])) {
      items.push({ n, kind: 'say', voice: m[1], slow: !!m[2], text: m[3] });
      return;
    }
    errors.push(`строка ${n}: не разобрал «${line}»`);
  });
  return { items, errors };
}

// Литерал массива из index.html — так же, как loadSituacoes в check.js.
function loadArray(html, name) {
  const start = html.indexOf(`var ${name} = [`);
  const end = html.indexOf('\n  ];', start);
  if (start < 0 || end < 0) throw new Error(`не нашёл ${name} в index.html`);
  return new Function('return ' + html.slice(start + `var ${name} = `.length, end) + '\n  ];')();
}

const norm = (s) => s.toLowerCase().replace(/[.,!?¿¡«»"]/g, '').replace(/\s+/g, ' ').trim();

function checkLesson(file, html) {
  const { items, errors } = parseLesson(fs.readFileSync(file, 'utf8'));

  const vocab = buildVocab(html);
  const sits = loadArray(html, 'SITUACOES');
  for (const p of sits) for (const x of p.words) {
    const k = x.w.toLowerCase();
    vocab.add(k);
    for (const part of k.split(/\s+/)) if (part.length > 1) vocab.add(part);
  }
  const look = makeLookup(vocab, buildStrip(html));

  // Дословные реплики: им можно содержать форму, которой нет в словаре
  // отдельной статьёй (escolheram), — ученик встречает её в сцене целиком.
  const verbatim = new Set();
  for (const d of loadArray(html, 'DIALOGS')) for (const s of d.steps) {
    verbatim.add(norm(s.npc.pt));
    verbatim.add(norm(s.answer));
  }
  for (const p of sits) for (const c of p.chunks || []) verbatim.add(norm(c.pt));

  let nPt = 0, nRu = 0, nVerbatim = 0, pauses = 0;
  for (const it of items) {
    if (it.kind === 'pause') { pauses += it.sec; continue; }
    if (it.kind !== 'say') continue;
    const where = `строка ${it.n}`;
    if (it.voice === 'R') {
      nRu++;
      if (/[A-Za-zÀ-ÿ]/.test(it.text)) errors.push(`${where}: латиница в русской реплике — «${it.text}»`);
      continue;
    }
    nPt++;
    if (/[А-Яа-яЁё]/.test(it.text)) errors.push(`${where}: кириллица в португальской реплике — «${it.text}»`);
    const gerund = [...it.text.matchAll(PT_WORD)].map((m) => m[0].toLowerCase()).filter((w) => GERUND.test(w) && !NOT_GERUND.has(w));
    if (gerund.length) errors.push(`${where}: похоже на бразильский герундий — ${gerund.join(', ')}; в pt-PT «estar a + инфинитив»`);
    if (verbatim.has(norm(it.text))) { nVerbatim++; continue; }
    const missing = [...it.text.matchAll(PT_WORD)].map((m) => m[0]).filter((w) => !look(w));
    if (missing.length) errors.push(`${where}: слова вне курса — ${missing.join(', ')} («${it.text}»)`);
  }

  return { errors, items, stats: { nPt, nRu, nVerbatim, pauses } };
}

module.exports = { parseLesson, checkLesson };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.error('укажи файл сценария'); process.exit(2); }
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
  const { errors, stats } = checkLesson(file, html);
  if (errors.length) {
    for (const e of errors) console.log('  ✗ ' + e);
    console.log(`${errors.length} ошибк(и) — озвучивать рано`);
    process.exit(1);
  }
  console.log(`  ✓ ${path.basename(file)}: ${stats.nPt} португальских реплик (${stats.nVerbatim} дословно из сцен и пакетов), ${stats.nRu} русских, пауз на ${Math.round(stats.pauses)} с`);
}
