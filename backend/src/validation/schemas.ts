import { z } from 'zod';

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
