# Task: migrate «Дисидентський Львів» to data v2 (much more text) and fix the issues from review

## Context

This repo is my Vite + React + TS site about dissident Lviv, 1965–1991, for a UCU course. The research has been expanded a lot. The text grew from about 1,100 words to about 4,900 words. There are also new stops, much longer biographies, 35 timeline events, a glossary and a "how the system worked" section.

The new dataset is **`src/data/lviv.v2.json`**. It is final content in Ukrainian. **Do not rewrite, shorten or "improve" any facts, dates, numbers or quotes.** Your job is to make the site carry this much text well, and to fix the UI problems listed below.

Keep the current visual identity: archival sheet, IBM Plex Mono/Serif, carbon violet, light and dark themes. The design direction stays. What changes is the content structure and the layout of long text.

## 1. Data migration (schema v2)

Replace `src/data/lviv.json` with `lviv.v2.json` as the app's data source. Keep the old file as `lviv.v1.json` for reference, then update `src/types.ts`.

What changed in the schema:

- **`offmap` is gone.**
  - The vertep is now a normal stop: id 13, slug `vertep`, at вул. Спокійна, 13, with `approx: true`.
  - Keep `#vertep` working as an alias of `#stop-13`.
- **Stop changes**
  - New `route: boolean`.
    - `true` (ids 1–12) means the stop is on the walking route in the city centre, in walking order.
    - `false` (ids 13–15) means a separate place outside the walking route: the vertep house, the Kalynets flat, and Stadium «Дружба».
  - New `facts: {label, value}[]`, 2–4 key facts per stop.
  - New `quote: {text, who, source: {title, url}} | null`, a short attributed quote.
  - `photo` can be `null` (stops 13, 14). For those, show no photo frame at all: no placeholder and no "фото немає" box.
  - `photo.search` (stops 5, 10, 15) is a Commons search hint for the photo script (see section 4).
  - `fromPrev` is a number for route stops and `null` for off-route ones.
- **Stop ids changed.** The old stops 5–10 are now 6, 7, 8, 9, 11, 12. There are new route stops 5 (Будинок культури будівельників, Стефаника 16а) and 10 (Порохова вежа). Photos of existing stops were carried over already.
- **`people[]`** now has these fields:
  - `name`, `years | null`, `role`, `summary` (1–2 sentences), `bio: string[]` (2–5 paragraphs), `stops: number[]`, `sources: Link[]`;
  - there are 19 people, including new ones.
- **`timeline[]`**: 35 events, each with a `stop` id.
- **`context`** has new fields:
  - `system: string[]`: how repression worked (articles of the code, closed trials, «профілактика», ШІЗО/ПКТ);
  - `critical: string`: how to read the map critically, about the disputed numbers.
- **New `glossary: {term, text}[]`** with 12 terms.

## 2. UI changes for long text

1. **Stop sheet layout** (order):
   1. Strip: "Арк. 03 з 12" for route stops, "Поза маршрутом" for off-route ones, plus coordinates.
   2. Theme tag, plus "місце приблизне" if `approx`.
   3. Title, address, years.
   4. `lead`.
   5. **Facts row.** A compact label/value grid. Mono labels, tabular numbers, 2–4 columns that wrap.
   6. Photo with credit, only if `photo` is not null.
   7. Story. It now has 4–6 paragraphs:
      - comfortable measure (about 65ch) and spacing;
      - paragraphs that start with a year ("1965.", "1972.", "1989.") get that year styled as a mono run-in.
   8. **Quote block**, if `quote`. A pull-quote with `who` and a link to `source`.
   9. «На полях» margin note (`unsure`).
   10. People chips. Each opens that person's page.
   11. «Питання для групи».
   12. Sources.
   13. Map links.
   14. Prev/next.
2. **Person page**, route `#person-<slug>`; generate the slug from `name`.
   - Contents: name, years, role, summary, the full `bio` paragraphs, stop badges (clickable) and sources.
   - The People grid shows name, years, role, summary and stop badges, and links to the person page.
   - **No portraits.** Do not fetch or embed photos of people.
3. **Intro tab**, in this order:
   - `context.intro`;
   - the 4 `waves` (a numbered sequence is fine here);
   - a «Як працювала система» block from `context.system`;
   - `context.ethics`;
   - `context.critical`, styled like a margin note;
   - a contents list split into «Пішій маршрут» (route stops) and «Окремо від маршруту» (off-route stops).
4. **Glossary**: a «Словник» section, reachable from the Intro and via `#glossary`.
   - In story text, the first occurrence of a glossary term can get a dotted underline and a tooltip/popover. This is optional.
   - Don't change the text itself.
5. **Off-route stops on the map**
   - Distinct marker style: a hollow circle with a dashed outline in the theme colour and the number inside.
   - Not connected to the route line.
   - Selecting one flies the map to it; they are 2–4 km from the centre.
6. **Walk mode**: only `route: true` stops count for the totals. Below the route, list the off-route stops as «Окремо: дістатися транспортом», with straight-line distance from the nearest route stop.

## 3. Fixes from my review of the current build

1. **Map framing.**
   - On first load the desktop map is zoomed out too far: the stops occupy a small part of the map.
   - After selecting a stop it is too tight: only 2–3 neighbours are visible and the next marker is clipped at the edge.
   - Fix:
     - fit the bounds of the route stops, with padding that accounts for the filter chips and the zoom buttons overlaying the map;
     - on select, fly to about zoom 15–15.5 with an offset so that the marker isn't hidden under overlays;
     - keep the neighbours visible.
2. **Mobile (375px)**
   - The theme filter chips overflow off-screen. Make them a single horizontally scrollable row, or collapse them into a «Теми» button.
   - The map opens zoomed in on one stop. Use the same framing rule as on desktop.
   - The timeline sits between the map and the story and pushes the story down. On mobile, move the timeline below the sheet or into its own tab.
   - Add a slim sticky bar with the stop number, title and prev/next while reading a sheet.
3. **Empty photo frame on the vertep sheet** («Місце не встановлене, тому фото немає»): remove it (see section 1).
4. **Timeline density.** With 35 events, 1965, 1972, 1988 and 1991 have many dots.
   - Stack them with collision avoidance.
   - Keep the «табори, заслання, тиша» gap label.
   - Highlight the selected stop's events.
   - Show the event text on hover/focus and on tap (mobile).
5. **Presentation keys.** ← / → step through route stops 1–12, then off-route stops 13–15. `Esc` closes the person page.

## 4. Photos

Extend `scripts/resolve-photos.mjs`:

- For stops whose `photo.search` is set and whose `photo.file` is null, run a Commons file search (`action=query&list=search&srnamespace=6&srsearch=…`).
- Print the top 8 candidates with titles and thumbnails URLs, so I can choose. Do not write anything automatically.
- Then let me pass the chosen file names (CLI args or a small `photos.choice.json`). The script fetches `imageinfo` + `extmetadata` and fills in `file`, `author`, `license`, `licenseUrl`, `page`, `src` and `catUrl`.
- Never pick photos of people.

## 5. Done means

- `npm run build` passes.
- Check the site in a browser (Playwright is fine) at 1440×900, 1920×1080 and 375×812, in light and dark:
  - stops 3, 13 and 14;
  - a person page;
  - the Intro with the glossary;
  - walk mode.
- Fix layout problems: overflow, clipped markers, unreadable text.
- Then give me a short summary:
  - what changed;
  - any data you think looks inconsistent. Report it, don't fix it.
