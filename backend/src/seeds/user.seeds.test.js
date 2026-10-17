import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSeedUser,
  buildSeekerUser,
  buildPosterUser,
  resolveRoles,
  DEFAULT_SEED_USER_EMAIL,
  DEFAULT_SEED_POSTER_EMAIL,
} from "./user.seeds.js";

const env = { SEED_USER_PASSWORD: "test-only" };

test("seeding refuses to run without SEED_USER_PASSWORD", () => {
  assert.throws(() => buildSeekerUser({}), /SEED_USER_PASSWORD/);
  assert.throws(() => buildPosterUser({}), /SEED_USER_PASSWORD/);
});

test("seeker profile is complete and schema-compatible", () => {
  const u = buildSeekerUser(env);
  assert.equal(u.email, DEFAULT_SEED_USER_EMAIL);
  assert.equal(u.password, "test-only");
  assert.equal(u.role, "seeker");
  assert.ok(["male", "female", "other"].includes(u.gender), "seeker accounts need a valid gender");
  assert.ok(u.skills.length >= 20);
  assert.deepEqual(u.parsedResume.skills, u.skills);
  assert.equal(u.parsedResume.location.city, "Bangalore");
  assert.match(u.linkedinUrl, /^https:\/\/www\.linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/);
  for (const s of u.skills) assert.ok(s.length <= 50);
});

test("poster profile uses a distinct email and the poster role", () => {
  const u = buildPosterUser(env);
  assert.equal(u.email, DEFAULT_SEED_POSTER_EMAIL);
  assert.equal(u.role, "poster");
  assert.notEqual(u.email, buildSeekerUser(env).email, "seeker and poster must not collide on the unique email");
  assert.equal(u.gender, undefined, "posters do not need a gender");
});

test("buildSeedUser dispatches on role and rejects unknown roles", () => {
  assert.equal(buildSeedUser(env).role, "seeker");
  assert.equal(buildSeedUser(env, "poster").role, "poster");
  assert.throws(() => buildSeedUser(env, "admin"), /Unknown seed role/);
});

test("env overrides apply and emails are lowercased", () => {
  const u = buildSeekerUser({ ...env, SEED_USER_EMAIL: "Demo@Example.com", SEED_USER_GENDER: "female" });
  assert.equal(u.email, "demo@example.com");
  assert.equal(u.parsedResume.email, "demo@example.com");
  assert.equal(u.gender, "female");
  const p = buildPosterUser({ ...env, SEED_POSTER_EMAIL: "HR@Example.com" });
  assert.equal(p.email, "hr@example.com");
});

test("resolveRoles maps seeker / poster / both and rejects junk", () => {
  assert.deepEqual(resolveRoles(undefined), ["seeker", "poster"]);
  assert.deepEqual(resolveRoles("both"), ["seeker", "poster"]);
  assert.deepEqual(resolveRoles("Seeker"), ["seeker"]);
  assert.deepEqual(resolveRoles("poster"), ["poster"]);
  assert.throws(() => resolveRoles("admin"), /Unknown role/);
});

test("both seeded emails pass the User schema email regex", () => {
  const schemaEmailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  assert.match(buildSeekerUser(env).email, schemaEmailRegex);
  assert.match(buildPosterUser(env).email, schemaEmailRegex);
});

test("seedOnBoot is a no-op unless SEED_ON_BOOT=true and a password is set", async () => {
  const { seedOnBoot } = await import("./user.seeds.js");
  assert.equal(await seedOnBoot({}), null);
  assert.equal(await seedOnBoot({ SEED_ON_BOOT: "false", SEED_USER_PASSWORD: "x" }), null);
  assert.equal(await seedOnBoot({ SEED_ON_BOOT: "true" }), null, "missing password must skip, not throw");
});
