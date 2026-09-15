# WeVideo recon notes (2026-09-14)

Source: `wevideo-recon.json` via `_tmp-wevideo-recon.mjs`.

## Launch surface

- Canvas still uses **playposit.com** LTI URLs; player lands on **wevideo.com/interactive/player_v2**.
- BCOR PlayPosit: `new_tab: true` (popup launch).
- ONLINEEXP sections: mostly iframe (`new_tab: false`), `playposit.com/LTI/launch/.../play2` or `LTI13/launch`.
- LEEDSFYE: `LTI13/launch/deeplink?interactivityRedirect=.../bulb/...` → confirmed player DOM.

## Player UI (Vuetify)

- `Start video playback`
- Sidebar tabs: Review / Notes / **Transcript**
- Timeline markers: `Multiple Choice interaction…`, `Check All interaction…`
- `Submit` buttons (disabled until selection)
- Completion: wait for Interactive Video Complete / postMessage `interactive_video_completed`

## Runner

`cd browser && npm run wevideo -- --course LEEDSFYE|--course ONLINEEXP|--course BCOR1030|--assignment URL`
