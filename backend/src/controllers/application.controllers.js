import mongoose from "mongoose";
import Application from "../models/application.model.js";
import Job from "../models/job.model.js";
import { applyHardRules, scoreWithAI } from "../utils/aiScreening.js";
import { uploadToCloudinary } from "../middleware/upload.middleware.js";

const applyToJob = async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const { coverLetter } = req.body;
    const applicant = req.user;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: "Job ID is required",
      });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (job.postedBy.toString() === applicant._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot apply to your own job",
      });
    }

    const existingApplication = await Application.findOne({
      jobId: jobId,
      applicantId: applicant._id,
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: "You have already applied to this job",
      });
    }

    // Handle resume upload
    let resumeUrl = null;
    if (req.file) {
      try {
        resumeUrl = await uploadToCloudinary(req.file.path);
      } catch (uploadError) {
        console.error("Resume upload error:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload resume",
        });
      }
    }

    // Create screening profile with gender priority
    const screeningProfile = {
      ...applicant.parsedResume,
      skills: applicant.skills || applicant.parsedResume?.skills || [],
      total_experience_years: applicant.parsedResume?.yearsOfExperience || 0,
      gender:
        applicant.gender === "male" || applicant.gender === "female"
          ? applicant.gender
          : applicant.parsedResume?.gender || null,
    };

    // Initialize screening variables
    let applicationStatus = "pending";
    let screeningResult = {};
    let matchScore = 0;
    let rejectionReason = null;

    // 1. Apply Hard Rules
    const hard = applyHardRules(job.hardConstraints, screeningProfile);
    screeningResult = {
      hardFail: hard.hardFail,
      reasons: hard.reasons,
    };

    if (hard.hardFail) {
      // INSTANT REJECTION
      applicationStatus = "rejected";
      matchScore = 0;
      rejectionReason = `Your application did not meet the required criteria: ${hard.reasons.join(", ")}`;

      const application = await Application.create({
        jobId: jobId,
        applicantId: applicant._id,
        recruiterId: job.postedBy,
        coverLetter: coverLetter ? coverLetter.trim() : "",
        resume: resumeUrl,
        status: applicationStatus,
        matchScore: matchScore,
        screeningResult: screeningResult,
        rejectionReason: rejectionReason,
      });

      const applicationCount = await Application.countDocuments({ jobId: jobId });

      return res.json({
        success: true,
        message: `Application submitted but rejected due to: ${hard.reasons.join(", ")}`,
        data: {
          applicationId: application._id,
          applicationStatus,
          matchScore,
          rejectionReason,
          applicationCount,
        },
      });
    }

    // 2. Soft Scoring (if passed hard rules)
    try {
      const requiredSkills = job.skills || [];
      const matchingSkills = (screeningProfile.skills || []).filter((skill) =>
        requiredSkills.some((jobSkill) =>
          jobSkill.toLowerCase().includes(skill.toLowerCase())
        )
      );
      matchScore = requiredSkills.length > 0
        ? Math.round((matchingSkills.length / requiredSkills.length) * 100)
        : 50;
    } catch (error) {
      console.warn("Scoring failed:", error);
      matchScore = 50;
    }

    // 3. Create Application
    const application = await Application.create({
      jobId: jobId,
      applicantId: applicant._id,
      recruiterId: job.postedBy,
      coverLetter: coverLetter ? coverLetter.trim() : "",
      resume: resumeUrl,
      status: applicationStatus,
      matchScore: matchScore,
      screeningResult: screeningResult,
    });

    const applicationCount = await Application.countDocuments({ jobId: jobId });

    res.json({
      success: true,
      message: "Application submitted successfully",
      data: {
        applicationId: application._id,
        applicationStatus,
        matchScore,
        applicationCount,
      },
    });
  } catch (error) {
    console.error("Error in applyToJob:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error: " + error.message,
    });
  }
};
const getMyApplications = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = "all" } = req.query;

    let filter = { applicantId: req.user._id };
    if (status !== "all") {
      filter.status = status;
    }

    const applications = await Application.find(filter)
      .populate({
        path: "jobId",
        populate: {
          path: "postedBy",
          select: "name email profileImage",
        },
      })
      .sort({ appliedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Application.countDocuments(filter);

 const formattedApplications = applications.map((app) => ({
  _id: app._id,
  job: app.jobId,
  coverLetter: app.coverLetter,
  status: app.status,
  appliedAt: app.appliedAt,
  feedback: app.feedback.filter((f) => f.visibleToApplicant),
  viewedByRecruiter: app.viewedByRecruiter,
  matchScore: app.matchScore,
  rejectionReason: app.rejectionReason, 
}));

    res.json({
      success: true,
      data: {
        applications: formattedApplications,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Error in getMyApplications:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const getJobApplicants = async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const {
      page = 1,
      limit = 10,
      status = "all",
      sortBy = "matchScore",
      sortOrder = "desc",
    } = req.query;
    
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view applicants for this job",
      });
    }

    let filter = { jobId: jobId };
    if (status !== "all") {
      filter.status = status;
    }

    const sortOptions = {};
    if (sortBy === "matchScore") {
      sortOptions.matchScore = sortOrder === "desc" ? -1 : 1;
    } else {
      sortOptions.appliedAt = sortOrder === "desc" ? -1 : 1;
    }

    const applications = await Application.find(filter)
      .populate({
        path: "applicantId",
        select: "name email profileImage skills bio linkedinUrl location gender createdAt parsedResume",
      })
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Application.countDocuments(filter);

    // **CRITICAL FIX**: Only update status to "viewed" for pending applications
    // Do NOT change status for rejected or already-processed applications
    await Application.updateMany(
      { 
        jobId: jobId, 
        viewedByRecruiter: false,
        status: "pending" // ONLY change pending applications
      },
      { 
        $set: { 
          viewedByRecruiter: true, 
          status: "viewed" 
        } 
      }
    );

    const stats = await Application.aggregate([
      { $match: { jobId: new mongoose.Types.ObjectId(jobId) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const applicationStats = {
      totalApplications: 0,
      pendingApplications: 0,
      viewedApplications: 0,
      movingForwardApplications: 0,
      acceptedApplications: 0,
      rejectedApplications: 0,
    };

    stats.forEach((stat) => {
      applicationStats.totalApplications += stat.count;
      switch (stat._id) {
        case "pending":
          applicationStats.pendingApplications = stat.count;
          break;
        case "viewed":
          applicationStats.viewedApplications = stat.count;
          break;
        case "moving-forward":
          applicationStats.movingForwardApplications = stat.count;
          break;
        case "accepted":
          applicationStats.acceptedApplications = stat.count;
          break;
        case "rejected":
          applicationStats.rejectedApplications = stat.count;
          break;
      }
    });

    const applicants = applications.map((app) => ({
      applicationId: app._id,
      user: app.applicantId ? {
        name: app.applicantId.name,
        email: app.applicantId.email,
        profileImage: app.applicantId.profileImage,
        skills: app.applicantId.skills,
        bio: app.applicantId.bio,
        linkedinUrl: app.applicantId.linkedinUrl,
        location: app.applicantId.location,
        gender: app.applicantId.gender,
        createdAt: app.applicantId.createdAt,
        parsedResume: app.applicantId.parsedResume,
      } : null,
      coverLetter: app.coverLetter,
      appliedAt: app.appliedAt,
      status: app.status,
      feedback: app.feedback,
      viewedByRecruiter: app.viewedByRecruiter,
      matchScore: app.matchScore,
      screeningResult: app.screeningResult,
      resume: app.resume,
      resumeUrl: app.resume,
      rejectionReason: app.rejectionReason,
    }));

    res.json({
      success: true,
      data: {
        job: {
          _id: job._id,
          title: job.title,
          company: job.company,
          jobType: job.jobType,
          workMode: job.workMode,
          location: job.location,
          createdAt: job.createdAt,
        },
        applicants,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit),
        },
        stats: applicationStats,
      },
    });
  } catch (error) {
    console.error("Error in getJobApplicants:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error: " + error.message,
    });
  }
};

const updateApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status, feedback } = req.body;

    if (
      !["pending", "viewed", "moving-forward", "accepted", "rejected"].includes(
        status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status. Must be 'pending', 'viewed', 'moving-forward', 'accepted', or 'rejected'",
      });
    }

    const application = await Application.findById(applicationId)
      .populate("jobId")
      .populate("applicantId", "name email profileImage");

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (application.jobId.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this application",
      });
    }

    application.status = status;
    application.viewedByRecruiter = true;
    application.lastUpdated = new Date();

    if (feedback && feedback.trim()) {
      application.feedback.push({
        message: feedback.trim(),
        givenBy: req.user._id,
        visibleToApplicant: true,
        createdAt: new Date(),
      });
    }

    await application.save();

    res.json({
      success: true,
      message: `Application ${status} successfully`,
      data: {
        application: {
          applicationId: application._id,
          user: application.applicantId,
          status: application.status,
          lastUpdated: application.lastUpdated,
          feedback: application.feedback,
        },
      },
    });
  } catch (error) {
    console.error("Error updating application status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error: " + error.message,
    });
  }
};

const addFeedback = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { message, visibleToApplicant = true } = req.body;

    if (!message || message.trim().length < 1) {
      return res.status(400).json({
        success: false,
        message: "Feedback message is required",
      });
    }

    const application = await Application.findById(applicationId).populate(
      "jobId"
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (application.jobId.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to add feedback to this application",
      });
    }

    const feedbackObj = {
      message: message.trim(),
      givenBy: req.user._id,
      visibleToApplicant,
      createdAt: new Date(),
    };

    application.feedback.push(feedbackObj);
    await application.save();

    res.json({
      success: true,
      message: "Feedback added successfully",
      data: {
        feedback: application.feedback[application.feedback.length - 1],
      },
    });
  } catch (error) {
    console.error("Error adding feedback:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error: " + error.message,
    });
  }
};

const getApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;

    // --- FIXED: Added 'gender' to populate fields ---
    const application = await Application.findById(applicationId)
      .populate("jobId")
      .populate(
        "applicantId",
        "name email profileImage skills bio linkedinUrl gender parsedResume"
      );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    const isApplicant =
      application.applicantId._id.toString() === req.user._id.toString();
    const isJobPoster =
      application.jobId.postedBy.toString() === req.user._id.toString();

    if (!isApplicant && !isJobPoster) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this application",
      });
    }

    let visibleFeedback = application.feedback;
    if (isApplicant) {
      visibleFeedback = application.feedback.filter(
        (f) => f.visibleToApplicant
      );
    }

    res.json({
      success: true,
      data: {
        application: {
          _id: application._id,
          job: application.jobId,
          applicant: application.applicantId,
          coverLetter: application.coverLetter,
          status: application.status,
          appliedAt: application.appliedAt,
          viewedByRecruiter: application.viewedByRecruiter,
          feedback: visibleFeedback,
          matchScore: application.matchScore,
          screeningResult: application.screeningResult,
          rejectionReason: application.rejectionReason,
        },
      },
    });
  } catch (error) {
    console.error("Error in getApplication:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error: " + error.message,
    });
  }
};

const getApplicationResume = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await Application.findById(applicationId)
      .populate("jobId")
      .populate("applicantId");

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    // Check authorization
    const isRecruiter = application.jobId.postedBy.toString() === req.user._id.toString();
    const isApplicant = application.applicantId._id.toString() === req.user._id.toString();

    if (!isRecruiter && !isApplicant) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this resume",
      });
    }

    if (!application.resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found for this application",
      });
    }

    // Return the Cloudinary URL directly as JSON (don't redirect)
    res.json({
      success: true,
      data: {
        resumeUrl: application.resume,
        applicantName: application.applicantId.name,
      },
    });
  } catch (error) {
    console.error("Error in getApplicationResume:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error: " + error.message,
    });
  }
};

export {
  applyToJob,
  getMyApplications,
  getJobApplicants,
  updateApplicationStatus,
  addFeedback,
  getApplication,
  getApplicationResume,
};