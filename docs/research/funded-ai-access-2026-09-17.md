# Funded AI access for the student beta

Research date: September 17, 2026. Documentation review, not an implementation
or live integration test. Scope: 5–10 testers; $50–$100 initial weekly budget;
Claude and Gemini; no owner vendor secrets distributed to students. Existing
provider adapters live in `src/canvas_mcp/core/llm_provider.py`.

## Recommendation

Use a small authenticated relay with existing provider adapters. This is an
engineering judgment about this product, not a claim that a custom relay is
universally better. Jacob authorized this fallback after researching alternatives.
No service has been created or deployed.

The app authenticates a tester, prepares minimal relevant context locally, and
sends it over TLS to a bounded endpoint. The relay checks access/model/request
limits, reserves budget, calls the provider using a server-held secret, and
streams the response back. Local storage owns the history. Keep operational
authentication/budget metadata separate from optional product analytics.

Selected email/calendar content may pass through cloud AI following Jacob's
latest clarification, but must not be persisted in our databases, queues, logs,
caches, analytics, or error traces. This supersedes the earlier local-inference
requirement. OAuth credentials remain on the device and never enter AI context.
Course content likewise should not be deliberately retained by the relay.

## Alternatives examined

| Option | Verified capability | Fit and tradeoff |
|---|---|---|
| Our authenticated relay | Server-side provider credentials are the conventional secret boundary; all client calls pass through our authorization | Best fit for existing Claude/Gemini adapters and precise invitation/model controls; we must implement and operate access, accounting, error handling, and content-free logging |
| Firebase AI Logic | Managed proxy keeps Gemini credentials server-side and integrates App Check | Real alternative for a Gemini-focused app; not a shared Claude/Gemini solution. Tauri desktop attestation is not proven here; custom App Check can require its own backend |
| OpenRouter provisioned per-tester keys | Management API creates, limits, disables, and rotates child keys; expiration and organizational guardrails are available | Plausible small-beta shortcut: management/provider keys stay private, clients call OpenRouter directly. A child credential is still extractable and usable outside our UI, within enforced restrictions. Adds a provider intermediary and an adapter/integration to validate |
| Gemini ephemeral credentials | Short-lived credentials for Live API | Useful for future live audio; not a general replacement for the app's ordinary `generateContent` requests, and still needs a credential-issuing backend |
| Student-owned accounts/keys via OAuth or BYOK | OpenRouter PKCE yields a user-controlled API key | Changes who owns/pays for access and adds onboarding; does not by itself implement Jacob-funded usage |
| Owner secret bundled in app, encrypted or obscured | Client must eventually recover a usable secret to send the request | Reject. Packaging/Keychain can protect storage but cannot keep an owner credential inaccessible to a person controlling the client |

Firebase has spend caps as well as rate quotas, but documented enforcement may
lag usage reporting by several minutes, with overages still billed. Therefore
neither an alert nor that cap should be described as an exact $50 ceiling.
[Firebase pricing](https://firebase.google.com/docs/ai-logic/pricing),
[spend-cap behavior](https://firebase.google.com/docs/projects/billing/spend-caps).

OpenRouter is the strongest alternative if minimizing our request-handling
infrastructure becomes the dominant priority. Before choosing it, verify actual
Claude/Gemini endpoints, required structured/tool outputs, key-scoped guardrail
availability for our account, concurrency/limit behavior, retention routes, and
fees. We have not performed those checks with an account. A server-held
provisioning key is still necessary for automated issuance. Do not give that key
to the app. A child-key quota is a documented capability, not a tested guarantee
of zero overshoot under concurrent requests.

No examined option gives us unrestricted multi-provider inference, hidden owner
keys, precise application-level controls, and no trusted service at all. Managed
services move that responsibility; they do not eliminate it.

## Minimal relay contract — proposed, not built

- Invite-based authentication, expiring sessions, revocation, and server-owned
  model allowlist. An invitation code is exchanged, not a reusable global secret.
- No arbitrary provider URLs, headers, tools, or models accepted from clients.
  Validate schemas, input size, maximum output, concurrency, and rate limits.
- Start with a $50 global inference allowance. A conservative example is $4 per
  tester for 10 testers ($40 allocated), leaving $10 unallocated for validation
  and variance. This is an allocation, not a prediction of model costs. Define
  whether hosting/fees also count toward the user's total $50–$100 budget.
- Reserve a conservative maximum request cost atomically before dispatch. Count
  outstanding reservations against the limit; reconcile only from authoritative
  usage. Unknown usage after a timeout remains reserved until resolved. Bound
  retries; client cancellation is not proof that provider billing stopped.
- Pin allowed pricing/config versions and account for input, output/reasoning,
  media and billable tools if enabled. Fail closed when cost cannot be bounded.
  Disable unneeded expensive features. Do not promise an exact total billing cap
  before validating accounting and all external charges.
- Persist only necessary operational metadata: opaque tester ID, authorization,
  quota reservations, token/cost accounting, and content-free status. This is
  required access/accounting state, not a study or email/calendar database.
  Document retention/deletion separately from opt-in usage analytics.
- No request/response-body logs, prompt caches, durable retry queues, session
  transcripts, or exception payloads containing content. Inspect hosting/CDN/APM
  defaults as well as application code. Locally cached history stays on-device.
- Do not send entire inboxes, calendars, `USER.md`, or course archives by default.
  Select only relevant permitted fields locally. OAuth tokens never go to models.
- Verify with synthetic canary content through success, timeout, retry, streaming
  failure, and error paths. Test authentication failures, revoked users, duplicate
  requests, concurrent budget reservations, and exhausted quotas.

## Privacy language we can support

“Your email and calendar records are stored on your device. Selected information
may be sent to our AI service and its model provider to fulfill your request. We
do not store that content in our service databases or intentionally log it.”

This is proposed wording, contingent on implementation verification and a clear
provider disclosure. Do not say “never leaves your device” or “zero retention.”
Google documents paid-service no-training treatment separately from abuse
monitoring retention. Anthropic documents standard API deletion within 30 days
with exceptions and additional covered-model requirements. Review the precise
endpoint/model settings before enabling any sensitive-content use.
[Google retention](https://ai.google.dev/gemini-api/docs/zdr),
[Anthropic retention](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data),
[covered models](https://privacy.claude.com/en/articles/15425996-data-retention-practices-for-covered-models).

## Primary sources and what each establishes

1. [Anthropic API-key guidance](https://support.anthropic.com/en/articles/9767949-api-key-best-practices-keeping-your-keys-safe-and-secure):
   protect API credentials; use hosting secrets rather than exposing keys.
2. [Firebase AI Logic](https://firebase.google.com/docs/ai-logic): managed Gemini
   SDK/proxy architecture, server-held credentials, App Check integration.
3. [Custom App Check providers](https://firebase.google.com/docs/app-check/custom-provider):
   desktop/custom scenarios can need a secure backend implementation.
4. [Firebase quotas](https://firebase.google.com/docs/ai-logic/quotas): request
   quotas; distinguish rate control from exact monetary accounting.
5. [OpenRouter management keys](https://openrouter.ai/docs/guides/overview/auth/management-api-keys):
   child-key creation, rotation, disabling and credit limits.
6. [OpenRouter key schema](https://openrouter.ai/docs/api/api-reference/api-keys/create-keys):
   limit/reset/expiration configuration.
7. [OpenRouter guardrails](https://openrouter.ai/docs/guides/features/guardrails/overview):
   model/provider allowlists and organization/key policy controls.
8. [OpenRouter PKCE](https://openrouter.ai/docs/guides/overview/auth/oauth):
   user-authorized key flow, distinct from distributing an owner's root key.
9. [Gemini ephemeral tokens](https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens):
   Live API-scoped short-lived authentication, not general text-generation access.
10. [OpenRouter retention routing](https://openrouter.ai/docs/guides/features/zdr):
    routing controls are endpoint-specific; “an intermediary exists” does not
    establish any particular endpoint's retention policy.

## Remaining verification

No credentials, paid requests, provisioning, benchmarks, deployment, or spending
occurred during this review. Actual host selection, provider configurations,
retention disclosure, fees, and security/accounting tests remain implementation
work. Apple enrollment is also not active, independently affecting Mac release
timing; do not treat AI architecture approval as installer readiness.
