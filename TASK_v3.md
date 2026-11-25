# Task: switch the site to data v3 (much more text, 6 new people) and polish long-text reading

## Context

The site is live at https://taraskonoval.github.io/dissident-lviv/. The research text has been expanded again. The new dataset is **`src/data/lviv.v3.json`** and its schema is **identical** to the current `lviv.json` (`version: 3`).

The content is final and in Ukrainian. **Do not rewrite, shorten, merge or "improve" any facts, dates, numbers or quotes.**

Readable copies of the same text are in `content/` (Markdown, one file per stop and per person) for review only. The JSON is the source of truth.

## What changed in the data

- **Context**
  - `context.intro` has 9 paragraphs (was 3). New topics:
    - how Ukraine looked inside the USSR;
    - Western Ukraine and the 1940s;
    - the family memory of the heroes;
    - the 1959–1961 Lukianenko group tried in Lviv.
  - `context.waves` has 5 waves, including the new «1959–1961». The existing ones got longer.
  - `context.system` has 4 more paragraphs: the ladder of punishments, the camps and their locations, life after return, and the deaths in 1984–1985.
- **Stops 1, 2, 3, 6, 7, 8, 10, 11, 12, 13, 14** have extra `story` paragraphs, appended at the end, plus new `sources`.
  - **Everything that was in `src/data/research.json` is now folded into these stories.** So stop rendering `research.json` additions to avoid duplicates. Remove the file and its component/types, or leave the file empty.
- **People**: 24, up from 18.
  - Existing bios are much longer: most have 5–9 paragraphs now.
  - New people (no portraits in `portraits.json`): Левко Лук'яненко, Атена Пашко, Михайло Косів, Ярослав Кендзьор, Ірина Сеник, Ярослав Дашкевич.
  - `stop.people` and `person.stops` were updated to cross-reference each other.
- **Timeline**: 42 events, sorted. **Glossary**: 15 terms.

## To do

1. Switch the data source to `lviv.v3.json`.
   - Keep `lviv.json` as `lviv.v2.json` for reference.
   - Remove the `research.json` usage (see above).
2. **New people without portraits**: render a clean text-only card and page header. Use the initials or name typographically, consistent with the current design. No empty image box, no "фото немає". Do not fetch or add portraits for them.
3. **Long bios on person pages**:
   - Make the person page comfortable for 5–9 paragraphs:
     - a short sticky side block with name, years, role and the stop badges;
     - good measure (about 65ch);
     - a drop cap only on the first paragraph;
     - generous paragraph spacing.
   - On the People index, keep cards short: summary only, plus a «Читати біографію →» link.
4. **Long stories on stop sheets**: stops now have 5–9 paragraphs.
   - Keep the year run-in style for paragraphs starting with a year.
   - Consider a small in-sheet table of contents only if a sheet has more than 7 paragraphs. This is optional.
   - Keep the facts row, quote, «На полях» and question blocks where they are.
5. **Intro page**: the `context` now carries most of the background reading.
   - Render `intro` as a proper long read.
   - Render the 5 `waves` as a numbered sequence.
   - Render `system` as its own section.
   - Add a short contents line at the top that links to these sections.
6. **Timeline**: 42 events now. Check stacking and legibility at 375px, 1440px and 1920px.
7. **Mobile nav**: at 375px the top tabs overflow and «Джерела» is cut off. Make the tab row scroll horizontally with a fade edge, or collapse it into a menu.
8. Run `npm run build`. Check in a browser at 375×812, 1440×900 and 1920×1080, in light and dark:
   - #about;
   - #stop-3, #stop-12, #stop-13;
   - #person-vasyl-stus (or whatever the slug function produces);
   - a new person without a portrait, e.g. Лук'яненко;
   - #people;
   - #walk.

   Fix layout issues, then commit and push so GitHub Pages redeploys.
9. Summarize what changed. List any data you think is inconsistent, but don't edit the text.
