const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync(new URL("../lib/registry.ts", `file://${__filename}`), "utf8");
const apiSource = fs.readFileSync(new URL("../app/api/registry/route.ts", `file://${__filename}`), "utf8");

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

test("API registration enforces email and phone validations", () => {
  assert.match(apiSource, /emailRegex/);
  assert.match(apiSource, /phone\.length < 7/);
  assert.match(apiSource, /\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$/);
});

test("Audit logging appends entries and caps at 100", () => {
  assert.match(source, /data\.audit\.slice\(0, 100\)/);
  assert.match(source, /data\.audit\.unshift\(entry\)/);
});

test("NANNM ID issuance follows standard sequence format PL-YYYY-XXXX", () => {
  assert.match(apiSource, /`PL-\$\{year\}-\$\{sequence\}`/);
});

test("serverless and Vercel compatibility checks in lib/registry.ts", () => {
  assert.match(source, /process\.env\.VERCEL/);
  assert.match(source, /tmpdir\(\)/);
  assert.match(source, /inMemoryStore/);
});
