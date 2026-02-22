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
    // --- FIELDS FOR AI SCREENING ---
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
    // --- NEW: ML MODEL FIELDS FOR TRAINING & PREDICTION ---
    mlPrediction: {
      score: {
        type: Number,
        min: 0,
        max: 1,
        default: null, // ML model's prediction score (0-1)
      },
      prediction: {
        type: String,
        enum: ["accept", "reject", "review", null],
        default: null, // ML model's recommendation
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1,
        default: null, // How confident the model is
      },
      modelVersion: {
        type: String,
        default: null, // Track which model version made prediction
      },
      predictedAt: {
        type: Date,
        default: null,
      },
    },
    // --- NEW: EXPLAINABILITY (SHAP/LIME) ---
    explanation: {
      topFactors: [
        {
          feature: String, // e.g., "skills_match", "experience"
          impact: Number, // Positive or negative impact on score
          value: mongoose.Schema.Types.Mixed, // Actual value of the feature
        },
      ],
      visualizationUrl: String, // URL to SHAP plot if stored
    },
    // --- NEW: RECRUITER DECISION (FOR TRAINING) ---
    recruiterDecision: {
      finalDecision: {
        type: String,
        enum: ["accepted", "rejected", null],
        default: null, // Actual decision by recruiter
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
        default: null, // Why recruiter made this decision
      },
    },
    // --- NEW: FEATURE VECTOR (FOR ML TRAINING) ---
    features: {
      skillsMatch: { type: Number, default: null }, // 0-1 score
      experienceMatch: { type: Number, default: null }, // 0-1 score
      educationMatch: { type: Number, default: null }, // 0-1 score
      locationMatch: { type: Number, default: null }, // 0-1 score
      yearsOfExperience: { type: Number, default: null },
      careerGrowthRate: { type: Number, default: null },
      jobStability: { type: Number, default: null },
      // Add more features as needed
    },
    // --- NEW: BIAS DETECTION METADATA ---
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
    // --- NEW: FEEDBACK LOOP FLAG ---
    usedForTraining: {
      type: Boolean,
      default: false, // Mark if this data was used to retrain model
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
// NEW: Indexes for ML-related queries
applicationSchema.index({ "mlPrediction.score": -1 }); // Sort by ML score
applicationSchema.index({ "recruiterDecision.finalDecision": 1 }); // Filter by decision
applicationSchema.index({ usedForTraining: 1 }); // Find training data
applicationSchema.index({ "mlPrediction.modelVersion": 1 }); // Track model versions

const Application = mongoose.model("Application", applicationSchema);
export default Application;