# Privacy Policy — ProductName (beta draft)

**Status:** beta draft, not lawyer-reviewed. Placeholder brand **ProductName**.  
**Date:** 2026-09-20

This describes what the current beta actually does. It is not legal advice.

## Local-first storage

Course lists, assignment metadata, study history, local calendar rows, preferences, and SSO cookies for Canvas live **on this device** under your ProductName profile folder (`{user_root}`). Deleting that folder deletes that copy of the data.

Nothing here is a hosted student-information system. ProductName does not claim FERPA “school official” status.

## What is read from Canvas

With your school SSO session (cookies in this profile, not a stored password), the app may read Canvas REST resources you can already see: courses, syllabus/pages, assignments, quizzes metadata, assignment groups, due dates, and submission *presence* when the API returns it. It does not fetch live quiz questions to auto-take assessments. It does not post or submit on your behalf.

## What we do not persist as a ProductName service

ProductName does not run a cloud database of your study answers, email bodies, or course content. Optional crash telemetry is off unless you opt in. Optional usage counts (session started/finished) are off by default and never include content.

Local connector records and OAuth tokens for **your** Google account may be stored in the profile folder.

## Providers (Claude / Gemini)

If you connect the funded AI relay, selected material and a question/answer may be processed by Anthropic (Claude) or Google (Gemini) under **their** retention and training policies. Our relay is designed not to keep that content in logs, caches, or databases. Provider policies are not under our control.

## Email and calendar

Gmail is read only if you connect it. Suggested calendar rows from mail are a contract (`inbox/calendar-suggestions.jsonl`); this round ships the file shape and a reader, not an automatic producer. Sends and Google Calendar writes require a per-action confirmation. We do not auto-add events.

## No affiliation

Not affiliated with CU Boulder or Instructure.

## Contact and deletion

Delete the profile folder to delete local ProductName data. Revoke OAuth at Google and your school IdP. Contact the beta operator who invited you.

## Changes

Dated beta draft. Updates will change the date in this file.
