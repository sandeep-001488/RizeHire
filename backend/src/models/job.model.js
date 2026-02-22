import mongoose from "mongoose";

// --- HARD CONSTRAINTS SCHEMA (Gender & Experience Only) ---
const hardConstraintsSchema = new mongoose.Schema(
  {
    gender: {
      type: String,
      enum: ["male", "female", null],
      default: null,
    },
    minYears: {
      type: Number,
      min: 0,
      default: null,
    },
  },
  { _id: false }
);

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
      maxlength: [200, "Title too long"],
    },
    // --- NEW: Job Category (for universal platform support) ---
    category: {
      type: String,
      enum: [
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
      ],
      required: [true, "Job category is required"],
      default: "other"
    },
    // --- NEW: Industry (optional, for better categorization) ---
    industry: {
      type: String,
      enum: [
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
      ],
      default: "Other"
    },
    company: {
      name: { type: String, trim: true },
      website: { type: String },
      description: { type: String, maxlength: 1000 },
    },
    description: {
      type: String,
      required: [true, "Job description is required"],
      maxlength: [5000, "Description too long"],
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    jobType: {
      type: String,
      enum: ["full-time", "part-time", "contract", "freelance", "internship"],
      required: true,
    },
    workMode: {
      type: String,
      enum: ["remote", "hybrid", "onsite"],
      required: true,
    },
    location: {
      city: String,
      state: String,
      country: String,
    },
    budget: {
      min: {
        type: Number,
        min: 0,
      },
      max: {
        type: Number,
        min: 0,
      },
      currency: {
        type: String,
        default: "USD",
      },
      period: {
        type: String,
        enum: ["hourly", "daily", "monthly", "yearly", "project"],
        default: "monthly",
      },
    },
    experienceLevel: {
      type: String,
      enum: ["entry", "junior", "mid", "senior", "expert"],
      default: "mid",
    },
    // --- HARD CONSTRAINTS (Gender & Experience Only) ---
    hardConstraints: {
      type: hardConstraintsSchema,
      default: () => ({}),
    },
    applicationUrl: String,
    applicationEmail: String,
    applicationDeadline: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    tags: [String],
    ideal_experience: {
      type: Number,
      default: 5,
    },
    preferred_education: {
      type: String,
      enum: ["High School", "Bachelor's", "Master's", "PhD"],
      default: "Bachelor's",
    },
    required_skills: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

jobSchema.index({ postedBy: 1 });
jobSchema.index({ skills: 1 });
jobSchema.index({ jobType: 1 });
jobSchema.index({ "location.city": 1 });
jobSchema.index({ createdAt: -1 });
jobSchema.index({ isActive: 1 });
// NEW: Indexes for category and industry for better filtering performance
jobSchema.index({ category: 1 });
jobSchema.index({ industry: 1 });
jobSchema.index({ category: 1, industry: 1 }); // Compound index for combined filtering

jobSchema.methods.incrementViews = function () {
  this.views += 1;
  return this.save();
};

const Job = mongoose.model("Job", jobSchema);
export default Job;