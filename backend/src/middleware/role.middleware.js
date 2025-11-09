const isPoster = (req, res, next) => {
  if (req.user && req.user.role === "poster") {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: "Access denied. Only users with role 'poster' can post jobs.",
    });
  }
};

const hasWallet = (req, res, next) => {
  if (req.user && req.user.walletAddress) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message:
        "A valid wallet address is required to post a job. Please update your profile.",
      requiresWallet: true,
    });
  }
};

export { isPoster, hasWallet };
