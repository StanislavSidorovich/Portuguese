'use strict';

/*
 * Общая часть двух проверок словаря.
 *
 * `check.js` разбирает готовый `index.html`, `prevocab.js` — черновик темы
 * ещё до вставки. Список лексики и цепочки замен у них обязаны быть
 * одинаковыми: разойдутся — и предсверка начнёт тихо врать, то есть станет
 * хуже, чем её отсутствие. Поэтому логика живёт здесь, а не копией в каждом
 * скрипте.
 *
 * Данных этот модуль тоже не хранит: и словарь, и цепочки он вытаскивает
 * из самого `index.html`.
 */

// Словарь VOCAB + наборы «Palavras N», которые досыпает seedVocabFromWordsets.
function buildVocab(html) {
  const start = html.indexOf('var VOCAB = {');
  const end   = html.indexOf('\n  };', start);
  if (start < 0 || end < 0) throw new Error('не нашёл объект VOCAB в index.html');
  const vocab = new Set();
  for (const m of html.slice(start, end).matchAll(/"([^"]+)"\s*:\s*"/g)) vocab.add(m[1]);
  addWordsets(vocab, html);
  return vocab;
}

// Наборы «Palavras N» из произвольного куска разметки — у черновика темы
// они свои, и их надо досыпать к словарю до проверки: слово, которое тема
// сама же и вводит, ошибкой не является.
function addWordsets(vocab, src) {
  // .w может нести дополнительный класс — приложение берёт элемент через
  // querySelector(".w"), значит и мы должны.
  for (const m of src.matchAll(/<span class="w[^"]*">([^<]*)<\/span>/g)) {
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
function buildStrip(html) {
  const m = html.match(/var STRIP = \[([\s\S]*?)\n  \];/);
  if (!m) throw new Error('не нашёл массив STRIP в index.html');
  return [...m[1].matchAll(/\["([^"]*)"\s*,\s*"([^"]*)"\]/g)].map((x) => [x[1], x[2]]);
}

// Повторяет lookupWord из приложения: поиск в ширину по цепочкам замен,
// глубина два.
//
// ВАЖНО: отвечает только на вопрос «дошло ли слово до какой-нибудь статьи»,
// но не «до верной ли». Короткое служебное слово легко уезжает не туда:
// «te» по цепочке [e → er] попадает в «ter» и переводится «иметь». Такие
// слова надо заводить в VOCAB своей статьёй — она перебивает цепочку,
// потому что lookupWord сначала смотрит VOCAB[w].
function makeLookup(vocab, strip) {
  const stripOnce = (w) => {
    const out = [];
    for (const [from, to] of strip) {
      if (w.length > from.length && w.slice(-from.length) === from) {
        out.push(w.slice(0, -from.length) + to);
      }
    }
    return out;
  };

  return function lookup(raw) {
    const w = raw.toLowerCase();
    if (vocab.has(w)) return true;
    let frontier = [w];
    const seen = new Set();
    for (let depth = 0; depth < 2; depth++) {
      const next = [];
      for (const word of frontier) {
        for (const cand of stripOnce(word)) {
          if (seen.has(cand)) continue;
          seen.add(cand);
          if (vocab.has(cand)) return true;
          next.push(cand);
        }
      }
      if (!next.length) break;
      frontier = next;
    }
    return false;
  };
}

// Места, где ученик тапает по словам: тексты и реплики диалогов. Пояснения
// в `.why-note`, `.trap` и `.rule-list` сюда не входят — приложение их не
// оборачивает (см. wrapTapWords), и лексика там свободная.
function readableZones(src) {
  return [
    ...src.matchAll(/<p class="storytext">([\s\S]*?)<\/p>/g),
    ...src.matchAll(/<p class="dline">([\s\S]*?)<\/p>/g),
  ].map((z) => z[1]
    .replace(/<span class="speaker">[\s\S]*?<\/span>/g, '')
    .replace(/<[^>]+>/g, ' '));
}

// Латиница с португальскими диакритиками — та же, что PT_WORD_RE в приложении.
const PT_WORD = /[A-Za-zÀ-ÖØ-öø-ÿ]+/g;

module.exports = { buildVocab, addWordsets, buildStrip, makeLookup, readableZones, PT_WORD };
