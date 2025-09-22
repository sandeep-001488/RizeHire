import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
      maxlength: [200, "Title too long"],
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
    applicationUrl: String,
    applicationEmail: String,
    applicationDeadline: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
    paymentTxHash: {
      type: String,
      required: true,
    },
    paymentVerified: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    tags: [String],
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

jobSchema.methods.incrementViews = function () {
  this.views += 1;
  return this.save();
};

const Job = mongoose.model("Job", jobSchema);
export default Job;
