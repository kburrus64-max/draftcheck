import test from "node:test"; import assert from "node:assert";
import { spawnSync } from "node:child_process"; import { writeFileSync, mkdtempSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path";
const cli = new URL("../bin/slopscore.js", import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), "ss-"));
writeFileSync(join(dir, "bad.md"), "Great question! Let's dive in.\n\nIn today's fast-paced world, this isn't just a tool, it's a mirror. It marks a pivotal moment for every team that wants to grow and thrive.\n\nI hope this helps!\n");
writeFileSync(join(dir, "good.md"), "We moved the nightly export to 4am because the backup job saturated disk IO. It has run without errors for six nights. If it fails again we will split it into two batches.\n\n```\nlet's dive in // code is ignored\n```\n");
test("fails on sloppy file with line numbers", () => {
  const r = spawnSync("node", [cli, "--format", "json", join(dir, "bad.md")], { encoding: "utf8" });
  assert.equal(r.status, 1); const j = JSON.parse(r.stdout); assert.ok(j.files[0].score > 40); assert.equal(j.files[0].matches[0].line, 1);
});
test("passes clean file and ignores code blocks", () => {
  const r = spawnSync("node", [cli, "--format", "json", join(dir, "good.md")], { encoding: "utf8" });
  assert.equal(r.status, 0); assert.equal(JSON.parse(r.stdout).files[0].tells, 0);
});
test("github format emits annotations", () => {
  const r = spawnSync("node", [cli, "--format", "github", dir], { encoding: "utf8" });
  assert.match(r.stdout, /::warning file=.*bad\.md,line=\d+/);
});
