# Bhautik Bharadava — personal site [![Netlify Status](https://api.netlify.com/api/v1/badges/bb37e908-428c-4722-8c59-6e613bc5ffff/deploy-status)](https://app.netlify.com/sites/bhautikbharadava/deploys)

Lives at **[bhautikbharadava.netlify.app](https://bhautikbharadava.netlify.app)**.

Warm, light, content-first. Mostly type and space, with one quiet signature: a career rail in the left margin that fills as you read and warms the year you're currently in.

No framework, no build step, no dependencies.

```bash
python3 -m http.server 8000
```

## Layout

```
index.html        the page
404.html          not-found page
src/styles.css    palette, type, layout, print stylesheet
src/app.js        career rail, local time, placeholder audit
favicon.svg       the rail, as a mark
netlify.toml      security headers
images/           avatar, also the social preview
CHECKLIST.md      what still needs filling in
```

## Notes

**The rail is the only moving part.** Ticks are positioned from where the roles actually sit in the document, so it's a map of the page rather than decoration — with a minimum spacing pass, because raw offsets bunch the labels into an illegible cluster near the top. It's `aria-hidden`, hidden below 1040px, hidden in print, and the page reads perfectly without it. `src/app.js` failing to load costs you nothing but a clock.

**Nothing else animates** except a slight entrance on the masthead, and `prefers-reduced-motion` disables even that.

**Print is a real target.** "Print as résumé" in the footer (or <kbd>⌘P</kbd>) gives a clean one-column PDF: rail and nav stripped, hairline borders, and link destinations printed after each link since paper can't be clicked.

**Placeholders can't ship quietly.** Anything unfilled carries `data-todo`, renders amber on screen *and* on paper, and logs a console warning on load.

**Light only.** A deliberate choice, not an oversight — the palette is warm paper and it's painted explicitly, so it never inherits a host theme.

**The avatar is the illustration from the old site.** A real photograph would land better with a hiring manager; swap `images/Avatar.png` and nothing else changes.

## History

This replaces the previous single-screen portfolio (2018–2023), which remains in git history on `master`.
