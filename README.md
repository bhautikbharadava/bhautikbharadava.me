# bhautikbharadava.me [![Netlify Status](https://api.netlify.com/api/v1/badges/bb37e908-428c-4722-8c59-6e613bc5ffff/deploy-status)](https://app.netlify.com/sites/bhautikbharadava/deploys)

My personal site, built as a live design system.

Every block on the page is a component instance driven by twelve CSS custom properties. The control panel writes to those properties and the browser recomputes — nothing re-renders. That is the argument the site is making, and the site is the evidence.

No framework, no build step, no dependencies.

```bash
python3 -m http.server 8000
```

## Layout

```
index.html        the page — every block tagged data-component / data-props
404.html          not-found page
src/styles.css    tokens, components, print stylesheet
src/app.js        control panel, inspector, persistence, placeholder audit
favicon.svg       2×2 token grid
netlify.toml      publish config + security headers
images/           avatar, used for the social preview
CHECKLIST.md      what still needs filling in
```

## Notes

**Tokens are the architecture.** `--hue`, `--radius`, `--density`, `--scale`, `--h-weight` and the theme drive everything. Colours derive from `--hue` via `hsl()`, spacing from `--density`, type from `--scale`. Change one and the whole page moves coherently — that is what the Chaos button demonstrates.

**Inspector.** Press <kbd>i</kbd> to reveal each component's name and props on hover; click any block for its source. <kbd>c</kbd> for chaos, <kbd>Esc</kbd> to close the drawer.

**Themes persist and can be shared.** Choices save to `localStorage` and serialise into a `?t=` URL. A shared link wins over local storage, so what you send is what they see.

**Print is a real target.** "Print as résumé" in the footer (or <kbd>⌘P</kbd>) produces a clean one-column PDF — panel stripped, hairline borders, and link destinations printed after each link.

**Placeholders can't ship quietly.** Anything unfilled carries `data-todo`, renders amber with a dashed underline on screen *and* on paper, and logs a console warning on load. See [`CHECKLIST.md`](CHECKLIST.md).

## History

This replaces the previous single-screen portfolio (2018–2023). That version, along with its stylesheets and assets, remains in git history on `master` prior to this redesign.
