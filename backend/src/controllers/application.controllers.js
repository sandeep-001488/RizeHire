import mongoose from "mongoose";
import Application from "../models/application.model.js";
import Job from "../models/job.model.js";

const applyToJob = async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const { coverLetter } = req.body;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: "Job ID is required",
      });
    }

    if (
      !coverLetter ||
      typeof coverLetter !== "string" ||
      coverLetter.trim().length < 10
    ) {
      return res.status(400).json({
        success: false,
        message: "Cover letter must be at least 10 characters long",
      });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (job.postedBy.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot apply to your own job",
      });
    }

    // Check if user has already applied
    const existingApplication = await Application.findOne({
      jobId: jobId,
      applicantId: req.user._id,
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: "You have already applied to this job",
      });
    }

    // Create new application
    const application = await Application.create({
      jobId: jobId,
      applicantId: req.user._id,
      recruiterId: job.postedBy,
      coverLetter: coverLetter.trim(),
    });

    const applicationCount = await Application.countDocuments({ jobId: jobId });

    res.json({
      success: true,
      message: "Application submitted successfully",
      data: {
        application: application._id,
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
    const { page = 1, limit = 10, status = "all" } = req.query;

    console.log("🔍 getJobApplicants called with:", {
      jobId,
      page,
      limit,
      status,
    });

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

    console.log("🔍 Filter applied:", filter);

    const applications = await Application.find(filter)
      .populate(
        "applicantId",
        "name email profileImage skills bio linkedinUrl location createdAt"
      )
      .sort({ appliedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Application.countDocuments(filter);

    console.log("🔍 Found applications:", applications.length);
    console.log("🔍 Total count:", total);

    // Mark applications as viewed by recruiter
    await Application.updateMany(
      { jobId: jobId, viewedByRecruiter: false },
      { viewedByRecruiter: true }
    );

    // Get application stats
    const stats = await Application.aggregate([
      { $match: { jobId: new mongoose.Types.ObjectId(jobId) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    console.log("🔍 Stats aggregation result:", stats);

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
      user: app.applicantId,
      coverLetter: app.coverLetter,
      appliedAt: app.appliedAt,
      status: app.status,
      linkedinUrl: app.linkedinUrl,
      feedback: app.feedback,
      viewedByRecruiter: app.viewedByRecruiter,
    }));

    console.log("🔍 Final response data:", {
      applicantsCount: applicants.length,
      stats: applicationStats,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit),
      },
    });

    res.json({
      success: true,
      data: {
        job: {
          _id: job._id,
          title: job.title,
          description: job.description,
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

    console.log("🔄 updateApplicationStatus called:", {
      applicationId,
      status,
      feedback,
    });

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

    // Update application status
    application.status = status;
    application.viewedByRecruiter = true;
    application.lastUpdated = new Date();

    // Add feedback if provided
    if (feedback && feedback.trim()) {
      application.feedback.push({
        message: feedback.trim(),
        givenBy: req.user._id,
        visibleToApplicant: true,
        createdAt: new Date(),
      });
    }

    await application.save();

    console.log("✅ Application status updated successfully");

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

    console.log("📝 addFeedback called:", {
      applicationId,
      message,
      visibleToApplicant,
    });

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

    // Check if user is the job poster
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

    console.log("✅ Feedback added successfully");

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

    const application = await Application.findById(applicationId)
      .populate("jobId")
      .populate(
        "applicantId",
        "name email profileImage skills bio linkedinUrl"
      );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    // Check if user is either the applicant or job poster
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

    // Filter feedback based on visibility
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

export {
  applyToJob,
  getMyApplications,
  getJobApplicants,
  updateApplicationStatus,
  addFeedback,
  getApplication,
};
