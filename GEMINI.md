# group-fitness-app: working rules

This repository is a small workout-tracking web app for a group of friends. The full product spec is in `SPEC.md`. It is the source of truth. Re-read the section for the current milestone before you start it.

## About the person you are working with

Jackie is new to web development and strong in math and statistics. She wants to understand what gets built. Define each new technical term the first time you use it, in one plain sentence. Explain why you are making a choice, not just what you changed.

## Rules

1. Work on one milestone at a time. When a milestone is finished, stop, write the milestone report (format below), and wait until Jackie says "continue".
2. Before changing files, explain your plan in plain language: which files you will create or edit and why.
3. Never start long-running commands such as `npm run dev` or any watch mode. They will freeze this session. Ask Jackie to run them in a separate terminal. Verify your own work with `npm run build` and `npm test` (both exit on their own).
4. Do not add any dependency that is not listed in SPEC.md section 3 without asking first.
5. Do not build anything listed as out of scope in SPEC.md section 2.
6. If the spec is ambiguous or contradicts itself, ask. Do not guess silently. List every assumption you did make in the milestone report.
7. Git: after Jackie confirms a milestone, make one commit with a descriptive message. Never push, never force anything, never rewrite history. Do not delete files other than `node_modules` and `dist` without asking.
8. Secrets: never commit `.env.local`. Never ask for, accept, or use a Supabase `service_role` or secret key. Never write the group passcode into any file.
9. Code conventions: TypeScript in strict mode, function components with hooks, plain CSS, inline SVG icons, mobile-first layout, no emojis in the interface. Add comments only where the logic is not obvious, such as date and time zone handling.
10. Keep files small and single-purpose, following the structure in SPEC.md section 6.

## Milestone report format

- What changed: list of files created or edited, one line each.
- How to check it: exact steps Jackie can follow, including any command to run in her own terminal.
- Not verified: anything you could not test yourself.
- Assumptions and open questions.

## Additions for SPEC-2.md (milestones 5 to 7)

- The build spec for milestones 5 to 7 is SPEC-2.md. SPEC.md still applies to everything it covers. Allowed dependencies are those in SPEC.md section 3 plus SPEC-2.md section 3.
- Never write VAPID_PRIVATE_KEY, CRON_SECRET, or any other secret value into any file, log, test, or commit. They live only in Vercel's environment settings, which Jackie sets herself. Do not ask her to paste them to you.
- Files in api/ run only on Vercel. Do not install the Vercel CLI or run vercel dev. Verify with npm run build and npm test, and ask Jackie to test the deployed site on her iPhone.
- Jackie pushes to GitHub herself. After each push Vercel deploys. Ask her to report what she sees on her phone, and to paste Vercel log output (with secrets removed) if something fails.
