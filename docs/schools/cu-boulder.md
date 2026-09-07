# CU Boulder school notes

Registry: [`schools/cu-boulder.yaml`](../../schools/cu-boulder.yaml)

- Canvas: `https://canvas.colorado.edu`
- SSO IdP: `https://fedauth.colorado.edu`
- Timezone: `America/Denver`
- Engagement: CampusGroups Engineering Connections — see `plugins/cu-boulder-campusgroups/`
- Connector registry: `browser/scripts/lib/connector-registry.mjs` (CampusGroups registered; contract in `plugins/README.md`)
- Sync inventories external tools under `## Tools this semester`; Bucket-A gaps → `{user_root}/inbox/tool-gaps.md`

Browser sync: `SCHOOL_SLUG=cu-boulder` (default) + `cd browser && npm run sync`.
