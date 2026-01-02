import { generateContent } from "../config/gemini.js";


function applyHardRules(jobConstraints, parsedResume) {
  const reasons = [];
  const hits = {};

  if (!jobConstraints) {
    return { hardFail: false, reasons: [], hits: {} };
  }

  // Gender rule (ONLY if explicitly specified as "male" or "female")
  if (jobConstraints.gender && jobConstraints.gender !== null) {
    const requiredGender = String(jobConstraints.gender).toLowerCase();
    const candidateGender = (parsedResume.gender || "").toLowerCase();

    // Only reject if gender is specified AND doesn't match
    if (candidateGender && requiredGender !== candidateGender) {
      reasons.push(
        `This position requires ${requiredGender} candidates. Your profile indicates ${candidateGender}.`
      );
      hits.gender = true;
    } else if (!candidateGender) {
      // If candidate hasn't specified gender but job requires it
      reasons.push(
        `This position requires ${requiredGender} candidates. Please update your gender in profile.`
      );
      hits.gender = true;
    }
  }

  // Experience rules
  const candidateExp = Number(parsedResume.yearsOfExperience || 0);

  if (
    jobConstraints.minYears !== null &&
    jobConstraints.minYears !== undefined
  ) {
    const minRequired = Number(jobConstraints.minYears);
    if (candidateExp < minRequired) {
      reasons.push(
        `Minimum ${minRequired} years of experience required. You have ${candidateExp} years.`
      );
      hits.minYears = true;
    }
  }

  if (
    jobConstraints.maxYears !== null &&
    jobConstraints.maxYears !== undefined
  ) {
    const maxAllowed = Number(jobConstraints.maxYears);
    if (candidateExp > maxAllowed) {
      reasons.push(
        `Maximum ${maxAllowed} years of experience allowed. You have ${candidateExp} years.`
      );
      hits.maxYears = true;
    }
  }

  return {
    hardFail: reasons.length > 0,
    reasons,
    hits,
  };
}

/** AI scoring (soft, flexible) */
async function scoreWithAI({ job, parsedResume }) {
  const prompt = `
You are an expert technical recruiter. Rate the job-candidate match on a scale of 0-100 and provide short reasons.

Return ONLY valid JSON in this format:
{
  "score": <number between 0-100>,
  "reasons": ["reason1", "reason2", "reason3"]
}

Job Details:
- Title: ${job.title}
- Type: ${job.jobType}
- Experience Level: ${job.experienceLevel || "unspecified"}
- Required Skills: ${JSON.stringify(job.skills || [])}
- Description: ${job.description}

Candidate Profile:
${JSON.stringify(parsedResume, null, 2)}

Consider:
1. Skill match percentage
2. Experience level alignment
3. Education relevance
4. Overall fit for the role

Return ONLY the JSON, nothing else.
`;

  try {
    const raw = await generateContent(prompt);
    const match = raw.match(/\{[\s\S]*\}/);

    if (!match) {
      return {
        score: 50,
        reasons: ["AI response could not be parsed. Default score assigned."],
      };
    }

    const json = JSON.parse(match[0]);
    return {
      score: Math.min(100, Math.max(0, Number(json.score) || 50)),
      reasons: Array.isArray(json.reasons)
        ? json.reasons.slice(0, 5)
        : ["Evaluation completed"],
    };
  } catch (error) {
    console.error("AI scoring error:", error);
    return {
      score: 50,
      reasons: ["AI evaluation failed. Default score assigned."],
    };
  }
}

/** AI resume parser */

async function parseResumeWithAI(resumeText) {
  const prompt = `
Parse the following resume text and extract information into a structured JSON format.

CRITICAL: Extract skills comprehensively - look for:
- Technical skills (programming languages, frameworks, tools)
- Software and technologies mentioned
- Certifications and platforms
- Any technical keywords

Required JSON structure:
{
  "name": string or null,
  "email": string or null,
  "phone": string or null,
  "skills": array of strings (BE COMPREHENSIVE - extract ALL technical skills, tools, technologies),
  "yearsOfExperience": number (total years, calculate from job history),
  "gender": "male" or "female" or null (only if explicitly mentioned),
  "location": {
    "city": string or null,
    "country": string or null
  },
  "education": array of strings (degrees, institutions)
}

Important:
- Extract EVERY technical skill, tool, framework, and technology mentioned
- Include programming languages, databases, cloud platforms, frameworks
- Look for skills in: job descriptions, projects, certifications, summary
- Return ONLY the JSON object, no markdown formatting

Resume Text:
${resumeText.slice(0, 15000)}
`;

  const fallback = {
    name: null,
    email: null,
    phone: null,
    skills: [],
    yearsOfExperience: 0,
    gender: null,
    location: { city: null, country: null },
    education: [],
  };

  try {
    console.log("🤖 Calling AI for resume parsing...");
    const raw = await generateContent(prompt);
    console.log("📥 AI response received, length:", raw.length);
    
    const match = raw.match(/\{[\s\S]*\}/);

    if (!match) {
      console.warn("⚠️ No JSON found in AI response");
      return fallback;
    }

    const parsed = JSON.parse(match[0]);
    console.log("✅ Parsed JSON:", {
      name: parsed.name,
      skillsCount: parsed.skills?.length,
      skills: parsed.skills,
    });

    // Sanitize and validate
    const result = {
      name: parsed.name || null,
      email: parsed.email || null,
      phone: parsed.phone || null,
      skills: Array.isArray(parsed.skills)
        ? parsed.skills
            .map((s) => String(s).trim())
            .filter(s => s.length > 0)
            .filter(Boolean)
        : [],
      yearsOfExperience: Math.max(0, Number(parsed.yearsOfExperience) || 0),
      gender: parsed.gender ? String(parsed.gender).toLowerCase() : null,
      location: {
        city: parsed.location?.city || null,
        country: parsed.location?.country || null,
      },
      education: Array.isArray(parsed.education)
        ? parsed.education
            .map((e) => String(e).trim())
            .filter(Boolean)
        : [],
    };

    console.log("✅ Final parsed result:", {
      name: result.name,
      skillsCount: result.skills.length,
      skills: result.skills,
    });

    return result;
  } catch (error) {
    console.error("❌ Resume parsing error:", error);
    return fallback;
  }
}

/** End-to-end evaluation */
async function evaluateCandidateAgainstJD({ job, parsedResume }) {
  // Apply hard rules first
  const hard = applyHardRules(job.hardConstraints, parsedResume);

  if (hard.hardFail) {
    return {
      decision: "rejected",
      matchScore: 0,
      reasons: hard.reasons,
      ruleHits: hard.hits,
    };
  }

  // Apply AI scoring for soft evaluation
  const ai = await scoreWithAI({ job, parsedResume });
  const decision = ai.score >= 60 ? "accepted" : "rejected";

  return {
    decision,
    matchScore: ai.score,
    reasons: ai.reasons,
    ruleHits: {},
  };
}

export {
  applyHardRules,
  scoreWithAI,
  parseResumeWithAI,
  evaluateCandidateAgainstJD,
};
