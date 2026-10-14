// Карточка ссылки (og:image, 1200×630) — снимок самого приложения, а не
// отдельная картинка: справа настоящий текст темы 0.5 и настоящая подсказка
// перевода по нажатию. Переснимать, когда меняется текст темы или вид.
//
// Запуск — через Playwright MCP, browser_run_code_unsafe с filename этого
// файла, при запущенном сервере (npx -y http-server -p 5601 -c-1; если порт
// занят, поправить BASE). MCP пишет снимки только в .playwright-mcp/, оттуда
// скопировать в assets/og-card.png.
async (page) => {
  const BASE = 'http://localhost:5602/';
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.goto(BASE + '?lang=en');
  await page.waitForTimeout(800);

  // Слова текста оборачивает в .tap-word само открытие темы — открыть её, как ученик.
  await page.evaluate(() => {
    document.querySelector('.topic-row[data-open="genero"]').click();
    [...document.querySelectorAll('#screen-genero button')].find((b) => b.textContent.trim().startsWith('Textos')).click();
  });
  await page.waitForTimeout(400);

  await page.evaluate(() => {
    document.body.classList.remove('dark');
    const story = document.querySelector('#screen-genero .storytext');
    const og = document.createElement('div');
    og.id = 'og';
    og.innerHTML = `
      <div class="og-left">
        <div class="og-kicker">PORTUGUÊS EUROPEU · PT-PT</div>
        <div class="og-title">Português do zero</div>
        <div class="og-lead">European Portuguese from scratch: reading rules, grammar topics, dialogues and a conjugator for any verb.</div>
        <div class="og-facts"><span>Free</span><span>No signup</span><span>Works offline</span></div>
      </div>
      <div class="og-right">
        <div class="og-tab">0.5 Género · texto</div>
        <div class="og-win"></div>
        <div class="og-note">Tap any word for its translation. Every word in a text comes from topics you have already done.</div>
      </div>`;
    document.body.appendChild(og);
    og.querySelector('.og-win').appendChild(story.cloneNode(true));   // слова уже обёрнуты wrapTapWords
  });

  await page.addStyleTag({ content: `
    body > *:not(#og){visibility:hidden}
    #og{position:fixed; inset:0; z-index:50; display:flex; gap:52px; align-items:center; padding:0 64px;
        background:var(--bg); background-image:radial-gradient(#cfdad5 1px, transparent 1px); background-size:22px 22px;
        font-family:var(--font-pt); color:var(--ink); visibility:visible}
    .og-left{flex:0 0 500px}
    .og-kicker{font-size:15px; letter-spacing:.12em; font-weight:700; color:var(--base)}
    .og-title{font-size:60px; font-weight:800; line-height:1.05; margin:14px 0 18px; letter-spacing:-.01em; white-space:nowrap}
    .og-lead{font-size:22px; line-height:1.45; color:var(--muted)}
    .og-facts{display:flex; gap:10px; margin-top:26px}
    .og-facts span{background:var(--base-tint); color:var(--base-deep); font-weight:700; font-size:17px; padding:8px 14px; border-radius:999px}
    .og-right{flex:1; min-width:0}
    .og-tab{display:inline-block; font-size:14px; font-weight:700; color:var(--muted); background:var(--card); border:1px solid #d5dfda; border-bottom:none; border-radius:8px 8px 0 0; padding:7px 14px; margin-bottom:-1px}
    .og-win{background:var(--card); border:1px solid #d5dfda; border-radius:0 14px 14px 14px; padding:40px 28px 26px; box-shadow:0 10px 30px rgba(20,40,30,.08)}
    .og-win .storytext{font-size:21px; line-height:1.75; margin:0}
    .og-note{font-size:15px; color:var(--muted); margin-top:14px; line-height:1.45}
    .tap-popup{visibility:visible !important; z-index:60; font-size:19px !important; padding:8px 14px !important}
  ` });
  await page.waitForTimeout(300);

  // Настоящая подсказка: тот же обработчик клика, что у ученика.
  await page.locator('#og .og-win .tap-word', { hasText: /^jardim$/ }).first().click();
  await page.waitForTimeout(300);
  const tip = await page.evaluate(() => (document.querySelector('.tap-popup') || {}).textContent);
  if (!tip) throw new Error('подсказка перевода не открылась');

  await page.screenshot({ path: '.playwright-mcp/og-card.png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
  return 'og-card.png · подсказка «' + tip + '»';
}
