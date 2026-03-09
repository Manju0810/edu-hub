import { z } from 'zod';

export const RegisterSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .max(50, 'Username must be at most 50 characters'),
  mobileNumber: z
    .string()
    .min(10, 'Mobile number must be at least 10 digits')
    .max(15, 'Mobile number must be at most 15 digits'),
  profileImage: z.string('Profile image URL must be a string'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be at most 100 characters'),
  role: z.enum(['student', 'educator'], {
    error: "Role must be either 'student' or 'educator'",
  }),
});

export type RegisterSchemaType = z.infer<typeof RegisterSchema>;
