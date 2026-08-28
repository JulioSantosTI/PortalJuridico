import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/error.middleware";
import { requireAuth } from "../../middleware/auth.middleware";

export const requestTypesRouter = Router();

requestTypesRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const types = await prisma.requestType.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
    res.json({ requestTypes: types });
  })
);
