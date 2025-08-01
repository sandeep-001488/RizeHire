import Job from "../models/job.model.js";

const verifyPayment = async (req, res) => {
  try {
    const { txHash, amount, blockchain } = req.body;

    if (!txHash) {
      return res.status(400).json({
        success: false,
        message: "Transaction hash is required",
      });
    }

    
    const isValidTransaction = await simulateBlockchainVerification(
      txHash,
      amount,
      blockchain
    );

    if (!isValidTransaction) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction or payment not confirmed",
      });
    }

    res.json({
      success: true,
      message: "Payment verified successfully",
      data: {
        txHash,
        verified: true,
        amount,
        blockchain,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getPaymentStatus = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view payment status",
      });
    }

    res.json({
      success: true,
      data: {
        jobId: job._id,
        paymentTxHash: job.paymentTxHash,
        paymentVerified: job.paymentVerified,
        isActive: job.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updatePaymentVerification = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { txHash, verified = false } = req.body;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update payment verification",
      });
    }

    job.paymentTxHash = txHash;
    job.paymentVerified = verified;

    if (verified) {
      job.isActive = true;
    }

    await job.save();

    res.json({
      success: true,
      message: "Payment verification updated successfully",
      data: {
        jobId: job._id,
        paymentTxHash: job.paymentTxHash,
        paymentVerified: job.paymentVerified,
        isActive: job.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getPaymentHistory = async (req, res) => {
  try {
    const jobs = await Job.find({
      postedBy: req.user._id,
      paymentTxHash: { $exists: true },
    })
      .select("title paymentTxHash paymentVerified createdAt")
      .sort({ createdAt: -1 });

    const paymentHistory = jobs.map((job) => ({
      jobId: job._id,
      jobTitle: job.title,
      txHash: job.paymentTxHash,
      verified: job.paymentVerified,
      date: job.createdAt,
    }));

    res.json({
      success: true,
      data: { paymentHistory },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getPlatformFeeInfo = async (req, res) => {
  try {
    const feeInfo = {
      ethereum: {
        amount: "0.001",
        currency: "ETH",
        usdEquivalent: "2.50", 
      },
      polygon: {
        amount: "2",
        currency: "MATIC",
        usdEquivalent: "2.00",
      },
      solana: {
        amount: "0.01",
        currency: "SOL",
        usdEquivalent: "2.30",
      },
      adminWallet: {
        ethereum: process.env.ADMIN_WALLET_ADDRESS,
        polygon: process.env.ADMIN_WALLET_ADDRESS,
        solana: process.env.ADMIN_WALLET_ADDRESS,
      },
    };

    res.json({
      success: true,
      data: { feeInfo },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const simulateBlockchainVerification = async (txHash, amount, blockchain) => {

  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (!txHash || txHash.length < 10) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Blockchain verification error:", error);
    return false;
  }
};

export {
  verifyPayment,
  getPaymentStatus,
  updatePaymentVerification,
  getPaymentHistory,
  getPlatformFeeInfo,
};
