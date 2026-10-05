---
name: draftcheck
description: Check prose for AI-writing patterns (not-X-but-Y contrasts, staged run-ups, dramatic closers, "delve", chatbot leftovers, inflated significance) with a deterministic linter, then fix each flagged line. Use after drafting or editing READMEs, docs, blog posts, emails or marketing copy, or when asked whether text "sounds like AI".
---

# DraftCheck

Formerly SlopScore.

DraftCheck is a linter, not an authorship detector. It flags specific phrases and sentence shapes and gives a fix hint for each. It does not say who wrote the text.

## Run it

- Files or folders: `npx -y github:kburrus64-max/draftcheck <paths> --format json`
- Text from stdin: `echo "$TEXT" | npx -y github:kburrus64-max/draftcheck - --format json`
- No local Node: `POST https://slopscore-nine.vercel.app/api/check` with JSON `{"text": "..."}` (free, up to 5,000 characters).
- MCP (streamable HTTP): `https://slopscore-nine.vercel.app/mcp`, tool `slop_check`.

Useful flags: `--max <n>` (fail threshold, default 40), `--ignore dash,triad` (skip pattern ids), `--format github` (Actions annotations).

## Workflow

1. Score the draft. Note `score` (0 to 100, lower is better) and each match's `label`, `line`, `text` and `hint`.
2. Rewrite only the flagged spans. Keep facts, names, numbers and the author's voice. Don't add new claims.
3. Re-run. Stop when the score is at or under 40 (or the user's `--max`), or when the remaining hits are deliberate.
4. Report the before and after scores and what changed. Don't claim the text is now "human-written" or "undetectable".

## Don'ts

- Don't use it to get around academic-integrity or AI-disclosure rules.
- Don't strip every em dash or list of three: weak tells only matter alongside strong ones.
