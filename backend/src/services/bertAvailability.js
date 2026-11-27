import axios from "axios";

/**
 * Fast, cached check for the Python BERT service.
 *
 * Tier 2 of the recommender used to call /predict once per job with a 10 s
 * timeout and swallow every failure, so with the service asleep or down a
 * request could hang for a long time and still report source "bert" while
 * actually returning keyword scores. Checking /health once (short timeout,
 * result cached) lets callers skip straight to the TF-IDF tier instead.
 */

const PYTHON_SERVICE_URL = process.env.PYTHON_EXPLAINABILITY_URL || "http://localhost:5001";
const HEALTH_TIMEOUT_MS = 2500;
const CACHE_MS = 60 * 1000;

let cached = { value: null, at: 0 };

export async function isBertAvailable({ now = Date.now(), fetchHealth } = {}) {
  if (cached.value !== null && now - cached.at < CACHE_MS) return cached.value;

  const check = fetchHealth || (() =>
    axios.get(`${PYTHON_SERVICE_URL}/health`, { timeout: HEALTH_TIMEOUT_MS }).then((r) => r.data));

  let healthy = false;
  try {
    const data = await check();
    // Older builds of the service only do SHAP/LIME (no /predict); they report
    // status "healthy" without sbert_loaded, so don't treat them as BERT-capable
    healthy = data?.status === "healthy" && data?.sbert_loaded === true;
  } catch {
    healthy = false;
  }

  cached = { value: healthy, at: now };
  return healthy;
}

export function resetBertAvailabilityCache() {
  cached = { value: null, at: 0 };
}
