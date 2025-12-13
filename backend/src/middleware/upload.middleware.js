import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer storage engine setup
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "resumes",
    allowed_formats: ["pdf", "docx", "doc"],
    public_id: (req, file) => `${req.user._id}-${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, "_")}`,
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