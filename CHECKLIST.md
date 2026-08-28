# Launch checklist

Everything unfilled is marked `data-todo` in `index.html`. It renders in **amber with a dashed underline** on screen and on paper, and `src/app.js` counts them and warns in the console on every load. You cannot ship these by accident.

```bash
grep -c 'data-todo' index.html      # how many are left
```

---

## 1 · The numbers (highest leverage — do these first)

A senior or lead hire is bought with numbers. Everything else on this site is packaging; this section is the product. If you only do one thing, do this one.

| Where | What's needed | How to find it |
|---|---|---|
| `RoleCard` — Genea | Components in the design system | Count the exported components in the library's index |
| `RoleCard` — Genea | Product surfaces adopting it | Count the apps/repos importing the package |
| `RoleCard` — Genea | Bundle size reduction % | Compare a build from before your work to now — CI artifacts or `git log` on the lockfile era |
| `ProjectCard` — operator dashboard | The result | Support tickets about stale state, time-to-render a door list, incident count, or operator task time |
| `ProjectCard` — design system | The result | Reduction in one-off UI, or change in time-to-ship a new screen |
| `ProjectCard` — agentic tooling | The result | Engineers using it, time saved, or simply "in production across N teams" |

**If a number genuinely doesn't exist**, don't invent one. Replace the placeholder with a specific technical decision instead — "chose an event projection over cached responses because three writers could race" is far stronger than "improved performance by an unverifiable percentage."

## 2 · Biography

Assembled from public sources and **not verified**. One aggregator confused Genea with an unrelated Australian fertility company, so treat all of it as a draft.

- [ ] Genea start date
- [ ] Clientjoy dates, plus two or three sentences on what you owned and shipped
- [ ] Gridle dates, plus one concrete thing you built
- [ ] Your notice period (in `Availability`)
- [ ] Confirm your job title is exactly "Senior Software Engineer II"

## 3 · Links

- [ ] Medium URL and the three pieces you'd want a hiring manager to read (`LinkList`)
- [ ] Confirm the GitHub repo count — the site says 52, which was true when this was built

## 4 · Employer review

The `agentic-tooling` project card describes internal Genea work. It's written at the level of craft rather than architecture, with no service counts, tool counts or internal names — but **get sign-off before this goes public**, especially the "Result" line.

## 5 · Deploy

The repo is already connected to Netlify (site `bhautikbharadava`, live at **bhautikbharadava.me**), so the domain and pipeline are done. What remains:

- [x] ~~Buy a domain~~ — already yours
- [x] ~~Replace the canonical / og:url placeholder~~ — now `https://bhautikbharadava.me/`
- [x] ~~Social preview~~ — `og:image` points at `images/Avatar.png`, which suits the `summary` card. If you'd rather have a wide card, make a 1200×630 PNG, save it as `og.png`, point `og:image` at it and switch `twitter:card` to `summary_large_image`.
- [ ] **Merge `redesign/source` into `master`.** That is what replaces the live site — do it only once the placeholders above are filled.

### Two things removed from the old site — restore them if you disagree

- **Google AdSense** (`ca-pub-7097771428383038`) was dropped. Ads on a portfolio you are using to apply for senior and lead roles work against you: they read as unprofessional to a hiring manager, add third-party requests to a page whose speed is part of the pitch, and earn effectively nothing at portfolio traffic levels. Easy to put back if you want it.
- **Google Analytics** (`UA-126436259-1`) was dropped because it is dead code — Universal Analytics stopped processing data in July 2023. If you want analytics, add a GA4 property or something lighter like Plausible or Netlify Analytics, which needs no client-side script at all.

## 6 · Final pass

- [ ] `grep -c 'data-todo' index.html` returns **0**
- [ ] Console shows no placeholder warning
- [ ] Print the page (`⌘P`, or the "Print as résumé" link in the footer) and check the PDF reads well — the print stylesheet strips the control rail and lays it out as a one-column résumé with link destinations spelled out
- [ ] Test both themes and a few accent hues; the palette is generated from `--hue`, so an unusual hue can surprise you
- [ ] Test at 375px wide
- [ ] Run Lighthouse. There's no framework and no build step, so this should score very well — if it doesn't, something regressed
