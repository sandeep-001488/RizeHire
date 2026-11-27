import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { isBertAvailable, resetBertAvailabilityCache } from "./bertAvailability.js";

beforeEach(() => resetBertAvailabilityCache());

test("healthy service reports available", async () => {
  assert.equal(await isBertAvailable({ fetchHealth: async () => ({ status: "healthy", sbert_loaded: true }) }), true);
});

test("errors and unexpected bodies report unavailable instead of throwing", async () => {
  assert.equal(await isBertAvailable({ fetchHealth: async () => { throw new Error("ECONNREFUSED"); } }), false);
  resetBertAvailabilityCache();
  assert.equal(await isBertAvailable({ fetchHealth: async () => ({ status: "loading" }) }), false);
});

test("result is cached for a minute, then re-checked", async () => {
  let calls = 0;
  const fetchHealth = async () => { calls++; return { status: "healthy", sbert_loaded: true }; };
  await isBertAvailable({ now: 0, fetchHealth });
  await isBertAvailable({ now: 30_000, fetchHealth });
  assert.equal(calls, 1);
  await isBertAvailable({ now: 61_000, fetchHealth });
  assert.equal(calls, 2);
});

test("an older SHAP/LIME-only build (no sbert_loaded) is not BERT-capable", async () => {
  assert.equal(
    await isBertAvailable({ fetchHealth: async () => ({ status: "healthy", model_loaded: true, service: "SHAP/LIME Explainability Service" }) }),
    false
  );
});
