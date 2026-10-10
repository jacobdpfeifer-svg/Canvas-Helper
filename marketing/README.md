# Campus placements: QR codes and NFC tags

Every physical thing that advertises Kairos (a hoodie, a laptop sticker, a flyer) gets its own short link, `https://<landing domain>/go/<slug>`. That link opens `landing/go/`, which works out what the visitor is holding:

| Visitor | What `/go` shows |
| --- | --- |
| Phone or tablet (they scanned or tapped) | **Send it to my Mac**: the share sheet (AirDrop to their MacBook, Messages or Notes to themselves), copy-link fallback, or email the link to themselves. "Don't have a Mac?" waitlist. |
| Mac (usually the link they just sent themselves) | The download once `landing/config.js` has `downloadUrl`; until then, early access sign-up. |
| Windows, Chromebook, Linux | "Kairos is a Mac app for now" plus a waitlist. |

The placement slug sits in the **path**, so it survives the hand-off: the link the phone sends to the Mac is the same `/go/<slug>`. Vercel Web Analytics (free tier) reports page views by path and by device type. For any placement, mobile views are scans and desktop views are people who made it to their Mac. No cookies, no custom events, no backend.

## Make the codes

```bash
cd marketing
npm install
npm run check                 # validate placements.json (works before the domain is set)
npm run codes                 # needs "baseUrl" in placements.json
npm run codes -- --base https://your-domain   # or pass the domain here
npm test
```

`npm run codes` writes `codes/<slug>.svg` (vector, for print shops), `codes/<slug>.png` (2400px, about 8 inches at 300 dpi), and `codes/links.csv`, the list of URLs to write onto NFC tags. `codes/` is gitignored; rebuild it any time.

It refuses to print until `baseUrl` is a bare `https://` domain. That's deliberate: a shirt printed with the wrong domain is a shirt that's never going to work.

## Add a placement

Add a row to `placements.json`:

```json
{ "slug": "hoodie-2", "kind": "qr", "note": "Second hoodie, Sam's" }
```

- `slug`: lowercase letters, digits and dashes, up to 40 characters. Short is better: a shorter URL makes a less dense QR code, and that scans better off fabric and from across a room.
- `kind`: `qr`, `nfc`, or `both`. NFC-only placements go in `links.csv` without a QR image.
- `ecc` (optional): QR error correction, `L` `M` `Q` `H`. Defaults to `Q`, which survives folds and scuffs. Use `H` for anything that will wrinkle a lot.

One slug per physical thing. If two hoodies share a slug, you can't tell which one works.

## Printing QR codes

- Print a test and scan it **on the actual material** before ordering a batch. Fabric stretches and folds.
- Keep it big on clothing (a hand-span or more), flat, and away from seams and zippers.
- Dark on light, with the white margin intact. Don't recolor it to the highlighter yellow.
- No CU marks next to it (CU, Buffs, the buffalo, Ralphie) without the Trademark Licensing Office. See `docs/research/go-to-market-campus-2026-10-10.md`.

## Writing NFC tags

1. Use NTAG213, 215 or 216 stickers. Any of them holds a URL this short.
2. With an NFC writer app (NFC Tools works on iPhone and Android), write one **URL / URI** record with the placement's link from `links.csv`.
3. Tap it with an iPhone and an Android phone. It should open `/go/<slug>`.
4. **Lock the tag** (in NFC Tools: Other → Lock tag). This is permanent, and it's the point: an unlocked tag in public can be rewritten to send people to a scam page under your name.
5. Label it. People don't tap things that don't say "tap here".

iPhones from the XS onward read URL tags with the screen on, no app needed. Android needs NFC switched on.

## Before you print, check the page

Open `https://<domain>/go/<slug>?as=phone` on your laptop to see exactly what a scanner will see. `?as=mac` and `?as=windows` preview the other versions.
