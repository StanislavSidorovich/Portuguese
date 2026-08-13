#!/usr/bin/env node
/*
 * Проверки курса. Запуск из корня репозитория:
 *
 *     node tools/check.js
 *
 * Курс — один index.html на несколько тысяч строк, и почти все поломки в нём
 * тихие: забытый регистр не роняет страницу, а просто выключает тему; слово
 * без словарной статьи не переводится по тапу, но выглядит как обычное;
 * пропущенная форма в таблице спряжения даёт «undefined» на экране.
 * Глазами это не ловится, поэтому пять проверок ниже.
 *
 * ВАЖНО: скрипт не хранит копию данных приложения. И словарь, и список замен
 * окончаний, и таблицу неправильных глаголов он вытаскивает из самого
 * index.html — иначе они разошлись бы.
 *
 * Ещё две проверки требуют браузера и живут в tools/browser-checks.js:
 * ширина таблиц и прохождение заданий на N/N.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const FILE = path.join(path.resolve(__dirname, '..'), 'index.html');
const html = fs.readFileSync(FILE, 'utf8');

let failed = 0;
const ok   = (msg) => console.log('  ok   ' + msg);
const bad  = (msg) => { failed++; console.log('  ФЕЙЛ ' + msg); };
const head = (msg) => console.log('\n' + msg);

/* ============ данные из самого index.html ============ */

// Словарь VOCAB + наборы «Palavras N», которые досыпает seedVocabFromWordsets.
function buildVocab() {
  const start = html.indexOf('var VOCAB = {');
  const end   = html.indexOf('\n  };', start);
  if (start < 0 || end < 0) throw new Error('не нашёл объект VOCAB в index.html');
  const vocab = new Set();
  for (const m of html.slice(start, end).matchAll(/"([^"]+)"\s*:\s*"/g)) vocab.add(m[1]);
  // .w может нести дополнительный класс — приложение берёт элемент через
  // querySelector(".w"), значит и мы должны.
  for (const m of html.matchAll(/<span class="w[^"]*">([^<]*)<\/span>/g)) {
    const key = m[1].trim().toLowerCase();
    vocab.add(key);
    // Фраза из двух слов кладётся в словарь и по частям — так же, как это
    // делает seedVocabFromWordsets.
    for (const part of key.split(/\s+/)) if (part.length > 1) vocab.add(part);
  }
  return vocab;
}

// STRIP — пары [что было, чем заменить]: в португальском окончание не
// отрезается, а подменяется (falamos → falar).
function buildStrip() {
  const m = html.match(/var STRIP = \[([\s\S]*?)\n  \];/);
  if (!m) throw new Error('не нашёл массив STRIP в index.html');
  return [...m[1].matchAll(/\["([^"]*)"\s*,\s*"([^"]*)"\]/g)].map((x) => [x[1], x[2]]);
}

const VOCAB = buildVocab();
const STRIP = buildStrip();

// Повторяет lookupWord из приложения: поиск в ширину по цепочкам замен,
// глубина два.
function stripOnce(w) {
  const out = [];
  for (const [from, to] of STRIP) {
    if (w.length > from.length && w.slice(-from.length) === from) {
      out.push(w.slice(0, -from.length) + to);
    }
  }
  return out;
}

function lookup(raw) {
  const w = raw.toLowerCase();
  if (VOCAB.has(w)) return true;
  let frontier = [w];
  const seen = new Set();
  for (let depth = 0; depth < 2; depth++) {
    const next = [];
    for (const word of frontier) {
      for (const cand of stripOnce(word)) {
        if (seen.has(cand)) continue;
        seen.add(cand);
        if (VOCAB.has(cand)) return true;
        next.push(cand);
      }
    }
    if (!next.length) break;
    frontier = next;
  }
  return false;
}

/* ============ 1. баланс тегов ============ */

function checkBalance() {
  head('1. Баланс HTML');
  const VOID = new Set(['br','img','input','meta','link','hr','source','area','base','col','embed','param','track','wbr']);
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  const stack = [];
  let errors = 0;
  for (const m of clean.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g)) {
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    if (VOID.has(tag) || m[3].trim().endsWith('/')) continue;
    if (!closing) { stack.push(tag); continue; }
    const top = stack.pop();
    if (top !== tag) {
      bad(`</${tag}> там, где ожидался </${top || '—'}>: …${clean.slice(Math.max(0, m.index - 90), m.index + 30).replace(/\s+/g, ' ')}`);
      if (++errors > 3) return;
    }
  }
  if (errors) return;
  if (stack.length) bad('незакрытые теги: ' + stack.join(', '));
  else ok('все теги закрыты');
}

/* ============ 2. связность тем ============ */

// Тема живёт в пяти местах сразу, и забытое место не роняет страницу,
// а просто выключает часть темы. Поэтому проверяем все пять.
function checkStructure() {
  head('2. Связность тем');

  const screenIds = [...html.matchAll(/id="(screen-[^"]+)"/g)].map((m) => m[1]);
  const dups = screenIds.filter((v, i) => screenIds.indexOf(v) !== i);
  if (dups.length) bad('повторяющиеся id экранов: ' + [...new Set(dups)].join(', '));
  else ok(`${screenIds.length} экранов, id уникальны`);

  // Литералы вида data-open="'+w.id+'" приходят из шаблонных строк в JS.
  const opens = [...new Set([...html.matchAll(/data-open="([^"]+)"/g)].map((m) => m[1]))]
    .filter((o) => !o.includes("'"));
  const orphan = opens.filter((o) => !screenIds.includes('screen-' + o));
  if (orphan.length) bad('data-open без экрана: ' + orphan.join(', '));
  else ok(`${opens.length} переходов ведут на существующие экраны`);

  const topics = [...new Set(
    [...html.matchAll(/<div class="screen topic-screen"[^>]*data-topic="([^"]+)"/g)].map((m) => m[1])
  )];
  let broken = 0;
  for (const t of topics) {
    const missing = [];
    if (!html.includes(`data-badge="${t}"`))            missing.push('значка «пройдено»');
    if (!html.includes(`data-check="${t}"`))            missing.push('строки на главной');
    if (!html.includes(`pane-quiz" data-topic="${t}"`)) missing.push('вкладки заданий');
    if (!new RegExp(`"${t}"\\s*:\\s*\\d+`).test(html))  missing.push('минут в TOPIC_MINUTES');
    if (!new RegExp(`_TOPICS\\s*=\\s*\\[[^\\]]*"${t}"`).test(html)) missing.push('регистра <БЛОК>_TOPICS');
    if (missing.length) { bad(`тема «${t}» без ${missing.join(', ')}`); broken++; }
  }
  if (!broken) ok(`${topics.length} тем подключены целиком`);

  // Строка на главной, ведущая в тему, которой ещё нет, должна быть disabled —
  // иначе кнопка нажимается и молча ничего не делает.
  const deadRows = [...html.matchAll(/<button type="button" class="topic-row" data-open="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((id) => !screenIds.includes('screen-' + id));
  if (deadRows.length) bad('строки главной без экрана (нужен disabled): ' + deadRows.join(', '));
  else ok('все активные строки главной ведут в готовые темы');
}

/* ============ 3. тап-перевод ============ */

// Слово в тексте, которого нет в словаре, не подсвечивает ошибку — оно
// просто молча не переводится по тапу. Для новичка это дыра в тексте.
function checkVocabCoverage() {
  head('3. Тап-перевод текстов');
  const PT = /[A-Za-zÀ-ÖØ-öø-ÿ]+/g;
  const missing = new Map();

  const zones = [
    ...html.matchAll(/<p class="storytext">([\s\S]*?)<\/p>/g),
    ...html.matchAll(/<p class="dline">([\s\S]*?)<\/p>/g),
  ];
  for (const zone of zones) {
    const text = zone[1]
      .replace(/<span class="speaker">[\s\S]*?<\/span>/g, '')
      .replace(/<[^>]+>/g, ' ');
    for (const m of text.matchAll(PT)) {
      const w = m[0].toLowerCase();
      if (!lookup(w)) missing.set(w, (missing.get(w) || 0) + 1);
    }
  }

  if (missing.size) {
    bad(`${missing.size} слов не переводятся — добавь их в VOCAB целиком:`);
    console.log('       ' + [...missing.keys()].sort().join(', '));
  } else {
    ok(`${zones.length} текстов и реплик, каждое слово переводится`);
  }
}

/* ============ 4. целостность заданий ============ */

// Опечатка в data-answer делает задание нерешаемым: правильного варианта
// либо нет среди опций, либо нет в банке слов.
function checkQuizData() {
  head('4. Задания');
  let problems = 0;

  for (const m of html.matchAll(/data-answer="([^"]*)" data-words="([^"]*)"/g)) {
    const answer = m[1].toLowerCase().replace(/[.,!?;:—–-]/g, '').split(/\s+/).filter(Boolean).sort().join(' ');
    const words  = m[2].toLowerCase().split('|').filter(Boolean).sort().join(' ');
    if (answer !== words) {
      bad(`сборка предложения: ответ «${m[1]}» не собирается из банка «${m[2]}»`);
      problems++;
    }
  }

  for (const m of html.matchAll(/<select class="mc" data-answer="([^"]*)">([\s\S]*?)<\/select>/g)) {
    const answer  = m[1];
    const options = [...m[2].matchAll(/<option value="([^"]*)"/g)].map((o) => o[1]);
    if (!answer) { bad('у выпадающего списка пустой data-answer'); problems++; continue; }
    if (!options.includes(answer)) {
      bad(`выбор из списка: правильного варианта «${answer}» нет среди опций (${options.filter(Boolean).join(', ')})`);
      problems++;
    }
  }

  const blanks = [...html.matchAll(/<input class="blank" data-answer="([^"]*)"/g)];
  for (const m of blanks) {
    if (!m[1].trim()) { bad('у поля ввода пустой data-answer'); problems++; }
  }

  if (!problems) {
    const builds  = [...html.matchAll(/data-words="/g)].length;
    const selects = [...html.matchAll(/<select class="mc"/g)].length;
    ok(`${blanks.length} полей, ${selects} списков, ${builds} сборок — ответы согласованы`);
  }
}

/* ============ 5. таблица неправильных глаголов ============ */

// Строк ровно пять (eu, tu, ele, nós, eles). Четыре — и последняя форма
// на экране станет undefined; шесть — лишняя молча потеряется. Ни то ни
// другое не роняет страницу.
function checkIrregulars() {
  head('5. Таблица неправильных глаголов');
  const start = html.indexOf('var IRREG = {');
  const end   = html.indexOf('\n  };', start);
  if (start < 0 || end < 0) { bad('не нашёл таблицу IRREG'); return; }
  const body = html.slice(start, end);

  let verbs = 0, problems = 0;
  for (const v of body.matchAll(/"([^"]+)":\s*\{([\s\S]*?)\n(?=\s*"|\s*\};)/g)) {
    verbs++;
    for (const t of v[2].matchAll(/(presente|preterito|imperfeito):\s*\[([^\]]*)\]/g)) {
      const forms = [...t[2].matchAll(/"([^"]*)"/g)].map((f) => f[1]);
      if (forms.length !== 5) {
        bad(`${v[1]} · ${t[1]}: ${forms.length} форм вместо пяти (${forms.join(', ')})`);
        problems++;
      }
      if (forms.some((f) => !f.trim())) {
        bad(`${v[1]} · ${t[1]}: есть пустая форма`);
        problems++;
      }
    }
  }

  const persons = html.match(/var PERSONS = \[([\s\S]*?)\];/);
  const nPersons = persons ? [...persons[1].matchAll(/"/g)].length / 2 : 0;
  if (nPersons !== 5) { bad(`PERSONS: ${nPersons} лиц вместо пяти`); problems++; }

  if (!problems) ok(`${verbs} глаголов, у всех по пять форм в каждом времени`);
}

/* ============ ============ */

console.log('Проверка index.html');
checkBalance();
checkStructure();
checkVocabCoverage();
checkQuizData();
checkIrregulars();

console.log('');
if (failed) {
  console.log(`ИТОГ: ${failed} проблем${failed === 1 ? 'а' : ''}.`);
  process.exit(1);
}
console.log('ИТОГ: всё чисто. Осталось проверить в браузере — см. tools/browser-checks.js:');
console.log('  · ширину таблиц и блоков (на теле темы доступно 343px при вьюпорте 375);');
console.log('  · что задания новых тем дают N / N верно.');
