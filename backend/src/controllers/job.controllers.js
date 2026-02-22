import Job from "../models/job.model.js";
import Application from "../models/application.model.js";
import Joi from "joi";
import { calculateJobMatch, rankJobsByRelevance } from "../utils/jobMatching.js";
import { predictAcceptance } from "../utils/mlModel.js";

const hardConstraintsSchema = Joi.object({
  gender: Joi.string().valid("male", "female", null).optional(),
  minYears: Joi.number().min(0).optional(),
  maxYears: Joi.number().min(0).optional(),
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
    const { error, value } = createJobSchema.validate(req.body);
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

    if (req.user) {
      const appliedJobIds = await Application.find({
        applicantId: req.user._id,
      })
        .select("jobId")
        .lean();

      const appliedJobIdsArray = appliedJobIds.map((app) =>
        app.jobId.toString()
      );

      if (appliedJobIdsArray.length > 0) {
        filter._id = { $nin: appliedJobIdsArray };
      }
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

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const jobs = await Job.find(filter)
      .populate("postedBy", "name email profileImage")
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const jobsWithApplicationCount = await Promise.all(
      jobs.map(async (job) => {
        const applicationCount = await Application.countDocuments({
          jobId: job._id,
        });
        return { ...job, applicationCount };
      })
    );

    // Calculate match scores if user is logged in (seeker)
    let jobsWithMatchScores = jobsWithApplicationCount;
    if (req.user && req.user.role === "seeker") {
      console.log("🎯 Calculating match scores for seeker:", req.user.name);

      // Calculate match scores and ML predictions in parallel
      jobsWithMatchScores = await Promise.all(
        jobsWithApplicationCount.map(async (job) => {
          const match = calculateJobMatch(req.user, job);

          // Get ML prediction based on match breakdown
          const mlPrediction = await predictAcceptance(match.breakdown);

          return {
            ...job,
            matchScore: match.overallScore,
            matchCategory: match.matchCategory,
            matchBadge: match.matchBadge,
            matchBreakdown: match.breakdown,
            whyThisJob: match.whyThisJob,
            recommendation: match.recommendation,
            mlPrediction: {
              acceptanceProbability: mlPrediction.acceptanceProbability,
              confidence: mlPrediction.confidence,
              recommendation: mlPrediction.recommendation,
              insight: mlPrediction.insight,
            },
          };
        })
      );

      // If sorting by relevance/match, sort by match score
      if (sortBy === "relevance" || sortBy === "match") {
        jobsWithMatchScores.sort((a, b) => b.matchScore - a.matchScore);
      }
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

    res.json({
      success: true,
      data: {
        job: {
          ...job.toObject(),
          hasApplied,
          applicationCount,
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
      applicationUrl: Joi.string().uri().allow("").optional(),
      applicationEmail: Joi.string().email().allow("").optional(),
      applicationDeadline: Joi.date().greater("now").allow(null, "").optional(),
      isActive: Joi.boolean().optional(),
      tags: Joi.array().items(Joi.string().max(30)).max(10).optional(),
    });

    const { error, value } = updateSchema.validate(req.body);
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

        console.log(`Job: ${job.title}, Applications: ${applicationCount}, Latest: ${latestApplication?.appliedAt}`);

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

    console.log('Sorted jobs order:', jobsWithApplicationData.map(j => j.title));

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

    // Filter out applied jobs
    const availableJobs = allJobs.filter(
      job => !appliedJobIdsArray.includes(job._id.toString())
    );

    // Rank jobs by relevance
    const rankedJobs = rankJobsByRelevance(availableJobs, req.user);

    // Get top recommendations
    const recommendations = rankedJobs.slice(0, parseInt(limit));

    // Add application count and ML predictions
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
        };
      })
    );

    res.json({
      success: true,
      data: {
        recommendations: recommendationsWithCount,
        total: rankedJobs.length,
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

export { createJob, getJobs, getJob, updateJob, deleteJob, getMyJobs, getRecommendations };