"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const ROLE_OPTIONS = [
  { value: "both", label: "Seeker + Poster" },
  { value: "seeker", label: "Job Seeker only" },
  { value: "poster", label: "Job Poster only" },
];

export default function SeedPage() {
  const [loading, setLoading] = useState(null);
  const [response, setResponse] = useState(null);
  const [role, setRole] = useState("both");
  const [resetPassword, setResetPassword] = useState(false);

  const run = async (label, path) => {
    setLoading(label);
    try {
      const res = await fetch(`${API_URL}${path}`, { method: "POST" });
      setResponse(await res.json());
    } catch (error) {
      setResponse({ error: error.message });
    }
    setLoading(null);
  };

  const seedUsers = () =>
    run("users", `/seed-users?role=${role}${resetPassword ? "&reset=true" : ""}`);

  return (
    <div className="p-10 space-y-8">
      <h1 className="text-3xl font-semibold">Seed Data</h1>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Demo accounts</h2>
        <p className="text-sm text-gray-500">
          Seeker: sandeepsanu1230@gmail.com · Poster: sandeep.sanu1230@gmail.com ·
          password comes from <code>SEED_USER_PASSWORD</code> on the backend.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2">
            <span>I am a...</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded border px-3 py-2 text-black"
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={resetPassword}
              onChange={(e) => setResetPassword(e.target.checked)}
            />
            <span>Reset password if the account already exists</span>
          </label>

          <button
            onClick={seedUsers}
            disabled={!!loading}
            className="px-6 py-3 bg-emerald-600 text-white rounded disabled:opacity-60"
          >
            {loading === "users" ? "Seeding..." : "Seed Demo User(s)"}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Sample jobs</h2>
        <button
          onClick={() => run("jobs", "/seed-jobs")}
          disabled={!!loading}
          className="px-6 py-3 bg-blue-600 text-white rounded disabled:opacity-60"
        >
          {loading === "jobs" ? "Seeding..." : "Insert Sample Jobs"}
        </button>
      </section>

      {response && (
        <pre className="bg-gray-100 p-4 rounded text-black overflow-auto">
          {JSON.stringify(response, null, 2)}
        </pre>
      )}
    </div>
  );
}
