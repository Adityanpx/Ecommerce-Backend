import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiError, FieldError } from '../utils/ApiError';

export const validate =
  (schema: AnyZodObject) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.params !== undefined) req.params = parsed.params as typeof req.params;
      // req.query is a getter in Express 4 — assign properties instead of replacing it.
      if (parsed.query !== undefined) {
        Object.assign(req.query, parsed.query);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: FieldError[] = error.issues.map((issue) => ({
          field: issue.path.slice(1).join('.') || issue.path.join('.'),
          message: issue.message,
        }));
        next(ApiError.validation('Validation failed', errors));
        return;
      }
      next(error);
    }
  };
