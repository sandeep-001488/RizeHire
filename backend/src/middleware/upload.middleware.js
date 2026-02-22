import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import path from "path";
import fs from "fs";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Local storage first
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads', 'resumes');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${req.user._id}-${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const ok = /pdf|doc|docx$/i.test(file.originalname);
  if (!ok) {
    return cb(new Error("Only PDF, DOC, or DOCX files are allowed"));
  }
  cb(null, true);
};

export const uploadResume = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Then upload to Cloudinary after parsing
export const uploadToCloudinary = async (localPath) => {
  try {
    // Use 'auto' resource type instead of 'raw' to avoid untrusted account issues
    const result = await cloudinary.uploader.upload(localPath, {
      folder: "resumes",
      resource_type: "auto", // Changed from 'raw' to 'auto'
      type: "upload",
      access_mode: "public",
      flags: "attachment", // Ensures download behavior
    });

    // Delete local file after upload
    fs.unlinkSync(localPath);

    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
};

// Generate authenticated signed URL for viewing PDFs
export const generateSignedUrl = (cloudinaryUrl) => {
  try {
    // Extract public_id from Cloudinary URL
    // URL format: https://res.cloudinary.com/{cloud_name}/raw/upload/v{version}/{folder}/{public_id}.{ext}
    const urlParts = cloudinaryUrl.split('/upload/');
    if (urlParts.length !== 2) {
      throw new Error('Invalid Cloudinary URL format');
    }

    // Get the part after /upload/ (e.g., "v1771778103/resumes/ibu6wqh16vsav8bb7fgb.pdf")
    const afterUpload = urlParts[1];

    // Remove version if present (v1771778103/)
    const withoutVersion = afterUpload.replace(/^v\d+\//, '');

    // This is our public_id with extension (e.g., "resumes/ibu6wqh16vsav8bb7fgb.pdf")
    const publicIdWithExt = withoutVersion;

    // Generate signed URL (valid for 1 hour)
    const signedUrl = cloudinary.utils.private_download_url(
      publicIdWithExt,
      'pdf',
      {
        resource_type: 'raw',
        expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      }
    );

    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
};