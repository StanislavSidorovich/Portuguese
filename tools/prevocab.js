#!/usr/bin/env node
/*
 * Предсверка словаря по черновику темы. Запуск из корня репозитория:
 *
 *     node tools/prevocab.js draft-1.5.html
 *     node tools/prevocab.js draft-1.5.html draft-1.6.html
 *     node tools/prevocab.js draft-1.5.html --add chamar,levantar,me,te
 *
 * Зачем отдельный скрипт, если есть проверка 3 в `check.js`.
 *
 * Правило курса: в текстах темы встречаются только слова этой темы и
 * предыдущих. Нарушить его легко — рука сама вставляет в рассказ удобное
 * слово («достаточно», «тот же», «спрашиваешь»), и замечается это уже после
 * того, как тема вставлена в `index.html`. Тогда переписывать приходится не
 * черновик, а кусок шеститысячестрочного файла, и вслепую: `check.js` даёт
 * список слов, но не показывает, где они стоят.
 *
 * Этот скрипт задаёт тот же вопрос по черновому файлу, пока правки стоят
 * дёшево. `--add` — список слов, которые ты собираешься завести в `VOCAB`
 * вместе с темой: формы неправильных глаголов, служебные слова, куски
 * устойчивых фраз. Так видно, хватит ли задуманных добавок.
 *
 * Наборы «Palavras N» из самого черновика досыпаются автоматически: слово,
 * которое тема сама же и вводит, ошибкой не является.
 *
 * Чего скрипт НЕ проверяет: что слово переводится ВЕРНО. Он отвечает только
 * на вопрос «дошло ли до какой-нибудь статьи». Короткое служебное слово
 * легко уезжает не туда — «te» по цепочке [e → er] попадает в «ter» и
 * переводится «иметь». Такие слова заводи в `VOCAB` своей статьёй и
 * проверяй тапом в браузере.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { buildVocab, addWordsets, buildStrip, makeLookup, readableZones, PT_WORD } = require('./lib-vocab.js');

const args   = process.argv.slice(2);
const addAt  = args.indexOf('--add');
const drafts = (addAt === -1 ? args : args.slice(0, addAt)).filter(Boolean);
const added  = addAt === -1 ? [] : (args[addAt + 1] || '').split(',').map((w) => w.trim().toLowerCase()).filter(Boolean);

if (!drafts.length) {
  console.log('Укажи хотя бы один черновик темы:');
  console.log('  node tools/prevocab.js draft-1.5.html [ещё.html] [--add слово,слово]');
  process.exit(2);
}

for (const f of drafts) {
  if (!fs.existsSync(f)) {
    console.log(`не нашёл черновик: ${f}`);
    process.exit(2);
  }
}

const html  = fs.readFileSync(path.join(path.resolve(__dirname, '..'), 'index.html'), 'utf8');
const vocab = buildVocab(html);

// Планируемые добавки в VOCAB и наборы самих черновиков — всё это будет
// в словаре к моменту, когда тема попадёт в index.html.
for (const w of added) vocab.add(w);
for (const f of drafts) addWordsets(vocab, fs.readFileSync(f, 'utf8'));

const lookup = makeLookup(vocab, buildStrip(html));

const missing = new Map();
let zones = 0;

for (const f of drafts) {
  for (const text of readableZones(fs.readFileSync(f, 'utf8'))) {
    zones++;
    for (const m of text.matchAll(PT_WORD)) {
      const w = m[0].toLowerCase();
      if (!lookup(w)) {
        if (!missing.has(w)) missing.set(w, new Set());
        missing.get(w).add(path.basename(f));
      }
    }
  }
}

if (!missing.size) {
  const where = drafts.length > 1 ? ` в ${drafts.length} черновиках` : '';
  console.log(`ok   ${zones} текстов и реплик${where} — каждое слово переводится`);
  if (added.length) console.log(`     (с учётом ${added.length} запланированных добавок в VOCAB)`);
  process.exit(0);
}

console.log(`ФЕЙЛ ${missing.size} слов не переводятся:\n`);
for (const [w, files] of [...missing].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`  ${w}  —  ${[...files].join(', ')}`);
}
console.log('\nКаждое из них — либо в набор «Palavras N» этой темы, либо в VOCAB');
console.log('целиком (если это форма, до словарной статьи не доходящая), либо');
console.log('переписать текст так, чтобы слова там не было.');
process.exit(1);
