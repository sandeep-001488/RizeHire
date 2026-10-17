/**
 * Seed the demo accounts directly against MONGODB_URI (works for the
 * Render/Atlas database too, no running server needed).
 *
 *   cd backend
 *   node scripts/seedUser.js                    # seeker + poster; create or refresh profiles
 *   node scripts/seedUser.js --role=seeker      # only the seeker
 *   node scripts/seedUser.js --role=poster      # only the poster
 *   node scripts/seedUser.js --reset            # also reset the password(s)
 *
 * Env: MONGODB_URI and SEED_USER_PASSWORD (required);
 *      SEED_USER_EMAIL / SEED_POSTER_EMAIL / SEED_USER_GENDER (optional)
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { seedUsers, resolveRoles } from "../src/seeds/user.seeds.js";

dotenv.config();

const args = process.argv.slice(2);
const resetPassword = args.includes("--reset");
const roleArg = (args.find((a) => a.startsWith("--role=")) || "--role=both").split("=")[1];

const missing = ["MONGODB_URI", "SEED_USER_PASSWORD"].filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing ${missing.join(" and ")}.`);
  console.error("Add them to backend/.env (copy MONGODB_URI from the Render dashboard -> Environment),");
  console.error("then run this from the backend folder:  cd backend && npm run seed:user -- --role=poster --reset");
  process.exit(1);
}

try {
  const roles = resolveRoles(roleArg);
  await mongoose.connect(process.env.MONGODB_URI);
  const results = await seedUsers({ roles, resetPassword });
  console.log(JSON.stringify(results, null, 2));
} catch (error) {
  console.error("Seed failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
