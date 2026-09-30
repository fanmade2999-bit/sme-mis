import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("project contract files exist", async () => {
  const [agents, spec] = await Promise.all([
    readFile("AGENTS.md", "utf8"),
    readFile("SPEC.md", "utf8"),
  ]);

  assert.match(agents, /Database is authoritative for business rules and authorization/);
  assert.match(agents, /npm run typecheck/);
  assert.match(spec, /## Database security/);
  assert.match(spec, /## Quality & delivery/);
});

test("package exposes the required verification commands", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  assert.equal(pkg.scripts.lint, "eslint .");
  assert.equal(pkg.scripts.typecheck, "tsc --noEmit");
  assert.equal(pkg.scripts.test, "node --test");
  assert.equal(pkg.scripts.build, "next build");
});
