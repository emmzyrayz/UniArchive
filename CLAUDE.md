@AGENTS.md

Project status, architecture notes and workflow rules live in AGENTS.md.
The key rule: test each fix thoroughly (typecheck, lint, `pnpm test`, build, then exercise
the change in the running app), then commit and push to `main`.

README.md opens with a plain-language product overview ("What UniArchive
is") and the brief for writing survey questions; both are handed to other
AI tools, so update them when features change.
