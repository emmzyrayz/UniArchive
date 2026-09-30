@AGENTS.md

Project status, architecture notes and workflow rules live in AGENTS.md.
The key rule: test each fix thoroughly (typecheck, lint, build, then exercise
the change in the running app), then commit and push to `main`.
