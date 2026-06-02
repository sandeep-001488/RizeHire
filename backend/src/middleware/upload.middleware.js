import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import path from "path";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

export const uploadToCloudinary = async (localPath) => {
  try {
    // resource_type 'auto' (not 'raw') avoids untrusted-account access issues
    const result = await cloudinary.uploader.upload(localPath, {
      folder: "resumes",
      resource_type: "auto",
      type: "upload",
      access_mode: "public",
      flags: "attachment",
    });

    fs.unlinkSync(localPath);

    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
};

export const generateSignedUrl = (cloudinaryUrl) => {
  try {
    // Derive public_id from a Cloudinary URL of the form .../upload/v{version}/{folder}/{id}.{ext}
    const urlParts = cloudinaryUrl.split('/upload/');
    if (urlParts.length !== 2) {
      throw new Error('Invalid Cloudinary URL format');
    }

    const afterUpload = urlParts[1];
    const withoutVersion = afterUpload.replace(/^v\d+\//, '');
    const publicIdWithExt = withoutVersion;

    const signedUrl = cloudinary.utils.private_download_url(
      publicIdWithExt,
      'pdf',
      {
        resource_type: 'raw',
        expires_at: Math.floor(Date.now() / 1000) + 3600, // expires in 1 hour
      }
    );

    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
};