import express from "express";
import { v2 as cloudinary } from "cloudinary";
import axios from "axios";
import crypto from "crypto";

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Proxy endpoint to serve resume files
router.get("/view/:publicId(*)", async (req, res) => {
  try {
    const publicId = req.params.publicId;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    
    // Use Cloudinary Admin API to fetch the resource
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = crypto
      .createHash('sha1')
      .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
      .digest('hex');

    // Fetch using Admin API
    const adminUrl = `https://api.cloudinary.com/v1_1/${cloudName}/resources/raw/upload/${publicId}`;
    
    console.log("Fetching resource info from Admin API");
    
    const resourceInfo = await axios.get(adminUrl, {
      params: {
        api_key: apiKey,
        timestamp: timestamp,
        signature: signature,
      },
    });

    // Get the secure URL from the response
    const secureUrl = resourceInfo.data.secure_url;
    console.log("Got secure URL:", secureUrl);

    // Now fetch the actual file
    const fileResponse = await axios.get(secureUrl, {
      responseType: 'arraybuffer',
    });

    // Set appropriate headers for PDF viewing
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(Buffer.from(fileResponse.data));
    
  } catch (error) {
    console.error("Error serving resume:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load resume. The file may need to be re-uploaded with public access.",
      error: error.message,
      details: error.response?.data
    });
  }
});

export default router;
