# Озвучка курса через Gemini TTS (пилот Z6, 26.11.2026)

Образец задания — `gemini-prompt.md` (голоса, темп, формат, таблицы id → реплика).
Скрипты (`tts_all.mjs`, `tts_pilot.mjs`, `check_voices.mjs`) читают ключ из
`.env` в **текущей папке** (`GEMINI_API_KEY=…`), в коде ключа нет. `.env` в git
не попадает (`.gitignore`).

Как сделать партию:

1. Рабочая папка вне репозитория или `audio/` (она в `.gitignore`): положить
   туда `.env` и свой `gemini-prompt.md` с таблицами `id | реплика`.
2. Запустить из этой папки `node <путь к репозиторию>/tools/tts-gemini/tts_all.mjs` (нужен `ffmpeg`).
   Уже готовые `id.mp3` пропускаются; переозвучка — по списку id в аргументах.
3. Готовые `<id>.mp3` положить в `assets/audio/` и расставить `data-audio` /
   `audio` в `index.html` — см. `ROADMAP.md`, раздел 8, «Z6». `node tools/check.js`
   сверит ссылки и файлы.
