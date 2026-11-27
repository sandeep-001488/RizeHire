import { test } from "node:test";
import assert from "node:assert/strict";
import { withRetry } from "./gemini.js";

const noSleep = { sleep: async () => {} };

test("retries Gemini's temporary 503/429 errors, then succeeds", async () => {
  let calls = 0;
  const out = await withRetry(async () => {
    calls++;
    if (calls < 3) throw new Error("[503 ] This model is currently experiencing high demand.");
    return "ok";
  }, noSleep);
  assert.equal(out, "ok");
  assert.equal(calls, 3);
});

test("does not retry permanent errors such as a retired model", async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(async () => { calls++; throw new Error("[404 ] This model is no longer available"); }, noSleep),
    /404/
  );
  assert.equal(calls, 1);
});

test("gives up after the attempt limit", async () => {
  let calls = 0;
  await assert.rejects(withRetry(async () => { calls++; throw new Error("429 rate limit"); }, { ...noSleep, attempts: 2 }));
  assert.equal(calls, 2);
});
