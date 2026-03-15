import { Role } from '@prisma/client';
import dotenv from 'dotenv';
import type { Request, Response } from 'express';

import { prisma } from '../prisma';
import type { Course, AuthPayload, Query } from '../types/types';

interface CustomRequest<
  TParams = object,
  TBody = object,
  TQuery = object,
> extends Request<TParams, object, TBody, TQuery> {
  user?: AuthPayload;
}

dotenv.config();

export const addCourse = async (
  req: CustomRequest<object, Course>,
  res: Response
) => {
  const {
    title,
    description,
    courseStartDate,
    courseEndDate,
    category,
    level,
  } = req.body;
  const creatorId = req.user?.userId || '';
  const creatorRole = req.user?.role === Role.educator;

  try {
    if (!creatorRole) {
      return res.status(400).json({
        errors: [
          {
            field: 'role',
            message: 'Access is denied',
          },
        ],
      });
    }
    if (
      !title ||
      !description ||
      !courseStartDate ||
      !courseEndDate ||
      !category ||
      !level
    ) {
      return res.status(400).json({
        errors: [
          {
            field: 'body',
            message: 'Mandatory fields are missing',
          },
        ],
      });
    }

    const existingCourse = await prisma.course.findFirst({
      where: { title },
    });
    if (existingCourse) {
      return res.status(400).json({
        errors: [
          {
            field: 'title',
            message: 'Course with this title already exists',
          },
        ],
      });
    }

    const course = await prisma.course.create({
      data: {
        title,
        description,
        courseStartDate: new Date(courseStartDate),
        courseEndDate: new Date(courseEndDate),
        category,
        level,
        userId: creatorId,
      },
      select: {
        courseId: true,
        title: true,
        description: true,
        courseStartDate: true,
        courseEndDate: true,
        category: true,
        level: true,
        userId: true,
      },
    });
    return res.status(200).json(course);
  } catch (error) {
    console.error('Error in adding course:', error);
    return res.status(400).json({
      errors: [
        {
          message: 'Failed to add course',
        },
      ],
    });
  } finally {
    await prisma.$disconnect();
  }
};

export const getAllCourses = async (
  req: CustomRequest<object, object, Query>,
  res: Response
) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'title',
      order = 'asc',
      search,
    } = req.query;
    const skip = Number(limit) * Number(page) - Number(limit);
    const take = Number(limit);
    const allowedSortFields = [
      'title',
      'level',
      'category',
      'courseStartDate',
      'courseEndDate',
    ];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'title';
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    const courses = await prisma.course.findMany({
      where: {
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      skip,
      take,
      orderBy: { [sortField]: sortOrder },
      select: {
        courseId: true,
        title: true,
        description: true,
        courseStartDate: true,
        courseEndDate: true,
        category: true,
        level: true,
        userId: true,
      },
    });

    const count = courses.length;
    return res.status(200).json({ courses, count });
  } catch (error) {
    console.error('Error in fetching courses:', error);
    return res.status(400).json({
      errors: [
        {
          message: 'Failed to fetch courses',
        },
      ],
    });
  } finally {
    await prisma.$disconnect();
  }
};

export const getCourseByCourseId = async (
  req: CustomRequest<{ courseId: string }>,
  res: Response
) => {
  const { courseId } = req.params;
  try {
    const course = await prisma.course.findUnique({
      where: {
        courseId,
      },
      select: {
        courseId: true,
        title: true,
        description: true,
        courseStartDate: true,
        courseEndDate: true,
        category: true,
        level: true,
        userId: true,
      },
    });
    if (!course) {
      return res.status(404).json({
        errors: [
          {
            field: 'courseId',
            message: 'Course not found',
          },
        ],
      });
    }
    return res.status(200).json(course);
  } catch (error) {
    console.error('Error in fetching course:', error);
    return res.status(400).json({
      errors: [
        {
          message: 'Failed to fetch course',
        },
      ],
    });
  } finally {
    await prisma.$disconnect();
  }
};

export const getCoursesByUserId = async (
  req: CustomRequest<Course, object, Query>,
  res: Response
) => {
  const { userId } = req.params;
  const {
    page = 1,
    limit = 10,
    sortBy = 'title',
    order = 'asc',
    search,
  } = req.query;

  const skip = Number(limit) * Number(page) - Number(limit);
  const take = Number(limit);
  const allowedSortFields = [
    'title',
    'level',
    'category',
    'courseStartDate',
    'courseEndDate',
  ];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'title';
  const sortOrder = order === 'asc' ? 'asc' : 'desc';

  try {
    const courses = await prisma.course.findMany({
      where: {
        userId,
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      skip,
      take,
      orderBy: { [sortField]: sortOrder },
      select: {
        courseId: true,
        title: true,
        description: true,
        courseStartDate: true,
        courseEndDate: true,
        category: true,
        level: true,
        userId: true,
      },
    });

    if (courses.length === 0) {
      return res.status(404).json({
        errors: [
          {
            field: 'userId',
            message: 'No courses were created by the given user ID',
          },
        ],
      });
    }
    return res.status(200).json(courses);
  } catch (error) {
    console.error('Error in fetching courses:', error);
    return res.status(400).json({
      errors: [
        {
          message: 'Failed to fetch courses',
        },
      ],
    });
  } finally {
    await prisma.$disconnect();
  }
};

export const updateCourse = async (
  req: CustomRequest<{ courseId: string }, Course>,
  res: Response
) => {
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
  const { courseId } = req.params;
  const {
    title,
    description,
    courseStartDate,
    courseEndDate,
    category,
    level,
  } = req.body;
  try {
    const isCourseExisting = await prisma.course.findUnique({
      where: {
        courseId,
      },
      select: {
        userId: true,
      },
    });
    if (!isCourseExisting) {
      return res.status(404).json({
        errors: [
          {
            field: 'courseId',
            message: 'Course not found',
          },
        ],
      });
    }
    const course = await prisma.course.update({
      where: {
        courseId,
      },
      data: {
        title,
        description,
        courseStartDate,
        courseEndDate,
        category,
        level,
      },
      select: {
        courseId: true,
        title: true,
        description: true,
        courseStartDate: true,
        courseEndDate: true,
        category: true,
        level: true,
        userId: true,
      },
    });

    return res.status(200).json(course);
  } catch (error) {
    console.error('Error in updating course:', error);
    return res.status(400).json({
      errors: [
        {
          message: `Failed to update course : ${error}`,
        },
      ],
    });
  } finally {
    await prisma.$disconnect();
  }
};

export const deleteCourse = async (
  req: CustomRequest<{ courseId: string }>,
  res: Response
) => {
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
  const { courseId } = req.params;
  try {
    const isCourseExisting = await prisma.course.findUnique({
      where: {
        courseId,
      },
      select: {
        userId: true,
      },
    });
    if (!isCourseExisting) {
      return res.status(404).json({
        errors: [
          {
            field: 'courseId',
            message: 'Course not found',
          },
        ],
      });
    }
    const course = await prisma.course.delete({
      where: {
        courseId,
      },
      select: {
        courseId: true,
        title: true,
        description: true,
        courseStartDate: true,
        courseEndDate: true,
        category: true,
        level: true,
        userId: true,
      },
    });

    return res.status(200).json(course);
  } catch (error) {
    console.error('Error in deleting course:', error);
    return res.status(400).json({
      errors: [
        {
          message: `Failed to delete course : ${error}`,
        },
      ],
    });
  } finally {
    await prisma.$disconnect();
  }
};
