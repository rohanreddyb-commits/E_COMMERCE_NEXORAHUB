import multer from "multer";
import path from "path";
import fs from "fs";
import { BadRequestError } from "../utils/customError";

const uploadDir = path.join(process.cwd(), "uploads");

// Self-healing: Create uploads directory if it does not exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log(`[Multer] Upload destination resolved to: ${uploadDir}`);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const generatedFilename = `${file.fieldname}-${uniqueSuffix}${ext}`;
    console.log(`[Multer] File upload started: originalname=${file.originalname}, fieldname=${file.fieldname}, generatedFilename=${generatedFilename}`);
    cb(null, generatedFilename);
  },
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new BadRequestError("Only image file uploads are allowed (jpeg, jpg, png, webp, gif)."));
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter,
});
