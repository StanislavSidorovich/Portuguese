# Задание для Gemini: пилот озвучки курса португальского

Скопируй в Gemini всё, что ниже черты.

---

Ты озвучиваешь учебный курс **европейского португальского (Португалия, Лиссабон, pt-PT)**. Бразильский португальский не подходит ни в одной реплике.

## Как проверить, что произношение европейское

- `-s` в конце слова и перед согласной звучит как «ш»: `estão` = «шта́у~», `mapas` = «ма́пəш».
- Безударные гласные сильно редуцированы или пропадают: `telefone` ≈ «тлфо́н», `pequeno` ≈ «пкэ́ну».
- `de`, `te` — без «дж» и «ч»: «ды», а не «джи».
- Интонация лиссабонская, не бразильская.

Если нужная модель или голос этого не дают, остановись и скажи мне. Не озвучивай всё бразильским голосом.

## Шаг 1. Пробный файл

Сначала озвучь только две реплики, `rev08-d-01` и `rev08-d-02`, и пришли их мне на проверку. Остальное — только после моего «да».

## Голоса

| Голос | Кто это | Тембр и манера |
|---|---|---|
| `narrador` | рассказчик учебного текста | женский, 35–45 лет, тёплый, спокойный, отчётливый, как диктор аудиокниги |
| `joao` | João, португалец, инженер, ~30 лет | мужской, дружелюбный, обычный городской |
| `rececionista` | администратор небольшого отеля у моря, ~40 лет | женский, вежливый, деловой, немного быстрее Жоао |
| `empregado` | официант в лиссабонском кафе-пастелариа, ~50 лет | мужской, приветливый, привычно-быстрый, но разборчиво |
| `cliente` | посетитель кафе, говорит о себе в мужском роде (`obrigado`) | мужской, 30–40 лет, не носитель-актёр, а просто спокойный человек |

Один голос на персонажа во всех его репликах.

## Темп и звук

- Это курс для начинающих: темп примерно 85–90 % обычной речи. Без нарочитой медленности и без пауз между словами, каждое слово разборчиво.
- Без музыки, эффектов и вступлений. Не читай вслух имена, номера и `id`.
- Короткая тишина: 0,2 с в начале файла, 0,3 с в конце.
- Формат: **mp3, моно, 44,1 кГц, 64 кбит/с**. Один файл — одна реплика или один абзац. Имя файла — ровно `id` + `.mp3`, например `rev08-d-01.mp3`.

## Тексты

### Учебный текст (голос `narrador`)

| id | текст |
|---|---|
| rev08-t-01 | A Ana é russa, de Moscovo. É estudante na universidade, em Lisboa. O João é português e é engenheiro. Hoje não estão em casa: estão de viagem. O hotel está perto da praia. |
| rev08-t-02 | O hotel é pequeno e velho, mas o quarto é grande. As camas são novas, e a janela está aberta. Na mesa estão os mapas da cidade, dois jornais e o telefone do João. A porta da casa de banho está fechada. |
| rev08-t-03 | A Ana está na cama com um livro. Não está doente: está cansada da viagem. O João não está cansado. Está contente: a praia está perto e não está frio. |
| rev08-t-04 | O restaurante do hotel está fechado. Na praça, as lojas estão fechadas, mas os cafés estão abertos até tarde. O João está no café com um amigo. O amigo é português, de Lisboa, e é motorista. |
| rev08-t-05 | A Ana está bem. O quarto é bom, a cama é grande e a praia está aqui, perto. Boa noite! |

### Диалог в отеле

| id | голос | текст |
|---|---|---|
| rev08-d-01 | rececionista | Boa tarde! Faz favor? |
| rev08-d-02 | joao | Boa tarde. A chave do quarto dois, por favor. |
| rev08-d-03 | rececionista | Aqui está. O quarto está pronto. |
| rev08-d-04 | joao | Obrigado. O restaurante está aberto? |
| rev08-d-05 | rececionista | Hoje não, está fechado. Mas os cafés da praça estão abertos. |
| rev08-d-06 | joao | Estão longe? |
| rev08-d-07 | rececionista | Não, estão perto, na rua da praia. |
| rev08-d-08 | joao | E os mapas da cidade? Onde estão? |
| rev08-d-09 | rececionista | Estão aqui, na mesa. São novos! |
| rev08-d-10 | joao | Muito obrigado. Boa tarde! |

### Сцена в кафе

| id | голос | текст |
|---|---|---|
| cafe-01-npc | empregado | Bom dia! Diga? |
| cafe-01-me | cliente | Bom dia. Um café, se faz favor. |
| cafe-02-npc | empregado | Mais alguma coisa? |
| cafe-02-me | cliente | Um pastel de nata, se faz favor. |
| cafe-03-npc | empregado | É para levar ou para aqui? |
| cafe-03-me | cliente | É para aqui, se faz favor. |
| cafe-04-npc | empregado | Com certeza. São dois euros e quarenta. |
| cafe-04-me | cliente | Pode repetir, se faz favor? |
| cafe-05-npc | empregado | Dois euros e quarenta. |
| cafe-05-me | cliente | Aceita multibanco? |
| cafe-06-npc | empregado | Aceitamos, sim. Faz favor. |
| cafe-06-me | cliente | Obrigado. Boa continuação! |

Текст не меняй: ни слова, ни пунктуации. Если в какой-то реплике сомневаешься в произношении, напиши мне об этом отдельно.

Итог — 32 файла mp3.
