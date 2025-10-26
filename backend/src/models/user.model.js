import mongoose from "mongoose";
import bcrypt from "bcryptjs";

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
    bio: {
      type: String,
      maxlength: [1000, "Bio too long"],
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
      unique: true,
      sparse: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^0x[a-fA-F0-9]{40}$/.test(v);
        },
        message: "Invalid Ethereum wallet address",
      },
    },
    isPaidUser: {
      type: Boolean,
      default: false,
    },
    paymentTransactions: [
      {
        txHash: String,
        amount: String,
        currency: String,
        verified: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
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
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.refreshTokens;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);
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

userSchema.statics.findByEmailWithPassword = function (email) {
  return this.findOne({ email }).select("+password");
};

const User = mongoose.model("User", userSchema);

export default User;
