const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync(new URL("../lib/registry.ts", `file://${__filename}`), "utf8");

test("licence status logic uses the actual expiry date and 180-day boundary", () => {
  assert.match(source, /daysLeft <= 180/);
  assert.match(source, /daysLeft < 0/);
  assert.match(source, /new Date\(`\$\{nurse\.licenseExpiry\}T23:59:59`\)/);
});

test("public verification payload is limited to registry details", () => {
  const publicFunction = source.match(/export function publicNurse[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(publicFunction, /nannmId:/);
  assert.match(publicFunction, /licenseExpiry:/);
  assert.doesNotMatch(publicFunction, /email:|phone:|licenseNumber:|nin/i);
});
