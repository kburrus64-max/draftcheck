#!/usr/bin/env node
// draftcheck CLI (slopscore bin alias): find AI-writing patterns ("AI slop") in files. MIT License.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { analyze } from "../src/engine.js";

const HELP = `draftcheck (formerly SlopScore): find AI-writing patterns in text files

Usage: draftcheck|slopscore [options] <file|dir|-> ...

Options:
  --max <n>          fail (exit 1) if any file scores above n (default 40)
  --format <fmt>     text (default) | json | github (GitHub Actions annotations)
  --ext <list>       extensions to scan in directories (default .md,.mdx,.txt,.html,.rst)
  --ignore <list>    pattern ids to ignore, comma separated (e.g. dash,triad)
  --include-quoted   also flag text inside "double quotes" (ignored by default)
  --min-words <n>    skip files with fewer words (default 20)
  -h, --help         show this help

Examples:
  slopscore README.md docs/
  slopscore --max 30 --format github content/blog
  cat draft.txt | slopscore -`;

const args = process.argv.slice(2);
const opt = { quoted: false, max: 40, format: "text", ext: [".md", ".mdx", ".txt", ".html", ".rst"], ignore: [], minWords: 20 };
const inputs = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "-h" || a === "--help") { console.log(HELP); process.exit(0); }
  else if (a === "--max") opt.max = Number(args[++i]);
  else if (a === "--format") opt.format = args[++i];
  else if (a === "--ext") opt.ext = args[++i].split(",").map(e => e.startsWith(".") ? e : "." + e);
  else if (a === "--ignore") opt.ignore = args[++i].split(",");
  else if (a === "--include-quoted") opt.quoted = true;
  else if (a === "--min-words") opt.minWords = Number(args[++i]);
  else inputs.push(a);
}
if (!inputs.length) { console.error(HELP); process.exit(2); }

function walk(p, out) {
  const st = statSync(p);
  if (st.isDirectory()) { for (const n of readdirSync(p)) { if (n === "node_modules" || n.startsWith(".")) continue; walk(join(p, n), out); } }
  else if (inputs.includes(p) || opt.ext.includes(extname(p).toLowerCase())) out.push(p);
}
const files = []; for (const i of inputs) { if (i === "-") files.push("-"); else walk(i, files); }

// blank out code (fenced blocks, inline code, html tags, front matter) but keep offsets so line numbers stay right
const blank = (s) => s.replace(/[^\n]/g, " ");
function prose(src, file) {
  let t = src.replace(/^---\n[\s\S]*?\n---\n/, blank).replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, blank).replace(/`[^`\n]*`/g, blank);
  if (/\.html?$/i.test(file)) t = t.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, blank).replace(/<[^>]+>/g, blank);
  t = t.replace(/^\s*\|.*\|\s*$/gm, blank);
  return t.replace(/\]\([^)]*\)/g, blank).replace(/https?:\/\/\S+/g, blank);
}
const lineOf = (text, off) => text.slice(0, off).split("\n").length;

let failed = false; const report = [];
for (const f of files) {
  const raw = f === "-" ? readFileSync(0, "utf8") : readFileSync(f, "utf8");
  const text = prose(raw, f);
  const r = analyze(text, { ignoreQuoted: !opt.quoted });
  if (r.words < opt.minWords) continue;
  const matches = r.matches.filter(m => !opt.ignore.includes(m.id));
  const over = r.score > opt.max; if (over) failed = true;
  report.push({ file: f, score: r.score, label: r.label, words: r.words, tells: matches.length, matches: matches.map(m => ({ id: m.id, label: m.label, line: lineOf(text, m.start), text: m.text.trim(), hint: m.hint })) });
}
if (opt.format === "json") console.log(JSON.stringify({ max: opt.max, failed, files: report }, null, 2));
else for (const r of report) {
  const over = r.score > opt.max;
  if (opt.format === "github") {
    for (const m of r.matches) console.log(`::${over ? "warning" : "notice"} file=${r.file},line=${m.line},title=${m.label}::"${m.text.slice(0, 80).replace(/\n/g, " ")}" ${m.hint}`);
    console.log(`${over ? "FAIL" : "ok"} ${r.file}: slop score ${r.score}/100 (${r.label}), ${r.tells} tells`);
  } else {
    console.log(`${over ? "FAIL" : "ok  "} ${String(r.score).padStart(3)}  ${r.label.padEnd(16)} ${r.file}`);
    for (const m of r.matches.slice(0, 12)) console.log(`        ${String(m.line).padStart(4)}: ${m.label}: "${m.text.slice(0, 70).replace(/\n/g, " ")}"`);
    if (r.matches.length > 12) console.log(`        ... ${r.matches.length - 12} more`);
  }
}
if (opt.format !== "json") console.log(`\n${report.length} file(s) checked, threshold ${opt.max}. ${failed ? "Some files are over the threshold." : "All under threshold."}`);
process.exit(failed ? 1 : 0);
