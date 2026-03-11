## Development Rules for Agents

### 1. Use NVM Before Running npm Commands

Before executing any `npm` or `node` commands, always load NVM by running:

```
. "$HOME/.nvm/nvm.sh"
```

This ensures the correct Node.js version is used.

---

### 2. Install Dependencies Using Exact Versions

Always install dependencies using exact versions to avoid unintended upgrades.

Example:

```
npm install --save-exact <package-name>
```

You may install the latest version of a package only if it does not cause any peer dependency conflicts.

Always verify compatibility with existing dependencies before upgrading.

Use npm ci for consistent installations in CI/CD environments.

Guideline: Always prefer the latest stable version of any npm package provided it does not break peer dependencies.

---

### 3. Run Code Quality Checks After Making Changes

After implementing any code changes, run the following commands:

```
npm run lint:fix
npm run prettier:fix
npm run test
```

Always check peer dependencies before upgrading packages.

Avoid running npm install without version constraints unless you've verified no conflicts exist.

Keep package-lock.json committed to maintain consistent environments across developers and CI.

All commands must complete successfully before considering the task finished.

---

### 4. Project-Specific Patterns and Conventions

This section documents the established patterns in the codebase that should be followed when adding new features or tests.

#### 4.1 Architecture Pattern

The project follows a **layered architecture** with clear separation of concerns:

- **Routes** (`src/routes/`): Define API endpoints and middleware chains
- **Controllers** (`src/controller/`): Handle request processing and response formatting
- **Middleware** (`src/middleware/`): Cross-cutting concerns (auth, validation)
- **Validation** (`src/validation/`): Zod schemas for input validation
- **Utils** (`src/utils/`): Helper functions (auth utilities)

#### 4.2 Request Flow

```
Route → Validation Middleware (Zod) → Auth Middleware (JWT) → Controller → Prisma → Response
```

#### 4.3 Response Format

All API responses follow a consistent JSON structure:

```typescript
// Success response
{
  success: true,
  message: 'Operation description',
  data?: any,  // optional payload
  // or endpoint-specific fields
  user?: User,
  students?: Student[],
  count?: number
}

// Error response
{
  success: false,
  message: 'Error description',
  errors?: ValidationError[]  // for validation failures
}
```

#### 4.4 Validation with Zod

- All input validation uses **Zod schemas** defined in `src/validation/schemas.ts`
- The `validateBody(schema)` middleware automatically:
  - Parses and validates request body
  - Returns 400 with error details on failure
  - Attaches parsed data to `req.body` on success
- Validation error format: `{ field: string, message: string }[]`

Example schema:

```typescript
export const RegisterSchema = z.object({
  username: z.string('Username is required').max(50, 'Max 50 chars'),
  email: z.email({ error: 'Invalid email address' }),
  password: z.string().min(8, 'Min 8 chars').max(100, 'Max 100 chars'),
  role: z.enum(['student', 'educator']),
});
```

#### 4.5 Authentication & Authorization

**Authentication**: JWT tokens stored in **HttpOnly, Secure cookies**

- Cookie name: `token`
- Max-Age: 86400 seconds (1 day)
- SameSite: Lax
- Path: /

**Authorization**: Role-based access control using Prisma `Role` enum

- `Role.student` - regular users
- `Role.educator` - admin/teacher privileges

**Middleware**:

- `verifyToken`: Extracts token from cookie, validates JWT, attaches payload to `req.user`
- Protected routes: `router.get('/endpoint', verifyToken, handler)`

**Utils**: `src/utils/auth.ts`

- `generateToken(payload)` - creates JWT with secret from env
- `cookieOptions` - standard cookie configuration
- `saltRounds` - bcrypt cost factor (12)

#### 4.6 Database Access with Prisma

- Single PrismaClient instance exported from `src/prisma.ts`
- Always disconnect in `finally` block: `await prisma.$disconnect();`
- Use **select** to exclude sensitive fields (password) from responses
- Use **type-safe** queries with Prisma's generated types
- Role enum: `import { Role } from '@prisma/client'`

Controller pattern:

```typescript
// Find with error handling
const user = await prisma.user.findUnique({ where: { email } });
if (!user) {
  return res.status(404).json({ success: false, message: 'Not found' });
}

// Create with select
const user = await prisma.user.create({
  data: { ... },
  select: { userId: true, username: true, email: true, ... } // exclude password
});
```

#### 4.7 Custom Request Types

Controllers can extend Request with custom properties:

```typescript
export interface CustomRequest<
  TParams = object,
  TBody = object,
  TQuery = object,
> extends Request<TParams, object, TBody, TQuery> {
  user?: AuthPayload; // populated by verifyToken middleware
}
```

Use in controllers with query parameters:

```typescript
export const handler = async (
  req: CustomRequest<object, object, Query>,
  res: Response
) => {
  // req.user available, req.query typed
};
```

#### 4.8 Error Handling

- **Try-catch-finally** pattern in all async controller methods
- Specific status codes: 200/201 (success), 400 (validation/business), 401 (auth), 403 (authorization), 404 (not found), 500 (server)
- Log errors with `console.error()` for debugging
- Always disconnect Prisma in `finally` block

#### 4.9 Testing Conventions

Refer to `backend/docs/ai/UNIT_DEVELOPMENT_RULES.md` for comprehensive testing guidelines.

Key patterns:

- Test files: `backend/test/<feature>.test.ts`
- Use `@jest/globals` imports
- Deep mock PrismaClient with `jest-mock-extended`
- Mock JWT with `jest.mock('jsonwebtoken')`
- Integration tests with `supertest`
- Standardized cookie validation helper
- Test coverage: happy path, validation errors, auth failures, authorization, edge cases

#### 4.10 Environment Configuration

- Use `dotenv.config()` at file start in modules needing env vars
- Required env vars: `JWT_SECRET`, `DATABASE_URL`
- Never commit `.env` file (in .gitignore)

#### 4.11 Code Style

- **TypeScript**: Strict typing, no `any` unless absolutely necessary
- **Imports**: Group (1) built-in, (2) external packages, (3) internal modules
- **Error messages**: User-friendly, not exposing internal details
- **Naming**: camelCase for variables/functions, PascalCase for classes/interfaces, UPPER_SNAKE_CASE for constants
- **Files**: lowercase with hyphens (e.g., `auth.ts`, `validation.ts`)

#### 4.12 Pagination, Sorting, Search

Standard query parameters for list endpoints:

- `page` (default: 1)
- `limit` (default: 10)
- `sortBy` (`username` | `email` | `createdAt`)
- `order` (`asc` | `desc`)
- `search` (string for case-insensitive OR search on multiple fields)

Implementation pattern:

```typescript
const {
  page = 1,
  limit = 10,
  sortBy = 'username',
  order = 'asc',
  search,
} = req.query;
const skip = Number(limit) * Number(page) - Number(limit);
const take = Number(limit);

const where = {
  role: Role.student,
  ...(search && {
    OR: [
      { username: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ],
  }),
};

const items = await prisma.model.findMany({
  where,
  skip,
  take,
  orderBy: { [sortBy]: order },
});
```

---

By following these rules and patterns, you ensure consistency, maintainability, and reliability across the codebase.
