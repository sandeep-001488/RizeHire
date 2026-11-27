import Job from "../models/job.model.js";
import Application from "../models/application.model.js";
import Joi from "joi";
import axios from "axios";
import { isBertAvailable } from "../services/bertAvailability.js";
import { escapeRegex, stripEmptyFields } from "../utils/requestCleaning.js";
import { calculateJobMatch, rankJobsWithTfidf } from "../utils/jobMatching.js";
import { predictAcceptance } from "../utils/mlModel.js";
import { generateContent } from "../config/gemini.js";

const PYTHON_SERVICE_URL = process.env.PYTHON_EXPLAINABILITY_URL || 'http://localhost:5001';

function extractTextData(user, job) {
  const parsedResume = user.parsedResume || {};
  const skills = [
    ...(parsedResume.skills || []),
    ...(parsedResume.technicalSkills || []),
    ...(user.skills || []),
  ].join(', ');

  const resumeParts = [
    parsedResume.parsed_summary || '',
    skills ? `Skills: ${skills}` : '',
    parsedResume.yearsOfExperience ? `Experience: ${parsedResume.yearsOfExperience} years` : '',
    parsedResume.education?.length ? `Education: ${parsedResume.education.join(', ')}` : '',
    user.bio || '',
  ].filter(Boolean);

  return {
    resumeText: resumeParts.join('. ') || '',
    jobDescription: job.description || '',
  };
}

/**
 * Get BERT-based match score from Python service
 * Falls back to traditional matching if service is unavailable
 */
async function getBERTMatchScore(user, job, traditionalMatch) {
  try {
    const textData = extractTextData(user, job);

    if (!textData.resumeText || !textData.jobDescription) {
      return null;
    }

    const response = await axios.post(`${PYTHON_SERVICE_URL}/predict`, {
      resume_text: textData.resumeText,
      job_description: textData.jobDescription,
      skills: traditionalMatch.breakdown?.skills?.score || 50,
      experience: traditionalMatch.breakdown?.experience?.score || 50,
      location: traditionalMatch.breakdown?.location?.score || 50,
      salary: traditionalMatch.breakdown?.salary?.score || 50,
    }, { timeout: 10000 });

    if (response.data?.success) {
      return {
        score: Math.round(response.data.prediction),
        bertSemanticScore: Math.round(response.data.bert_semantic_score),
        breakdown: response.data.breakdown,
      };
    }
    return null;
  } catch (error) {
    // Silently fall back to traditional matching
    return null;
  }
}

const hardConstraintsSchema = Joi.object({
  gender: Joi.string().valid("male", "female").allow(null).optional(),
  minYears: Joi.number().min(0).allow(null).optional(),
});

const createJobSchema = Joi.object({
  title: Joi.string().min(5).max(200).required(),
  category: Joi.string()
    .valid(
      "technology",
      "business",
      "marketing",
      "finance",
      "healthcare",
      "education",
      "creative",
      "operations",
      "sales",
      "engineering",
      "legal",
      "hr",
      "other"
    )
    .required(),
  industry: Joi.string()
    .valid(
      "IT & Software",
      "Banking & Finance",
      "Healthcare & Medical",
      "Education & Training",
      "Retail & E-commerce",
      "Manufacturing",
      "Consulting",
      "Media & Entertainment",
      "Real Estate",
      "Hospitality & Tourism",
      "Telecommunications",
      "Automotive",
      "Energy & Utilities",
      "Government & Public Sector",
      "Non-Profit",
      "Other"
    )
    .optional(),
  company: Joi.object({
    name: Joi.string().max(200).optional(),
    website: Joi.string().uri().optional(),
    description: Joi.string().max(1000).optional(),
  }).optional(),
  description: Joi.string().min(20).max(5000).required(),
  skills: Joi.array().items(Joi.string().max(50)).max(20).optional(),
  jobType: Joi.string()
    .valid("full-time", "part-time", "contract", "freelance", "internship")
    .required(),
  workMode: Joi.string().valid("remote", "hybrid", "onsite").required(),
  location: Joi.object({
    city: Joi.string().max(100),
    state: Joi.string().max(100),
    country: Joi.string().max(100),
  }).optional(),
  budget: Joi.object({
    min: Joi.number().min(0),
    max: Joi.number().min(0),
    currency: Joi.string().default("USD"),
    period: Joi.string()
      .valid("hourly", "daily", "monthly", "yearly", "project")
      .default("monthly"),
  }).optional(),
  experienceLevel: Joi.string()
    .valid("entry", "junior", "mid", "senior", "expert")
    .optional(),
  hardConstraints: hardConstraintsSchema.optional(),
  applicationUrl: Joi.string().uri().optional(),
  applicationEmail: Joi.string().email().optional(),
  applicationDeadline: Joi.date().greater("now").optional(),
  tags: Joi.array().items(Joi.string().max(30)).max(10).optional(),
});

const createJob = async (req, res) => {
  try {
    const cleanedBody = stripEmptyFields(req.body);

    const { error, value } = createJobSchema.validate(cleanedBody);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const job = await Job.create({
      ...value,
      postedBy: req.user._id,
    });

    await job.populate("postedBy", "name email profileImage");

    res.status(201).json({
      success: true,
      message: "Job posted successfully",
      data: { job },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Application counts for many jobs in ONE query (was one countDocuments per job).
 * The backend and database live in different regions, so each extra round trip
 * costs ~200 ms; this keeps the jobs list to a constant number of queries.
 */
async function applicationCountsByJob(jobIds) {
  if (!jobIds.length) return new Map();
  const rows = await Application.aggregate([
    { $match: { jobId: { $in: jobIds } } },
    { $group: { _id: "$jobId", count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.count]));
}

const getJobs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      skills,
      jobType,
      workMode,
      location,
      experienceLevel,
      category,
      industry,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filter = { isActive: true };

    // Collect applied job IDs to mark (not exclude) them in the results.
    // Started here and awaited below so it runs in parallel with the job query.
    const appliedJobsPromise = req.user
      ? Application.find({ applicantId: req.user._id }).select("jobId").lean()
      : Promise.resolve([]);

    // Search terms are user input: escape them so "C++" or "(" can't break the regex (or be a ReDoS)
    const textMatch = (value) => new RegExp(escapeRegex(String(value).trim()), "i");
    const orGroups = [];

    if (skills) {
      const skillsArray = skills.split(",").filter((s) => s.trim()).map(textMatch);
      filter.skills = { $in: skillsArray };
    }

    if (jobType) {
      filter.jobType = jobType;
    }

    if (workMode) {
      filter.workMode = workMode;
    }

    if (location) {
      orGroups.push([
        { "location.city": textMatch(location) },
        { "location.state": textMatch(location) },
        { "location.country": textMatch(location) },
      ]);
    }

    if (experienceLevel) {
      filter.experienceLevel = experienceLevel;
    }

    if (category) {
      filter.category = category;
    }

    if (industry) {
      filter.industry = industry;
    }

    if (search) {
      orGroups.push([
        { title: textMatch(search) },
        { description: textMatch(search) },
        { "company.name": textMatch(search) },
      ]);
    }

    // Location and search are each "any of these fields"; both must hold, so AND the groups
    // (assigning filter.$or twice used to make search silently drop the location filter)
    if (orGroups.length === 1) filter.$or = orGroups[0];
    else if (orGroups.length > 1) filter.$and = orGroups.map((group) => ({ $or: group }));

    // Seekers fetch ALL jobs so we can sort by match score before paginating;
    // employers/guests use cheaper DB-level sorting + pagination
    const isSeeker = req.user && req.user.role === "seeker";
    let jobsQuery;
    if (isSeeker) {
      jobsQuery = Job.find(filter)
        .populate("postedBy", "name email profileImage")
        .lean();
    } else {
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

      jobsQuery = Job.find(filter)
        .populate("postedBy", "name email profileImage")
        .sort(sortOptions)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();
    }

    // Independent queries run together: one round trip instead of three in a row.
    // Seekers load every matching job anyway, so their total needs no extra count query.
    const [allJobs, appliedJobs, totalForPage, bertUp] = await Promise.all([
      jobsQuery,
      appliedJobsPromise,
      isSeeker ? Promise.resolve(null) : Job.countDocuments(filter),
      isSeeker ? isBertAvailable() : Promise.resolve(false),
    ]);
    const appliedJobIdsArray = appliedJobs.map((app) => app.jobId.toString());
    const total = isSeeker ? allJobs.length : totalForPage;

    const counts = await applicationCountsByJob(allJobs.map((job) => job._id));
    const jobsWithApplicationCount = allJobs.map((job) => ({
      ...job,
      applicationCount: counts.get(String(job._id)) || 0,
    }));

    let jobsWithMatchScores = jobsWithApplicationCount;
    if (isSeeker) {
      jobsWithMatchScores = await Promise.all(
        jobsWithApplicationCount.map(async (job) => {
          const match = calculateJobMatch(req.user, job);
          const bertResult = bertUp ? await getBERTMatchScore(req.user, job, match) : null;

          let finalScore = match.overallScore;
          let matchSource = 'traditional';
          let bertSemanticScore = null;

          if (bertResult) {
            finalScore = bertResult.score;
            bertSemanticScore = bertResult.bertSemanticScore;
            matchSource = 'bert';

            // Apply skills penalty on BERT score too
            const skillScore = match.breakdown?.skills?.score || 0;
            if (skillScore === 0) {
              finalScore = Math.min(finalScore, 20);
            } else if (skillScore < 20) {
              finalScore = Math.min(finalScore, 30);
            } else if (skillScore < 40) {
              finalScore = Math.min(finalScore, 40);
            }
          }

          let matchCategory, matchBadge;
          if (finalScore >= 80) {
            matchCategory = 'Excellent Match';
            matchBadge = 'best-match';
          } else if (finalScore >= 60) {
            matchCategory = 'Good Match';
            matchBadge = 'good-match';
          } else if (finalScore >= 40) {
            matchCategory = 'Fair Match';
            matchBadge = 'fair-match';
          } else {
            matchCategory = 'Needs Development';
            matchBadge = 'low-match';
          }

          const mlPrediction = await predictAcceptance(match.breakdown);
          const isApplied = appliedJobIdsArray.includes(job._id.toString());

          const now = new Date();
          const isDeadlinePassed = job.applicationDeadline && new Date(job.applicationDeadline) < now;
          const canApply = !isDeadlinePassed && job.acceptingApplications;

          return {
            ...job,
            matchScore: finalScore,
            matchCategory,
            matchBadge,
            matchBreakdown: match.breakdown,
            whyThisJob: match.whyThisJob,
            recommendation: match.recommendation,
            matchSource,
            bertSemanticScore,
            isApplied,
            isDeadlinePassed,
            canApply,
            mlPrediction: {
              acceptanceProbability: mlPrediction.acceptanceProbability,
              confidence: mlPrediction.confidence,
              recommendation: mlPrediction.recommendation,
              insight: mlPrediction.insight,
            },
          };
        })
      );

      // Sort by match score, tie-break on ML acceptance probability (both descending)
      jobsWithMatchScores.sort((a, b) => {
        const matchScoreDiff = b.matchScore - a.matchScore;
        if (matchScoreDiff !== 0) return matchScoreDiff;

        const aAcceptance = a.mlPrediction?.acceptanceProbability || 0;
        const bAcceptance = b.mlPrediction?.acceptanceProbability || 0;
        return bAcceptance - aAcceptance;
      });

      // Paginate only after the full set is sorted
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      jobsWithMatchScores = jobsWithMatchScores.slice(startIndex, endIndex);
    }

    res.json({
      success: true,
      data: {
        jobs: jobsWithMatchScores,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate(
      "postedBy",
      "name email profileImage bio linkedinUrl"
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    const applicationCount = await Application.countDocuments({
      jobId: job._id,
    });

    let hasApplied = false;
    if (req.user) {
      const userApplication = await Application.findOne({
        jobId: job._id,
        applicantId: req.user._id,
      });
      hasApplied = !!userApplication;

      if (job.postedBy && req.user._id.toString() !== job.postedBy._id.toString()) {
        await job.incrementViews();
      }
    }

    // Deadline takes priority over the acceptingApplications flag
    const now = new Date();
    const isDeadlinePassed = job.applicationDeadline && new Date(job.applicationDeadline) < now;
    const canApply = !isDeadlinePassed && job.acceptingApplications;

    res.json({
      success: true,
      data: {
        job: {
          ...job.toObject(),
          hasApplied,
          applicationCount,
          isDeadlinePassed,
          canApply,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this job",
      });
    }

    const updateSchema = Joi.object({
      title: Joi.string().min(5).max(200).optional(),
      category: Joi.string()
        .valid(
          "technology",
          "business",
          "marketing",
          "finance",
          "healthcare",
          "education",
          "creative",
          "operations",
          "sales",
          "engineering",
          "legal",
          "hr",
          "other"
        )
        .optional(),
      industry: Joi.string()
        .valid(
          "IT & Software",
          "Banking & Finance",
          "Healthcare & Medical",
          "Education & Training",
          "Retail & E-commerce",
          "Manufacturing",
          "Consulting",
          "Media & Entertainment",
          "Real Estate",
          "Hospitality & Tourism",
          "Telecommunications",
          "Automotive",
          "Energy & Utilities",
          "Government & Public Sector",
          "Non-Profit",
          "Other"
        )
        .optional(),
      company: Joi.object({
        name: Joi.string().max(200).allow("").optional(),
        website: Joi.string().uri().allow("").optional(),
        description: Joi.string().max(1000).allow("").optional(),
      }).optional(),
      description: Joi.string().min(20).max(5000).optional(),
      skills: Joi.array().items(Joi.string().max(50)).max(20).optional(),
      jobType: Joi.string()
        .valid("full-time", "part-time", "contract", "freelance", "internship")
        .optional(),
      workMode: Joi.string().valid("remote", "hybrid", "onsite").optional(),
      experienceLevel: Joi.string()
        .valid("entry", "junior", "mid", "senior", "expert")
        .optional(),
      location: Joi.object({
        city: Joi.string().max(100).allow(""),
        state: Joi.string().max(100).allow(""),
        country: Joi.string().max(100).allow(""),
      }).optional(),
      budget: Joi.object({
        min: Joi.number().min(0).allow(null, ""),
        max: Joi.number().min(0).allow(null, ""),
        currency: Joi.string().optional(),
        period: Joi.string()
          .valid("hourly", "daily", "monthly", "yearly", "project")
          .optional(),
      }).optional(),
      hardConstraints: hardConstraintsSchema.optional(),
      applicationUrl: Joi.string().uri().optional(),
      applicationEmail: Joi.string().email().optional(),
      applicationDeadline: Joi.date().greater("now").allow(null, "").optional(),
      acceptingApplications: Joi.boolean().optional(),
      isActive: Joi.boolean().optional(),
      tags: Joi.array().items(Joi.string().max(30)).max(10).optional(),
    });

    const cleanedBody = { ...req.body };
    if (cleanedBody.applicationEmail === "") {
      delete cleanedBody.applicationEmail;
    }
    if (cleanedBody.applicationUrl === "") {
      delete cleanedBody.applicationUrl;
    }

    const { error, value } = updateSchema.validate(cleanedBody);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    Object.keys(value).forEach((key) => {
      if (value[key] === undefined || value[key] === null) {
        delete value[key];
      }
      if (typeof value[key] === "object" && !Array.isArray(value[key])) {
        Object.keys(value[key]).forEach((nestedKey) => {
          if (
            value[key][nestedKey] === undefined ||
            value[key][nestedKey] === null ||
            value[key][nestedKey] === ""
          ) {
            delete value[key][nestedKey];
          }
        });
      }
    });

    const updatedJob = await Job.findByIdAndUpdate(req.params.id, value, {
      new: true,
      runValidators: true,
    }).populate("postedBy", "name email profileImage");

    res.json({
      success: true,
      message: "Job updated successfully",
      data: { job: updatedJob },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this job",
      });
    }

    await Application.deleteMany({ jobId: req.params.id });
    await Job.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Job deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getMyJobs = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const jobs = await Job.find({ postedBy: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    // One aggregation for every job's count and latest application (was 2 queries per job)
    const stats = jobs.length
      ? await Application.aggregate([
          { $match: { jobId: { $in: jobs.map((j) => j._id) } } },
          { $group: { _id: "$jobId", count: { $sum: 1 }, latest: { $max: "$appliedAt" } } },
        ])
      : [];
    const statsByJob = new Map(stats.map((r) => [String(r._id), r]));

    const jobsWithApplicationData = jobs.map((job) => {
      const st = statsByJob.get(String(job._id));
      return {
        ...job,
        applicationCount: st?.count || 0,
        latestApplicationDate: st?.latest || null,
      };
    });

    // Jobs with recent applications first; fall back to creation date when none
    jobsWithApplicationData.sort((a, b) => {
      if (a.latestApplicationDate && !b.latestApplicationDate) return -1;
      if (!a.latestApplicationDate && b.latestApplicationDate) return 1;

      if (a.latestApplicationDate && b.latestApplicationDate) {
        return new Date(b.latestApplicationDate) - new Date(a.latestApplicationDate);
      }

      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedJobs = jobsWithApplicationData.slice(startIndex, endIndex);

    const total = jobs.length;

    res.json({
      success: true,
      data: {
        jobs: paginatedJobs,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Tiered Recommendation System:
 * Tier 1: Gemini API (AI-powered ranking & scoring)
 * Tier 2: BERT Python Service (semantic matching)
 * Tier 3: TF-IDF + keyword matching (fallback, no external service)
 */

async function getGeminiRecommendations(user, jobs) {
  const parsedResume = user.parsedResume || {};
  const candidateSkills = [
    ...(parsedResume.skills || []),
    ...(parsedResume.technicalSkills || []),
    ...(user.skills || []),
  ];

  const candidateProfile = {
    skills: candidateSkills,
    experience: parsedResume.yearsOfExperience || 0,
    education: parsedResume.education || [],
    summary: parsedResume.parsed_summary || user.bio || '',
    location: user.location || parsedResume.location || '',
  };

  // Build compact job summaries (limit to 20 jobs to stay within token limits)
  const jobSummaries = jobs.slice(0, 20).map((job, index) => ({
    index,
    id: job._id.toString(),
    title: job.title,
    skills: (job.skills || []).join(', '),
    experienceLevel: job.experienceLevel || 'mid',
    workMode: job.workMode || '',
    location: job.location ? `${job.location.city || ''}, ${job.location.country || ''}` : '',
    description: (job.description || '').substring(0, 200),
  }));

  const prompt = `You are an AI recruitment expert. Analyze the candidate profile and rank the jobs by relevance.

CANDIDATE PROFILE:
- Skills: ${candidateProfile.skills.join(', ') || 'Not specified'}
- Experience: ${candidateProfile.experience} years
- Education: ${Array.isArray(candidateProfile.education) ? candidateProfile.education.join(', ') : candidateProfile.education || 'Not specified'}
- Summary: ${candidateProfile.summary || 'Not provided'}
- Location: ${typeof candidateProfile.location === 'object' ? `${candidateProfile.location.city || ''}, ${candidateProfile.location.country || ''}` : candidateProfile.location || 'Not specified'}

AVAILABLE JOBS:
${jobSummaries.map(j => `[${j.index}] ${j.title} | Skills: ${j.skills} | Level: ${j.experienceLevel} | Mode: ${j.workMode} | Location: ${j.location}`).join('\n')}

INSTRUCTIONS:
For each job, provide a match score (0-100) and a brief reason. Consider:
1. Skill overlap (most important - 50% weight)
2. Experience level fit (35% weight)
3. Location/work mode compatibility (15% weight)

Respond ONLY with a valid JSON array, no markdown, no code blocks, no extra text. Format:
[{"index": 0, "score": 85, "reason": "Strong skill match in React, Node.js", "matchCategory": "Excellent Match", "whyThisJob": "Strong match: React, Node.js • Great experience fit"}, ...]

Sort by score descending. Only include jobs with score > 10.`;

  const responseText = await generateContent(prompt);

  let geminiResults;
  try {
    // Strip markdown code fences Gemini sometimes wraps the JSON in
    let cleanText = responseText.trim();
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    geminiResults = JSON.parse(cleanText);
  } catch (parseError) {
    console.error("❌ Failed to parse Gemini response:", parseError.message);
    throw new Error("Gemini returned invalid JSON");
  }

  if (!Array.isArray(geminiResults) || geminiResults.length === 0) {
    throw new Error("Gemini returned empty results");
  }

  const scoredJobs = geminiResults
    .filter(r => r.index !== undefined && r.index < jobs.length)
    .map(result => {
      const job = jobs[result.index];
      const score = Math.min(Math.max(Math.round(result.score || 0), 0), 100);

      let matchBadge = 'low-match';
      let matchCategory = result.matchCategory || 'Needs Development';
      if (score >= 80) { matchBadge = 'best-match'; matchCategory = 'Excellent Match'; }
      else if (score >= 60) { matchBadge = 'good-match'; matchCategory = 'Good Match'; }
      else if (score >= 40) { matchBadge = 'fair-match'; matchCategory = 'Fair Match'; }

      return {
        ...job,
        matchScore: score,
        matchCategory,
        matchBadge,
        whyThisJob: result.whyThisJob || result.reason || '',
        recommendation: score >= 60
          ? 'We recommend applying to this position!'
          : score >= 40
            ? "Consider applying if you're willing to learn the missing skills."
            : 'Focus on positions that better match your current skill set.',
        matchBreakdown: {
          skills: { score, matchPercentage: score },
          experience: { score, explanation: result.reason || '' },
          location: { score: 100, explanation: '' },
          salary: { score: 50, explanation: '' },
        },
        recommendationSource: 'gemini',
      };
    });

  return scoredJobs.sort((a, b) => b.matchScore - a.matchScore);
}

async function getBERTRecommendations(user, jobs) {
  // Fail fast so the caller drops to the TF-IDF tier instead of waiting on per-job timeouts
  if (!(await isBertAvailable())) {
    throw new Error("BERT service unavailable");
  }

  const results = [];

  for (const job of jobs.slice(0, 20)) {
    const traditionalMatch = calculateJobMatch(user, job);
    const bertResult = await getBERTMatchScore(user, job, traditionalMatch);

    if (bertResult) {
      const bertScore = bertResult.score;
      const skillsScore = traditionalMatch.breakdown?.skills?.score || 0;
      const experienceScore = traditionalMatch.breakdown?.experience?.score || 0;
      const locationScore = traditionalMatch.breakdown?.location?.score || 0;
      const salaryScore = traditionalMatch.breakdown?.salary?.score || 0;

      // Hybrid: BERT 40% + Skills 30% + Experience 15% + Location 10% + Salary 5%
      let finalScore = Math.round(
        (bertScore * 0.40) +
        (skillsScore * 0.30) +
        (experienceScore * 0.15) +
        (locationScore * 0.10) +
        (salaryScore * 0.05)
      );

      // Apply skills penalty (same as in getJobs)
      if (skillsScore === 0) {
        finalScore = Math.min(finalScore, 20);
      } else if (skillsScore < 20) {
        finalScore = Math.min(finalScore, 30);
      } else if (skillsScore < 40) {
        finalScore = Math.min(finalScore, 40);
      }

      let matchCategory = 'Needs Development';
      let matchBadge = 'low-match';
      if (finalScore >= 80) { matchCategory = 'Excellent Match'; matchBadge = 'best-match'; }
      else if (finalScore >= 60) { matchCategory = 'Good Match'; matchBadge = 'good-match'; }
      else if (finalScore >= 40) { matchCategory = 'Fair Match'; matchBadge = 'fair-match'; }

      results.push({
        ...job,
        matchScore: finalScore,
        matchCategory,
        matchBadge,
        matchBreakdown: traditionalMatch.breakdown,
        whyThisJob: traditionalMatch.whyThisJob || '',
        recommendation: traditionalMatch.recommendation || '',
        bertScore: bertResult.bertSemanticScore,
        recommendationSource: 'bert',
      });
    } else {
      results.push({
        ...job,
        matchScore: traditionalMatch.overallScore,
        matchCategory: traditionalMatch.matchCategory,
        matchBadge: traditionalMatch.matchBadge,
        matchBreakdown: traditionalMatch.breakdown,
        whyThisJob: traditionalMatch.whyThisJob || '',
        recommendation: traditionalMatch.recommendation || '',
        recommendationSource: 'traditional',
      });
    }
  }

  if (!results.some((r) => r.recommendationSource === 'bert')) {
    throw new Error("BERT returned no scores");
  }

  return results.sort((a, b) => b.matchScore - a.matchScore);
}

const getRecommendations = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    if (!req.user || req.user.role !== "seeker") {
      return res.status(403).json({
        success: false,
        message: "Only seekers can get recommendations",
      });
    }

    console.log("🎯 Generating personalized recommendations for:", req.user.name);

    const [allJobs, appliedJobIds] = await Promise.all([
      Job.find({ isActive: true })
        .populate("postedBy", "name email profileImage")
        .lean(),
      Application.find({ applicantId: req.user._id })
        .select("jobId")
        .lean(),
    ]);

    const appliedJobIdsArray = appliedJobIds.map(app => app.jobId.toString());
    const unappliedJobs = allJobs.filter(job => !appliedJobIdsArray.includes(job._id.toString()));

    let rankedJobs = [];
    let recommendationSource = 'traditional';

    // TIER 1: Gemini API
    try {
      console.log("🤖 Tier 1: Attempting Gemini API recommendations...");
      rankedJobs = await getGeminiRecommendations(req.user, unappliedJobs);
      recommendationSource = 'gemini';
      console.log(`✅ Gemini returned ${rankedJobs.length} recommendations`);
    } catch (geminiError) {
      console.warn("⚠️ Gemini API failed:", geminiError.message);

      // TIER 2: BERT Python service
      try {
        console.log("🧠 Tier 2: Attempting BERT recommendations...");
        rankedJobs = await getBERTRecommendations(req.user, unappliedJobs);
        recommendationSource = 'bert';
        console.log(`✅ BERT returned ${rankedJobs.length} recommendations`);
      } catch (bertError) {
        console.warn("⚠️ BERT service failed:", bertError.message);

        // TIER 3: Traditional keyword matching
        console.log("📊 Tier 3: Using TF-IDF + keyword matching...");
        rankedJobs = rankJobsWithTfidf(unappliedJobs, req.user);
        recommendationSource = 'tfidf';
        console.log(`✅ TF-IDF matching returned ${rankedJobs.length} recommendations`);
      }
    }

    const recommendations = rankedJobs.slice(0, parseInt(limit));

    const recCounts = await applicationCountsByJob(recommendations.map((job) => job._id));
    const recommendationsWithCount = await Promise.all(
      recommendations.map(async (job) => {
        const applicationCount = recCounts.get(String(job._id)) || 0;

        const mlPrediction = await predictAcceptance(job.matchBreakdown);

        return {
          ...job,
          applicationCount,
          mlPrediction: {
            acceptanceProbability: mlPrediction.acceptanceProbability,
            confidence: mlPrediction.confidence,
            recommendation: mlPrediction.recommendation,
            insight: mlPrediction.insight,
          },
          recommendationSource: job.recommendationSource || recommendationSource,
        };
      })
    );

    recommendationsWithCount.sort((a, b) => {
      const matchScoreDiff = b.matchScore - a.matchScore;
      if (matchScoreDiff !== 0) return matchScoreDiff;

      const aAcceptance = a.mlPrediction?.acceptanceProbability || 0;
      const bAcceptance = b.mlPrediction?.acceptanceProbability || 0;
      return bAcceptance - aAcceptance;
    });

    res.json({
      success: true,
      data: {
        recommendations: recommendationsWithCount,
        total: rankedJobs.length,
        source: recommendationSource,
      },
    });
  } catch (error) {
    console.error("Error getting recommendations:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const searchSkills = async (req, res) => {
  try {
    const { q = "" } = req.query;

    if (!q || q.length < 1) {
      return res.json({ success: true, skills: [] });
    }

    const allSkills = await Job.distinct("skills");

    // Filter + dedupe case-insensitively
    const query = q.toLowerCase();
    const seen = new Set();
    const matchingSkills = allSkills
      .filter((skill) => {
        if (!skill) return false;
        const lower = skill.toLowerCase();
        if (seen.has(lower)) return false;
        seen.add(lower);
        return lower.includes(query);
      })
      .sort((a, b) => {
        // Prioritize skills that START with the query
        const aStarts = a.toLowerCase().startsWith(query) ? 0 : 1;
        const bStarts = b.toLowerCase().startsWith(query) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return a.localeCompare(b);
      })
      .slice(0, 10);

    res.json({ success: true, skills: matchingSkills });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export { createJob, getJobs, getJob, updateJob, deleteJob, getMyJobs, getRecommendations, searchSkills };