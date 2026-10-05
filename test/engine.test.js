import test from "node:test"; import assert from "node:assert";
import { analyze } from "../src/engine.js";
test("sloppy text scores high", () => { const r = analyze("Great question! Let's dive in. It's not about speed, it's about trust. This marks a pivotal moment. I hope this helps!"); assert.ok(r.score >= 70, String(r.score)); });
test("plain text scores low", () => { const r = analyze("I moved the cron job to 4am because the backup saturated disk IO. It has run clean for six nights."); assert.ok(r.score < 20, String(r.score)); });
test("a single em dash alone does not count", () => { const r = analyze("We shipped on Tuesday — two customers hit a bug, and I fixed it Wednesday morning."); assert.equal(r.score, 0); });
test("offsets point at matched text", () => { const t = "Honestly, I hope this helps."; const r = analyze(t); for (const m of r.matches) assert.equal(t.slice(m.start, m.end), m.text); });

test("ignoreQuoted skips quoted examples", async () => {
  const { analyze } = await import("../src/engine.js");
  const t = 'Avoid phrases like "Great question! I hope this helps!" in docs.';
  assert.ok(analyze(t).matches.some((m) => m.id === "chatbot_residue"));
  assert.ok(!analyze(t, { ignoreQuoted: true }).matches.some((m) => m.id === "chatbot_residue"));
});

test("flags 2026-model tells (Graphite study, Oct 2026)", () => {
  const t = "This matters for every team. Here is why reliability matters in practice. The platform is more than a tool, it's a partner for growth. The update is not simply a patch; it is a rethink of the pipeline. Rather than relying on manual checks, teams can automate review. Looking ahead, the roadmap adds two features.";
  const r = analyze(t);
  assert.ok(r.matches.some((m) => m.id === "newer_model_phrase"));
  assert.ok(r.matches.some((m) => m.id === "not_x_but_y"));
  assert.ok(r.score >= 70, String(r.score));
});
test("plain uses of matters / looking ahead stay clean", () => {
  for (const s of ["This matters because the contract renews Friday.", "It matters to me that the build is green.", "Looking ahead to Friday, I booked the room."]) assert.equal(analyze(s).score, 0, s);
});
