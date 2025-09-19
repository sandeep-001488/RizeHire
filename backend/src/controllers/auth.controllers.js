import User from "../models/user.model.js";
import { generateTokenPair, verifyRefreshToken } from "../utils/jwt.utils.js";
import Joi from "joi";

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  bio: Joi.string().max(500).optional(),
  linkedinUrl: Joi.string().uri().optional(),
  walletAddress: Joi.string().optional(),
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

    const { name, email, password, bio, linkedinUrl, walletAddress } = value;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      bio: bio || "",
      linkedinUrl,
      walletAddress,
    });

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

    // await user.removeRefreshToken(refreshToken);
    // await user.addRefreshToken(tokens.refreshToken);

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
      bio: Joi.string().max(500).optional(),
      linkedinUrl: Joi.string().uri().optional(),
      walletAddress: Joi.string().optional(),
      skills: Joi.array().items(Joi.string().max(50)).max(20).optional(),
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

export { register, login, refreshToken, logout, getProfile, updateProfile };
