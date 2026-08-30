# Launch checklist

Everything unfilled is marked `data-todo` in `index.html`. It renders in **amber with a dashed underline** on screen and on paper, and `src/app.js` counts them and warns in the console on every load. You cannot ship these by accident.

```bash
grep -c 'data-todo' index.html      # how many are left
```

Content was rebuilt from your own résumé (`Bhautik_Bharadava_Senior_Frontend_Engineer_Full`), which replaced a lot of guesswork.

## ✅ No placeholders left

```bash
grep -c 'data-todo' index.html lab/index.html   # both return 0
```

Fourteen at the start, now none. The writing section was cut rather than filled — a thin one reads worse than none — so `Elsewhere` is GitHub and CodePen on both pages.

**This is mergeable.** Merging `redesign/warm` into `master` replaces the live site. Worth doing first:

- [ ] Print the quiet page (`⌘P`, or the footer link) and check the résumé PDF
- [ ] Look at both pages on your phone
- [ ] Swap `images/Avatar.png` for a real photo if you'd rather — it's still the 2018 illustration
- [ ] Close PR #10 (design-system version) and PR #11 (concept gallery); neither should ever merge

---

## 2 · Decisions I made from the résumé — check you agree

**Corrected against what was on the site before:**

- **8+ years**, not 7+. Your GitHub bio says 7+; the résumé says 8+. Used the résumé.
- **Job title** is now "Senior Software Engineer, Frontend Owner" — the résumé's wording. A third-party listing had claimed "Senior Software Engineer II"; that's gone.
- **Clientjoy removed.** It appeared in public aggregator data but is not on your résumé. If it belongs, say so and it goes back with real dates.
- **Sequr, Inc. added** as its own role (Frontend Engineer, Sep 2019 – Jan 2020). Previously it was collapsed into "Genea, formerly Sequr", which lost a real position.
- **TypeScript removed** from the stack. Your résumé lists "JavaScript (ES6+)" and never mentions TypeScript. If you do work in it, say so and it goes back — but the site shouldn't claim more than the CV.
- **Dates** now match the résumé throughout: Genea Jan 2020–present, Sequr Sep 2019–Jan 2020, Gridle Sep 2017–Sep 2019 (intern, then engineer).
- **~50% engagement lift** at Gridle is now on the page — it was the only hard number in the résumé and it was going unused.

**Two judgement calls worth a second opinion:**

- **The agentic / AI-tooling work is no longer on the site.** Earlier drafts led with it. Your résumé doesn't mention it at all, and a site claiming more than the CV is an inconsistency an interviewer will find. It is genuinely differentiating though — if you want it back, put it on the résumé too, and clear it with Genea.
- **Your phone number is deliberately not on the site.** It's on the résumé, but a public page invites recruiter spam and scraping. Email and LinkedIn are there instead. Easy to add if you'd rather.

---

## 3 · Deploy

The repo is connected to Netlify (site `bhautikbharadava`, live at **bhautikbharadava.netlify.app**), so hosting is sorted.

- [x] ~~Domain~~ — settled: the site lives at `bhautikbharadava.netlify.app`.
- [x] ~~Canonical / og:url~~ — pointing at the live host.
- [x] ~~Social preview~~ — `og:image` uses `images/Avatar.png`, which suits the `summary` card. For a wide card, make a 1200×630 PNG as `og.png`, point `og:image` at it and switch `twitter:card` to `summary_large_image`.
- [x] ~~Netlify builds blocked by the Lighthouse plugin~~ — fixed in the dashboard: plugin v4 → 6.0.1, Node 16.x → 24.x. `netlify.toml` keeps the note.
- [ ] **Merge `redesign/source` into `master`.** That is what replaces the live site — only once the placeholders are filled.
- [ ] Close the preview-only concept gallery (`preview/concepts`, PR #11) once a direction is settled.

### Analytics — one step left

GA4 is wired up in `src/analytics.js` on all three pages, but **it needs your Measurement ID**:

1. Google Analytics → Admin → Data Streams → your web stream
2. Copy the ID (it looks like `G-ABC1234XYZ`)
3. Paste it into `MEASUREMENT_ID` at the top of `src/analytics.js`

Until then it loads nothing and makes no requests — verified.

Your old `UA-126436259-1` can't be reused. Universal Analytics stopped processing data in July 2023, so it had been collecting nothing for years, and GA4 is a different product with a different ID format.

The tag is deliberately defensive: it refuses malformed IDs, honours Do Not Track, skips `localhost` and Netlify deploy previews so you don't pollute your own data, and loads only after `load` so a third-party script never competes with first paint.

**Two things worth knowing before you commit to GA4.** It's roughly 100KB of third-party JavaScript on a site whose speed is part of the argument, and it sets cookies — which means EU visitors technically need a consent banner. If neither appeals, **Netlify Analytics** is server-side (zero client JS, no cookies, no banner, $9/mo) and you're already on Netlify; **Cloudflare Web Analytics** is free and cookieless. Either would drop straight in.

### Also removed from the old site

- **Google AdSense** (`ca-pub-7097771428383038`) — ads work against a portfolio used to apply for senior roles, add third-party requests to a page whose speed is part of the pitch, and earn effectively nothing at this traffic level. Say the word if you want it back.

## 4 · Final pass

- [ ] `grep -c 'data-todo' index.html` returns **0**
- [ ] Console shows no placeholder warning
- [ ] Print the page (`⌘P`, or "Print as résumé" in the footer) and check the PDF — the print stylesheet strips the control panel and lays it out as a one-column résumé with link destinations spelled out
- [ ] Test at 375px wide
- [ ] Run Lighthouse — it now runs automatically on every deploy
- [ ] Consider replacing `images/Avatar.png` with a real photograph
