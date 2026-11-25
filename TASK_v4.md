# Task: switch the site to data v4 (≈21k words of reading text) and make very long texts comfortable to read

## Context

The site is live at https://taraskonoval.github.io/dissident-lviv/ and currently uses `src/data/lviv.v3.json`. The new dataset is **`src/data/lviv.v4.json`** (`version: 4`). Its schema is **identical** to v3: no new fields and no renamed fields.

The content is final and in Ukrainian. **Do not rewrite, shorten, merge, reorder or "improve" any text, facts, dates, numbers or quotes.** Readable copies are in `content/` (regenerated from v4). The JSON is the source of truth.

### Word count

Reading text is `stops[].story` + `people[].bio` + `context.intro` + `context.system` + `context.waves[].text`, counted as whitespace-separated tokens.

| Version | Reading text |
|---|---|
| v3 | 9,187 words |
| v4 | ≈20,900 words |

With every text field included (titles, leads, facts, timeline, glossary, ethics), v4 is about 24,400 words. Please print this count after the switch (a small `scripts/wordcount.mjs` is fine) so we can confirm it.

## What changed in the data

- **Context**
  - `intro`: 27 paragraphs (was 9). New topics:
    - everyday life;
    - the thaw;
    - the language question and the 1958–59 school reform;
    - Dziuba's «Інтернаціоналізм чи русифікація?»;
    - Shelest vs Shcherbytsky;
    - the Helsinki Accords;
    - how news travelled (samvydav, tamvydav, radio);
    - east/west composition of the movement;
    - the 1980s and Chornobyl;
    - Lviv as «П'ємонт»;
    - the 1965 arrest list;
    - the Dobosh case;
    - «Український вісник»;
    - the 1988 UHU programme;
    - disagreements inside the movement;
    - what the map does not show.
  - `system`: 14 paragraphs (was 7). New topics:
    - pressure before arrest;
    - investigation;
    - punitive psychiatry;
    - public recantations;
    - etap and camp life;
    - exile;
    - families.
  - All 5 `waves` texts are longer. `ethics` and `critical` are longer too.
- **Stops**
  - Every stop has extra `story` paragraphs; stops now have 7–14.
  - **The last paragraph of every stop starts with «Сьогодні.»** It is a practical note for walking there now. Please style it as a distinct "visit today" note at the end of the story, for example a small mono label «Сьогодні» and a subtle top rule. Detect it by the prefix, but leave the text itself unchanged.
  - Some stops got new `people` and new `sources`.
- **People**: 25, up from 24.
  - New: **Валентин Мороз** (no portrait). Use the existing text-only card style and **do not add a portrait**.
  - All bios are longer; they now have 4–16 paragraphs, most 7–12.
  - **The last paragraph of every bio starts with «Що почитати.», «Що подивитися.» or «Що послухати.»** Style it like the «Сьогодні» note, as a "further reading" box, and keep the text as is.
  - `stop.people` and `person.stops` cross-reference each other.
- **Timeline**: 75 events, sorted (was 42), including 1946, 1986 and 1999.
- **Glossary**: 31 terms (was 15).

## To do

1. Switch the data source to `lviv.v4.json`. Keep `lviv.v3.json` for reference.
2. **Long reading on stop sheets.** With 7–14 paragraphs per stop:
   - add a sticky mini-TOC or a «Зміст» jump list when a sheet has more than 8 paragraphs. Use the year run-ins («1946.», «1989.» …) and the «Сьогодні» note as anchors;
   - add a reading-progress indicator in the sheet header;
   - keep the facts row, quote, «На полях», people chips, question and sources blocks in place.
3. **Person pages**: up to 16 paragraphs.
   - Keep the sticky side block.
   - Add an estimated reading time (≈200 words/min) next to the name.
   - Style the final «Що почитати» paragraph as a box.
4. **Intro page**: `intro` now has 27 paragraphs.
   - Split it visually into sections every 4–6 paragraphs, using subtle numbered dividers. **Do not add invented headings to the data.** If you want headings in the UI, use neutral numbers («I», «II» …).
   - Keep the contents line at the top and add a reading-time estimate.
5. **Timeline with 75 events.**
   - Check stacking at 375px, 1440px and 1920px.
   - The range now starts in 1946. Make sure the axis does not waste space: a compressed gap before 1959 is fine.
6. **Glossary with 31 terms**: alphabetical order and a quick filter input.
7. **People index**: 25 cards. Keep the cards short (summary + «Читати біографію →»).
8. Run `npm run build` and check in a browser at 375×812, 1440×900 and 1920×1080, in light and dark:
   - #about;
   - #stop-1, #stop-11, #stop-13;
   - Chornovil's person page;
   - Moroz's person page (new, no portrait);
   - #people;
   - #glossary;
   - #walk.

   Fix overflow and legibility problems, then commit and push so GitHub Pages redeploys.
9. Summarize what changed and print the word count. List any data that looks inconsistent, but don't edit the text.

## Known open questions in the data (report only, do not fix)

- **Chornovil, 1967 sentence date.** v3/v4 say 15 листопада 1967, while the English Wikipedia says 13 November.
- **Chornovil, 1973 verdict date.** The data says 12 квітня 1973; one historian dates it 8 квітня 1973.
- **Shabatura's place of exile.** The bio says Курганська область; the English Wikipedia says the Tajik SSR.
- **Antoniv's marriage to Krasivsky.** The data says 1979; the English Wikipedia says 1978.
