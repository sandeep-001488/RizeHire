import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeRegex, stripEmptyFields } from "./requestCleaning.js";

test("escapeRegex makes user text safe to use as a literal pattern", () => {
  for (const term of ["C++", "(", "node.js", "a|b", "[x]", "$100", "back\\slash"]) {
    const re = new RegExp(escapeRegex(term), "i");
    assert.ok(re.test(`I know ${term} well`), term);
  }
  assert.equal(new RegExp(escapeRegex("node.js")).test("nodeXjs"), false, "dot must be literal");
});

test("stripEmptyFields drops empty strings and emptied objects, keeps real values", () => {
  const out = stripEmptyFields({
    title: "Go Engineer",
    applicationDeadline: "",
    budget: { min: 50000, max: "", currency: "INR" },
    location: { city: "", state: "", country: "" },
    hardConstraints: { gender: null, minYears: 0 },
    skills: ["Go", ""],
  });
  assert.deepEqual(out, {
    title: "Go Engineer",
    budget: { min: 50000, currency: "INR" },
    hardConstraints: { gender: null, minYears: 0 },
    skills: ["Go", ""],
  });
});
