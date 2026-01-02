import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// --- PARSED RESUME SCHEMA ---
const parsedResumeSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    skills: [String],
    technicalSkills: [String],
    yearsOfExperience: Number,
    gender: String,
    location: {
      city: String,
      country: String,
    },
    education: [String],
    resume_confidence: Number,
    parsed_summary: String,
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name too long"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Invalid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["seeker", "poster"],
      required: [true, "User role is required ('seeker' or 'poster')"],
    },
    // --- MANDATORY GENDER FIELD ---
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: function () {
        return this.role === "seeker"; 
      },
    },
    bio: {
      type: String,
      maxlength: [10000, "Bio cannot exceed 10000 characters"],
      default: "",
    },
    linkedinUrl: {
      type: String,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/.test(
            v
          );
        },
        message: "Invalid LinkedIn URL",
      },
    },
    skills: [
      {
        type: String,
        trim: true,
        maxlength: [50, "Skill name too long"],
      },
    ],
    walletAddress: {
      type: String,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^0x[a-fA-F0-9]{40}$/.test(v);
        },
        message: "Invalid Ethereum wallet address",
      },
    },
    parsedResume: {
      type: parsedResumeSchema,
      default: null,
    },
    profileImage: String,
    refreshTokens: [
      {
        token: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.refreshTokens;
        delete ret.__v;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        return ret;
      },
    },
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);

  if (!this.isNew) {
    this.resetPasswordToken = undefined;
    this.resetPasswordExpires = undefined;
  }
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.addRefreshToken = function (token) {
  if (this.refreshTokens.length >= 5) {
    this.refreshTokens = this.refreshTokens.slice(-4);
  }
  this.refreshTokens.push({ token });
  return this.save();
};

userSchema.methods.removeRefreshToken = function (token) {
  this.refreshTokens = this.refreshTokens.filter((rt) => rt.token !== token);
  return this.save();
};

userSchema.methods.createPasswordResetToken = function () {
  const rawToken = crypto.randomBytes(32).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  this.resetPasswordExpires = Date.now() + 15 * 60 * 1000; 

  return rawToken;
};

userSchema.statics.findByEmailWithPassword = function (email) {
  return this.findOne({ email }).select("+password");
};

const User = mongoose.model("User", userSchema);

export default User;