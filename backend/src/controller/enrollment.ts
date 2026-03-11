import type { EnrollmentStatus } from '@prisma/client';
import dotenv from 'dotenv';
import type { Request, Response } from 'express';
import { prisma } from '../prisma';
import { AuthPayload, Query } from '../types/types';

interface CustomRequest<
  TParams = object,
  TBody = object,
  TQuery = object,
> extends Request<TParams, object, TBody, TQuery> {
  user?: AuthPayload;
}

dotenv.config();

export const addEnroll = async (
  req: CustomRequest<object, { userId: string; courseId: string }>,
  res: Response
) => {
  const { userId, courseId } = req.body;

  try {
    if (!userId || !courseId) {
      return res
        .status(400)
        .json({ success: false, message: 'Mandatory fields are missing' });
    }

    const existingEnroll = await prisma.enrollment.findFirst({
      where: { userId, courseId },
    });
    if (existingEnroll) {
      return res.status(400).json({
        success: false,
        message: 'Enrollment already exists for this user and course',
      });
    }

    const userExists = await prisma.user.findUnique({
      where: { userId },
    });
    if (!userExists) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    const courseExists = await prisma.course.findUnique({
      where: { courseId },
    });
    if (!courseExists) {
      return res
        .status(404)
        .json({ success: false, message: 'Course not found' });
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        userId,
        courseId,
      },
      select: {
        enrollmentId: true,
        userId: true,
        courseId: true,
        enrollmentDate: true,
        status: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Enrollment added successfully',
      enrollment,
    });
  } catch (error) {
    console.error('Error in adding enrollment:', error);
    return res
      .status(400)
      .json({ success: false, message: 'Failed to add enrollment' });
  } finally {
    await prisma.$disconnect();
  }
};

export const getAllEnrolls = async (
  req: CustomRequest<object, object, Query>,
  res: Response
) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'enrollmentDate',
      order = 'desc',
      search,
    } = req.query;
    const skip = Number(limit) * Number(page) - Number(limit);
    const take = Number(limit);
    const allowedSortFields = ['enrollmentDate', 'status'];
    const sortField = allowedSortFields.includes(sortBy)
      ? sortBy
      : 'enrollmentDate';
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    let userSearchResult: { userId: string }[] = [];
    let courseSearchResult: { courseId: string }[] = [];

    if (search) {
      userSearchResult = await prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: search as string, mode: 'insensitive' } },
            { email: { contains: search as string, mode: 'insensitive' } },
          ],
        },
        select: { userId: true },
      });
      courseSearchResult = await prisma.course.findMany({
        where: {
          OR: [
            { title: { contains: search as string, mode: 'insensitive' } },
            {
              description: { contains: search as string, mode: 'insensitive' },
            },
          ],
        },
        select: { courseId: true },
      });
    }

    const enrollments = await prisma.enrollment.findMany({
      where:
        search && userSearchResult.length > 0 && courseSearchResult.length > 0
          ? {
              OR: [
                { userId: { in: userSearchResult.map((u) => u.userId) } },
                { courseId: { in: courseSearchResult.map((c) => c.courseId) } },
              ],
            }
          : {},
      skip,
      take,
      orderBy: { [sortField]: sortOrder },
      select: {
        enrollmentId: true,
        userId: true,
        courseId: true,
        enrollmentDate: true,
        status: true,
      },
    });

    const count = enrollments.length;
    return res.status(200).json({
      success: true,
      message: 'Enrollments fetched successfully',
      enrollments,
      count,
    });
  } catch (error) {
    console.error('Error in fetching enrollments:', error);
    return res
      .status(400)
      .json({ success: false, message: 'Failed to fetch enrollments' });
  } finally {
    await prisma.$disconnect();
  }
};

export const getEnrollByEnrollId = async (
  req: CustomRequest<{ enrollId: string }>,
  res: Response
) => {
  const { enrollId } = req.params;
  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        enrollmentId: enrollId,
      },
      select: {
        enrollmentId: true,
        userId: true,
        courseId: true,
        enrollmentDate: true,
        status: true,
      },
    });
    if (!enrollment) {
      return res
        .status(404)
        .json({ success: false, message: 'Enrollment not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'Enrollment fetched successfully',
      enrollment,
    });
  } catch (error) {
    console.error('Error in fetching enrollment:', error);
    return res
      .status(400)
      .json({ success: false, message: 'Failed to fetch enrollment' });
  } finally {
    await prisma.$disconnect();
  }
};

export const getEnrollsByUserId = async (
  req: CustomRequest<{ userId: string }, object, Query>,
  res: Response
) => {
  const { userId } = req.params;
  const {
    page = 1,
    limit = 10,
    sortBy = 'enrollmentDate',
    order = 'desc',
    search,
  } = req.query;

  const skip = Number(limit) * Number(page) - Number(limit);
  const take = Number(limit);
  const allowedSortFields = ['enrollmentDate', 'status'];
  const sortField = allowedSortFields.includes(sortBy)
    ? sortBy
    : 'enrollmentDate';
  const sortOrder = order === 'asc' ? 'asc' : 'desc';

  try {
    let courseSearchResult: { courseId: string }[] = [];

    if (search) {
      courseSearchResult = await prisma.course.findMany({
        where: {
          OR: [
            { title: { contains: search as string, mode: 'insensitive' } },
            {
              description: { contains: search as string, mode: 'insensitive' },
            },
          ],
        },
        select: { courseId: true },
      });
    }

    const enrollments = await prisma.enrollment.findMany({
      where:
        search && courseSearchResult.length > 0
          ? {
              userId,
              courseId: { in: courseSearchResult.map((c) => c.courseId) },
            }
          : { userId },
      skip,
      take,
      orderBy: { [sortField]: sortOrder },
      select: {
        enrollmentId: true,
        userId: true,
        courseId: true,
        enrollmentDate: true,
        status: true,
      },
    });

    if (enrollments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No enrollments found for the given user ID',
      });
    }
    return res.status(200).json({
      success: true,
      message: 'Enrollments fetched successfully',
      enrollments,
    });
  } catch (error) {
    console.error('Error in fetching enrollments:', error);
    return res
      .status(400)
      .json({ success: false, message: 'Failed to fetch enrollments' });
  } finally {
    await prisma.$disconnect();
  }
};

export const getEnrollsByCourseId = async (
  req: CustomRequest<{ courseId: string }, object, Query>,
  res: Response
) => {
  const { courseId } = req.params;
  const {
    page = 1,
    limit = 10,
    sortBy = 'enrollmentDate',
    order = 'desc',
    search,
  } = req.query;

  const skip = Number(limit) * Number(page) - Number(limit);
  const take = Number(limit);
  const allowedSortFields = ['enrollmentDate', 'status'];
  const sortField = allowedSortFields.includes(sortBy)
    ? sortBy
    : 'enrollmentDate';
  const sortOrder = order === 'asc' ? 'asc' : 'desc';

  try {
    let userSearchResult: { userId: string }[] = [];

    if (search) {
      userSearchResult = await prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: search as string, mode: 'insensitive' } },
            { email: { contains: search as string, mode: 'insensitive' } },
          ],
        },
        select: { userId: true },
      });
    }

    const enrollments = await prisma.enrollment.findMany({
      where:
        search && userSearchResult.length > 0
          ? {
              courseId,
              userId: { in: userSearchResult.map((u) => u.userId) },
            }
          : { courseId },
      skip,
      take,
      orderBy: { [sortField]: sortOrder },
      select: {
        enrollmentId: true,
        userId: true,
        courseId: true,
        enrollmentDate: true,
        status: true,
      },
    });

    if (enrollments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No enrollments found for the given course ID',
      });
    }
    return res.status(200).json({
      success: true,
      message: 'Enrollments fetched successfully',
      enrollments,
    });
  } catch (error) {
    console.error('Error in fetching enrollments:', error);
    return res
      .status(400)
      .json({ success: false, message: 'Failed to fetch enrollments' });
  } finally {
    await prisma.$disconnect();
  }
};

export const updateEnrollByEnrollId = async (
  req: CustomRequest<{ enrollId: string }, { status: string }>,
  res: Response
) => {
  const { enrollId } = req.params;
  const { status } = req.body;

  try {
    if (!status) {
      return res
        .status(400)
        .json({ success: false, message: 'Status is required' });
    }

    const existingEnroll = await prisma.enrollment.findUnique({
      where: {
        enrollmentId: enrollId,
      },
      select: {
        enrollmentId: true,
      },
    });
    if (!existingEnroll) {
      return res
        .status(404)
        .json({ success: false, message: 'Enrollment not found' });
    }

    const enrollment = await prisma.enrollment.update({
      where: {
        enrollmentId: enrollId,
      },
      data: {
        status: status as EnrollmentStatus,
      },
      select: {
        enrollmentId: true,
        userId: true,
        courseId: true,
        enrollmentDate: true,
        status: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Enrollment updated successfully',
      enrollment,
    });
  } catch (error) {
    console.error('Error in updating enrollment:', error);
    return res.status(400).json({
      success: false,
      message: `Failed to update enrollment : ${error}`,
    });
  } finally {
    await prisma.$disconnect();
  }
};

export const deleteEnrollByEnrollId = async (
  req: CustomRequest<{ enrollId: string }>,
  res: Response
) => {
  const { enrollId } = req.params;
  try {
    const isEnrollExisting = await prisma.enrollment.findUnique({
      where: {
        enrollmentId: enrollId,
      },
      select: {
        enrollmentId: true,
      },
    });
    if (!isEnrollExisting) {
      return res
        .status(404)
        .json({ success: false, message: 'Enrollment not found' });
    }
    const enrollment = await prisma.enrollment.delete({
      where: {
        enrollmentId: enrollId,
      },
      select: {
        enrollmentId: true,
        userId: true,
        courseId: true,
        enrollmentDate: true,
        status: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Enrollment deleted successfully',
      'Deleted enrollment details': enrollment,
    });
  } catch (error) {
    console.error('Error in deleting enrollment:', error);
    return res.status(400).json({
      success: false,
      message: `Failed to delete enrollment : ${error}`,
    });
  } finally {
    await prisma.$disconnect();
  }
};
