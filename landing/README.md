# Kairos landing page

Static HTML/CSS/JS marketing site. No build step: open `index.html` directly or serve this folder with any static server. Deployed on Vercel from `main` with Root Directory `landing`, preset Other, no build command. Keep it that way: `index.html` at the root of this folder, every asset relative, no bundler.

## Files

- `index.html` — hero (headline + the product page with margin notes), the app in use, "keep the weekend", the grade-math example, how you get started, privacy and what Kairos won't do, early access, footer.
- `styles.css` — the Notebook design system (`design-system/kairos/MASTER.md`), mirrored from `app/src/styles.css` + `app/src/notebook.css` so the site looks like the app. Light by default; dark follows the visitor's system setting.
- `app.js` — draws the margin notes and marker swipe in once as they scroll into view (skipped under reduced motion), and handles the early-access form.
- `fonts/` — Gabarito and Caveat (OFL, licenses alongside), self-hosted so the page makes no third-party requests. The Big Shoulders files are left over from an earlier pass and unused.

## Rules this page follows

- Show, don't tell: the product UI is built from real components with a sample student's week, not a screenshot mockup made of boxes.
- No school is named in the copy. Kairos works for any school on Canvas.
- No social proof that isn't real. No invented testimonials, avatars, logos, user counts, or AI-generated "students" (FTC 2024 rule on fake reviews and testimonials). When real beta students record clips or give quotes with permission, add them as their own section below the app band.
- One CTA label for one intent: "Get early access".
- Copy: no em-dashes, no buzzwords, hero subtext of 20 words or fewer.

## Email capture

There is no backend. Submitting builds a `mailto:jacobdpfeifer@gmail.com` link with the visitor's address in the body and opens their own mail client; the status line says nothing was sent yet. If you switch to a Tally or Google Form, change the form's `action`/handler in `app.js` and update the status copy so the page never claims to have saved something it didn't.

## Before a real launch

- Replace the panorama line art in the "weekend" section with real hand-drawn assets (Open Peeps / Open Doodles are CC0 and match the line style) or real footage (Pexels / Mixkit, free license).
- The access section intentionally keeps the `.dmg` button disabled until a signed, fresh-machine-tested artifact exists. When that gate is met, replace the disabled button with the versioned download URL and update the release note.
- The GitHub path currently routes through the email handoff because the repo may still be private. If the repo becomes public and source setup is a supported beta path, replace that path with the public repository URL and keep the source-build caveat visible.
