import type { Level, MaterialType } from '@prisma/client';
import type { JwtPayload } from 'jsonwebtoken';

export interface AuthPayload extends JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export interface Query {
  page?: string;
  limit?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
  search?: string;
}

export interface Course {
  courseId: string;
  title: string;
  description: string;
  courseStartDate: string;
  courseEndDate: string;
  category: string;
  level: Level;
  userId: string;
}

interface Material {
  materialId: string;
  courseId: string;
  title: string;
  description: string;
  URL?: string;
  contentType: MaterialType;
}

export interface CustomRequest<
  TParams = object,
  TBody = object,
  TQuery = object,
> extends Request<TParams, object, TBody, TQuery> {
  user?: AuthPayload;
}
