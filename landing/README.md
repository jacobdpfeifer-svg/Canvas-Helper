# ProductName landing page

Static HTML/CSS/JS marketing site for the local-first Canvas companion. No build step — open `index.html` directly (double-click) or serve this directory with any static server (`npx serve landing` etc).

## Files

- `index.html` — the whole page (hero, pain points, how-it-works, features, non-goals, privacy, download/waitlist, footer)
- `styles.css` — Living Instrument tokens (`design-system/productname/MASTER.md`: ink/paper primitives, named signals, role-based radii, Source Serif 4 / IBM Plex Sans / IBM Plex Mono), mirrored from `app/src/styles.css` so the site matches the running app instead of inventing a new look. Glass is limited to temporary chrome (nav, hero frame, download panel). Night theme by default; a Paper toggle in the nav swaps to the warm paper theme, both using the same token values as the app.
- `app.js` — theme toggle (persisted to `localStorage`), scroll-reveal (respects `prefers-reduced-motion`), and the email-capture form handler.

## Design decisions

- **Visual language:** anchored to the app's own design system (`design-system/productname/MASTER.md`, Living Instrument as of 2026-09-21; previously Spatial Instrument, commit `be0eb3c`) rather than inventing a fresh style. A calmer, glass/trust aesthetic — not the loud/high-motion starting idea from the brief — because this product touches grades, and a skeptical, privacy-aware Gen Z audience converts better on "this looks like something that won't screw up my transcript" than on maximalist motion. Motion is present but restrained: a scroll-reveal fade and hover/press states only.
- **Messaging:** sells relief from specific pain points (Canvas grade fragmentation, "the grade Canvas shows isn't the real grade", dashboards that miss what's due, distrust of anything AI-flavored near grades) rather than generic "AI assistant" language.
- **Non-goals as a selling point:** a dedicated section lists what the product will never do (no auto-submit/comment/post, no educator tools, no DegreeWorks/Buff Portal scraping, no RateMyProfessors scraping, no losable-state gamification, no standing account automation) — framed as why it's safe to point at your real grades, not as buried legal text.
- **No DMG exists in this repo** (`app/src-tauri/target` has only a `debug` build, no `release`/`bundle` output, no signed artifact anywhere in the tree). The download section says so explicitly and offers an email-capture form instead of a fake or broken link.
- **Email capture has no backend.** Submitting builds a `mailto:jacobdpfeifer@gmail.com` link with the visitor's address in the body and opens the visitor's own mail client. The UI copy says exactly that — no claim of a connected list, no fake success state.

## Before a real launch

- Once a signed, fresh-machine-tested `.dmg` exists, replace the `#download` panel's status pill/copy and add the real download button/link.
- If a real waitlist endpoint is stood up, swap `app.js`'s `mailto:` fallback for that endpoint and update the copy in `index.html` (`#waitlist-status` note) accordingly — don't silently start claiming persistence without updating what the page tells the visitor.
