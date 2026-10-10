# Go-to-market: campus channels and the funnel each one needs (2026-10-10)

Scope: first launch at CU Boulder, word of mouth first, physical and quirky channels ahead of social. Every channel below was checked against the funnel as it existed on `754fd64`. If a channel works and the funnel behind it is broken, we lose the people it brought in.

This is a plan to execute as launch pieces land (signed `.dmg`, hosted relay, domain), not all at once. The QR/NFC landing page that every physical channel depends on is **built** (`landing/go/`, `marketing/`). Everything else plugs into it through `landing/config.js` and `marketing/placements.json`.

## 1. The funnel today, and where people fall out

| Stage | What exists in the repo | Drop-off risk |
| --- | --- | --- |
| Discover | **Built:** every placement has its own `/go/<slug>` path; Vercel Web Analytics script is in place (enable it in the dashboard). | Solved once Analytics is switched on. |
| Land | Download stays disabled until `downloadUrl` is set in `landing/config.js`. That one value turns on both the main page and `/go`. | Waiting on the release. |
| Leave contact info | Form builds a `mailto:` link to Jacob. Nothing is saved. | High on phones: opens the mail app, the person has to hit send. Many won't. |
| Phone to Mac | **Built:** `/go` detects phone or tablet (including an iPad posing as a Mac) and offers "Send it to my Mac" through the share sheet (AirDrop or Messages to yourself), plus copy-link and email-yourself fallbacks. Phone visitors to the main page get a link to it. | Solved. |
| Install | Tauri `.dmg`, macOS 12+, `com.kairosstudy.student` v0.1.0. | Windows and Chromebook students hit a dead end with no capture. |
| First run | `FirstRun.tsx`: school, then Canvas SSO, then sync. Three steps; CU Boulder is curated in `schools/cu-boulder.yaml`. | Low. This part is good. |
| Chrome extension | "Load unpacked" in developer mode only (`app/extension-chrome/README.md`). | High for non-technical students. Treat it as optional until it is on the Chrome Web Store. |
| AI study help | `services/relay/` has invite codes, per-tester and global spend caps, and revocation. README says it is not hosted yet. | If AI help is part of the pitch, it has to be live before the push. |
| Tell a friend | Nothing in the app. | Word of mouth runs on memory alone. |

### Fix before any channel goes live (status 2026-10-10)

1. **Turn on the download.** *Ready:* set `downloadUrl` and `downloadNote` in `landing/config.js`. Also update `docs/handoff/packaging-notes.md`, which still says notarization is deferred.
2. **Phone-aware landing ("Send it to my Mac").** *Built in `landing/go/`.* If the visitor is on a phone, the main button changes from "Download" to "Send to my Mac". It uses the Web Share API, so on iPhone the share sheet offers AirDrop to their own MacBook, Messages to themselves, or Notes. Fall back to copying the link, or an email to themselves. Then: "Open it on your Mac and you're two minutes away." For an Apple-heavy campus this is the most valuable piece of funnel work. It's a few dozen lines in `landing/app.js`.
3. **Per-placement links.** *Built.* Each tag, shirt and poster gets its own **path**, `/go/<slug>`, from `marketing/placements.json`. `npm run codes` prints the QR codes and the NFC link list once `baseUrl` is set. A path rather than `?src=`, because Vercel's free analytics tier reports paths and device type but not query strings, UTM tags or custom events. The phone hands the same path to the Mac, so one analytics row shows scans (mobile) and Mac arrivals (desktop). Remaining step: enable Analytics in the Vercel project.
4. **A real email capture.** *Still open.* Replace the `mailto:` with a Tally or Google Form, or a tiny Vercel function. Catch non-Mac visitors with "Windows/Chromebook? Get told when it's ready." Keep the landing README's honesty rule: the page never claims something was saved when it wasn't.
5. **A short, typeable URL.** *Still open; the QR generator refuses to print without it.* People will say it out loud ("go to ___"). If the Vercel domain isn't short and spellable, buy one. QR codes also scan more reliably when the URL is short.

## 2. Channels, ranked by what to do first

Each channel lists why it should work (with evidence where there is any), what it needs from the funnel, and the rules that apply.

### A. Invite codes: exclusivity plus referral tracking (do first)

- **What:** Kairos is "invite-only for CU Boulder this semester." Each beta student gets three codes to hand out. Codes are scarce, so people talk about them.
- **Why:** TheFacebook launched gated to Harvard email and reportedly signed up half the undergrads within a month, then grew school by school ([History Hit](https://www.historyhit.com/2004-facebook-founded-mark-zuckerberg/), [Xpert.Digital](https://xpert.digital/en/facebook-from-zero-to-23-billion-in-15-years/?amp=1)). Fizz also launches one campus at a time behind a verified school email ([Ithacan](https://theithacan.org/49642/news/fizz-hires-ic-students-to-market-app-on-campus/), [Ring-tum Phi](https://ringtumphi.net/7268/arts-life/new-app-fizz-launches-on-campus/)).
- **Funnel fit:** most of it already exists. The relay issues invite codes, enforces per-tester and global spend caps, and can revoke a tester. That matters because AI spend is funded by Jacob (the beta doc caps the first week at $50 to $100 for 5 to 10 testers). The caps stop a word-of-mouth spike from becoming a bill.
- **Build:** mint codes tagged with who handed them out. Add `?invite=CODE` on the landing page that carries through to first run. Add a "Give a friend Kairos" button in the app that copies the link and one of the student's codes. **Prerequisite:** the relay has to be hosted.

### B. Wearables: shirt or hoodie that shows the product

- **What:** skip the logo. Print the product: a hand-drawn week in the Notebook style, one highlighter swipe across "Sunday: free", and a large QR. Copy along the lines of "Ask me why my Sunday is free." The back of a hoodie is perfect because **the person behind you in lecture** stares at it for 75 minutes.
- **Why:** Notehall paid 12 University of Arizona students to wear "Ask me about Notehall" shirts every day for two weeks. One wearer said more than 20 people came up and asked ([Daily Wildcat](https://wildcat.arizona.edu/102914/uncategorized/notehall-goes-viral-with-new-advertising/)). Yik Yak's early growth leaned on branded shirts and swag at parties ([Rapptr](https://www.rapptrlabs.com/academy/35-actionable-app-marketing-tactics-explosive-growth)).
- **Funnel fit:** fixes 2 and 3 are built. Every scan is from a phone and lands on `/go/hoodie`.
- **Rules:** **no CU marks** (CU, Buffs, the buffalo, Ralphie, CU type treatments) without the Trademark Licensing Office and a licensed vendor ([CU Boulder brand merchandising](https://www.colorado.edu/brand/logos-design-elements/athletics-logo-licensing/brand-merchandising), [CU trademark FAQ](https://www.cu.edu/trademarks/trademark-and-licensing-frequently-asked-questions)). The landing page already keeps schools unnamed, so stay brand-neutral. Make the QR big (roughly a hand-span or more on the back), keep it off folds and seams, use high contrast, and **scan a printed test on fabric before ordering a batch**.
- **Twist:** an NFC tag sewn into the cuff or a patch. "Tap my sleeve." It's strange enough that people remember it.

### C. NFC tags, on things you own

- **What:** put tags where a tap is natural and allowed: **your own laptop** (sticker: "Tap for the app running on this laptop" while you work in Norlin), phone case, water bottle, hoodie patch, a business card you hand out, and posters on approved boards.
- **Why:** there's no published campus scan-rate data. Vendor comparisons say QR wins on range and recognition, and NFC wins on tap-and-go for deliberate close-range moments ([Bitly](https://bitly.com/blog/nfc-vs-qr-codes/?lang=de), [Flowcode](https://www.flowcode.com/blog/qr-codes-vs-nfc)). NFC needs a visible "tap here" prompt or people don't try it. Modern iPhones read URL tags without an app.
- **Funnel fit:** fixes 2 and 3 are built. Give each tag its own slug in `marketing/placements.json`; the write-and-lock steps are in `marketing/README.md`.
- **Rules:**
  - **Write-lock every tag after encoding.** An unlocked public tag can be rewritten to point at a phishing page under your name.
  - CU's posting rules allow printed material only on authorized kiosks and bulletin boards. Light posts, doors, windows, restrooms, classrooms, tables and sidewalks are off-limits ([CU Involvement: marketing](https://colorado.edu/involvement/marketing)). That rules out stickers on library tables and bathroom-stall ads. Things you own and carry are fine.
  - Test with both iPhone and Android.

### D. Moment-based drops: show up when Canvas hurts

The product is strongest at predictable pain points. Time the physical pushes to them:

- **Midterms (now, October):** "What's due this week across all five classes?" table or signs.
- **Sunday night:** the weekly "Sunday scaries." Posts and story drops at 7 to 9pm Sunday when people open Canvas and panic.
- **Finals week:** Red Bull's campus campaign deliberately timed product drops to finals week ([Archrival](https://archrival.com/work/90/airdrop/)).
- **Spring syllabus week (mid-January, from `term_dates.spring_start`):** the best install window of the year. Everyone is setting up their semester. Have the funnel perfect by then.

**Chalking:** CU allows water-soluble stick chalk on sidewalks, but only for student organizations promoting university events, and not within 10 ft of entrances ([CU Bulletin: chalk](https://bulletin.colorado.edu/index.php/node/8477)). So chalk requires either registering a Kairos or study-skills student org, or partnering with one on an actual event like "Midterm planning night."

### E. Live "your real week in 60 seconds" demo table

- **What:** a laptop and a sign: "Sign into your Canvas, see your whole week, and walk away with a plan." The wow moment is seeing their own classes appear, not a sample.
- **Why:** Google Pay's agency-run campus activation combined ambassadors with an on-the-spot download and reported 42% conversion among students who engaged. That's self-reported, with a big-brand budget, so trust the tactic more than the number ([Evolve Activation](https://evolveactivation.com/case-studies/college-activation/campus-guerrilla-marketing-boost-college-brand-awareness/)).
- **Funnel fit:** **don't have strangers sign into Canvas on your laptop.** That cuts against the product's own rule against holding anyone's session. Demo with a sample week, then help them install on **their** Mac on the spot. Pre-test DMG download speed on campus Wi-Fi, and have it on a USB stick as a backup.
- **Rules:** as a student you can canvass if you don't block traffic and don't leave literature behind. Tabling for non-affiliates needs a student org sponsor ([CU canvassing](https://www.colorado.edu/civic-engagement/canvassing-cu-boulder)).

### F. Brand-native giveaways (quirky, and on-theme)

The Notebook design system's signature is one highlighter and margin notes. Lean into that:

- **Highlighters** with a QR or short URL on the barrel. Students use them during midterms, and each one is a tiny billboard on a desk.
- **Sticky-note pads** printed with a blank week grid and the QR in the corner. Useful, so they stick around. Hand them out; don't leave stacks (canvassing rule).
- **"Lost: my weekend."** Tear-off-tab flyers on approved boards. Each tab has the short URL. The tear-off tabs also work as a crude count of interest.
- **Coffee sleeves or receipts** with a local shop on the Hill or Pearl. That's off campus, so the CUUF posting rules don't apply.

### G. Word-of-mouth amplifiers (Jacob's network)

- **Class group chats** (GroupMe, Discord): the natural place for "is anyone else drowning in Canvas?" The in-app "Give a friend Kairos" button (from A) makes sharing one tap.
- **Dense networks:** your own friends, then dorm floors and RAs, Greek houses, engineering societies (`schools/cu-boulder.yaml` already points at the engineering connections platform), and club sports teams. A whole house or team on it gives you a mini-launch you can watch closely.
- **Paid student ambassadors, later:** Fizz paid roughly $20 per hour for first-day-of-class shifts ([Ithacan](https://theithacan.org/49642/news/fizz-hires-ic-students-to-market-app-on-campus/)). Hold off until the funnel and the relay caps are proven.
- **Campus credibility:** CU's New Venture Challenge (Deming Center), the CU Independent and engineering newsletters. These are earned media for "a CU student built this," and they bring trust that flyers can't.

### H. Social (supporting, not primary)

- r/cuboulder and r/college: post a real story ("I built this because Canvas…"), not an ad.
- Short video: screen-record your own real week going from chaos to plan, with the Sunday-night framing.
- Only use real students' clips and quotes, with permission (landing README rule; FTC 2024 rule on fake reviews).

## 3. Don't do these

| Idea | Why not |
| --- | --- |
| Unsolicited AirDrop to strangers | Feels invasive, iOS limits receiving from "Everyone" to 10 minutes, and it hurts the brand. |
| Stickers on tables, doors, poles, bathroom stalls | Prohibited by CU posting policy, and taken down anyway. |
| Anything resembling a CU, Canvas or Instructure notice (fake "assignment due" slips, Canvas-blue parody) | Impersonation and trademark risk. The landing footer already disclaims affiliation. Keep it that way. |
| CU logos or Buffs on merch | Needs licensing. |
| "Your professor recommends Kairos" | Not true, and it pulls instructors into a product that deliberately does nothing toward them. |
| Streaks or leaderboards as a growth hook | Against the product's no-losable-state rule. |
| Pitching it as doing homework | False, and it invites honor-code trouble. Pitch it as "plan your week and study smarter." |

## 4. Suggested first 30 days

1. **Week 1, funnel:** fixes 1, 4 and 5 (2 and 3 are built). Host the relay with tight caps. Mint 30 invite codes tagged by referrer.
2. **Week 1–2, closest circle:** hand codes to about 10 friends you trust to actually use it. Watch first-run completion yourself and fix what trips them up.
3. **Week 2–3, wearables and NFC:** two or three hoodies (yours and two friends') and a laptop sticker, each with its own slug. Run a midterm-week table if you can get an org sponsor.
4. **Week 4, read the numbers:** views per `/go/<slug>` (mobile versus desktop), installs, first-run completions, codes redeemed. Double down on the top two channels for finals week, and build toward spring syllabus week.

## 5. What to measure (fits the opt-in analytics rule)

- Landing: views of each `/go/<slug>` split by mobile (scans) and desktop (made it to the Mac), via Vercel Web Analytics with no cookies. Taps and download clicks need custom events, a Pro-plan feature; the desktop views of a placement are the conversion that matters.
- Relay: invite codes redeemed, by referrer. Ids and counts only; this is already how the relay stores data.
- App: first-run completion, as an opt-in count event only, per `docs/handoff/student-beta-2026-09-17.md`. No content, no free text.

## Open questions for Jacob

- What's the release URL for the approved `.dmg` (goes in `landing/config.js`), and what domain is the landing page on (goes in `marketing/placements.json`)?
- Is AI study help part of the launch pitch? If yes, where will the relay be hosted?
- How many beta seats do you want at once, given the spend cap?
