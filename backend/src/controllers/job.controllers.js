import Job from "../models/job.model.js";
import Application from "../models/application.model.js";
import Joi from "joi";

const hardConstraintsSchema = Joi.object({
  gender: Joi.string().valid("male", "female", null).optional(),
  minYears: Joi.number().min(0).optional(),
  maxYears: Joi.number().min(0).optional(),
});

const createJobSchema = Joi.object({
  title: Joi.string().min(5).max(200).required(),
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

    const total = await Job.countDocuments(filter);

    res.json({
      success: true,
      data: {
        jobs: jobsWithApplicationCount,
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

    const total = await Job.countDocuments({ postedBy: req.user._id });

    res.json({
      success: true,
      data: {
        jobs: jobsWithApplicationCount,
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

export { createJob, getJobs, getJob, updateJob, deleteJob, getMyJobs };