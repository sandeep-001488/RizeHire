import mongoose from "mongoose";
import axios from "axios";
import Application from "../models/application.model.js";
import Job from "../models/job.model.js";
import Message from "../models/message.model.js";
import Notification from "../models/notification.model.js";
import { io } from "../../app.js";
import { applyHardRules, scoreWithAI } from "../utils/aiScreening.js";
import { uploadToCloudinary, generateSignedUrl } from "../middleware/upload.middleware.js";
import { generateRejectionFeedback } from "../utils/rejectionFeedback.js";
import { sendRejectionEmail, sendAcceptanceEmail, sendStatusChangeEmail } from "../services/email.service.js";
import { generateRejectionExplanation, formatRejectionForEmail } from "../services/rejectionExplanation.service.js";

const applyToJob = async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const { coverLetter, willingToRelocate } = req.body;
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

    // Deadline is checked before the acceptingApplications flag
    if (job.applicationDeadline && new Date(job.applicationDeadline) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "The application deadline for this job has passed",
      });
    }

    if (!job.acceptingApplications) {
      return res.status(400).json({
        success: false,
        message: "This job is currently not accepting applications",
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

    // multer already saved the file under uploads/resumes/; store its relative path
    let resumeUrl = null;
    if (req.file) {
      resumeUrl = `/uploads/resumes/${req.file.filename}`;
      console.log("✅ Resume saved locally:", resumeUrl);
    }

    const screeningProfile = {
      ...applicant.parsedResume,
      skills: applicant.skills || applicant.parsedResume?.skills || [],
      total_experience_years: applicant.parsedResume?.yearsOfExperience || 0,
      gender:
        applicant.gender === "male" || applicant.gender === "female"
          ? applicant.gender
          : applicant.parsedResume?.gender || null,
    };

    let applicationStatus = "pending";
    let screeningResult = {};
    let matchScore = 0;
    let rejectionReason = null;

    const hard = applyHardRules(job.hardConstraints, screeningProfile);
    screeningResult = {
      hardFail: hard.hardFail,
      reasons: hard.reasons,
    };

    if (hard.hardFail) {
      applicationStatus = "rejected";
      matchScore = 0;
      rejectionReason = `Your application did not meet the required criteria: ${hard.reasons.join(", ")}`;

      const rejectionExplanation = await generateRejectionExplanation({
        hardRuleFailed: hard.reasons,
        matchBreakdown: {},
        job,
        candidate: applicant,
      });

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
        rejectionExplanation: rejectionExplanation,
        willingToRelocate: willingToRelocate !== undefined ? willingToRelocate : null,
      });

      setImmediate(() => {
        sendRejectionEmail({
          candidateEmail: applicant.email,
          candidateName: applicant.name,
          jobTitle: job.title,
          companyName: job.company?.name || "Our Company",
          rejectionFeedback: {
            matchScore: 0,
            detailedAnalysis: rejectionExplanation.reason,
            improvementSuggestions: rejectionExplanation.recommendations,
            encouragement: "Keep improving and apply to more positions!",
          },
        }).catch((err) => console.error("Failed to send rejection email:", err));
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
          rejectionExplanation,
          applicationCount,
        },
      });
    }

    // Soft scoring runs only after hard rules pass
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

    const application = await Application.create({
      jobId: jobId,
      applicantId: applicant._id,
      recruiterId: job.postedBy,
      coverLetter: coverLetter ? coverLetter.trim() : "",
      resume: resumeUrl,
      status: applicationStatus,
      matchScore: matchScore,
      screeningResult: screeningResult,
      willingToRelocate: willingToRelocate !== undefined ? willingToRelocate : null,
    });

    try {
      const notification = await Notification.createNotification(
        job.postedBy,
        'new_application',
        {
          title: 'New Application',
          description: `New application from ${applicant.name} for ${job.title}`,
          icon: 'mail',
          actionUrl: `/jobs/${jobId}/applicants`,
          relatedIds: {
            applicationId: application._id,
            jobId: jobId,
            fromUserId: applicant._id,
          },
        }
      );

      io.to(`user:${job.postedBy}`).emit('applicationReceived', {
        notificationId: notification._id,
        applicationId: application._id,
        applicantName: applicant.name,
        jobTitle: job.title,
      });
    } catch (error) {
      console.error('Error creating notification for new application:', error);
    }

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

    const formattedApplications = await Promise.all(
      applications.map(async (app) => {
        // Job or recruiter may have been deleted
        if (!app.jobId || !app.jobId.postedBy) {
          return {
            _id: app._id,
            job: app.jobId,
            coverLetter: app.coverLetter,
            status: app.status,
            appliedAt: app.appliedAt,
            feedback: app.feedback.filter((f) => f.visibleToApplicant),
            viewedByRecruiter: app.viewedByRecruiter,
            matchScore: app.matchScore,
            rejectionReason: app.rejectionReason,
            hasMessages: false,
            unreadMessageCount: 0,
            conversationId: null,
          };
        }

        const conversationId = Message.createConversationId(
          app.jobId._id,
          app.applicantId,
          app.jobId.postedBy._id
        );

        const recruiterMessages = await Message.countDocuments({
          conversationId,
          senderId: app.jobId.postedBy._id,
        });

        const unreadCount = await Message.countDocuments({
          conversationId,
          receiverId: req.user._id,
          read: false,
        });

        return {
          _id: app._id,
          job: app.jobId,
          coverLetter: app.coverLetter,
          status: app.status,
          appliedAt: app.appliedAt,
          feedback: app.feedback.filter((f) => f.visibleToApplicant),
          viewedByRecruiter: app.viewedByRecruiter,
          matchScore: app.matchScore,
          rejectionReason: app.rejectionReason,
          hasMessages: recruiterMessages > 0,
          unreadMessageCount: unreadCount,
          conversationId,
        };
      })
    );

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

    // Only flip pending applications to "viewed"; never touch rejected/processed ones
    await Application.updateMany(
      {
        jobId: jobId,
        viewedByRecruiter: false,
        status: "pending"
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

    const applicants = await Promise.all(
      applications.map(async (app) => {
        let conversationId = null;
        let unreadCount = 0;

        if (app.applicantId) {
          conversationId = Message.createConversationId(
            app.jobId,
            app.applicantId._id,
            req.user._id
          );

          unreadCount = await Message.countDocuments({
            conversationId,
            senderId: app.applicantId._id,
            receiverId: req.user._id,
            read: false,
          });
        }

        return {
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
      unreadMessageCount: unreadCount,
      conversationId,
    };
      })
    );

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
      .populate("applicantId", "name email profileImage skills parsedResume");

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

    if (status === "rejected") {
      console.log("🤖 Generating AI-powered rejection feedback...");

      try {
        const rejectionFeedback = await generateRejectionFeedback({
          job: application.jobId,
          candidateProfile: application.applicantId.parsedResume || {
            skills: application.applicantId.skills || [],
            yearsOfExperience: 0,
          },
          screeningResult: application.screeningResult || { reasons: [] },
          matchScore: application.matchScore || 0,
        });

        application.rejectionReason = rejectionFeedback.primaryReasons.join(". ");

        application.feedback.push({
          message: `Match Score: ${rejectionFeedback.matchScore}%\n\n${rejectionFeedback.detailedAnalysis.skillGapAnalysis || ""}`,
          givenBy: req.user._id,
          visibleToApplicant: true,
          createdAt: new Date(),
        });

        console.log("✅ Rejection feedback generated successfully");

        sendRejectionEmail({
          candidateEmail: application.applicantId.email,
          candidateName: application.applicantId.name,
          jobTitle: application.jobId.title,
          companyName: application.jobId.company?.name,
          rejectionFeedback,
        })
          .then((result) => {
            if (result.success) {
              console.log("✅ Rejection email sent to:", application.applicantId.email);
            } else {
              console.warn("⚠️  Failed to send rejection email:", result.message || result.error);
            }
          })
          .catch((err) => {
            console.error("❌ Error sending rejection email:", err);
          });
      } catch (feedbackError) {
        console.error("❌ Error generating rejection feedback:", feedbackError);
        application.rejectionReason = "Your application did not meet the job requirements.";
      }
    }

    if (status === "accepted") {
      console.log("🎉 Sending acceptance email...");

      sendAcceptanceEmail({
        candidateEmail: application.applicantId.email,
        candidateName: application.applicantId.name,
        jobTitle: application.jobId.title,
        companyName: application.jobId.company?.name,
        nextSteps: "The recruiter will contact you soon with next steps.",
      })
        .then((result) => {
          if (result.success) {
            console.log("✅ Acceptance email sent to:", application.applicantId.email);
          }
        })
        .catch((err) => {
          console.error("❌ Error sending acceptance email:", err);
        });
    }

    if (status === "viewed" || status === "moving-forward") {
      console.log(`📧 Sending status change email for: ${status}...`);

      sendStatusChangeEmail({
        candidate: application.applicantId,
        recruiter: req.user,
        job: application.jobId,
        oldStatus: application.status,
        newStatus: status,
        applicationId: application._id,
      })
        .then((result) => {
          if (result.success) {
            console.log(`✅ Status change email sent to: ${application.applicantId.email}`);
          }
        })
        .catch((err) => {
          console.error("❌ Error sending status change email:", err);
        });
    }

    if (feedback && feedback.trim()) {
      application.feedback.push({
        message: feedback.trim(),
        givenBy: req.user._id,
        visibleToApplicant: true,
        createdAt: new Date(),
      });
    }

    await application.save();

    // Create notification for applicant about status change (only for non-pending statuses)
    if (status !== "pending") {
      try {
        const statusLabels = {
          'viewed': 'Application Viewed',
          'moving-forward': 'Moving Forward',
          'accepted': 'Application Accepted',
          'rejected': 'Application Rejected',
        };

        const notification = await Notification.createNotification(
          application.applicantId._id,
          'status_change',
          {
            title: statusLabels[status] || 'Status Changed',
            description: `Your application for ${application.jobId.title} has been ${status}`,
            icon: status === 'accepted' ? 'check-circle' : status === 'rejected' ? 'alert-circle' : 'mail',
            actionUrl: `/applications?id=${application._id}`,
            relatedIds: {
              applicationId: application._id,
              jobId: application.jobId._id,
              fromUserId: req.user._id,
            },
          }
        );

        io.to(`user:${application.applicantId._id}`).emit('applicationStatusChanged', {
          notificationId: notification._id,
          applicationId: application._id,
          jobTitle: application.jobId.title,
          newStatus: status,
        });
      } catch (error) {
        console.error('Error creating notification for status change:', error);
      }
    }

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

const getApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await Application.findById(applicationId)
      .populate({
        path: "jobId",
        populate: {
          path: "postedBy",
          select: "name email profileImage"
        }
      })
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

    // postedBy can be an ID, a populated object, or null when the poster's
    // account was deleted (typeof null === 'object', so check for null first).
    const postedBy = application.jobId?.postedBy;
    const recruiterId = postedBy?._id ?? postedBy ?? application.recruiterId ?? null;
    const isJobPoster =
      !!recruiterId && recruiterId.toString() === req.user._id.toString();

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

    const isRecruiter = application.jobId.postedBy.toString() === req.user._id.toString();
    const isApplicant = application.applicantId._id.toString() === req.user._id.toString();

    if (!isRecruiter && !isApplicant) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this resume",
      });
    }

    if (!application.resume) {
      console.log("⚠️  No resume found for application:", applicationId);
      console.log("Application data:", {
        id: application._id,
        applicantId: application.applicantId?._id,
        applicantName: application.applicantId?.name,
        resume: application.resume,
      });
      return res.status(404).json({
        success: false,
        message: "Resume not found for this application",
      });
    }

    try {
      console.log("📄 Attempting to serve resume from:", application.resume);

      if (application.resume.startsWith('/uploads/')) {
        // Local file - serve directly from filesystem
        const fs = await import('fs');
        const path = await import('path');

        const filePath = path.join(process.cwd(), application.resume);

        console.log("📂 Serving local file from:", filePath);

        if (!fs.existsSync(filePath)) {
          console.error("❌ File not found:", filePath);
          return res.status(404).json({
            success: false,
            message: "Resume file not found on server",
          });
        }

        const fileBuffer = fs.readFileSync(filePath);

        console.log("✅ Successfully loaded resume, size:", fileBuffer.length, "bytes");

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${application.applicantId.name.replace(/[^a-zA-Z0-9]/g, '_')}_resume.pdf"`);
        res.setHeader("Cache-Control", "public, max-age=86400");

        return res.send(fileBuffer);
      } else if (application.resume.includes('cloudinary.com')) {
        // Cloudinary URL - kept for backward compatibility with old uploads
        console.log("☁️  Fetching from Cloudinary...");

        let pdfUrl = application.resume;

        // Signed URL needed for raw/upload assets
        if (application.resume.includes('/raw/upload/')) {
          try {
            pdfUrl = generateSignedUrl(application.resume);
          } catch (signError) {
            console.warn("Could not generate signed URL:", signError.message);
          }
        }

        const response = await axios.get(pdfUrl, {
          responseType: "arraybuffer",
          timeout: 30000,
        });

        console.log("✅ Successfully fetched resume from Cloudinary, size:", response.data.length, "bytes");

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${application.applicantId.name.replace(/[^a-zA-Z0-9]/g, '_')}_resume.pdf"`);
        res.setHeader("Cache-Control", "public, max-age=3600");

        return res.send(Buffer.from(response.data));
      } else {
        console.error("❌ Unknown resume URL format:", application.resume);
        return res.status(400).json({
          success: false,
          message: "Invalid resume URL format",
        });
      }
    } catch (fetchError) {
      console.error("❌ Error serving resume:", {
        message: fetchError.message,
        url: application.resume,
      });
      return res.status(500).json({
        success: false,
        message: "Failed to load resume",
        error: fetchError.message,
      });
    }
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
  getApplication,
  getApplicationResume,
};