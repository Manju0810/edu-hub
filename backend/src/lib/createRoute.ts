/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Request, Response, NextFunction, Router } from 'express';
import type { ZodType } from 'zod';

import { registry } from './openapi';

type Middleware = (req: Request, res: Response, next: NextFunction) => any;

type RouteConfig = {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string;
  summary?: string;
  middlewares?: Middleware[];
  request?: {
    body?: ZodType<any>;
    query?: ZodType<any>;
    params?: ZodType<any>;
  };
  responses: {
    200?: ZodType<any>;
    201?: ZodType<any>;
    400?: ZodType<any>;
    401?: ZodType<any>;
    404?: ZodType<any>;
  };
  handler: (req: any, res: Response, next?: NextFunction) => any;
};

export function createRoute(router: Router, config: RouteConfig) {
  const {
    method,
    path,
    summary,
    middlewares = [],
    request,
    responses,
    handler,
  } = config;

  if (summary) {
    const openApiRequest: any = {};
    if (request?.body) {
      openApiRequest.body = {
        content: {
          'application/json': {
            schema: request.body,
          },
        },
      };
    }
    if (request?.query) {
      openApiRequest.query = request.query;
    }
    if (request?.params) {
      openApiRequest.params = request.params;
    }

    const openApiResponses: any = {};
    if (responses[200]) {
      openApiResponses[200] = {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: responses[200],
          },
        },
      };
    }
    if (responses[201]) {
      openApiResponses[201] = {
        description: 'Created',
        content: {
          'application/json': {
            schema: responses[201],
          },
        },
      };
    }
    if (responses[400]) {
      openApiResponses[400] = {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: responses[400],
          },
        },
      };
    }
    if (responses[401]) {
      openApiResponses[401] = {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: responses[401],
          },
        },
      };
    }
    if (responses[404]) {
      openApiResponses[404] = {
        description: 'Not Found',
        content: {
          'application/json': {
            schema: responses[404],
          },
        },
      };
    }

    registry.registerPath({
      method,
      path,
      description: summary,
      request: openApiRequest,
      responses: openApiResponses,
    });
  }

  const handlerWrapper = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (request?.body) {
        const parsed = request.body.safeParse(req.body);
        if (!parsed.success) {
          if (!parsed.success) {
            return res.status(400).json({
              errors: parsed.error.issues.map((issue) => ({
                field: issue.path.join('.'),
                message: issue.message,
              })),
            });
          }
        }
        req.body = parsed.data;
      }

      if (request?.query) {
        const parsed = request.query.safeParse(req.query);
        if (!parsed.success) {
          return res.status(400).json({
            errors: parsed.error.issues.map((issue) => ({
              field: issue.path.join('.'),
              message: issue.message,
            })),
          });
        }
        // req.query = parsed.data;
      }

      if (request?.params) {
        const parsed = request.params.safeParse(req.params);
        if (!parsed.success) {
          return res.status(400).json({
            errors: parsed.error.issues.map((issue) => ({
              field: issue.path.join('.'),
              message: issue.message,
            })),
          });
        }
        req.params = parsed.data;
      }

      return await handler(req, res, next);
    } catch (err) {
      console.error(
        `Error in route handler for ${method.toUpperCase()} ${path}:`,
        err
      );
      return next(err);
    }
  };

  let composedHandler = handlerWrapper;

  if (middlewares && middlewares.length > 0) {
    for (let i = middlewares.length - 1; i >= 0; i--) {
      const middleware = middlewares[i];
      if (middleware) {
        const previousHandler = composedHandler;
        composedHandler = (req, res, next) => {
          const result = middleware(req, res, () =>
            previousHandler(req, res, next)
          );
          if (result !== undefined && !(result instanceof Promise)) {
            return result;
          }
          return undefined;
        };
      }
    }
  }

  router[method](path, composedHandler);
}
