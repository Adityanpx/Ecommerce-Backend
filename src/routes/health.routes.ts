import { Router } from 'express';
import { prisma } from '../config/database';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { config } from '../config/env';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(
      ApiResponse.ok({
        status: 'ok',
        environment: config.env,
        version: config.apiVersion,
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      }),
    );
  }),
);

router.get(
  '/db',
  asyncHandler(async (_req, res) => {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    res.json(
      ApiResponse.ok({
        database: 'connected',
        latencyMs: Date.now() - start,
      }),
    );
  }),
);

export default router;
