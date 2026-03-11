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

// Register

// Test Cases

// 1. should register a new user when valid data is provided
// 2. should return error when any required data is not provided
// 3. should return error when password is not meeting requriements
// 4. should return error when invalid is provided
// 5. should return error when mobile number is not valid
// 5. should return error when role is invalid
