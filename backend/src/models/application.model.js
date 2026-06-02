import mongoose from "mongoose";

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
    resume: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ["pending", "viewed", "moving-forward", "accepted", "rejected"],
      default: "pending",
    },
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
    mlPrediction: {
      score: {
        type: Number,
        min: 0,
        max: 1,
        default: null,
      },
      prediction: {
        type: String,
        enum: ["accept", "reject", "review", null],
        default: null,
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1,
        default: null,
      },
      modelVersion: {
        type: String,
        default: null,
      },
      predictedAt: {
        type: Date,
        default: null,
      },
    },
    explanation: {
      topFactors: [
        {
          feature: String,
          impact: Number,
          value: mongoose.Schema.Types.Mixed,
        },
      ],
      visualizationUrl: String,
    },
    recruiterDecision: {
      finalDecision: {
        type: String,
        enum: ["accepted", "rejected", null],
        default: null,
      },
      decidedAt: {
        type: Date,
        default: null,
      },
      decidedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      notes: {
        type: String,
        maxlength: 1000,
        default: null,
      },
    },
    features: {
      skillsMatch: { type: Number, default: null },
      experienceMatch: { type: Number, default: null },
      educationMatch: { type: Number, default: null },
      locationMatch: { type: Number, default: null },
      yearsOfExperience: { type: Number, default: null },
      careerGrowthRate: { type: Number, default: null },
      jobStability: { type: Number, default: null },
    },
    biasMetadata: {
      gender: {
        type: String,
        enum: ["male", "female", "other", "not_specified", null],
        default: null,
      },
      ageGroup: {
        type: String,
        enum: ["18-25", "26-35", "36-45", "46-55", "55+", null],
        default: null,
      },
      // Used only for bias detection, not for ML predictions
    },
    usedForTraining: {
      type: Boolean,
      default: false,
    },
    // AI-generated improvement feedback (not manual recruiter communication)
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
    willingToRelocate: {
      type: Boolean,
      default: null, // null = not answered, true = yes, false = no
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
    rejectionExplanation: {
      type: {
        reason: String,
        hardRuleFailed: [String],
        matchBreakdown: {
          skills: Number,
          experience: Number,
          location: Number,
          salary: Number,
        },
        shapExplanation: mongoose.Schema.Types.Mixed,
        limeExplanation: mongoose.Schema.Types.Mixed,
        recommendations: [String],
      },
      default: null,
    },
    rejectionEmailSent: {
      type: Boolean,
      default: false,
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
applicationSchema.index({ "mlPrediction.score": -1 });
applicationSchema.index({ "recruiterDecision.finalDecision": 1 });
applicationSchema.index({ usedForTraining: 1 });
applicationSchema.index({ "mlPrediction.modelVersion": 1 });

const Application = mongoose.model("Application", applicationSchema);
export default Application;