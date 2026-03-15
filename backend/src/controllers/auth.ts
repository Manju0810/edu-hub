import { Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import type { Request, Response } from 'express';

import { prisma } from '../prisma';
import type { AuthPayload, Query } from '../types/types';
import { cookieOptions, generateToken, saltRounds } from '../utils/auth';

interface CustomRequest<
  TParams = object,
  TBody = object,
  TQuery = object,
> extends Request<TParams, object, TBody, TQuery> {
  user?: AuthPayload;
}

dotenv.config();
export const register = async (req: Request, res: Response) => {
  const { username, mobileNumber, profileImage, email, password, role } =
    req.body;

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        errors: [
          {
            field: 'email',
            message: 'Email already exists',
          },
        ],
      });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: role as Role,
        mobileNumber,
        profileImage,
      },
      select: {
        userId: true,
        username: true,
        email: true,
        role: true,
        mobileNumber: true,
        profileImage: true,
        createdAt: true,
      }, // No password in response
    });

    const payload = { userId: user.userId, email: user.email, role: user.role };
    const token = generateToken(payload);
    res.cookie('token', token, cookieOptions);
    return res.status(201).json(user);
  } catch (error) {
    console.error(error);
    return res.status(400).json({
      errors: [
        {
          message: `Error in registering user: ${error}`,
        },
      ],
    });
  } finally {
    await prisma.$disconnect();
  }
};

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(400).json({
        errors: [
          {
            field: 'username',
            message: 'No user found',
          },
        ],
      });
    }
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        errors: [
          {
            field: 'password',
            message: 'Invalid password',
          },
        ],
      });
    }
    const payload = { userId: user.userId, email: user.email, role: user.role };
    const token = generateToken(payload);

    res.cookie('token', token, cookieOptions);
    return res.status(200).json(user);
  } catch (error) {
    console.error(error);
    return res.status(400).json({
      errors: [
        {
          message: `Error in user login: ${error}`,
        },
      ],
    });
  } finally {
    await prisma.$disconnect();
  }
};

export const getAllStudents = async (
  req: CustomRequest<object, object, Query>,
  res: Response
) => {
  try {
    const requestedBy = req.user?.role === Role.educator;
    if (!requestedBy) {
      return res.status(400).json({
        errors: [
          {
            field: 'role',
            message: 'Access is denied',
          },
        ],
      });
    }
    const {
      page = 1,
      limit = 10,
      sortBy = 'username',
      order = 'asc',
      search,
    } = req.query;
    const skip = Number(limit) * Number(page) - Number(limit);
    const take = Number(limit);
    const sortField = sortBy === 'username' ? 'username' : 'email';
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    const students = await prisma.user.findMany({
      where: {
        role: Role.student,
        ...(search && {
          OR: [
            { username: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      skip,
      take,
      orderBy: { [sortField]: sortOrder },
      select: {
        userId: true,
        username: true,
        email: true,
        mobileNumber: true,
      },
    });

    const count = students.length;
    return res.status(200).json({ students, count });
  } catch (error) {
    console.error('Error in fetching students:', error);
    return res.status(400).json({
      errors: [
        {
          message: 'Failed to fetch students',
        },
      ],
    });
  } finally {
    await prisma.$disconnect();
  }
};
