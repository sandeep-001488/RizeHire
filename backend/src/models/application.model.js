import mongoose from "mongoose";

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
    status: {
      type: String,
      enum: ["pending", "viewed", "moving-forward", "accepted", "rejected"],
      default: "pending",
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
