# Задание для Gemini: партия 3 — диалоги темы блока 0 (голоса по полу говорящего)

Скопируй в Gemini всё, что ниже черты. Реплик: **123** (часть Б — 89, часть В — 34), диалогов: 18. Можно слать **по одному диалогу за сообщение** (каждая таблица ### ниже — отдельный запрос, итого 18), а можно только часть Б. Один файл — одна реплика.

## Часть А. Переозвучка несовпадений пола — не нужна

Все 22 диалоговых файла, которые уже в приложении (`rev08-d-01..10`, `cafe-01..06-npc/-me`), озвучены голосами того же пола, что и говорящий: Empregada → женский, João → мужской, Empregado и клиент кафе → мужские. Пол голосов берётся из API (`/v1beta/voices`), оценка высоты тона по самим mp3 с этим совпадает. Если на слух что-то не так — скажи, какие id, переозвучим по списку.

---

Продолжаем озвучку учебного курса **европейского португальского (Португалия, Лиссабон, pt-PT)**. Бразильский вариант не подходит ни в одной реплике.

## Голоса — один голос на роль, пол обязателен

Роль в таблице = персонаж **с полом**. У двух собеседников в одном диалоге голоса **всегда разные** (даже когда оба — женщины: Ana и Empregada, Ana и Maria, Ana и Senhora). В таблице ниже — голос Gemini (pt-PT), если ты озвучиваешь не через API, а в чате: возьми ближайший по полу и возрасту и **не меняй его между диалогами**.

| роль | кто | пол | возраст | голос Gemini | манера |
|---|---|---|---|---|---|
| `ana-f` | Ana, студентка | женский | ~24 | pt-pt-tutor-1 | тёплый, живой, молодой |
| `joao-m` | João, инженер | мужской | ~30–33 | pt-pt-advisor-6 | дружелюбный, обычный городской (тот же, что в `rev08`) |
| `maria-f` | Maria, соседка | женский | ~55 | pt-pt-concierge-2 | светлый, приветливый |
| `empregada-f` | продавщица, администратор | женский | ~39 | pt-pt-assistant-7 | вежливый, деловой (тот же, что в `rev08`) |
| `senhora-f` | пожилая незнакомая сеньора | женский | ~65 | pt-pt-csagent-2 | доброжелательный, неторопливый |
| `empregado-m` | официант, продавец | мужской | ~50 | pt-pt-advisor-5 | приветливый (тот же, что в `cafe`) |
| `homem-m` | незнакомый мужчина | мужской | ~44 | pt-pt-tutor-7 | спокойный, вежливый |

## Произношение (проверь на первом файле)

- `-s` в конце слова и перед согласной — «ш»: `estão`, `livros`, `mesas`.
- Безударные гласные редуцированы: `telefone` ≈ «тлфо́н», `pequeno` ≈ «пкэ́ну».
- `de`, `te` — «ды», не «джи».
- Лиссабонская интонация.

## Темп и звук

- Темп примерно 80–85 % обычной речи, как в прошлых партиях (они одобрены): разборчиво для начинающих, без пауз между словами.
- Без музыки и эффектов. Не читай вслух `id`, имена говорящих и номера.
- 0,2 с тишины в начале, 0,3 с в конце.
- **mp3, моно, 44,1 кГц, 64 кбит/с**, имя файла — ровно `id` + `.mp3`.

Текст не меняй: ни слов, ни пунктуации. Если в слове сомневаешься в произношении, напиши отдельно.

## Часть Б. Диалоги тем 0.5–0.16 (89 реплик, 13 диалогов)

### genero · тема 0.5 · диалог 1 (Ana — ana-f, Empregada — empregada-f)

| id | роль | текст |
|---|---|---|
| genero-d1-01 | ana-f | Boa tarde! Um mapa da cidade, por favor. |
| genero-d1-02 | empregada-f | Aqui está o mapa. |
| genero-d1-03 | ana-f | E o jornal de hoje? |
| genero-d1-04 | empregada-f | O jornal está aqui. É tudo? |
| genero-d1-05 | ana-f | É tudo, obrigada. |
| genero-d1-06 | empregada-f | Obrigada. Boa tarde! |

### plural · тема 0.6 · диалог 1 (Ana — ana-f, Empregado — empregado-m)

| id | роль | текст |
|---|---|---|
| plural-d1-01 | ana-f | Bom dia! Dois pães, por favor. |
| plural-d1-02 | empregado-m | Dois pães. Mais? |
| plural-d1-03 | ana-f | Sim, as frutas e os ovos. |
| plural-d1-04 | empregado-m | As frutas e os ovos. É tudo? |
| plural-d1-05 | ana-f | É tudo. Quanto é? |
| plural-d1-06 | empregado-m | São setenta cêntimos. |
| plural-d1-07 | ana-f | Aqui está. Muito obrigada! |

### ser · тема 0.7 · диалог 1 (Ana — ana-f, João — joao-m)

| id | роль | текст |
|---|---|---|
| ser-d1-01 | ana-f | Olá! Eu sou a Ana. E tu? |
| ser-d1-02 | joao-m | Sou o João. Sou de Lisboa. E tu, és de Lisboa? |
| ser-d1-03 | ana-f | Não, sou russa. Sou de Moscovo. |
| ser-d1-04 | joao-m | És estudante? |
| ser-d1-05 | ana-f | Sou. Sou estudante na universidade. E tu? |
| ser-d1-06 | joao-m | Sou engenheiro. O meu colega é russo! |
| ser-d1-07 | ana-f | Ah, muito bem! |

### estar · тема 0.8 · диалог 1 (Ana — ana-f, João — joao-m)

| id | роль | текст |
|---|---|---|
| estar-d1-01 | ana-f | Olá, João! Onde estás? |
| estar-d1-02 | joao-m | Estou no restaurante, perto da praia. E tu? |
| estar-d1-03 | ana-f | Estou em casa. Estou cansada. |
| estar-d1-04 | joao-m | Estás doente? |
| estar-d1-05 | ana-f | Não, não estou doente. Estou bem, mas cansada. |
| estar-d1-06 | joao-m | Está bem. O restaurante está aberto até tarde! |
| estar-d1-07 | ana-f | Obrigada! Até logo. |

### servsestar · тема 0.9 · диалог 1 (Ana — ana-f, João — joao-m)

| id | роль | текст |
|---|---|---|
| servsestar-d1-01 | ana-f | João, onde é a festa? |
| servsestar-d1-02 | joao-m | É na minha casa, perto da praia. |
| servsestar-d1-03 | ana-f | E o teu irmão? Está em casa? |
| servsestar-d1-04 | joao-m | Não, está no hospital. Está doente. |
| servsestar-d1-05 | ana-f | Ah não! É doente? |
| servsestar-d1-06 | joao-m | Não, não é doente. Está doente hoje, mas não é nada. |
| servsestar-d1-07 | ana-f | Ainda bem! Então, até logo na festa. |

### pronomes · тема 0.10 · диалог 1 (Ana — ana-f, Maria — maria-f)

| id | роль | текст |
|---|---|---|
| pronomes-d1-01 | ana-f | Bom dia, senhora Maria! Como está? |
| pronomes-d1-02 | maria-f | Estou bem, obrigada. E a Ana, está boa? |
| pronomes-d1-03 | ana-f | Estou, obrigada. O senhor Paulo está em casa? |
| pronomes-d1-04 | maria-f | Não, está no trabalho. Está muito ocupado. |
| pronomes-d1-05 | ana-f | E os miúdos? |
| pronomes-d1-06 | maria-f | Estão na escola. A família está bem, obrigada! |

### pronomes · тема 0.10 · диалог 2 (João — joao-m, Ana — ana-f)

| id | роль | текст |
|---|---|---|
| pronomes-d2-01 | joao-m | Ana! Onde estás? |
| pronomes-d2-02 | ana-f | Estou perto da praça. E tu? |
| pronomes-d2-03 | joao-m | A gente está no café. Estamos com o meu primo. |
| pronomes-d2-04 | ana-f | Vocês estão no café da universidade? |
| pronomes-d2-05 | joao-m | Estamos. O jogo é hoje, e o café está aberto até tarde. |
| pronomes-d2-06 | ana-f | Muito bem, estou perto! Até já. |

### adjetivos · тема 0.11 · диалог 1 (Ana — ana-f, João — joao-m)

| id | роль | текст |
|---|---|---|
| adjetivos-d1-01 | ana-f | João, o colega novo é simpático? |
| adjetivos-d1-02 | joao-m | É muito simpático e é inteligente. É alemão. |
| adjetivos-d1-03 | ana-f | E a mulher? É alemã? |
| adjetivos-d1-04 | joao-m | Não, ela é portuguesa. É médica, é uma senhora muito calma. |
| adjetivos-d1-05 | ana-f | E o chefe? Ainda está antipático? |
| adjetivos-d1-06 | joao-m | Hoje não. Hoje está alegre! É um grande homem, mas é difícil. |

### ter · тема 0.12 · диалог 1 (Ana — ana-f, João — joao-m)

| id | роль | текст |
|---|---|---|
| ter-d1-01 | ana-f | João, tens fome? |
| ter-d1-02 | joao-m | Tenho muita fome! E tenho sede. |
| ter-d1-03 | ana-f | Há uma pastelaria aqui perto. Há pão, há sopa, há tudo. |
| ter-d1-04 | joao-m | Mas não tenho dinheiro... |
| ter-d1-05 | ana-f | Não há problema, o café é meu. Tens sorte hoje! |
| ter-d1-06 | joao-m | Tens razão, tenho muita sorte. E tu, tens pressa? |
| ter-d1-07 | ana-f | Não tenho. A aula é mais tarde. |

### negacao · тема 0.13 · диалог 1 (Ana — ana-f, João — joao-m)

| id | роль | текст |
|---|---|---|
| negacao-d1-01 | ana-f | João, não tens fome? |
| negacao-d1-02 | joao-m | Não tenho, não. E tu? |
| negacao-d1-03 | ana-f | Tenho, sim! Em casa não há nada. Nem pão. |
| negacao-d1-04 | joao-m | Que pena. E há alguém na pastelaria? |
| negacao-d1-05 | ana-f | Claro! Está sempre aberta. Nunca está fechada. |
| negacao-d1-06 | joao-m | Então o jantar é na pastelaria, não é? |
| negacao-d1-07 | ana-f | Pois é! E de certeza que o Paulo também está na pastelaria — hoje não tem trabalho. |

### preposicoes · тема 0.14 · диалог 1 (Ana — ana-f, Senhora — senhora-f)

| id | роль | текст |
|---|---|---|
| preposicoes-d1-01 | ana-f | Desculpe, o museu é aqui perto? |
| preposicoes-d1-02 | senhora-f | É, sim. É ao lado da ponte, na esquina da estrada. |
| preposicoes-d1-03 | ana-f | E a estação do metro? |
| preposicoes-d1-04 | senhora-f | Está entre a igreja e o supermercado. É perto, não é longe. |
| preposicoes-d1-05 | ana-f | Muito obrigada! E há uma farmácia pela rua? |
| preposicoes-d1-06 | senhora-f | Há, sim, ao lado do café. Está sempre aberta durante o dia. |
| preposicoes-d1-07 | ana-f | É muito simpática. Até logo! |

### demonstrativos · тема 0.15 · диалог 1 (Ana — ana-f, Empregada — empregada-f)

| id | роль | текст |
|---|---|---|
| demonstrativos-d1-01 | ana-f | Este chapéu é bonito. E aquele ali, o preto? |
| demonstrativos-d1-02 | empregada-f | Aquele também é bonito, mas este é novo. |
| demonstrativos-d1-03 | ana-f | E essa mochila aí, ao pé da caneta? É boa? |
| demonstrativos-d1-04 | empregada-f | Esta? É muito boa. Dentro há um saco. |
| demonstrativos-d1-05 | ana-f | Desculpe, o que é isto? |
| demonstrativos-d1-06 | empregada-f | Isto é uma carteira. Está em cima da mesa. |
| demonstrativos-d1-07 | ana-f | Claro! Hoje não tenho os óculos comigo. |
| demonstrativos-d1-08 | empregada-f | Pois é! Sem óculos nada é fácil. |

### numeros · тема 0.16 · диалог 1 (João — joao-m, Ana — ana-f)

| id | роль | текст |
|---|---|---|
| numeros-d1-01 | joao-m | Ana, que horas são? |
| numeros-d1-02 | ana-f | São nove e meia. Já? |
| numeros-d1-03 | joao-m | A aula é às dez, não é? Temos vinte minutos. |
| numeros-d1-04 | ana-f | Temos, sim. Quanto é o café aqui? |
| numeros-d1-05 | joao-m | Um euro e vinte. Tenho dois euros, o troco é oitenta cêntimos. |
| numeros-d1-06 | ana-f | Que idade tem o teu irmão? Tem dezassete anos? |
| numeros-d1-07 | joao-m | Tem dezasseis. Faz anos hoje! |
| numeros-d1-08 | ana-f | Que bom! Então, até às dez! |


## Часть В. Диалоги тем 0.1–0.4 и сводной главы 0.1–0.4 (34 реплик, 5 диалога; в приложении там нет «Участвовать» — только 🔊 по строкам, поэтому часть В можно отложить)

### alfabeto · тема 0.1 · диалог 1 (Ana — ana-f, Empregado — empregado-m)

| id | роль | текст |
|---|---|---|
| alfabeto-d1-01 | ana-f | Bom dia! |
| alfabeto-d1-02 | empregado-m | Bom dia! Faz favor? |
| alfabeto-d1-03 | ana-f | Um café, por favor. |
| alfabeto-d1-04 | empregado-m | Com açúcar? |
| alfabeto-d1-05 | ana-f | Não, obrigada. Quanto é? |
| alfabeto-d1-06 | empregado-m | São setenta cêntimos. |
| alfabeto-d1-07 | ana-f | Aqui está. Obrigada, adeus! |

### acento · тема 0.2 · диалог 1 (Ana — ana-f, João — joao-m)

| id | роль | текст |
|---|---|---|
| acento-d1-01 | ana-f | Olá, bom dia! |
| acento-d1-02 | joao-m | Bom dia! Tudo bem? |
| acento-d1-03 | ana-f | Tudo bem, obrigada. E tu? |
| acento-d1-04 | joao-m | Tudo bem. A aula é aqui? |
| acento-d1-05 | ana-f | Não, a aula é na sala dois. |
| acento-d1-06 | joao-m | Ah, obrigado! Até logo. |
| acento-d1-07 | ana-f | Até logo! |

### nasais · тема 0.3 · диалог 1 (Ana — ana-f, Homem — homem-m)

| id | роль | текст |
|---|---|---|
| nasais-d1-01 | ana-f | Desculpe! A estação é aqui? |
| nasais-d1-02 | homem-m | Bom dia. Não, a estação é na praça do mercado. |
| nasais-d1-03 | ana-f | Ah! E o autocarro? |
| nasais-d1-04 | homem-m | O autocarro é aqui, com o jardim. |
| nasais-d1-05 | ana-f | Muito obrigada! |
| nasais-d1-06 | homem-m | De nada. Até logo! |

### digrafos · тема 0.4 · диалог 1 (Ana — ana-f, João — joao-m)

| id | роль | текст |
|---|---|---|
| digrafos-d1-01 | ana-f | Olá! A chave da casa? |
| digrafos-d1-02 | joao-m | A chave está na cozinha, na mesa. |
| digrafos-d1-03 | ana-f | E a roupa da filha? |
| digrafos-d1-04 | joao-m | Está na caixa, com a roupa do filho. |
| digrafos-d1-05 | ana-f | Ah, bem. E o almoço? |
| digrafos-d1-06 | joao-m | O almoço é na praça, com a mãe. |
| digrafos-d1-07 | ana-f | Muito bem! Um chá, por favor. |

### rev04 · тема 0.1–0.4 (сводная) · диалог 1 (Empregado — empregado-m, Ana — ana-f)

| id | роль | текст |
|---|---|---|
| rev04-d1-01 | empregado-m | Boa tarde! Faz favor? |
| rev04-d1-02 | ana-f | Boa tarde. Sopa e peixe com arroz, por favor. |
| rev04-d1-03 | empregado-m | Com pão? |
| rev04-d1-04 | ana-f | Sim, com pão e manteiga. E água, por favor. |
| rev04-d1-05 | empregado-m | E um café? |
| rev04-d1-06 | ana-f | Não, obrigada. Um chá, por favor. |
| rev04-d1-07 | empregado-m | Um chá. Muito bem! |

Итог — 123 файлов mp3 (Б — 89, В — 34).
