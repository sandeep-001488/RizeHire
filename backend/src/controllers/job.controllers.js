import Job from "../models/job.model.js";
import Application from "../models/application.model.js";
import Joi from "joi";
import axios from "axios";
import { calculateJobMatch, rankJobsByRelevance } from "../utils/jobMatching.js";
import { predictAcceptance } from "../utils/mlModel.js";
import { generateContent } from "../config/gemini.js";

// Python BERT service for semantic matching
const PYTHON_SERVICE_URL = process.env.PYTHON_EXPLAINABILITY_URL || 'http://localhost:5001';

/**
 * Extract text data from user and job for BERT matching
 */
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

    // Skip BERT if no text data available
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
    }, { timeout: 10000 }); // 10 second timeout

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
  // NEW: Category and Industry fields
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
    // Clean up empty strings before validation
    const cleanedBody = { ...req.body };
    if (cleanedBody.applicationEmail === "") {
      delete cleanedBody.applicationEmail;
    }
    if (cleanedBody.applicationUrl === "") {
      delete cleanedBody.applicationUrl;
    }

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
      category, // NEW: Category filter
      industry, // NEW: Industry filter
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filter = { isActive: true };

    // Get applied job IDs to mark them (but don't exclude them)
    let appliedJobIdsArray = [];
    if (req.user) {
      const appliedJobIds = await Application.find({
        applicantId: req.user._id,
      })
        .select("jobId")
        .lean();

      appliedJobIdsArray = appliedJobIds.map((app) => app.jobId.toString());
    }

    if (skills) {
      const skillsArray = skills.split(",").map((s) => new RegExp(s, "i"));
      filter.skills = { $in: skillsArray };
    }

    if (jobType) {
      filter.jobType = jobType;
    }

    if (workMode) {
      filter.workMode = workMode;
    }

    if (location) {
      filter.$or = [
        { "location.city": new RegExp(location, "i") },
        { "location.state": new RegExp(location, "i") },
        { "location.country": new RegExp(location, "i") },
      ];
    }

    if (experienceLevel) {
      filter.experienceLevel = experienceLevel;
    }

    // NEW: Category filter
    if (category) {
      filter.category = category;
    }

    // NEW: Industry filter
    if (industry) {
      filter.industry = industry;
    }

    if (search) {
      filter.$or = [
        { title: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
        { "company.name": new RegExp(search, "i") },
      ];
    }

    // For seekers: Get ALL jobs first, then sort by match score, then paginate
    // For employers/guests: Use database sorting and pagination
    let allJobs;
    if (req.user && req.user.role === "seeker") {
      // Get ALL jobs without pagination (for seekers to sort by match score)
      allJobs = await Job.find(filter)
        .populate("postedBy", "name email profileImage")
        .lean();
    } else {
      // For non-seekers, use traditional database sorting and pagination
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

      allJobs = await Job.find(filter)
        .populate("postedBy", "name email profileImage")
        .sort(sortOptions)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();
    }

    const jobsWithApplicationCount = await Promise.all(
      allJobs.map(async (job) => {
        const applicationCount = await Application.countDocuments({
          jobId: job._id,
        });
        return { ...job, applicationCount };
      })
    );

    // Calculate match scores if user is logged in (seeker)
    let jobsWithMatchScores = jobsWithApplicationCount;
    console.log("🔍 DEBUG /jobs - User:", req.user?.name, "Role:", req.user?.role, "Jobs count:", jobsWithApplicationCount.length);
    if (req.user && req.user.role === "seeker") {
      console.log("🎯 Calculating match scores for seeker:", req.user.name);

      // ⚠️ Check if user has location - if not, show warning in recommendations
      if (!req.user.location) {
        console.log("⚠️ User has no location - recommendations will show remote jobs only");
      }

      // Calculate match scores using BERT + traditional matching for ALL jobs
      jobsWithMatchScores = await Promise.all(
        jobsWithApplicationCount.map(async (job) => {
          // Step 1: Get traditional match (used as fallback and for breakdown details)
          const match = calculateJobMatch(req.user, job);

          // Step 2: Try BERT-based matching (uses Python service)
          const bertResult = await getBERTMatchScore(req.user, job, match);

          // Step 3: Use BERT score if available, otherwise fall back to traditional
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

          // Determine match category based on final score
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

          // Get ML prediction based on match breakdown
          const mlPrediction = await predictAcceptance(match.breakdown);

          // Check if user has applied to this job
          const isApplied = appliedJobIdsArray.includes(job._id.toString());

          // Check deadline and acceptingApplications status
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
            matchSource, // 'bert' or 'traditional'
            bertSemanticScore, // BERT semantic similarity (if available)
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

      // Sort ALL jobs by match score (highest first), then by acceptance rate (highest first)
      jobsWithMatchScores.sort((a, b) => {
        // Primary sort: Match score (descending)
        const matchScoreDiff = b.matchScore - a.matchScore;
        if (matchScoreDiff !== 0) return matchScoreDiff;

        // Secondary sort: Acceptance rate (descending) if match scores are equal
        const aAcceptance = a.mlPrediction?.acceptanceProbability || 0;
        const bAcceptance = b.mlPrediction?.acceptanceProbability || 0;
        return bAcceptance - aAcceptance;
      });

      // NOW apply pagination AFTER sorting all jobs
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      jobsWithMatchScores = jobsWithMatchScores.slice(startIndex, endIndex);
    }

    const total = await Job.countDocuments(filter);

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

    // Check deadline and acceptingApplications status
    // Priority: deadline > acceptingApplications
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
      // NEW: Allow updating category and industry
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
      hardConstraints: hardConstraintsSchema.optional(), // Allow editing hard constraints
      applicationUrl: Joi.string().uri().optional(),
      applicationEmail: Joi.string().email().optional(),
      applicationDeadline: Joi.date().greater("now").allow(null, "").optional(),
      acceptingApplications: Joi.boolean().optional(),
      isActive: Joi.boolean().optional(),
      tags: Joi.array().items(Joi.string().max(30)).max(10).optional(),
    });

    // Clean up empty strings before validation
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

    // Clean up empty/null values
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

    // Get application data for each job including latest application date
    const jobsWithApplicationData = await Promise.all(
      jobs.map(async (job) => {
        const applicationCount = await Application.countDocuments({
          jobId: job._id,
        });
        
        // Get the most recent application for this job
        const latestApplication = await Application.findOne({
          jobId: job._id,
        })
          .sort({ appliedAt: -1 })
          .select('appliedAt')
          .lean();

        return {
          ...job,
          applicationCount,
          latestApplicationDate: latestApplication?.appliedAt || null,
        };
      })
    );

    // Sort jobs by latest application date (jobs with recent applications first)
    jobsWithApplicationData.sort((a, b) => {
      // Jobs with applications come before jobs without applications
      if (a.latestApplicationDate && !b.latestApplicationDate) return -1;
      if (!a.latestApplicationDate && b.latestApplicationDate) return 1;
      
      // If both have applications, sort by most recent
      if (a.latestApplicationDate && b.latestApplicationDate) {
        return new Date(b.latestApplicationDate) - new Date(a.latestApplicationDate);
      }
      
      // If neither has applications, sort by job creation date
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Apply pagination after sorting
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedJobs = jobsWithApplicationData.slice(startIndex, endIndex);

    const total = await Job.countDocuments({ postedBy: req.user._id });

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
 * Tier 3: Traditional keyword matching (fallback)
 */

/**
 * Tier 1: Get Gemini-powered recommendations
 * Sends candidate profile + jobs to Gemini for intelligent ranking
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

  // Parse the JSON response from Gemini
  let geminiResults;
  try {
    // Clean response - remove markdown code blocks if present
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

  // Map Gemini results back to job objects
  const scoredJobs = geminiResults
    .filter(r => r.index !== undefined && r.index < jobs.length)
    .map(result => {
      const job = jobs[result.index];
      const score = Math.min(Math.max(Math.round(result.score || 0), 0), 100);

      // Determine match badge
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

/**
 * Tier 2: Get BERT-powered recommendations
 * Uses Python BERT service for semantic matching on each job
 */
async function getBERTRecommendations(user, jobs) {
  const results = [];

  for (const job of jobs.slice(0, 20)) {
    // First get traditional match for feature inputs
    const traditionalMatch = calculateJobMatch(user, job);

    // Get BERT score
    const bertResult = await getBERTMatchScore(user, job, traditionalMatch);

    if (bertResult) {
      // Use BERT hybrid scoring (same as getJobs)
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
      // BERT failed for this job, use traditional score
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

  // Sort by score
  return results.sort((a, b) => b.matchScore - a.matchScore);
}

// Get personalized job recommendations for seeker
const getRecommendations = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Must be a seeker
    if (!req.user || req.user.role !== "seeker") {
      return res.status(403).json({
        success: false,
        message: "Only seekers can get recommendations",
      });
    }

    console.log("🎯 Generating personalized recommendations for:", req.user.name);

    // Get all active jobs
    const allJobs = await Job.find({ isActive: true })
      .populate("postedBy", "name email profileImage")
      .lean();

    // Get jobs already applied to
    const appliedJobIds = await Application.find({
      applicantId: req.user._id,
    })
      .select("jobId")
      .lean();

    const appliedJobIdsArray = appliedJobIds.map(app => app.jobId.toString());

    // Filter out jobs user has already applied to
    const unappliedJobs = allJobs.filter(job => !appliedJobIdsArray.includes(job._id.toString()));

    let rankedJobs = [];
    let recommendationSource = 'traditional';

    // ============================================
    // TIER 1: Try Gemini API first
    // ============================================
    try {
      console.log("🤖 Tier 1: Attempting Gemini API recommendations...");
      rankedJobs = await getGeminiRecommendations(req.user, unappliedJobs);
      recommendationSource = 'gemini';
      console.log(`✅ Gemini returned ${rankedJobs.length} recommendations`);
    } catch (geminiError) {
      console.warn("⚠️ Gemini API failed:", geminiError.message);

      // ============================================
      // TIER 2: Fall back to BERT Python service
      // ============================================
      try {
        console.log("🧠 Tier 2: Attempting BERT recommendations...");
        rankedJobs = await getBERTRecommendations(req.user, unappliedJobs);
        recommendationSource = 'bert';
        console.log(`✅ BERT returned ${rankedJobs.length} recommendations`);
      } catch (bertError) {
        console.warn("⚠️ BERT service failed:", bertError.message);

        // ============================================
        // TIER 3: Fall back to traditional matching
        // ============================================
        console.log("📊 Tier 3: Using traditional keyword matching...");
        rankedJobs = rankJobsByRelevance(unappliedJobs, req.user);
        recommendationSource = 'traditional';
        console.log(`✅ Traditional matching returned ${rankedJobs.length} recommendations`);
      }
    }

    // Get top recommendations
    const recommendations = rankedJobs.slice(0, parseInt(limit));

    // Add application count, ML predictions, and source info
    const recommendationsWithCount = await Promise.all(
      recommendations.map(async (job) => {
        const applicationCount = await Application.countDocuments({
          jobId: job._id,
        });

        // Get ML prediction for this job
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

    // Sort by match score first, then by acceptance rate
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

/**
 * Search skills from all job postings in the database
 * Returns distinct skills matching the query string
 */
const searchSkills = async (req, res) => {
  try {
    const { q = "" } = req.query;

    if (!q || q.length < 1) {
      return res.json({ success: true, skills: [] });
    }

    // Get all distinct skills from jobs
    const allSkills = await Job.distinct("skills");

    // Filter and deduplicate (case-insensitive matching)
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
      .slice(0, 10); // Max 10 suggestions

    res.json({ success: true, skills: matchingSkills });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export { createJob, getJobs, getJob, updateJob, deleteJob, getMyJobs, getRecommendations, searchSkills };