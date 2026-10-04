# SlopScore

[![test](https://github.com/kburrus64-max/slopscore/actions/workflows/test.yml/badge.svg)](https://github.com/kburrus64-max/slopscore/actions/workflows/test.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) [![Live site](https://img.shields.io/badge/try%20it-slopscore--nine.vercel.app-orange)](https://slopscore-nine.vercel.app)

Find the patterns that make writing read as AI-generated, and fix them before you publish.

SlopScore scans text for 20+ habits of machine-written prose: "it's not X, it's Y" contrasts, dramatic one-line closers, "let's dive in" openers, inflated significance ("a pivotal moment"), AI vocabulary ("delve", "seamless", "leverage"), em-dash overuse, bold-label bullet lists, and chatbot leftovers like "I hope this helps!". It returns a 0-100 score and points at every match with a short fix.

It's a linter, not a detector. It doesn't guess who wrote a text. It shows you the specific sentences readers will notice.

- Web app (free, runs in your browser): https://slopscore-nine.vercel.app
- Pattern guides with examples: https://slopscore-nine.vercel.app/patterns/

## CLI

```sh
npx github:kburrus64-max/slopscore README.md docs/
```

(Not on npm yet. The unscoped `slopscore` name on npm belongs to a different project, so install from GitHub for now: `npm i -D github:kburrus64-max/slopscore`.)

```
FAIL  71  Pure slop        docs/launch-post.md
           1: Chatbot residue: "Great question"
           3: Not X, but Y: "this isn't just a tool, it's"
           3: Inflated significance: "marks a pivotal moment"
ok     4  Reads human      docs/install.md
```

Options:

| flag | default | what it does |
|---|---|---|
| `--max <n>` | 40 | exit 1 if any file scores above n |
| `--format text\|json\|github` | text | `github` prints annotations for Actions |
| `--ext <list>` | .md,.mdx,.txt,.html,.rst | extensions to scan inside directories |
| `--ignore <ids>` | none | skip patterns, e.g. `dash,triad` |
| `--include-quoted` | off | also flag text inside double quotes (quoted examples are skipped by default) |
| `--min-words <n>` | 20 | skip very short files |

Code blocks, inline code, front matter, URLs and HTML tags are ignored, so READMEs with examples don't get flagged for their code. Read from stdin with `-`.

## GitHub Action

```yaml
name: SlopScore
on:
  pull_request:
    paths: ["**/*.md", "docs/**", "content/**"]
jobs:
  slop:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: kburrus64-max/slopscore@v1
        with:
          paths: "docs content README.md"
          max: "40"
```

Each match shows up as an annotation on the changed line. The check fails when a file goes over `max`.

## Library

```js
import { analyze, PATTERNS } from "slopscore";

const r = analyze("Great question! Let's dive in.", { ignoreQuoted: false });
r.score;    // 0-100
r.label;    // "Reads human" | "A little sloppy" | "Sloppy" | "Pure slop"
r.matches;  // [{ id, label, category, start, end, text, hint }]
```

No dependencies. Works in Node 18+ and the browser.

## How scoring works

Each match has a strength. Strong tells (chatbot leftovers, not-X-but-Y, dramatic closers) count 3 points, medium tells 2, weak tells 1. Points are divided by text length (per 100 words, with a 100-word floor) and mapped to 0-100. Weak signals like a single em dash or one three-item list don't count unless stronger tells are also present, because careful human writers use them all the time.

The rules are regular expressions plus a sentence-shape check for rows of fragments. They are deterministic: the same text always gets the same score.

## Limits

- English only for now.
- It flags patterns, not authorship. Plenty of human writing has a few of these, and a clean score doesn't prove a person wrote something.
- The CLI skips text inside double quotes, so style guides can quote bad examples. The web app and API count quoted text unless you pass `ignoreQuoted`.

## Hosted API

The web app has a free JSON API (`POST /api/check`, up to 5,000 characters), a URL scorer, and pay-per-call endpoints for longer documents and batches. See https://slopscore-nine.vercel.app/llms.txt.

## Credits

The pattern list builds on Wikipedia's [Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) (WikiProject AI Cleanup) and two MIT-licensed agent skills: [blader/humanizer](https://github.com/blader/humanizer) and [petergyang/no-ai-slop](https://github.com/petergyang/no-ai-slop). The detection code and scoring here are original.

## License

MIT © Anansi Data. See [LICENSE](LICENSE).
