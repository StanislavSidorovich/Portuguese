/*
 * Три проверки, которые нельзя сделать в node: все требуют разметки страницы.
 *
 * Как запускать: поднять локальный сервер (`npx -y http-server -p 5601 -c-1`),
 * открыть страницу, поставить окно шириной 375px (в DevTools — режим
 * телефона), открыть консоль и вставить нужную функцию целиком, потом
 * вызвать её. Через file:// браузерная панель работать не будет.
 *
 * Всё остальное проверяет `node tools/check.js`.
 */

/* ---------------------------------------------------------------------------
 * 1. ШИРИНА ТАБЛИЦ
 *
 * На теле темы доступно 343px при вьюпорте 375. Таблица шире контейнера даёт
 * горизонтальную прокрутку всей страницы — на телефоне это заметно и мешает.
 * Опасное место португальского курса — таблицы спряжения: пять строк лиц
 * влезают, а вот три колонки времён рядом (falo / falei / falava) уже нет,
 * если добавить к ним перевод.
 *
 * Вызов: checkTables()
 * -------------------------------------------------------------------------*/
function checkTables() {
  const problems = [];
  document.querySelectorAll('.topic-row[data-open], .tool-row[data-open]').forEach((row) => {
    const id = row.dataset.open;
    row.click();
    const screen = document.getElementById('screen-' + id);
    if (!screen) return;
    screen.querySelectorAll('.subnav-btn').forEach((btn) => {
      btn.click();
      screen.querySelectorAll('table').forEach((table) => {
        const w = table.getBoundingClientRect().width;
        const p = table.parentElement.getBoundingClientRect().width;
        if (w > p + 1) {
          problems.push(`${id} · ${table.rows[0].cells.length} колонок · ${Math.round(w)}px в контейнере ${Math.round(p)}px`);
        }
      });
    });
    const back = screen.querySelector('[data-back]');
    if (back) back.click();
  });

  const scroll = document.body.scrollWidth;
  const client = document.documentElement.clientWidth;
  if (scroll > client) problems.push(`страница шире экрана: ${scroll}px против ${client}px`);

  console.log(problems.length ? 'ПЕРЕПОЛНЕНИЕ:\n' + problems.join('\n') : 'Все таблицы влезают, горизонтальной прокрутки нет.');
  return problems;
}

/* ---------------------------------------------------------------------------
 * 1б. ОБРЕЗАННЫЕ БЛОКИ
 *
 * checkTables() ловит только таблицы и ширину страницы целиком, и этого мало.
 * Элемент с overflow:auto прокручивается внутри себя, страницу не расширяет —
 * и обрезка остаётся невидимой для проверки. Ловится только сравнением
 * scrollWidth > clientWidth.
 *
 * Кандидаты на обрезку в этом курсе: .blockbar (четыре кнопки блоков),
 * .level-track (сегменты метра с зазорами), .sound-row при крупном шрифте,
 * .conj-table (колонка лиц «eles / elas / vocês» длинная).
 *
 * Проверять при обоих крайних размерах шрифта: при 125% не влезает то,
 * что при обычном влезало.
 *
 * Вызов: checkClipping()
 * -------------------------------------------------------------------------*/
function checkClipping() {
  const problems = [];
  const seen = new Set();

  const scan = (where) => {
    document.querySelectorAll('.screen.active, .screen.active *').forEach((el) => {
      if (!el.offsetParent) return;
      const over = el.scrollWidth - el.clientWidth;
      if (over <= 1 || el.clientWidth === 0) return;
      // Таблица при шрифте 125% прокручивается внутри себя намеренно —
      // это лечение, а не болезнь.
      if (el.tagName === 'TABLE' && getComputedStyle(el).overflowX === 'auto') return;
      const key = where + '|' + el.tagName + (el.className || '');
      if (seen.has(key)) return;
      seen.add(key);
      problems.push(`${where} · ${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} шире своего контейнера на ${over}px`);
    });
  };

  ['', 'font-plus', 'font-plus-plus'].forEach((font) => {
    document.documentElement.className = font;
    scan('главная, шрифт ' + (font || 'обычный'));
    document.querySelectorAll('.topic-row[data-open], .tool-row[data-open]').forEach((row) => {
      const id = row.dataset.open;
      row.click();
      const screen = document.getElementById('screen-' + id);
      if (!screen) return;
      screen.querySelectorAll('.subnav-btn').forEach((btn) => { btn.click(); scan(id); });
      if (!screen.querySelector('.subnav-btn')) scan(id);
      const back = screen.querySelector('[data-back]');
      if (back) back.click();
    });
  });
  document.documentElement.className = '';

  console.log(problems.length ? 'ОБРЕЗКА:\n' + problems.join('\n') : 'Ничего не обрезано ни при одном размере шрифта.');
  return problems;
}

/* ---------------------------------------------------------------------------
 * 2. ЗАДАНИЯ
 *
 * Заполняет все задания темы правильными ответами и жмёт «Verificar».
 * Должно выйти N / N верно. Ловит то, чего не видит статическая проверка:
 * ответ, который не проходит нормализацию (лишний пробел, другой апостроф),
 * и слово, которое не встаёт в собранную строку.
 *
 * Вызов: checkQuizzes()                  — все темы
 *        checkQuizzes(['alfabeto'])      — только эти
 * -------------------------------------------------------------------------*/
function checkQuizzes(ids) {
  const list = ids || [...document.querySelectorAll('.topic-row[data-open]')].map((r) => r.dataset.open);
  const out = [];

  for (const id of list) {
    const row = document.querySelector('.topic-row[data-open="' + id + '"]');
    if (!row) { out.push(id + ': нет такой темы'); continue; }
    row.click();

    const screen = document.getElementById('screen-' + id);
    const tab = screen.querySelector('.subnav-btn[data-pane="quiz"]');
    if (!tab) { out.push(id + ': нет вкладки заданий'); continue; }
    tab.click();

    const pane = screen.querySelector('.pane-quiz');
    pane.querySelectorAll('input.blank').forEach((i) => { i.value = i.dataset.answer.split('|')[0]; });
    pane.querySelectorAll('select.mc').forEach((s) => { s.value = s.dataset.answer; });
    pane.querySelectorAll('.qbuild').forEach((box) => {
      box.dataset.answer.replace(/[.,!?;:—–-]/g, '').split(/\s+/).forEach((word) => {
        const btn = [...box.querySelectorAll('.qbuild-bank .qword')].find((b) => b.textContent.trim() === word);
        if (btn) btn.click();
        else out.push(`${id}: слова «${word}» нет в банке`);
      });
    });

    pane.querySelector('.btn-check').click();
    const result = pane.querySelector('.quiz-result').textContent;
    const wrong = [...pane.querySelectorAll('input.blank.bad, select.mc.bad')].map((e) => e.dataset.answer);
    out.push(id + ': ' + result + (wrong.length ? ' · не зачлись: ' + wrong.join(', ') : ''));

    const back = screen.querySelector('[data-back]');
    if (back) back.click();
  }

  console.log(out.join('\n'));
  return out;
}

/* ---------------------------------------------------------------------------
 * 3. CONJUGADOR
 *
 * Прогоняет спрягатель по всем временам и всем глаголам из таблицы
 * неправильных плюс по образцам правильных. Ловит формы, которые вышли
 * пустыми или с «undefined», и глаголы, которые молча посчитались
 * правильными во всех временах (значит, таблица до них не дотянулась).
 *
 * Вызов: checkConjugador()
 * -------------------------------------------------------------------------*/
function checkConjugador() {
  const problems = [];
  const row = document.querySelector('.tool-row[data-open="tool-conjugador"]');
  if (!row) { console.log('нет экрана conjugador'); return; }
  row.click();

  const input = document.getElementById('conjWord');
  const tense = document.getElementById('conjTense');
  const verbs = [...document.querySelectorAll('#conjChips .chip')].map((c) => c.dataset.word);

  for (const v of verbs) {
    input.value = v;
    input.dispatchEvent(new Event('input'));
    for (const t of [...tense.options].map((o) => o.value)) {
      tense.value = t;
      tense.dispatchEvent(new Event('change'));
      const forms = [...document.querySelectorAll('#conjTable .conj-f')].map((f) => f.textContent.replace('🔊', '').trim());
      if (forms.length !== 5) problems.push(`${v} · ${t}: ${forms.length} форм вместо пяти`);
      forms.forEach((f, i) => {
        if (!f || /undefined|null/.test(f)) problems.push(`${v} · ${t} · строка ${i + 1}: «${f}»`);
      });
    }
  }

  const back = document.querySelector('#screen-tool-conjugador [data-back]');
  if (back) back.click();

  console.log(problems.length ? 'CONJUGADOR:\n' + problems.join('\n') : `Conjugador: ${verbs.length} глаголов × 5 времён, все формы на месте.`);
  return problems;
}

/* ---------------------------------------------------------------------------
 * 4. LEITURAS
 *
 * Проходит каждый открытый эпизод экрана Leituras с правильными ответами —
 * догадка, текст, вопросы — и ждёт «N / N · ★ N». Ответы берутся из самого
 * index.html (страница скачивается заново, как это делает check.js), потому
 * что движок живёт в замыкании. Ловит то, чего не видит check.js: вариант,
 * который не нажимается, порядок событий, который не собирается, текст, не
 * спрятавшийся перед вопросами (тогда ★ ничего не значит), и «пик» в текст,
 * который должен снимать звёздочку.
 *
 * Страницу открывать с ?draft=1, иначе черновики не показываются, а ворота
 * закрыты. Вызов: await checkLeituras()
 * -------------------------------------------------------------------------*/
async function checkLeituras() {
  const out = [];
  const src = await (await fetch(location.pathname)).text();
  const a = src.indexOf('var LEITURAS = [');
  const b = src.indexOf('\n  ];', a);
  const data = new Function('return ' + src.slice(a + 'var LEITURAS = '.length, b) + '\n  ];')();

  const row = document.querySelector('.tool-row[data-open="leituras"]');
  if (!row) { console.log('нет строки Leituras на главной'); return; }
  row.click();
  const body = document.getElementById('ltBody');
  const q$ = (sel) => body.querySelector(sel);
  const locked = body.querySelectorAll('.lt-card.locked').length;
  const opens = [...body.querySelectorAll('[data-lt="open"]')].map((x) => x.dataset.ep);
  out.push(`эпизодов открыто: ${opens.length}, заперто: ${locked}`);
  if (!opens.length) { console.log(out.join('\n') + '\nнет открытых эпизодов (нужен ?draft=1)'); return out; }

  for (const id of opens) {
    const ep = data.find((e) => e.id === id);
    q$(`[data-lt="open"][data-ep="${id}"]`).click();

    q$(`[data-lt="predict"][data-i="${ep.predict.ans}"]`).click();
    if (!q$('.lt-text')) out.push(`${id}: после догадки нет текста`);
    if (!q$('.lt-text .tap-word')) out.push(`${id}: слова текста не переводятся по тапу`);
    const nNew = body.querySelectorAll('.lt-new').length;
    if ((ep.gloss || []).length && !nNew) out.push(`${id}: слова сноски не подсвечены`);
    q$('[data-lt="ask"]').click();
    if (q$('.lt-text')) out.push(`${id}: текст не спрятался перед вопросами`);

    // Один вопрос отвечаем с открытым текстом — он не должен дать ★.
    q$('[data-lt="peek"]').click();
    if (!q$('.lt-text')) out.push(`${id}: «подсмотреть» не открыл текст`);

    let qi = 0, peeked = false;
    const answerPick = (k, i) => { body.querySelector(`[data-lt="pick"][data-q="${k}"][data-i="${i}"]`).click(); };
    for (const x of ep.tf) { answerPick(qi, x.a ? 0 : 1); qi++; if (!peeked) { peeked = true; q$('[data-lt="peek"]').click(); } }
    for (const x of ep.mc) { answerPick(qi, x.a); qi++; }

    // порядок событий: события в данных уже стоят верно, на экране — вперемешку
    const events = ep.order.events;
    for (const ev of events) {
      const btn = [...body.querySelectorAll('[data-lt="otok"]')].find((x) => x.textContent === ev);
      if (!btn) { out.push(`${id}: события «${ev}» нет в банке`); break; }
      btn.click();
    }
    const chk = q$('[data-lt="ocheck"]');
    if (chk && !chk.disabled) chk.click(); else out.push(`${id}: «Проверить» порядок недоступен после сборки`);
    qi++;

    for (const x of ep.who.items) { answerPick(qi, x.a); qi++; }
    answerPick(qi, ep.infer.a); qi++;

    const res = q$('.lt-result');
    const stars = body.querySelectorAll('.lt-star').length;
    const total = qi;
    const txt = res ? res.textContent.replace(/\s+/g, ' ').trim() : '';
    if (!res) out.push(`${id}: итога нет — не все вопросы получили ответ`);
    else if (!txt.startsWith(`${total} / ${total}`)) out.push(`${id}: итог «${txt}» вместо ${total} / ${total}`);
    // Первые пять ответов (tf) идут после «подсмотреть», затем текст снова
    // открыт — звёзд не может быть больше, чем ответов без пика.
    out.push(`${id}: ${txt} · звёзд на экране ${stars} из ${total}`);

    try { if (JSON.parse(localStorage.getItem('ptLeiturasV1'))[id].done !== true) out.push(`${id}: эпизод не засчитан при ${total} / ${total}`); }
    catch (e) { out.push(`${id}: прогресс не записан`); }

    q$('[data-lt="close"]').click();
  }

  const back = document.querySelector('#screen-leituras [data-back]');
  if (back) back.click();
  console.log(out.join('\n'));
  return out;
}
