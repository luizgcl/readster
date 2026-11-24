@AGENTS.md

## Claude Code

The skills named below come from the `mattpocock-skills` plugin: `/plugin install mattpocock-skills@claude-plugins-official`.

- **Test-first** for logic in `reading.ts`, `pdf.ts` and `preferences.ts`: run the `tdd` skill and see the spec go red before the fix.
- **Bugs**: start with the `diagnosing-bugs` skill and reproduce the failure before editing.
- **UI changes**: run `npm start`, open the page in the browser pane and check light and dark themes, 375px width and keyboard focus before calling it done.
- **Vocabulary**: when a domain term or a design decision gets settled in conversation, record it with the `domain-modeling` skill.
- **PRs**: write the body with the `pr` skill; review the branch with the `code-review` skill before asking for merge.
