const requirePayment = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user.walletAddress) {
      return res.status(400).json({
        success: false,
        message: "Wallet address required for job posting",
        requiresWallet: true,
      });
    }

    if (!user.isPaidUser) {
      return res.status(402).json({
        success: false,
        message: "Payment required to post jobs",
        requiresPayment: true,
        walletAddress: user.walletAddress,
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export { requirePayment };
