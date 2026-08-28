import { Router } from "express";
import { z } from "zod";
import { buildStorageKey, createPresignedUploadUrl, publicFileUrl } from "../../lib/s3";
import { asyncHandler } from "../../middleware/error.middleware";
import { requireAuth } from "../../middleware/auth.middleware";

export const uploadsRouter = Router();

const presignSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
});

uploadsRouter.post(
  "/presign",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { fileName, mimeType } = presignSchema.parse(req.body);
    const storageKey = buildStorageKey(fileName);
    const uploadUrl = await createPresignedUploadUrl(storageKey, mimeType);
    res.json({ uploadUrl, storageKey, fileUrl: publicFileUrl(storageKey) });
  })
);
