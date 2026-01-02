import User from "../models/user.model.js";
import { generateTokenPair, verifyRefreshToken } from "../utils/jwt.utils.js";
import extractTextFromResume from "../utils/resumeParser.js";
import { parseResumeWithAI } from "../utils/aiScreening.js";
import { sendEmail } from "../utils/email.js";
import Joi from "joi";
import crypto from "crypto";
import { uploadToCloudinary } from "../middleware/upload.middleware.js";

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("seeker", "poster").required(),
  gender: Joi.when("role", {
    is: "seeker",
    then: Joi.string().valid("male", "female", "other").required(),
    otherwise: Joi.forbidden(), // Change this line - don't accept gender for posters
  }),
  bio: Joi.string().max(10000).optional().allow(""),
  linkedinUrl: Joi.string().uri().optional().allow(""),
  walletAddress: Joi.string().optional().allow(""),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const register = async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const {
      name,
      email,
      password,
      role,
      gender,
      bio,
      linkedinUrl,
      walletAddress,
    } = value;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Create user object conditionally
    const userData = {
      name,
      email,
      password,
      role,
      bio: bio || "",
      linkedinUrl,
      walletAddress,
    };

    // Only add gender if user is a seeker
    if (role === "seeker" && gender) {
      userData.gender = gender;
    }

    const user = await User.create(userData);

    const tokens = generateTokenPair({ userId: user._id, email: user.email });
    await user.addRefreshToken(tokens.refreshToken);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user,
        tokens,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { email, password } = value;

    const user = await User.findByEmailWithPassword(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const tokens = generateTokenPair({ userId: user._id, email: user.email });
    await user.addRefreshToken(tokens.refreshToken);

    user.password = undefined;

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user,
        tokens,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token required",
      });
    }

    const decoded = verifyRefreshToken(refreshToken);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const tokenExists = user.refreshTokens.some(
      (rt) => rt.token === refreshToken
    );
    if (!tokenExists) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const tokens = generateTokenPair({ userId: user._id, email: user.email });

    res.json({
      success: true,
      message: "Tokens refreshed successfully",
      data: {
        tokens,
      },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await req.user.removeRefreshToken(refreshToken);
    }

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getProfile = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const updateSchema = Joi.object({
      name: Joi.string().min(2).max(100).optional(),
      gender: Joi.string().valid("male", "female", "other").optional(),
      bio: Joi.string().max(10000).optional().allow(""),
      linkedinUrl: Joi.string().uri().optional().allow(""),
      walletAddress: Joi.string().optional().allow(""),
      skills: Joi.array().items(Joi.string().max(50)).optional(), 
    });

    const { error, value } = updateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, value, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateSkills = async (req, res) => {
  try {
    const { skills } = req.body;
    if (!Array.isArray(skills)) {
      return res.status(400).json({
        success: false,
        message: "Skills must be an array of strings",
      });
    }
    // REMOVED: 20 skill limit check
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { skills },
      {
        new: true,
        runValidators: true,
      }
    );
    res.json({
      success: true,
      message: "Skills updated successfully",
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATED: Parse and Save Resume with Gender Priority Logic ---
// const parseAndSaveResume = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: "Resume file (PDF/DOCX) is required",
//       });
//     }

//     const resumeText = await extractTextFromResume(req.file.path);
    
//     if (!resumeText || resumeText.trim().length < 50) {
//       fs.unlinkSync(req.file.path);
//       return res.status(400).json({
//         success: false,
//         message: "Could not extract meaningful text from resume.",
//       });
//     }

//     const parsedData = await parseResumeWithAI(resumeText);
//     await uploadToCloudinary(req.file.path);

//     const user = req.user;

//     // Gender priority logic
//     if (user.gender && (user.gender === "male" || user.gender === "female")) {
//       parsedData.gender = user.gender;
//     } else if (parsedData.gender && user.gender === "other") {
//       user.gender = parsedData.gender;
//     }

//     user.parsedResume = parsedData;

//     // FIXED: Properly merge and update skills
//     if (parsedData.skills && parsedData.skills.length > 0) {
//       const existingSkills = user.skills || [];
//       const allSkills = [...existingSkills, ...parsedData.skills];
      
//       // Remove duplicates (case-insensitive)
//       const uniqueSkills = [...new Set(
//         allSkills.map(skill => skill.trim().toLowerCase())
//       )].map(lowerSkill => {
//         return allSkills.find(s => s.toLowerCase() === lowerSkill);
//       });

//       user.skills = uniqueSkills; 
//     }

//     await user.save();

//     res.json({
//       success: true,
//       message: "Resume parsed and profile updated successfully",
//       data: {
//         user,
//         parsedDetails: {
//           name: parsedData.name,
//           email: parsedData.email,
//           phone: parsedData.phone,
//           skills: parsedData.skills,
//           yearsOfExperience: parsedData.yearsOfExperience,
//           gender: parsedData.gender,
//           location: parsedData.location,
//           education: parsedData.education,
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Resume parsing error:", error);
//     res.status(500).json({
//       success: false,
//       message: `Failed to parse resume: ${error.message}`,
//     });
//   }
// };
const parseAndSaveResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Resume file (PDF/DOCX) is required",
      });
    }

    console.log("📄 Parsing resume file:", req.file.originalname);

    const resumeText = await extractTextFromResume(req.file.path);
    
    console.log("📝 Extracted text length:", resumeText.length);
    
    if (!resumeText || resumeText.trim().length < 50) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Could not extract meaningful text from resume.",
      });
    }

    console.log("🤖 Sending to AI for parsing...");
    const parsedData = await parseResumeWithAI(resumeText);
    console.log("✅ AI parsing complete:", {
      name: parsedData.name,
      skillsCount: parsedData.skills?.length || 0,
      skills: parsedData.skills,
    });

    // Upload resume to Cloudinary
    const resumeUrl = await uploadToCloudinary(req.file.path);
    console.log("☁️ Uploaded to Cloudinary:", resumeUrl);

    const user = req.user;

    // Gender priority logic
    if (user.gender && (user.gender === "male" || user.gender === "female")) {
      parsedData.gender = user.gender;
    } else if (parsedData.gender && user.gender === "other") {
      user.gender = parsedData.gender;
    }

    // **CRITICAL FIX**: Save parsed resume data
    user.parsedResume = {
      name: parsedData.name,
      email: parsedData.email,
      phone: parsedData.phone,
      skills: parsedData.skills || [],
      yearsOfExperience: parsedData.yearsOfExperience || 0,
      gender: parsedData.gender,
      location: parsedData.location || { city: null, country: null },
      education: parsedData.education || [],
    };

    // **FIX**: Properly merge skills
    console.log("📊 Current user skills:", user.skills?.length || 0);
    console.log("📊 Parsed skills:", parsedData.skills?.length || 0);

    if (parsedData.skills && Array.isArray(parsedData.skills) && parsedData.skills.length > 0) {
      const existingSkills = user.skills || [];
      
      // Combine all skills
      const allSkills = [...existingSkills, ...parsedData.skills];
      
      // Remove duplicates (case-insensitive)
      const uniqueSkillsMap = new Map();
      allSkills.forEach(skill => {
        const lowerSkill = skill.trim().toLowerCase();
        if (!uniqueSkillsMap.has(lowerSkill)) {
          uniqueSkillsMap.set(lowerSkill, skill.trim());
        }
      });
      
      user.skills = Array.from(uniqueSkillsMap.values());
      console.log("✅ Final merged skills:", user.skills.length);
    }

    await user.save();

    console.log("💾 User profile updated successfully");

    res.json({
      success: true,
      message: "Resume parsed and profile updated successfully",
      data: {
        user,
        parsedDetails: {
          name: parsedData.name,
          email: parsedData.email,
          phone: parsedData.phone,
          skills: parsedData.skills,
          yearsOfExperience: parsedData.yearsOfExperience,
          gender: parsedData.gender,
          location: parsedData.location,
          education: parsedData.education,
        },
      },
    });
  } catch (error) {
    console.error("❌ Resume parsing error:", error);
    res.status(500).json({
      success: false,
      message: `Failed to parse resume: ${error.message}`,
    });
  }
};

// --- Forgot Password ---
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({
        success: true,
        message:
          "If an account exists, a reset link has been sent to your email.",
      });
    }

    const rawToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password/${rawToken}`;
    const html = `
      <h1>Password Reset Request</h1>
      <p>You requested to reset your password. Click the link below to proceed:</p>
      <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Your Password</a>
      <p>This link expires in 15 minutes.</p>
      <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
    `;

    await sendEmail({
      to: user.email,
      subject: "Password Reset Request - RizeHire",
      html,
    });

    res.json({
      success: true,
      message:
        "If an account exists, a reset link has been sent to your email.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    // Clear tokens on error
    if (req.user) {
      req.user.resetPasswordToken = undefined;
      req.user.resetPasswordExpires = undefined;
      await req.user.save({ validateBeforeSave: false });
    }
    res.status(500).json({
      success: false,
      message: "Failed to process password reset request",
    });
  }
};

// --- Reset Password ---
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Hash the token from the URL
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Password reset token is invalid or has expired",
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    const tokens = generateTokenPair({ userId: user._id, email: user.email });
    await user.addRefreshToken(tokens.refreshToken);
    user.password = undefined;

    res.json({
      success: true,
      message: "Password reset successful. You are now logged in.",
      data: {
        user,
        tokens,
      },
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
    });
  }
};

export {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  parseAndSaveResume,
  forgotPassword,
  resetPassword,
  updateSkills
};