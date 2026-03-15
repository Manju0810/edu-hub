import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const RegisterSchema = z.object({
  username: z
    .string('Username is required')
    .max(50, 'Username must be at most 50 characters'),
  mobileNumber: z
    .string('Mobile number is required')
    .min(10, 'Mobile number must be at least 10 digits')
    .max(15, 'Mobile number must be at most 15 digits'),
  profileImage: z.string('Profile image URL is required'),
  email: z.email({ error: 'Invalid email address' }),
  password: z
    .string('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be at most 100 characters'),
  role: z.enum(['student', 'educator'], {
    error: "Role must be either 'student' or 'educator'",
  }),
});

export const LoginSchema = z.object({
  username: z.string('Username is required').nonempty(),
  password: z.string('Password is required').nonempty(),
});

export const AddEnrollSchema = z.object({
  userId: z.string('User ID is required').nonempty(),
  courseId: z.string('Course ID is required').nonempty(),
});

export const UpdateEnrollSchema = z.object({
  status: z.enum(['Pending', 'Accepted', 'Rejected'], {
    error: "Status must be either 'Pending', 'Accepted', or 'Rejected'",
  }),
});

export const RegisterResponseSchema = z.object({
  userId: z
    .string()
    .openapi({ example: '3f1e7a8c-9c2b-4f6a-bd5a-2e9f7c4a1d63' }),
  username: z.string().openapi({ example: 'John Doe' }),
  email: z.email().openapi({ example: 'john@example.com' }),
  role: z.enum(['student', 'educator']).openapi({ example: 'student' }),
  mobileNumber: z.string().openapi({ example: '1234567890' }),
  profileImage: z
    .string()
    .openapi({ example: 'https://example.com/profile.jpg' }),
  createdAt: z.string().openapi({ example: '2023-10-01T12:00:00Z' }),
});

export type UserResponse = z.infer<typeof RegisterResponseSchema>;

export const ErrorResponseSchema = z.object({
  errors: z.array(
    z.object({
      field: z.string().optional(),
      message: z.string(),
    })
  ),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const CourseSchema = z.object({
  courseId: z.string(),
  title: z.string(),
  description: z.string(),
  courseStartDate: z.string(),
  courseEndDate: z.string(),
  category: z.string(),
  level: z.string(),
  userId: z.string(),
});

export const CoursesResponseSchema = z.object({
  courses: z.array(CourseSchema),
  count: z.number(),
});

export const EnrollmentSchema = z.object({
  enrollmentId: z.string(),
  userId: z.string(),
  courseId: z.string(),
  enrollmentDate: z.string(),
  status: z.enum(['Pending', 'Accepted', 'Rejected']),
});

export const EnrollmentsResponseSchema = z.object({
  enrollments: z.array(EnrollmentSchema),
  count: z.number(),
});

export const MaterialSchema = z.object({
  materialId: z.string(),
  courseId: z.string(),
  title: z.string(),
  description: z.string(),
  uploadDate: z.string(),
  URL: z.string().optional(),
  contentType: z.string(),
});

export const MaterialsResponseSchema = z.array(MaterialSchema);

export const LoginResponseSchema = z.object({
  userId: z.string(),
  username: z.string(),
  email: z.string(),
  role: z.enum(['student', 'educator']),
});

// Query schemas with proper error messages
export const PaginationQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
});

export const CourseQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z
    .enum(['title', 'level', 'category', 'courseStartDate', 'courseEndDate'])
    .optional(),
  order: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
});

export const EnrollmentQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.enum(['enrollmentDate', 'status']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
});

export const CourseBodySchema = z.object({
  title: z.string('Title is required'),
  description: z.string('Description is required'),
  courseStartDate: z.string('Course start date is required'),
  courseEndDate: z.string('Course end date is required'),
  category: z.string('Category is required'),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced'], {
    error: "Level must be either 'Beginner', 'Intermediate', or 'Advanced'",
  }),
});

export const UpdateCourseBodySchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  courseStartDate: z.string().optional(),
  courseEndDate: z.string().optional(),
  category: z.string().optional(),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional(),
});

export const MaterialBodySchema = z.object({
  courseId: z.string('Course ID is required'),
  title: z.string('Title is required'),
  description: z.string('Description is required'),
  URL: z.url().optional(),
  contentType: z.enum(['Lecture_Slides', 'Assignment', 'Video', 'Other'], {
    error:
      "Content type must be either 'Lecture_Slides', 'Assignment', 'Video', or 'Other'",
  }),
});

export const UpdateMaterialBodySchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  URL: z.url('URL must be a valid URL'),
  contentType: z
    .enum(['Lecture_Slides', 'Assignment', 'Video', 'Other'])
    .optional(),
});

// Parameter schemas
export const CourseIdParamSchema = z.object({
  courseId: z.string('Course ID is required'),
});

export const UserIdParamSchema = z.object({
  userId: z.string('User ID is required'),
});

export const EnrollmentIdParamSchema = z.object({
  enrollId: z.string('Enrollment ID is required'),
});

export const MaterialIdParamSchema = z.object({
  materialId: z.string('Material ID is required'),
});

// Auth route specific schemas
export const StudentsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.enum(['username', 'email']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
});

export const StudentsResponseSchema = z.object({
  students: z.array(
    z.object({
      userId: z.string(),
      username: z.string(),
      email: z.string(),
      mobileNumber: z.string(),
    })
  ),
  count: z.number(),
});
