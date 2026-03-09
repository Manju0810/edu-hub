import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { body } = req;

    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    req.body = parsed.data;
    return next();
  };
};
