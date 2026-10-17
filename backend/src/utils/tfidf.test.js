import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tokenize,
  TfidfVectorizer,
  cosineSimilarity,
  rankJobsByTfidf,
  buildCandidateText,
  buildJobText,
} from "./tfidf.js";

test("tokenize lowercases, drops stopwords and keeps tech tokens like c++ / node.js", () => {
  const tokens = tokenize("The Senior C++ and Node.js engineer, with REST APIs!");
  assert.deepEqual(tokens, ["senior", "c++", "node.js", "engineer", "rest", "apis"]);
});

test("vectorizer gives identical documents cosine 1 and unrelated documents cosine 0", () => {
  const vec = new TfidfVectorizer();
  vec.fit(["react node mongodb", "python pytorch nlp", "java spring kafka"]);
  const a = vec.transform("react node mongodb");
  const b = vec.transform("react node mongodb");
  const c = vec.transform("java spring kafka");
  assert.ok(Math.abs(cosineSimilarity(a, b) - 1) < 1e-9);
  assert.equal(cosineSimilarity(a, c), 0);
});

test("idf down-weights terms that appear in every document", () => {
  const vec = new TfidfVectorizer();
  vec.fit(["engineer react", "engineer python", "engineer java"]);
  assert.ok(vec.idf.get("react") > vec.idf.get("engineer"));
});

test("rankJobsByTfidf scores the semantically closest job highest, on a 0-100 scale", () => {
  const jobs = [
    { _id: "1", title: "Frontend Developer", skills: ["React", "Next.js"], description: "Build React and Next.js interfaces with Tailwind" },
    { _id: "2", title: "Data Scientist", skills: ["Python", "PyTorch"], description: "Train PyTorch models and run NLP experiments" },
    { _id: "3", title: "DevOps Engineer", skills: ["Kubernetes"], description: "Operate Kubernetes clusters and Terraform pipelines" },
  ];
  const scores = rankJobsByTfidf("Skills: React, Next.js, Tailwind, JavaScript. Built dashboards in React", jobs);
  assert.equal(scores.size, 3);
  for (const s of scores.values()) {
    assert.ok(s >= 0 && s <= 100);
  }
  assert.ok(scores.get("1") > scores.get("2"));
  assert.ok(scores.get("1") > scores.get("3"));
});

test("rankJobsByTfidf returns zeros when the candidate has no text", () => {
  const scores = rankJobsByTfidf("", [{ _id: "1", description: "anything" }]);
  assert.equal(scores.get("1"), 0);
});

test("buildCandidateText and buildJobText flatten profile fields into one string", () => {
  const user = {
    skills: ["Go"],
    bio: "Backend engineer",
    parsedResume: { skills: ["Python"], technicalSkills: ["Docker"], yearsOfExperience: 2, education: ["B.Tech CSE"], parsed_summary: "Builds APIs" },
  };
  const text = buildCandidateText(user);
  for (const needle of ["Builds APIs", "Python", "Docker", "Go", "2 years", "B.Tech CSE", "Backend engineer"]) {
    assert.ok(text.includes(needle), `missing ${needle}`);
  }
  const jobText = buildJobText({ title: "SDE-1", skills: ["Go", "AI"], description: "Ship Go services", category: "technology" });
  for (const needle of ["SDE-1", "Go", "AI", "Ship Go services"]) {
    assert.ok(jobText.includes(needle), `missing ${needle}`);
  }
});

test("rankJobsWithTfidf handles mongoose-style documents (toObject) and plain objects alike", async () => {
  const { rankJobsWithTfidf } = await import("./jobMatching.js");
  const plain = { _id: "p", title: "React Developer", skills: ["React"], description: "React dashboards", workMode: "remote" };
  const fields = { _id: "m", title: "Go Backend Engineer", skills: ["Go", "gRPC"], description: "Go microservices and gRPC", workMode: "remote" };
  const mongooseLike = { toObject: () => ({ ...fields }), get _id() { return fields._id; }, get skills() { return fields.skills; }, get description() { return fields.description; }, get title() { return fields.title; }, get workMode() { return fields.workMode; } };
  const user = { skills: ["Go", "gRPC", "Kubernetes"], parsedResume: { parsed_summary: "Go backend engineer building gRPC microservices", yearsOfExperience: 2 } };

  const ranked = rankJobsWithTfidf([plain, mongooseLike], user);
  assert.deepEqual(ranked.map((j) => j._id), ["m", "p"]);
  assert.equal(ranked[0].title, "Go Backend Engineer");
  assert.equal(ranked[0].recommendationSource, "tfidf");
  assert.ok(ranked[0].tfidfScore > ranked[1].tfidfScore);
  assert.ok(ranked[0].matchBreakdown.tfidf.score === ranked[0].tfidfScore);
});
