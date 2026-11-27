import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateJobMatch } from "./jobMatching.js";

test("match score stays within 0-100 even when many candidate skills overlap one job skill", () => {
  // Under the old apply-time formula these 8 skills against 4 job skills scored 200%
  const candidate = {
    skills: ["React", "Next", "Next.js", "Type", "Script", "TypeScript", "CSS", "SS"],
    parsedResume: { yearsOfExperience: 2 },
    location: "Bangalore, India",
  };
  const job = {
    skills: ["React", "Next.js", "TypeScript", "CSS"],
    experienceLevel: "junior",
    workMode: "remote",
    location: { city: "Bangalore" },
  };
  const { overallScore, breakdown } = calculateJobMatch(candidate, job);
  assert.ok(overallScore >= 0 && overallScore <= 100, `overall ${overallScore}`);
  assert.ok(breakdown.skills.score <= 100, `skills ${breakdown.skills.score}`);
});

test("no shared skills keeps the score low", () => {
  const { overallScore } = calculateJobMatch(
    { skills: ["Photoshop"], parsedResume: { yearsOfExperience: 1 } },
    { skills: ["Go", "Kubernetes"], experienceLevel: "mid", workMode: "remote" }
  );
  assert.ok(overallScore <= 20, `overall ${overallScore}`);
});
