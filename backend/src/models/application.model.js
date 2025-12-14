import mongoose from "mongoose";

// --- NEW SCHEMA FOR SCREENING RESULTS ---
const screeningResultSchema = new mongoose.Schema(
  {
    hardFail: {
      type: Boolean,
      default: false,
    },
    reasons: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    applicantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    coverLetter: {
      type: String,
      maxlength: 5000,
    },
    resume: { // Store the resume file path
      type: String,
      required: false, // Resume is optional
    },
    status: {
      type: String,
      enum: ["pending", "viewed", "moving-forward", "accepted", "rejected"],
      default: "pending",
    },
    // --- NEW FIELDS FOR AI SCREENING ---
    matchScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    screeningResult: {
      type: screeningResultSchema,
      default: () => ({}),
    },
    feedback: [
      {
        message: {
          type: String,
          required: true,
          maxlength: 2000,
        },
        givenBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        visibleToApplicant: {
          type: Boolean,
          default: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    viewedByRecruiter: {
      type: Boolean,
      default: false,
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
   rejectionReason: {
      type: String,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
  }
);

applicationSchema.index({ jobId: 1, applicantId: 1 }, { unique: true });
applicationSchema.index({ status: 1 });
applicationSchema.index({ appliedAt: -1 });
applicationSchema.index({ recruiterId: 1 });

const Application = mongoose.model("Application", applicationSchema);
export default Application;