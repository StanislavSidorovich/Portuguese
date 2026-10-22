#!/usr/bin/env node
/*
 * Планы уроков для учителя Aulas (ROADMAP, раздел 3ж). Запуск из корня:
 *
 *     node tools/build-aulas.js
 *
 * Собирает aulas/plans.json — по плану на каждую сцену DIALOGS. Страница-
 * учитель (артефакт claude.ai, шаг A2) не может загрузить файл с GitHub
 * Pages: сеть артефакта закрыта. Поэтому plans.json и aulas/professor.md
 * публикуются вместе с ней как её собственные файлы, а этот скрипт надо
 * перезапускать после каждой правки сцен, словаря или пакетов Situações.
 *
 * ВАЖНО: всё, что сверяется с данными, берётся из index.html — реплики,
 * переводы, темы, словарь. Руками здесь написано только то, что сверить не
 * с чем: грамматический фокус сцены (FOCUS ниже) и список служебных слов.
 *
 * Как считается каждое поле плана:
 *   · topics — для каждого слова сцены первая тема курса (в порядке
 *     прохождения), где оно встречается: в наборе «Palavras N» или в тексте
 *     экрана темы, с теми же цепочками STRIP, что у тап-перевода. Слова,
 *     которых в темах нет, ищутся в пакете Situações, привязанном к сцене;
 *     не нашлись и там — уходят в outside;
 *   · gate — самая поздняя из этих тем: до неё сцена «доходит»;
 *   · allowed — слова наборов «Palavras N» всех тем до gate включительно,
 *     плюс слова и сочетания пакета сцены. Внутри них учитель меняет детали;
 *   · target — 10–15 слов и сочетаний из реплик сцены. Сочетания — фразы
 *     Frases, сочетания пакетов и многословные статьи словаря, целиком
 *     звучащие в реплике. Сквозное (в трёх сценах и больше: faz, favor,
 *     obrigado) — в конец, сочетания раньше слов, новое раньше старого.
 *     Слово проверено по словарю курса так же, как в tools/check.js, а
 *     форма, дошедшая до статьи цепочкой, ещё и подтверждена правилом
 *     числа и рода или движком спряжения — иначе в план не берётся;
 *   · questions — реплики собеседника с «?», either — вопрос «или–или»;
 *   · warmup — 3–5 заданий разминки из шагов сцены и её ловушек (wrong).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { buildVocab, buildStrip, makeResolve, PT_WORD } = require('./lib-vocab.js');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const OUT  = path.join(ROOT, 'aulas', 'plans.json');

let failed = 0;
const bad = (msg) => { failed++; console.log('  ФЕЙЛ ' + msg); };

/* ============ данные из index.html ============ */

function loadArray(name) {
  const start = html.indexOf('var ' + name + ' = [');
  const end   = html.indexOf('\n  ];', start);
  if (start < 0 || end < 0) throw new Error('не нашёл ' + name + ' в index.html');
  return new Function('return ' + html.slice(start + ('var ' + name + ' = ').length, end) + '\n  ];')();
}

const DIALOGS   = loadArray('DIALOGS');
const SITUACOES = loadArray('SITUACOES');
const STRIP     = buildStrip(html);
const VOCAB     = buildVocab(html);

const plain = (s) => String(s).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/^\s*[—-]\s*/, '').trim();
const words = (s) => [...String(s).matchAll(PT_WORD)].map((m) => m[0].toLowerCase());
const stripArt = (k) => k.replace(/^(o|a|os|as)\s+/, '');

// Переводы: VOCAB, потом наборы (как seedVocabFromWordsets — первая статья
// побеждает), потом слова пакетов.
const RU = new Map();
{
  const start = html.indexOf('var VOCAB = {');
  const end   = html.indexOf('\n  };', start);
  for (const m of html.slice(start, end).matchAll(/"([^"]+)"\s*:\s*"([^"]*)"/g)) RU.set(m[1], m[2]);
}
const putRu = (k, v) => {
  if (!v) return;
  if (!RU.has(k)) RU.set(k, v);
  for (const part of k.split(/\s+/)) if (part.length > 1 && !RU.has(part)) RU.set(part, v);
};

// Темы в порядке прохождения: номер, название, набор слов, весь текст экрана.
const TOPICS = [];
for (const name of ['BASE', 'PRESENTE', 'PASSADO', 'EXPANSAO']) {
  const m = html.match(new RegExp('var ' + name + '_TOPICS\\s*=\\s*\\[([^\\]]*)\\]'));
  if (m) for (const x of m[1].matchAll(/"([^"]+)"/g)) TOPICS.push({ id: x[1] });
}
for (const t of TOPICS) {
  const at = html.search(new RegExp('<div class="screen topic-screen"[^>]*data-topic="' + t.id + '"'));
  if (at < 0) throw new Error('нет экрана темы ' + t.id);
  const next = html.indexOf('<div class="screen', at + 10);
  const chunk = html.slice(at, next < 0 ? html.length : next).replace(/<!--[\s\S]*?-->/g, ' ');
  const h = chunk.match(/<h2><span class="topic-num">([^<]+)<\/span>\s*([^<]+)<\/h2>/);
  t.num = h ? h[1].trim() : '';
  t.title = h ? h[2].trim() : t.id;
  t.wordset = [];
  for (const r of chunk.matchAll(/<span class="w[^"]*">([^<]*)<\/span>[\s\S]*?<span class="t"[^>]*>([^<]*(?:<(?!\/span)[^<]*)*)<\/span>/g)) {
    const pt = r[1].trim().toLowerCase();
    if (!pt) continue;
    const ru = plain(r[2]);
    t.wordset.push({ pt, ru });
    putRu(pt, ru);
  }
  const set = new Set();
  for (const x of t.wordset) { set.add(x.pt); for (const p of x.pt.split(/\s+/)) if (p.length > 1) set.add(p); }
  for (const w of words(chunk.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' '))) set.add(w);
  t.resolve = makeResolve(set, STRIP);
}
for (const p of SITUACOES) for (const x of p.words) putRu(x.w.toLowerCase(), x.ru);

// Словарь курса для проверки слов плана: тот же, что у check.js (VOCAB +
// наборы), плюс слова пакетов — их приложение досыпает так же.
const COURSE = new Set(VOCAB);
for (const p of SITUACOES) for (const x of p.words) {
  const k = x.w.toLowerCase();
  COURSE.add(k);
  for (const part of k.split(/\s+/)) if (part.length > 1) COURSE.add(part);
}
const courseResolve = makeResolve(COURSE, STRIP);

// «Резолвится» не значит «верно»: цепочка STRIP уводит verão в ver
// («видеть» вместо «лета»), diga — в digo. Поэтому форма, дошедшая до
// статьи цепочкой, берётся в план, только если подтверждена: это
// множественное число статьи по правилу или форма глагола из движка
// спряжения — в тех временах, что уже пройдены (будущего в курсе нет,
// а verão — как раз его форма).
const ENGINE = (() => {
  const start = html.indexOf('var PERSONS = [');
  const end   = html.indexOf('/* ================= ПРОГРЕСС', start);
  if (start < 0 || end < 0) throw new Error('не нашёл движок спряжения в index.html');
  return new Function(html.slice(start, end) + '\nreturn { conjugate: conjugate };')();
})();
const PASSED_TENSES = ['presente', 'preterito', 'imperfeito'];
function confirmed(w, base) {
  if (w === base) return true;
  // Статья-форма глагола («faz — делает (от fazer)») числа и рода не имеет:
  // fazes — это не «много faz».
  if (!/\(от /.test(RU.get(base) || '')) {
    const fem = base.replace(/o$/, 'a');
    const forms = [base, fem].flatMap((b) => [b, b + 's', b + 'es', b.replace(/l$/, 'is'), b.replace(/m$/, 'ns'),
      b.replace(/ão$/, 'ões'), b.replace(/ão$/, 'ães')]);
    if (forms.includes(w)) return true;
  }
  if (!/(ar|er|ir|ôr)$/.test(base)) return false;
  return PASSED_TENSES.some((t) => {
    const c = ENGINE.conjugate(base, t);
    return c && !c.error && (c.forms || []).some((f) => String(f).toLowerCase() === w);
  });
}

// Готовые куски со своим переводом: фразы Frases и сочетания пакетов.
// check.js не сверяет их по словам — они вне словарного правила, как и сами
// сцены, — поэтому и здесь кусок проверяется переводом, а не словами.
const key = (s) => words(s).join(' ');
const PHRASES = new Map();
for (const r of html.matchAll(/<div class="fr-pt">([^<]+)<\/div>[\s\S]*?<div class="fr-ru"[^>]*>([^<]+)<\/div>/g)) {
  const k = key(r[1]);
  if (!PHRASES.has(k)) PHRASES.set(k, { pt: r[1].trim(), ru: plain(r[2]), src: 'frases' });
}
for (const p of SITUACOES) for (const x of p.chunks || []) {
  const k = key(x.pt);
  if (!PHRASES.has(k)) PHRASES.set(k, { pt: x.pt, ru: x.ru, src: 'pack:' + p.id });
}
// Многословные статьи словаря: их слова обязаны переводиться. Артикль
// перед одним словом («o polvo») сочетанием не считается.
const DICT_CHUNKS = [...RU.keys()].filter((k) => words(stripArt(k)).length > 1).map(key);

/* ============ то, что сверить не с чем ============ */

// Служебные слова не становятся целевыми.
const STOP = new Set(('o a os as um uma uns umas de do da dos das em no na nos nas num numa à ao aos às ' +
  'por pelo pela para com sem e ou mas que se eu tu ele ela nós vocês eles elas me te lhe ' +
  'é são sim não já só isso este esta').split(' '));

// Грамматический фокус — одна строка на сцену и тема курса, где он объяснён.
const FOCUS = {
  cafe:        { topic: 'numeros',        line: 'Сумма через são и числа: «São dois euros e quarenta»; заказ — что + se faz favor, без quero.' },
  caixa:       { topic: 'estarainf',      line: 'estar a + инфинитив: «Estou só a ver» — «я просто смотрю» прямо сейчас, а не «vejo».' },
  rua:         { topic: 'servsestar',     line: 'Где находится то, что не двигается, — через ser: «Onde é a estação?», «É longe?», а не está.' },
  transporte:  { topic: 'reflexivos',     line: 'Местоимение после глагола через дефис: «Pode avisar-me?», а не бразильское «Pode me avisar?».' },
  conhecer:    { topic: 'ter',            line: 'Сколько длится до сих пор — há + срок: «Vivo em Lisboa há um ano», а не «por um ano».' },
  farmacia:    { topic: 'ter',            line: 'Боль и аллергия через ter: «Tenho dores de cabeça», «Não tenho»; давность — «Há dois dias».' },
  restaurante: { topic: 'interrogativas', line: 'Спросить, что это: «O que é…?»; сколько вас — через ser: «Somos dois».' },
  talho:       { topic: 'imperfeito',     line: 'Queria — имперфект вежливости: «Queria meio quilo…» мягче, чем «Quero».' },
  tasca:       { topic: 'imperfeito',     line: 'Оценка того, что было, — имперфект estar: «Estava tudo bem?» — «Estava ótimo».' },
};

/* ============ один план ============ */

const order = (id) => TOPICS.findIndex((t) => t.id === id);
const sceneLines = (sc) => sc.steps.flatMap((s) => [{ pt: s.npc.pt, who: 'npc' }, { pt: s.answer, who: 'me' }]);

// Сквозные слова — те, что звучат в трёх сценах и больше (faz, favor,
// obrigado, boa tarde). Их ученик знает к любой сцене, целевыми они
// становятся, только если без них не набирается десяти.
const sceneCount = new Map();
for (const sc of DIALOGS) for (const w of new Set(sceneLines(sc).flatMap((l) => words(l.pt)))) sceneCount.set(w, (sceneCount.get(w) || 0) + 1);
const staple = (k) => words(k).every((w) => STOP.has(w) || (sceneCount.get(w) || 0) >= 3);

// Первая тема курса, где слово встречается. Слово считается словом курса,
// только если его переводит словарь курса: в пояснениях тем (.why-note,
// .trap) лексика свободная, и встретиться там — не значит быть пройденным.
// Дальше — пакеты Situações, сначала пакет самой сцены.
function firstSource(w, packs) {
  if (courseResolve(w) !== null) {
    for (const t of TOPICS) if (t.resolve(w) !== null) return t.id;
  }
  for (const p of packs) {
    const set = new Set();
    for (const x of p.words) { const k = x.w.toLowerCase(); set.add(k); for (const q of k.split(/\s+/)) set.add(q); }
    if (makeResolve(set, STRIP)(w) !== null) return 'pack:' + p.id;
  }
  return null;
}

// Имена собственные: заглавная буква не в начале предложения.
function names(line) {
  const out = new Set();
  for (const m of line.matchAll(/[^.!?]\s([A-ZÀ-Ý][a-zà-ÿ]+)/g)) out.add(m[1].toLowerCase());
  return out;
}

const has = (line, k) => (' ' + key(line) + ' ').includes(' ' + k + ' ');
const inside = (k, set) => [...set].some((c) => (' ' + c + ' ').includes(' ' + k + ' '));

function buildPlan(sc) {
  const where = 'сцена ' + sc.id;
  const pack = SITUACOES.find((p) => p.dialog === sc.id) || null;
  const packs = [...(pack ? [pack] : []), ...SITUACOES.filter((p) => p !== pack)];
  const lines = sceneLines(sc);
  const proper = new Set();
  for (const l of lines) for (const n of names(l.pt)) proper.add(n);

  // Готовые куски, которые звучат в репликах сцены: длинные раньше коротких,
  // чтобы «pode repetir se faz favor» не распался на куски поменьше.
  const chunkKeys = [...new Set([...PHRASES.keys(), ...DICT_CHUNKS])].sort((a, b) => words(b).length - words(a).length);
  const chunks = [];
  const chunkSet = new Set();
  for (const who of ['me', 'npc']) for (const l of lines.filter((x) => x.who === who)) for (const k of chunkKeys) {
    if (!has(l.pt, k) || chunkSet.has(k) || inside(k, chunkSet)) continue;
    // Однословный кусок — только если это целая реплика («Igualmente!»).
    if (words(k).length === 1 && key(l.pt) !== k) continue;
    chunkSet.add(k);
    const ph = PHRASES.get(k);
    chunks.push({ k, from: who, ph, ru: ph ? ph.ru : RU.get(k) || RU.get(DICT_CHUNKS.includes(k) ? [...RU.keys()].find((x) => key(x) === k) : k) || null });
  }

  // Темы, на которые опирается сцена; слова вне курса.
  const bySource = new Map();
  const outside = new Set();
  const usedPacks = new Set(pack ? [pack.id] : []);
  for (const l of lines) for (const w of words(l.pt)) {
    if (proper.has(w)) continue;
    const src = firstSource(w, packs);
    if (!src) {
      // Слово готового куска переводится вместе с куском.
      if (![...chunkSet].some((c) => PHRASES.has(c) && words(c).includes(w))) outside.add(w);
      continue;
    }
    if (src.startsWith('pack:')) usedPacks.add(src.slice(5));
    if (!bySource.has(src)) bySource.set(src, new Set());
    bySource.get(src).add(w);
  }
  // Тема грамматического фокуса — тоже опора, даже если цепочки STRIP
  // уводят её слова в тему пораньше (estava → estar, queria → querer).
  const focus = FOCUS[sc.id];
  if (!focus) bad(`${where}: нет грамматического фокуса в FOCUS`);
  else if (order(focus.topic) < 0) bad(`${where}: темы фокуса «${focus.topic}» нет в курсе`);
  else if (!bySource.has(focus.topic)) bySource.set(focus.topic, new Set());
  const topicIds = [...bySource.keys()].filter((k) => order(k) >= 0).sort((a, b) => order(a) - order(b));
  const gate = TOPICS[Math.max(...topicIds.map(order))];
  const topics = topicIds.map((id) => {
    const t = TOPICS[order(id)];
    const o = { id, num: t.num, title: t.title, words: [...bySource.get(id)] };
    if (focus && id === focus.topic) o.focus = true;
    return o;
  });

  // Разрешённый словарь: наборы тем до ворот, пакет сцены целиком, слова
  // других пакетов, которые сцена уже использует, и куски самой сцены.
  const allowed = [];
  const seenAllowed = new Set();
  const addAllowed = (pt) => { const k = pt.toLowerCase(); if (!seenAllowed.has(k)) { seenAllowed.add(k); allowed.push(pt); } };
  for (const t of TOPICS.slice(0, order(gate.id) + 1)) for (const x of t.wordset) addAllowed(x.pt);
  if (pack) {
    for (const x of pack.words) addAllowed(x.w.toLowerCase());
    for (const x of pack.chunks || []) addAllowed(x.pt.replace(/[.!?]+$/, ''));
  }
  for (const [src, ws] of bySource) if (src.startsWith('pack:') && src !== 'pack:' + (pack && pack.id)) for (const w of ws) addAllowed(w);
  for (const c of chunks) if (c.ph) addAllowed(c.ph.pt.replace(/[.!?]+$/, ''));

  // Целевые слова и сочетания.
  const rank = (src) => (src === null ? 99 : src === 'frases' ? 97 : src.startsWith('pack:') ? 98 : order(src));
  const cands = [];
  for (const c of chunks) {
    const src = c.ph ? c.ph.src : words(c.k).map((w) => firstSource(w, packs)).sort((a, b) => rank(b) - rank(a))[0];
    cands.push({ pt: c.ph ? c.ph.pt : c.k, kind: 'chunk', from: c.from, src, ru: c.ru });
  }
  const covered = new Set(chunkSet);
  const unsure = [];
  for (const who of ['me', 'npc']) for (const l of lines.filter((x) => x.who === who)) for (const w of words(l.pt)) {
    if (STOP.has(w) || proper.has(w) || outside.has(w) || w.length < 3 || covered.has(w) || inside(w, covered)) continue;
    // Слово, известное только по готовому куску, отдельно не берётся.
    const base = courseResolve(w);
    if (base === null) continue;
    if (!confirmed(w, base)) { if (!unsure.includes(w + ' → ' + base)) unsure.push(w + ' → ' + base); continue; }
    covered.add(w);
    cands.push({ pt: w, kind: 'word', from: who, src: firstSource(w, packs), ru: RU.get(base) || null, base: base !== w ? base : undefined });
  }
  // Порядок: несквозное раньше сквозного, сочетания раньше слов, новое
  // раньше старого, реплики ученика раньше реплик собеседника.
  cands.sort((a, b) => (staple(a.pt) - staple(b.pt))
    || (a.kind === b.kind ? 0 : a.kind === 'chunk' ? -1 : 1)
    || rank(b.src) - rank(a.src)
    || (a.from === b.from ? 0 : a.from === 'me' ? -1 : 1));
  const target = cands.slice(0, 15).map((c) => {
    const o = { pt: c.pt, ru: c.ru, kind: c.kind, from: c.from === 'me' ? 'ученик' : 'собеседник' };
    if (c.base) o.base = c.base;
    o.source = c.src;
    return o;
  });
  if (target.length < 10) bad(`${where}: целевых слов ${target.length}, нужно 10–15`);

  // Проверка по словарю курса — как проверка 3 в check.js: каждое слово
  // доходит до статьи, и у каждого есть перевод. Готовый кусок (Frases,
  // сочетание пакета) проверяется своим переводом.
  for (const t of target) {
    if (!PHRASES.has(key(t.pt))) for (const w of words(t.pt)) if (courseResolve(w) === null) bad(`${where}: «${w}» из «${t.pt}» не переводится словарём курса`);
    if (!t.ru) bad(`${where}: у «${t.pt}» нет перевода`);
  }
  for (const a of allowed) {
    if (PHRASES.has(key(a))) continue;
    for (const w of words(a)) if (courseResolve(w) === null) bad(`${where}: «${w}» из разрешённого словаря не переводится`);
  }

  // Вопросы собеседника; «или–или» — ещё и из сочетаний пакета сцены.
  const either = (s) => /\sou\s/i.test(s);
  const questions = sc.steps.filter((s) => s.npc.pt.includes('?')).map((s) => ({
    pt: s.npc.pt, ru: s.npc.ru, either: either(s.npc.pt), answer: s.answer,
  }));
  if (pack) for (const x of pack.chunks || []) {
    if (x.pt.includes('?') && either(x.pt) && !questions.some((q) => has(q.pt, key(x.pt)))) {
      questions.push({ pt: x.pt, ru: x.ru, either: true, answer: null });
    }
  }

  // Разминка: слова → вопрос «или–или» → реплики с ловушками; всего четыре.
  const warmup = [];
  const tw = target.filter((t, i, a) => t.kind === 'word' && t.ru && a.findIndex((x) => (x.base || x.pt) === (t.base || t.pt)) === i).slice(0, 5);
  if (tw.length >= 3) warmup.push({
    type: 'palavras',
    task: 'Скажи по-португальски: ' + tw.map((t) => '«' + t.ru.split(/[;,(]/)[0].trim() + '»').join(', ') + '.',
    expect: tw.map((t) => t.base || t.pt),
  });
  const eitherStep = sc.steps.find((s) => s.npc.pt.includes('?') && either(s.npc.pt));
  if (eitherStep) {
    const w = { type: 'ou-ou', task: 'Ответь на «' + eitherStep.npc.pt + '». Ситуация: ' + eitherStep.goal, expect: [eitherStep.answer] };
    if (eitherStep.wrong && eitherStep.wrong[0]) w.trap = { t: eitherStep.wrong[0].t, why: eitherStep.wrong[0].why };
    warmup.push(w);
  }
  const coverage = (s) => target.filter((t) => has(s.answer, key(t.pt))).length;
  const rest = sc.steps.map((s, i) => ({ s, i, c: coverage(s) }))
    .filter(({ s }) => s !== eitherStep && s.wrong && s.wrong.length)
    .sort((a, b) => b.c - a.c || a.i - b.i)
    .slice(0, 4 - warmup.length)
    .sort((a, b) => a.i - b.i);
  for (const { s } of rest) warmup.push({
    type: 'dizer',
    task: 'Скажи по-португальски: «' + s.answerRu + '»',
    expect: [s.answer],
    trap: { t: s.wrong[0].t, why: s.wrong[0].why },
  });
  if (warmup.length < 3 || warmup.length > 5) bad(`${where}: заданий разминки ${warmup.length}, нужно 3–5`);

  const ft = focus && TOPICS[order(focus.topic)];

  return {
    id: sc.id,
    title: sc.title,
    sub: sc.sub,
    pack: pack ? pack.id : null,
    topics,
    gate: { id: gate.id, num: gate.num, title: gate.title },
    grammar: focus ? { topic: focus.topic, num: ft.num, line: focus.line } : null,
    target,
    outside: [...outside],
    questions,
    warmup,
    scene: sc.steps.map((s) => ({ npc: s.npc.pt, npcRu: s.npc.ru, goal: s.goal, answer: s.answer, answerRu: s.answerRu })),
    allowed,
    _unsure: unsure,
  };
}

/* ============ ============ */

console.log('Планы уроков Aulas из index.html');
const plans = DIALOGS.map(buildPlan);
if (new Set(plans.map((p) => p.id)).size !== DIALOGS.length) bad('id сцен повторяются');

if (failed) {
  console.log(`\nИТОГ: ${failed} проблем — plans.json не записан.`);
  process.exit(1);
}

// Неподтверждённые цепочки — в отчёт, а не в файл: учителю они не нужны,
// а человеку, который правит словарь, — да.
const unsure = plans.map((p) => { const u = p._unsure; delete p._unsure; return [p.id, u]; });

const out = {
  about: 'Планы уроков Aulas: по одному на сцену DIALOGS. Собирается tools/build-aulas.js из index.html — руками не править.',
  plans,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');

for (const p of plans) {
  console.log(`  ok   ${p.id.padEnd(12)} ворота ${p.gate.num.padEnd(4)} ${p.gate.id.padEnd(15)} тем ${String(p.topics.length).padStart(2)} · целевых ${p.target.length} · разрешённых ${p.allowed.length} · вопросов ${p.questions.length} (или–или ${p.questions.filter((q) => q.either).length}) · разминка ${p.warmup.length}` +
    (p.outside.length ? `\n       вне курса: ${p.outside.join(', ')}` : ''));
}
const skipped = unsure.filter(([, u]) => u.length);
if (skipped.length) {
  console.log('\n  Цепочка STRIP дошла до статьи, но форма не подтверждена — в целевые не взяты:');
  for (const [id, u] of skipped) console.log(`       ${id}: ${u.join(', ')}`);
}
console.log(`\nИТОГ: ${plans.length} планов → ${path.relative(ROOT, OUT)} (${Math.round(fs.statSync(OUT).size / 1024)} КБ)`);
