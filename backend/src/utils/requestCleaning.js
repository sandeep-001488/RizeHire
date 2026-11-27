/** Escapes regex metacharacters so user text can be matched literally (e.g. "C++", "("). */
export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Forms send "" for every untouched field (deadline, budget max, location
 * state/country...). Joi rejects "" for dates, numbers and URIs, so drop empty
 * strings and any object left empty before validating.
 */
export function stripEmptyFields(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === "" || v === undefined) continue;
      const cleaned = stripEmptyFields(v);
      const isEmptyObject =
        cleaned && typeof cleaned === "object" && !Array.isArray(cleaned) && !(cleaned instanceof Date) &&
        Object.keys(cleaned).length === 0;
      if (isEmptyObject) continue;
      out[k] = cleaned;
    }
    return out;
  }
  return value;
}
