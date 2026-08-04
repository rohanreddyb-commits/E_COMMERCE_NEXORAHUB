import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { BadRequestError } from "../utils/customError";
import { logger } from "../config/logger";

const uploadDir = path.join(process.cwd(), "uploads");

// Self-healing: Create uploads directory if it does not exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Server-controlled extension allow-list.
 *
 * The stored extension is looked up from this map, never copied from the
 * client's filename. The previous filter used an UNANCHORED regex against
 * `path.extname(originalname)`, so `.phpjpg` or `.aspxpng` matched, and the
 * declared MIME type was trusted verbatim.
 */
const ALLOWED_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

/**
 * Magic-byte signatures. A declared Content-Type is attacker-controlled, so
 * the bytes on disk are what actually decide whether a file is an image.
 */
const MAGIC_BYTES: { mime: string; matches: (buf: Buffer) => boolean }[] = [
  { mime: "image/jpeg", matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/png",
    matches: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    mime: "image/gif",
    matches: (b) => b.subarray(0, 6).toString("ascii") === "GIF87a" || b.subarray(0, 6).toString("ascii") === "GIF89a",
  },
  {
    mime: "image/webp",
    matches: (b) =>
      b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP",
  },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // Extension comes from the allow-list, and the basename is random, so the
    // client cannot influence the stored path at all: no traversal, no
    // double extension, and no guessable URLs for other users' uploads.
    const safeExt = ALLOWED_TYPES[ext] ? ext : ".bin";
    cb(null, `${crypto.randomUUID()}${safeExt}`);
  },
});

const fileFilter = (
  _req: unknown,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const expectedMime = ALLOWED_TYPES[ext];

  // Both the extension and the declared MIME must be on the allow-list AND
  // agree with each other. This is a cheap pre-filter; the authoritative
  // check is the magic-byte verification after the write.
  if (!expectedMime || file.mimetype.toLowerCase() !== expectedMime) {
    return cb(
      new BadRequestError("Only JPEG, PNG, WebP and GIF images are allowed.")
    );
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5,
    fields: 30,
    // Reject absurd field names/values outright rather than buffering them.
    fieldNameSize: 100,
    fieldSize: 1024 * 1024,
  },
  fileFilter,
});

/**
 * Verify the bytes actually written and delete anything that is not a real
 * image of the declared type. Runs after multer, as Express middleware.
 *
 * Without this, a file whose contents are arbitrary (a script, an HTML
 * polyglot) can be stored under an image extension and served from /uploads.
 */
export const verifyUploadedImages = async (
  req: { file?: Express.Multer.File; files?: Express.Multer.File[] | Record<string, Express.Multer.File[]> },
  _res: unknown,
  next: (err?: unknown) => void
): Promise<void> => {
  const collected: Express.Multer.File[] = [];
  if (req.file) collected.push(req.file);
  if (Array.isArray(req.files)) collected.push(...req.files);
  else if (req.files && typeof req.files === "object") {
    for (const group of Object.values(req.files)) collected.push(...group);
  }

  if (collected.length === 0) return next();

  const discard = async (files: Express.Multer.File[]) => {
    await Promise.all(
      files.map((f) => fs.promises.unlink(f.path).catch(() => undefined))
    );
  };

  for (const file of collected) {
    try {
      const handle = await fs.promises.open(file.path, "r");
      const buffer = Buffer.alloc(12);
      await handle.read(buffer, 0, 12, 0);
      await handle.close();

      const expectedMime = ALLOWED_TYPES[path.extname(file.filename).toLowerCase()];
      const detected = MAGIC_BYTES.find((sig) => sig.matches(buffer));

      if (!detected || detected.mime !== expectedMime) {
        logger.warn(
          `[Upload] Rejected ${file.originalname}: content is not a valid ${expectedMime ?? "image"}.`
        );
        await discard(collected);
        return next(
          new BadRequestError("Uploaded file content is not a valid image.")
        );
      }
    } catch (err) {
      await discard(collected);
      return next(new BadRequestError("Unable to process the uploaded file."));
    }
  }

  next();
};
