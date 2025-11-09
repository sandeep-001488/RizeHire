import multer from "multer";
import fs from "fs";
import path from "path";

const dir = path.join(process.cwd(), "uploads", "resumes");
fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, dir),
  filename: (req, file, cb) => {
    // Safe filename
    const safe = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
    cb(null, `${req.user._id}-${Date.now()}-${safe}`);
  },
});

const fileFilter = (_, file, cb) => {
  // Allow PDF, DOC, and DOCX
  const ok = /pdf|doc|docx$/i.test(file.originalname);
  if (!ok) {
    return cb(new Error("Only PDF, DOC, or DOCX files are allowed"));
  }
  cb(null, true);
};

export const uploadResume = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, 
});