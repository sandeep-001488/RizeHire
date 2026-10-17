import express from "express";
import User from "../models/user.model.js";

/**
 * Seeds the demo accounts used for the live demo / interviews:
 *   - a SEEKER  (sandeepsanu1230@gmail.com)
 *   - a POSTER  (sandeep.sanu1230@gmail.com; Gmail ignores dots, so it is the same inbox,
 *     but a distinct value for the unique email index. "+alias" is rejected by the
 *     User schema email regex, so a dotted variant is used instead.)
 *
 * Configure through env vars (no password is stored in this file on purpose):
 *   SEED_USER_PASSWORD    REQUIRED - login password for both seeded accounts
 *   SEED_USER_EMAIL       seeker email   (default sandeepsanu1230@gmail.com)
 *   SEED_POSTER_EMAIL     poster email   (default sandeep.sanu1230@gmail.com)
 *   SEED_USER_GENDER      seeker gender: male | female | other (seekers require one)
 *   SEED_SECRET           if set, the HTTP route requires header x-seed-secret
 *
 * The password is hashed by the User model's pre-save hook, so users are
 * created with `new User().save()` rather than insertMany/updateOne.
 */

export const SEED_ROLES = ["seeker", "poster"];
export const DEFAULT_SEED_USER_EMAIL = "sandeepsanu1230@gmail.com";
export const DEFAULT_SEED_POSTER_EMAIL = "sandeep.sanu1230@gmail.com";

const SEEKER_SKILLS = [
  "JavaScript", "TypeScript", "Python", "C++", "SQL",
  "React", "Next.js", "Redux", "Tailwind CSS",
  "Node.js", "Express.js", "Flask", "REST APIs", "Socket.IO",
  "MongoDB", "PostgreSQL", "MySQL", "Prisma",
  "AWS", "Docker", "Jenkins", "CI/CD", "Git",
  "BERT", "Scikit-learn", "SHAP", "LIME", "TF-IDF",
];

function requirePassword(env) {
  if (!env.SEED_USER_PASSWORD) {
    throw new Error("SEED_USER_PASSWORD is not set. Set it in backend/.env (or the Render dashboard) before seeding.");
  }
  return env.SEED_USER_PASSWORD;
}

export function buildSeekerUser(env = process.env) {
  const password = requirePassword(env);
  const email = (env.SEED_USER_EMAIL || DEFAULT_SEED_USER_EMAIL).toLowerCase();

  return {
    name: "Sandeep Kumar",
    email,
    password,
    role: "seeker",
    gender: env.SEED_USER_GENDER || "other",
    bio:
      "SDE-1 at ClearTax working on a production TypeScript/React platform. " +
      "Built RizeHire: an AI job portal with a Gemini → BERT → TF-IDF recommendation " +
      "pipeline, SHAP/LIME explainability, Socket.IO messaging and JWT auth.",
    linkedinUrl: "https://www.linkedin.com/in/sandeep-kumar-934237260/",
    location: "Bangalore, India",
    skills: SEEKER_SKILLS,
    preferences: { willingToRelocate: true, relocationType: "within-country" },
    parsedResume: {
      name: "Sandeep Kumar",
      email,
      skills: SEEKER_SKILLS,
      technicalSkills: ["Next.js", "Node.js", "Flask", "BERT", "Socket.IO"],
      yearsOfExperience: 1,
      gender: env.SEED_USER_GENDER || null,
      location: { city: "Bangalore", country: "India" },
      education: ["B.Tech Computer Science and Engineering, IIIT Ranchi (2022-2026), CGPA 8.58"],
      resume_confidence: 0.9,
      parsed_summary:
        "Software engineer with full-stack experience in Next.js, Node.js and Python, " +
        "and applied ML experience fine-tuning BERT models for resume-job matching.",
    },
  };
}

export function buildPosterUser(env = process.env) {
  const password = requirePassword(env);
  const email = (env.SEED_POSTER_EMAIL || DEFAULT_SEED_POSTER_EMAIL).toLowerCase();

  return {
    name: "Sandeep Kumar (Recruiter)",
    email,
    password,
    role: "poster",
    bio:
      "Demo recruiter account for RizeHire. Posts jobs, reviews AI-screened applicants, " +
      "and chats with candidates in real time.",
    linkedinUrl: "https://www.linkedin.com/in/sandeep-kumar-934237260/",
    location: "Bangalore, India",
    skills: ["Technical Recruiting", "Hiring", "Interviewing"],
  };
}

/** Builds the profile for one role. Kept for backward compatibility: no role = seeker. */
export function buildSeedUser(env = process.env, role = "seeker") {
  if (role === "poster") return buildPosterUser(env);
  if (role === "seeker") return buildSeekerUser(env);
  throw new Error(`Unknown seed role "${role}". Use one of: ${SEED_ROLES.join(", ")}`);
}

/**
 * Creates the seed user for `role`, or updates the profile of an existing one.
 * The password is only (re)set when the user is new or `resetPassword` is true.
 */
export async function seedUser({ role = "seeker", resetPassword = false, env = process.env } = {}) {
  const data = buildSeedUser(env, role);
  const existing = await User.findOne({ email: data.email }).select("+password");

  if (!existing) {
    const user = await new User(data).save();
    return { role, created: true, updated: false, passwordReset: true, userId: user._id, email: user.email };
  }

  const { password, ...profile } = data;
  Object.assign(existing, profile);
  if (resetPassword) existing.password = password; // triggers the hashing hook
  await existing.save();

  return { role, created: false, updated: true, passwordReset: resetPassword, userId: existing._id, email: existing.email };
}

/** Parses "seeker" | "poster" | "both" (default both) into the list of roles to seed. */
export function resolveRoles(input) {
  const value = String(input || "both").toLowerCase();
  if (value === "both" || value === "all") return [...SEED_ROLES];
  if (SEED_ROLES.includes(value)) return [value];
  throw new Error(`Unknown role "${input}". Use seeker, poster or both.`);
}

export async function seedUsers({ roles = SEED_ROLES, resetPassword = false, env = process.env } = {}) {
  const results = [];
  for (const role of roles) {
    results.push(await seedUser({ role, resetPassword, env }));
  }
  return results;
}

/**
 * Runs once at server start-up, after MongoDB connects (see app.js).
 * Lets the deployed server seed itself, so no local MONGODB_URI or shell is needed.
 *
 *   SEED_ON_BOOT=true            turn it on
 *   SEED_USER_PASSWORD=...       required
 *   SEED_ROLES=both              seeker | poster | both (default both)
 *   SEED_RESET_PASSWORD=true     also reset passwords of existing accounts (default off)
 *
 * Never throws: a seeding problem is logged and the server keeps running.
 */
export async function seedOnBoot(env = process.env) {
  if (env.SEED_ON_BOOT !== "true") return null;

  if (!env.SEED_USER_PASSWORD) {
    console.warn("🌱 SEED_ON_BOOT is on but SEED_USER_PASSWORD is not set; skipping user seeding.");
    return null;
  }

  try {
    const roles = resolveRoles(env.SEED_ROLES);
    const results = await seedUsers({ roles, resetPassword: env.SEED_RESET_PASSWORD === "true", env });
    for (const r of results) {
      console.log(`🌱 Seeded ${r.role}: ${r.email} (${r.created ? "created" : "updated"}${r.passwordReset ? ", password set" : ""})`);
    }
    return results;
  } catch (error) {
    console.error("🌱 User seeding on boot failed:", error.message);
    return null;
  }
}

const router = express.Router();

/**
 * POST /api/seed-users?role=seeker|poster|both&reset=true
 * Body alternative: { "role": "poster", "resetPassword": true }
 */
router.post("/seed-users", async (req, res) => {
  try {
    if (process.env.SEED_SECRET && req.get("x-seed-secret") !== process.env.SEED_SECRET) {
      return res.status(403).json({ success: false, error: "Invalid seed secret" });
    }

    const roles = resolveRoles(req.query.role ?? req.body?.role);
    const resetPassword = req.query.reset === "true" || req.body?.resetPassword === true;
    const users = await seedUsers({ roles, resetPassword });

    return res.json({
      success: true,
      users,
      note: "New accounts (and reset ones) use the password from SEED_USER_PASSWORD. " +
            "Existing accounts keep their password unless reset=true.",
    });
  } catch (error) {
    console.error("User seed error:", error);
    const status = /Unknown role/.test(error.message) ? 400 : 500;
    return res.status(status).json({ success: false, error: error.message });
  }
});

export default router;
