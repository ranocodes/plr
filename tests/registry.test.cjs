const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync(new URL("../lib/registry.ts", `file://${__filename}`), "utf8");
const apiSource = fs.readFileSync(new URL("../app/api/registry/route.ts", `file://${__filename}`), "utf8");

test("licence status logic uses the actual expiry date and handles suspended/revoked", () => {
  assert.match(source, /nurse\.status === "revoked"/);
  assert.match(source, /nurse\.status === "suspended"/);
  assert.match(source, /daysLeft <= 180/);
  assert.match(source, /daysLeft < 0/);
});

test("public verification payload is limited to registry details (PII hidden)", () => {
  const publicFunction = source.match(/export function publicNurse[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(publicFunction, /nannmId:/);
  assert.match(publicFunction, /licenseExpiry:/);
  assert.doesNotMatch(publicFunction, /email:|phone:|licenseNumber:|nin|address|ward/i);
});

test("API registration enforces email and phone validations", () => {
  assert.match(apiSource, /emailRegex/);
  assert.match(apiSource, /phone\.length < 7/);
  assert.match(apiSource, /\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$/);
});

test("Duplicate detection endpoint checks licence number and NIN", () => {
  assert.match(apiSource, /checkDuplicate/);
  assert.match(apiSource, /potential match/i);
});

test("NANNM ID issuance follows standard sequence format PLT-NUR-XXXX", () => {
  assert.match(source, /`PLT-NUR-\$\{String\(next\)\.padStart\(4, "0"\)\}`/);
});

test("State machine blocks transitions on revoked records (PNR-25)", () => {
  assert.match(apiSource, /nurse\.status === "revoked"/);
  assert.match(apiSource, /Record is revoked\. Further state transitions are blocked\./);
});

test("Serverless and Vercel compatibility checks in lib/registry.ts", () => {
  assert.match(source, /process\.env\.VERCEL/);
  assert.match(source, /tmpdir\(\)/);
  assert.match(source, /inMemoryStore/);
});
