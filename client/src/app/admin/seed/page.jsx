"use client";

import { useState } from "react";

export default function SeedJobs() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);

  const seed = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/seed-jobs", {
        method: "POST",
      });
      const data = await res.json();
      setResponse(data);
    } catch (error) {
      setResponse({ error: error.message });
    }
    setLoading(false);
  };

  return (
    <div className="p-10">
      <h1 className="text-3xl font-semibold">Seed Sample Jobs</h1>

      <button
        onClick={seed}
        className="mt-4 px-6 py-3 bg-blue-600 text-white rounded"
      >
        {loading ? "Seeding..." : "Insert 12 Sample Jobs"}
      </button>

      {response && (
        <pre className="mt-6 bg-gray-100 p-4 rounded text-black">
          {JSON.stringify(response, null, 2)}
        </pre>
      )}
    </div>
  );
}
