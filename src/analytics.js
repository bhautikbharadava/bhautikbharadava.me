/* ═══════════════════════════════════════════════════════════════
   Google Analytics 4

   ┌───────────────────────────────────────────────────────────┐
   │  PUT YOUR MEASUREMENT ID HERE. Until you do, nothing      │
   │  loads and no requests are made.                          │
   │                                                           │
   │  Get it from: Google Analytics → Admin → Data Streams →   │
   │  your web stream. It looks like G-ABC1234XYZ.             │
   └───────────────────────────────────────────────────────────┘

   The old property on this site (UA-126436259-1) was a Universal
   Analytics tag. Universal Analytics stopped processing data in
   July 2023, so it had been collecting nothing for years. GA4 is
   a different product with a different ID format — the old one
   cannot be migrated or reused.
   ═══════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const MEASUREMENT_ID = '';        // ← e.g. 'G-ABC1234XYZ'

  /* ── guards ─────────────────────────────────────────────────
     Each of these exists to stop a request that shouldn't happen.
     ─────────────────────────────────────────────────────────── */

  // An unset or malformed ID must never ship a broken tag.
  if (!/^G-[A-Z0-9]{6,}$/i.test(MEASUREMENT_ID)) return;

  // Honour Do Not Track. GA won't do this for you.
  const dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
  if (dnt === '1' || dnt === 'yes') return;

  // Don't pollute the data with your own local and preview traffic.
  const host = location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '' ||
      host.startsWith('deploy-preview-') || host.endsWith('.local')) return;

  /* ── load ───────────────────────────────────────────────────
     After `load`, so a third-party script never competes with
     first paint. Page speed is part of the argument this site is
     making; analytics does not get to undermine it.
     ─────────────────────────────────────────────────────────── */

  function start() {
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(MEASUREMENT_ID);
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', MEASUREMENT_ID);
  }

  if (document.readyState === 'complete') start();
  else addEventListener('load', start, { once: true });
})();
