// import Job from "../models/job.model.js";
// import Joi from "joi";

// const createJobSchema = Joi.object({
//   title: Joi.string().min(5).max(200).required(),
//   description: Joi.string().min(20).max(5000).required(),
//   skills: Joi.array().items(Joi.string().max(50)).max(20).optional(),
//   jobType: Joi.string()
//     .valid("full-time", "part-time", "contract", "freelance", "internship")
//     .required(),
//   workMode: Joi.string().valid("remote", "hybrid", "onsite").required(),
//   location: Joi.object({
//     city: Joi.string().max(100),
//     state: Joi.string().max(100),
//     country: Joi.string().max(100),
//   }).optional(),
//   budget: Joi.object({
//     min: Joi.number().min(0),
//     max: Joi.number().min(0),
//     currency: Joi.string().default("USD"),
//     period: Joi.string()
//       .valid("hourly", "daily", "monthly", "yearly", "project")
//       .default("monthly"),
//   }).optional(),
//   experienceLevel: Joi.string()
//     .valid("entry", "junior", "mid", "senior", "expert")
//     .optional(),
//   applicationUrl: Joi.string().uri().optional(),
//   applicationEmail: Joi.string().email().optional(),
//   applicationDeadline: Joi.date().greater("now").optional(),
//   paymentTxHash: Joi.string().required(),
//   tags: Joi.array().items(Joi.string().max(30)).max(10).optional(),
// });

// const createJob = async (req, res) => {
//   try {
//     const { error, value } = createJobSchema.validate(req.body);
//     if (error) {
//       return res.status(400).json({
//         success: false,
//         message: error.details[0].message,
//       });
//     }

//     const job = await Job.create({
//       ...value,
//       postedBy: req.user._id,
//     });

//     await job.populate("postedBy", "name email profileImage");

//     res.status(201).json({
//       success: true,
//       message: "Job posted successfully",
//       data: { job },
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// const getJobs = async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 10,
//       skills,
//       jobType,
//       workMode,
//       location,
//       experienceLevel,
//       search,
//       sortBy = "createdAt",
//       sortOrder = "desc",
//     } = req.query;

//     const filter = { isActive: true };

//     if (skills) {
//       const skillsArray = skills.split(",");
//       filter.skills = { $in: skillsArray };
//     }

//     if (jobType) {
//       filter.jobType = jobType;
//     }

//     if (workMode) {
//       filter.workMode = workMode;
//     }

//     if (location) {
//       filter.$or = [
//         { "location.city": new RegExp(location, "i") },
//         { "location.state": new RegExp(location, "i") },
//         { "location.country": new RegExp(location, "i") },
//       ];
//     }

//     if (experienceLevel) {
//       filter.experienceLevel = experienceLevel;
//     }

//     if (search) {
//       filter.$or = [
//         { title: new RegExp(search, "i") },
//         { description: new RegExp(search, "i") },
//       ];
//     }

//     const sortOptions = {};
//     sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

//     const jobs = await Job.find(filter)
//       .populate("postedBy", "name email profileImage")
//       .sort(sortOptions)
//       .limit(limit * 1)
//       .skip((page - 1) * limit)
//       .lean();

//     const total = await Job.countDocuments(filter);

//     res.json({
//       success: true,
//       data: {
//         jobs,
//         pagination: {
//           current: parseInt(page),
//           pages: Math.ceil(total / limit),
//           total,
//           limit: parseInt(limit),
//         },
//       },
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// const getJob = async (req, res) => {
//   try {
//     const job = await Job.findById(req.params.id)
//       .populate("postedBy", "name email profileImage bio linkedinUrl")
//       .populate("applications.user", "name email profileImage skills");

//     if (!job) {
//       return res.status(404).json({
//         success: false,
//         message: "Job not found",
//       });
//     }

//     if (req.user && req.user._id.toString() !== job.postedBy._id.toString()) {
//       await job.incrementViews();
//     }

//     res.json({
//       success: true,
//       data: { job },
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// const updateJob = async (req, res) => {
//   try {
//     const job = await Job.findById(req.params.id);

//     if (!job) {
//       return res.status(404).json({
//         success: false,
//         message: "Job not found",
//       });
//     }

//     if (job.postedBy.toString() !== req.user._id.toString()) {
//       return res.status(403).json({
//         success: false,
//         message: "Not authorized to update this job",
//       });
//     }

//     const updateSchema = Joi.object({
//       title: Joi.string().min(5).max(200).optional(),
//       description: Joi.string().min(20).max(5000).optional(),
//       skills: Joi.array().items(Joi.string().max(50)).max(20).optional(),
//       jobType: Joi.string()
//         .valid("full-time", "part-time", "contract", "freelance", "internship")
//         .optional(),
//       workMode: Joi.string().valid("remote", "hybrid", "onsite").optional(),
//       experienceLevel: Joi.string()
//         .valid("entry", "junior", "mid", "senior", "expert")
//         .optional(),
//       location: Joi.object({
//         city: Joi.string().max(100).allow(''),
//         state: Joi.string().max(100).allow(''),
//         country: Joi.string().max(100).allow(''),
//       }).optional(),
//       budget: Joi.object({
//         min: Joi.number().min(0).allow(''),
//         max: Joi.number().min(0).allow(''),
//         currency: Joi.string().optional(),
//         period: Joi.string().valid(
//           "hourly",
//           "daily",
//           "monthly",
//           "yearly",
//           "project"
//         ).optional(),
//       }).optional(),
//       applicationUrl: Joi.string().uri().allow('').optional(),
//       applicationEmail: Joi.string().email().allow('').optional(),
//       applicationDeadline: Joi.date().greater("now").allow('').optional(),
//       isActive: Joi.boolean().optional(),
//       tags: Joi.array().items(Joi.string().max(30)).max(10).optional(),
//     });

//     const { error, value } = updateSchema.validate(req.body);
//     if (error) {
//       return res.status(400).json({
//         success: false,
//         message: error.details[0].message,
//       });
//     }

//     const cleanedValue = {};
//     Object.keys(value).forEach(key => {
//       if (value[key] !== undefined && value[key] !== '') {
//         if (key === 'skills' || key === 'tags') {
//           if (Array.isArray(value[key])) {
//             const cleanedArray = value[key].filter(item =>
//               typeof item === 'string' && item.trim() !== ''
//             );
//             if (cleanedArray.length > 0) {
//               cleanedValue[key] = cleanedArray;
//             }
//           }
//         } else if (typeof value[key] === 'object' && value[key] !== null && !Array.isArray(value[key])) {
//           const cleanedNested = {};
//           Object.keys(value[key]).forEach(nestedKey => {
//             if (value[key][nestedKey] !== undefined && value[key][nestedKey] !== '') {
//               cleanedNested[nestedKey] = value[key][nestedKey];
//             }
//           });
//           if (Object.keys(cleanedNested).length > 0) {
//             cleanedValue[key] = cleanedNested;
//           }
//         } else {
//           cleanedValue[key] = value[key];
//         }
//       }
//     });

//     const updatedJob = await Job.findByIdAndUpdate(req.params.id, cleanedValue, {
//       new: true,
//       runValidators: true,
//     }).populate("postedBy", "name email profileImage");

//     res.json({
//       success: true,
//       message: "Job updated successfully",
//       data: { job: updatedJob },
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// const deleteJob = async (req, res) => {
//   try {
//     const job = await Job.findById(req.params.id);

//     if (!job) {
//       return res.status(404).json({
//         success: false,
//         message: "Job not found",
//       });
//     }

//     if (job.postedBy.toString() !== req.user._id.toString()) {
//       return res.status(403).json({
//         success: false,
//         message: "Not authorized to delete this job",
//       });
//     }

//     await Job.findByIdAndDelete(req.params.id);

//     res.json({
//       success: true,
//       message: "Job deleted successfully",
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// const applyToJob = async (req, res) => {
//   try {
//     const jobId = req.params.id;
//     const { coverLetter } = req.body;

//     if (!jobId) {
//       return res.status(400).json({
//         success: false,
//         message: "Job ID is required in the URL",
//       });
//     }

//     if (
//       !coverLetter ||
//       typeof coverLetter !== "string" ||
//       coverLetter.trim().length < 10
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Cover letter must be at least 10 characters long",
//       });
//     }

//     if (!req.user || !req.user._id) {
//       return res.status(401).json({
//         success: false,
//         message: "Authentication required",
//       });
//     }

//     const job = await Job.findById(jobId);

//     if (!job) {
//       return res.status(404).json({
//         success: false,
//         message: "Job not found",
//       });
//     }

//     if (job.postedBy.toString() === req.user._id.toString()) {
//       return res.status(400).json({
//         success: false,
//         message: "You cannot apply to your own job",
//       });
//     }

//     const alreadyApplied = job.applications?.find(
//       (app) => app.user.toString() === req.user._id.toString()
//     );

//     if (alreadyApplied) {
//       return res.status(400).json({
//         success: false,
//         message: "You have already applied to this job",
//       });
//     }

//     job.applications = job.applications || [];
//     job.applications.push({
//       user: req.user._id,
//       coverLetter: coverLetter.trim(),
//       appliedAt: new Date(),
//       status: "pending",
//     });

//     await job.save();

//     res.json({
//       success: true,
//       message: "Application submitted successfully",
//       data: {
//         applicationCount: job.applications.length,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Internal server error: " + error.message,
//     });
//   }
// };

// const getMyJobs = async (req, res) => {
//   try {
//     const { page = 1, limit = 10 } = req.query;

//     const jobs = await Job.find({ postedBy: req.user._id })
//       .sort({ createdAt: -1 })
//       .limit(limit * 1)
//       .skip((page - 1) * limit)
//       .lean();

//     const total = await Job.countDocuments({ postedBy: req.user._id });

//     res.json({
//       success: true,
//       data: {
//         jobs,
//         pagination: {
//           current: parseInt(page),
//           pages: Math.ceil(total / limit),
//           total,
//           limit: parseInt(limit),
//         },
//       },
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// const getMyApplications = async (req, res) => {
//   try {
//     const jobs = await Job.find({
//       "applications.user": req.user._id,
//     })
//       .populate("postedBy", "name email profileImage")
//       .sort({ "applications.appliedAt": -1 });

//     const applications = jobs.map((job) => {
//       const userApp = job.applications.find(
//         (app) => app.user.toString() === req.user._id.toString()
//       );

//       return {
//         job: {
//           _id: job._id,
//           title: job.title,
//           description: job.description,
//           jobType: job.jobType,
//           workMode: job.workMode,
//           location: job.location,
//           postedBy: job.postedBy,
//           createdAt: job.createdAt,
//         },
//         application: userApp,
//       };
//     });

//     res.json({
//       success: true,
//       data: { applications },
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// const getJobApplicants = async (req, res) => {
//   try {
//     console.log('🔍 getJobApplicants called');
//     console.log('📋 Request params:', req.params);
//     console.log('📋 Request query:', req.query);
//     console.log('👤 User ID:', req.user?._id);

//     const jobId = req.params.id;
//     const { page = 1, limit = 10, status = 'all' } = req.query;

//     console.log('🎯 Job ID:', jobId);
//     console.log('📄 Page:', page, 'Limit:', limit, 'Status:', status);

//     const job = await Job.findById(jobId);
//     console.log('📝 Job found:', job ? 'Yes' : 'No');

//     if (!job) {
//       console.log('❌ Job not found for ID:', jobId);
//       return res.status(404).json({
//         success: false,
//         message: "Job not found",
//       });
//     }

//     console.log('👥 Job posted by:', job.postedBy.toString());
//     console.log('🔐 Current user:', req.user._id.toString());

//     if (job.postedBy.toString() !== req.user._id.toString()) {
//       console.log('🚫 Authorization failed - not job owner');
//       return res.status(403).json({
//         success: false,
//         message: "Not authorized to view applicants for this job",
//       });
//     }

//     console.log('✅ Authorization passed');

//     let applicationFilter = {};
//     if (status !== 'all') {
//       applicationFilter = { status: status };
//     }

//     const jobWithApplicants = await Job.findById(jobId)
//       .populate({
//         path: 'applications.user',
//         select: 'name email profileImage skills bio linkedinUrl location createdAt',
//       })
//       .lean();

//     console.log('📊 Applications found:', jobWithApplicants?.applications?.length || 0);

//     if (!jobWithApplicants || !jobWithApplicants.applications) {
//       console.log('📭 No applications found');
//       return res.json({
//         success: true,
//         data: {
//           job: {
//             _id: job._id,
//             title: job.title,
//             description: job.description,
//             jobType: job.jobType,
//             workMode: job.workMode,
//           },
//           applicants: [],
//           pagination: {
//             current: parseInt(page),
//             pages: 0,
//             total: 0,
//             limit: parseInt(limit),
//           },
//         },
//       });
//     }

//     let filteredApplications = jobWithApplicants.applications;
//     if (status !== 'all') {
//       filteredApplications = jobWithApplicants.applications.filter(
//         app => app.status === status
//       );
//     }

//     console.log('🔍 Filtered applications:', filteredApplications.length);

//     filteredApplications.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

//     const startIndex = (page - 1) * limit;
//     const endIndex = startIndex + parseInt(limit);
//     const paginatedApplications = filteredApplications.slice(startIndex, endIndex);

//     console.log('📄 Paginated applications:', paginatedApplications.length);

//     const applicants = paginatedApplications.map(app => ({
//       applicationId: app._id,
//       user: app.user,
//       coverLetter: app.coverLetter,
//       appliedAt: app.appliedAt,
//       status: app.status,
//     }));

//     const total = filteredApplications.length;

//     const responseData = {
//       success: true,
//       data: {
//         job: {
//           _id: jobWithApplicants._id,
//           title: jobWithApplicants.title,
//           description: jobWithApplicants.description,
//           jobType: jobWithApplicants.jobType,
//           workMode: jobWithApplicants.workMode,
//           location: jobWithApplicants.location,
//           createdAt: jobWithApplicants.createdAt,
//         },
//         applicants,
//         pagination: {
//           current: parseInt(page),
//           pages: Math.ceil(total / limit),
//           total,
//           limit: parseInt(limit),
//         },
//         stats: {
//           totalApplications: jobWithApplicants.applications.length,
//           pendingApplications: jobWithApplicants.applications.filter(app => app.status === 'pending').length,
//           acceptedApplications: jobWithApplicants.applications.filter(app => app.status === 'accepted').length,
//           rejectedApplications: jobWithApplicants.applications.filter(app => app.status === 'rejected').length,
//         },
//       },
//     };

//     console.log('✅ Response prepared successfully');
//     res.json(responseData);

//   } catch (error) {
//     console.error('💥 Error in getJobApplicants:', error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error: " + error.message,
//     });
//   }
// };

// const updateApplicationStatus = async (req, res) => {
//   try {
//     const { jobId, applicationId } = req.params;
//     const { status } = req.body;

//     if (!['pending', 'accepted', 'rejected'].includes(status)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid status. Must be 'pending', 'accepted', or 'rejected'",
//       });
//     }

//     const job = await Job.findById(jobId);

//     if (!job) {
//       return res.status(404).json({
//         success: false,
//         message: "Job not found",
//       });
//     }

//     if (job.postedBy.toString() !== req.user._id.toString()) {
//       return res.status(403).json({
//         success: false,
//         message: "Not authorized to update applications for this job",
//       });
//     }

//     const applicationIndex = job.applications.findIndex(
//       app => app._id.toString() === applicationId
//     );

//     if (applicationIndex === -1) {
//       return res.status(404).json({
//         success: false,
//         message: "Application not found",
//       });
//     }

//     job.applications[applicationIndex].status = status;
//     job.applications[applicationIndex].updatedAt = new Date();

//     await job.save();

//     const updatedJob = await Job.findById(jobId)
//       .populate({
//         path: 'applications.user',
//         select: 'name email profileImage',
//       });

//     const updatedApplication = updatedJob.applications.find(
//       app => app._id.toString() === applicationId
//     );

//     res.json({
//       success: true,
//       message: `Application ${status} successfully`,
//       data: {
//         application: {
//           applicationId: updatedApplication._id,
//           user: updatedApplication.user,
//           status: updatedApplication.status,
//           updatedAt: updatedApplication.updatedAt,
//         },
//       },
//     });

//   } catch (error) {
//     console.error('Error updating application status:', error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error: " + error.message,
//     });
//   }
// };

// export {
//   createJob,
//   getJobs,
//   getJob,
//   updateJob,
//   deleteJob,
//   applyToJob,
//   getMyJobs,
//   getMyApplications,
//   getJobApplicants,
//   updateApplicationStatus,
// };

import Job from "../models/job.model.js";
import Application from "../models/application.model.js";
import Joi from "joi";

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
  applicationUrl: Joi.string().uri().optional(),
  applicationEmail: Joi.string().email().optional(),
  applicationDeadline: Joi.date().greater("now").optional(),
  paymentTxHash: Joi.string().required(),
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

// const getJobs = async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 10,
//       skills,
//       jobType,
//       workMode,
//       location,
//       experienceLevel,
//       search,
//       sortBy = "createdAt",
//       sortOrder = "desc",
//     } = req.query;

//     const filter = { isActive: true };

//     if (skills) {
//       const skillsArray = skills.split(",");
//       filter.skills = { $in: skillsArray };
//     }

//     if (jobType) {
//       filter.jobType = jobType;
//     }

//     if (workMode) {
//       filter.workMode = workMode;
//     }

//     if (location) {
//       filter.$or = [
//         { "location.city": new RegExp(location, "i") },
//         { "location.state": new RegExp(location, "i") },
//         { "location.country": new RegExp(location, "i") },
//       ];
//     }

//     if (experienceLevel) {
//       filter.experienceLevel = experienceLevel;
//     }

//     if (search) {
//       filter.$or = [
//         { title: new RegExp(search, "i") },
//         { description: new RegExp(search, "i") },
//         { "company.name": new RegExp(search, "i") },
//       ];
//     }

//     const sortOptions = {};
//     sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

//     const jobs = await Job.find(filter)
//       .populate("postedBy", "name email profileImage")
//       .sort(sortOptions)
//       .limit(limit * 1)
//       .skip((page - 1) * limit)
//       .lean();

//     // Add application count for each job
//     const jobsWithApplicationCount = await Promise.all(
//       jobs.map(async (job) => {
//         const applicationCount = await Application.countDocuments({
//           jobId: job._id,
//         });
//         return { ...job, applicationCount };
//       })
//     );

//     const total = await Job.countDocuments(filter);

//     res.json({
//       success: true,
//       data: {
//         jobs: jobsWithApplicationCount,
//         pagination: {
//           current: parseInt(page),
//           pages: Math.ceil(total / limit),
//           total,
//           limit: parseInt(limit),
//         },
//       },
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
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

    // Exclude jobs user has already applied to (only if authenticated)
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
      const skillsArray = skills.split(",");
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

    // Get application count
    const applicationCount = await Application.countDocuments({
      jobId: job._id,
    });

    // Check if current user has applied (if authenticated)
    let hasApplied = false;
    if (req.user) {
      const userApplication = await Application.findOne({
        jobId: job._id,
        applicantId: req.user._id,
      });
      hasApplied = !!userApplication;

      // Increment views only if user is not the job poster
      if (req.user._id.toString() !== job.postedBy._id.toString()) {
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
        min: Joi.number().min(0).allow(""),
        max: Joi.number().min(0).allow(""),
        currency: Joi.string().optional(),
        period: Joi.string()
          .valid("hourly", "daily", "monthly", "yearly", "project")
          .optional(),
      }).optional(),
      applicationUrl: Joi.string().uri().allow("").optional(),
      applicationEmail: Joi.string().email().allow("").optional(),
      applicationDeadline: Joi.date().greater("now").allow("").optional(),
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

    const cleanedValue = {};
    Object.keys(value).forEach((key) => {
      if (value[key] !== undefined && value[key] !== "") {
        if (key === "skills" || key === "tags") {
          if (Array.isArray(value[key])) {
            const cleanedArray = value[key].filter(
              (item) => typeof item === "string" && item.trim() !== ""
            );
            if (cleanedArray.length > 0) {
              cleanedValue[key] = cleanedArray;
            }
          }
        } else if (
          typeof value[key] === "object" &&
          value[key] !== null &&
          !Array.isArray(value[key])
        ) {
          const cleanedNested = {};
          Object.keys(value[key]).forEach((nestedKey) => {
            if (
              value[key][nestedKey] !== undefined &&
              value[key][nestedKey] !== ""
            ) {
              cleanedNested[nestedKey] = value[key][nestedKey];
            }
          });
          if (Object.keys(cleanedNested).length > 0) {
            cleanedValue[key] = cleanedNested;
          }
        } else {
          cleanedValue[key] = value[key];
        }
      }
    });

    const updatedJob = await Job.findByIdAndUpdate(
      req.params.id,
      cleanedValue,
      {
        new: true,
        runValidators: true,
      }
    ).populate("postedBy", "name email profileImage");

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

    // Delete all applications for this job
    await Application.deleteMany({ jobId: req.params.id });

    // Delete the job
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

    // Add application count for each job
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
