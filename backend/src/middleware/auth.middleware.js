import User from "../models/user.model.js";
import {
  verifyAccessToken,
  extractTokenFromHeader,
  generateTokenPair,
} from "../utils/jwt.utils.js";

export const protect = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token",
        requiresAuth: true,
      });
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (tokenError) {
      if (tokenError.message === "Access token expired") {
        // Try to refresh automatically if refresh token is in headers
        const refreshToken = req.headers["x-refresh-token"];
        
        if (refreshToken) {
          try {
            const { verifyRefreshToken } = await import("../utils/jwt.utils.js");
            const refreshDecoded = verifyRefreshToken(refreshToken);
            
            const user = await User.findById(refreshDecoded.userId);
            if (user && user.refreshTokens.some(rt => rt.token === refreshToken)) {
              // Generate new tokens
              const newTokens = generateTokenPair({
                userId: user._id,
                email: user.email,
              });
              
              // Set new tokens in response headers
              res.setHeader("X-New-Access-Token", newTokens.accessToken);
              res.setHeader("X-New-Refresh-Token", newTokens.refreshToken);
              
              // Continue with the user
              req.user = user;
              return next();
            }
          } catch (refreshError) {
            console.error("Refresh error:", refreshError);
          }
        }
      }
      
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
        requiresAuth: true,
      });
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
        requiresAuth: true,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({
      success: false,
      message: "Not authorized",
      requiresAuth: true,
    });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        const user = await User.findById(decoded.userId);
        if (user) {
          req.user = user;
        }
      } catch (error) {
        // Token invalid, just continue without user
      }
    }

    next();
  } catch (error) {
    next();
  }
};