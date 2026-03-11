# Unit Testing Development Rules

## 1. Test File Structure and Location

- Place test files in the `backend/test/` directory
- Name test files using the pattern: `<feature>.test.ts`
- Mirror the structure of the src directory when organizing tests (optional but recommended for large projects)
- Current project uses: `test/auth.test.ts` for testing auth routes
  git push --set-upstream origin feature/add-development-and-unit-tests-rules"

## 2. Jest Configuration

The project uses the following Jest settings (in `backend/jest.config.ts`):

- **preset**: `ts-jest` for TypeScript support
- **testEnvironment**: `node`
- **roots**: `['<rootDir>/src', '<rootDir>/test']`
- **testMatch**: `['**/?(*.)+(spec|test).ts']`
- **collectCoverage**: `true`
- **collectCoverageFrom**: `['src/**/*.ts']`
- **coverageReporters**: `['text', 'text-summary', 'html', 'lcov']`

## 3. Import Patterns

Always import testing utilities from `@jest/globals`:

```typescript
import { beforeEach, describe, test, expect } from '@jest/globals';
```

Import application code relative to the project root:

```typescript
import { app } from '../src/app';
import { prisma } from '../src/prisma';
```

## 4. Mocking Strategy

### 4.1 External Dependencies (JWT, bcrypt, etc.)

Use `jest.mock()` for modules that need to be mocked:

```typescript
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    verify: jest.fn(),
    sign: jest.fn(),
  },
}));

const mockJwt = jest.mocked(jwt);
```

### 4.2 Database (PrismaClient)

Use `jest-mock-extended` for deep mocking PrismaClient:

```typescript
import type { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset } from 'jest-mock-extended';
import type { DeepMockProxy } from 'jest-mock-extended';

jest.mock('../src/prisma', () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
}));

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prismaMock);
});
```

### 4.3 Setting Up Mock Returns

Use `mockResolvedValue` for successful async operations:

```typescript
prismaMock.user.findUnique.mockResolvedValue(mockUser);
```

Use `mockRejectedValue` for error scenarios:

```typescript
prismaMock.user.create.mockRejectedValue(new Error('Database error'));
```

## 5. API Integration Testing with Supertest

Use `supertest` to test Express routes:

```typescript
import request from 'supertest';

const response = await request(app).post('/api/auth/register').send(payload);
```

### 5.1 Testing with Authentication

For protected routes, set the JWT token in cookies:

```typescript
const response = await request(app)
  .get('/api/protected-route')
  .set('Cookie', 'token=fake-token');
```

Mock JWT verify to return user payload:

```typescript
mockJwt.verify.mockReturnValue({
  userId: 'mock-user',
  email: 'test@test.com',
  role: Role.educator,
} as never);
```

## 6. Test Organization

Use `describe` blocks to group related tests:

```typescript
describe('Register Endpoint Tests', () => {
  // tests here
});

describe('Login Endpoint Tests', () => {
  // tests here
});
```

### 6.1 Test Cases Structure

Within each describe block, include:

1. **Happy Path**: Valid input, expected success response
2. **Error Cases**:
   - Database/prisma errors
   - Resource not found
   - Authentication failures
   - Authorization failures (role-based access)
3. **Validation Tests**:
   - Missing required fields
   - Invalid data formats
   - Edge cases (min/max lengths, format constraints)
4. **Business Logic**:
   - Search functionality
   - Sorting and filtering
   - Pagination (if applicable)

## 7. Assertion Best Practices

### 7.1 Status Codes

Always verify HTTP status codes:

```typescript
expect(response.status).toBe(200); // or 201, 400, 401, 403, 404, 500
```

### 7.2 Response Body Format

The application uses a standardized response format:

```typescript
expect(response.body.success).toBe(true);
expect(response.body.message).toBe('Expected message');
expect(response.body.data).toEqual(expectedData);
```

For error responses:

```typescript
expect(response.body.success).toBe(false);
expect(response.body.message).toBe('Error message');
```

### 7.3 Sensitive Data

Never include sensitive data (passwords, tokens) in mock responses:

```typescript
// BAD: Include password
const mockUser = {
  password: 'hashedpassword',
  // ...
};

// GOOD: Exclude or empty password
const mockUser = {
  password: '',
  // ...
};
```

### 7.4 Date Handling

Convert Date objects to ISO strings in comparisons:

```typescript
expect(response.body.user).toEqual({
  ...mockPrismaCreateResponse,
  createdAt: mockPrismaCreateResponse.createdAt.toISOString(),
});
```

## 8. Cookie Validation Helper

Use the provided helper for validating cookie responses as required:

```typescript
const validateCookie = (
  cookie: string,
  cookieName: string,
  mockCookieValue: string
) => {
  expect(cookie).toBeDefined();
  const parts = cookie.split('; ').reduce(
    (acc, part) => {
      const [key, value] = part.split('=');
      acc[key as string] = value ?? true;
      return acc;
    },
    {} as Record<string, string | boolean>
  );
  expect(parts[cookieName]).toBe(mockCookieValue);
  expect(parts['Max-Age']).toBe('86400');
  expect(parts.HttpOnly).toBe(true);
  expect(parts.Secure).toBe(true);
  expect(parts.SameSite]).toBe('Lax');
  expect(parts.Path]).toBe('/');
};

// Usage
const cookie = response.headers['set-cookie']?.[0] ?? '';
validateCookie(cookie, 'token', 'fake-token');
```

## 9. Type Safety

### 9.1 Using Role Enum

Import and use the Prisma Role enum:

```typescript
import { Role } from '@prisma/client';

// Cast role when needed
role: 'student' as Role,
```

### 9.2 Mock Types

Type mocks properly:

```typescript
const mockValidPayload = {
  username: 'user',
  email: 'test@example.com',
  role: 'student' as Role,
  // ... other fields
} as const;
```

## 10. Running Tests

### 10.1 Available Scripts

```bash
npm run test              # Run all tests with coverage
npm run test:watch        # Run in watch mode
npm run test:coverage     # Run with coverage report
```

### 10.2 Coverage Requirements

- Coverage is automatically collected on all tests
- Coverage reports generated in `coverage/` directory
- Coverage includes all files in `src/**/*.ts`
- View HTML report: `open coverage/lcov-report/index.html`

## 11. Writing New Tests Checklist

When adding a new test file or test case:

- [ ] Follow the file naming convention: `<feature>.test.ts`
- [ ] Import from `@jest/globals` for jest functions
- [ ] Set up necessary mocks (Prisma, JWT, external modules)
- [ ] Reset mocks in `beforeEach` if needed
- [ ] Create TypeScript interfaces/types for mock data
- [ ] Test both success and failure scenarios
- [ ] Include validation tests for input data
- [ ] Test edge cases and boundary conditions
- [ ] Verify HTTP status codes
- [ ] Validate response body format
- [ ] Test authorization (role-based access)
- [ ] Test authentication (token validation)
- [ ] Use `validateCookie` helper for cookie assertions
- [ ] Avoid sensitive data in mock responses
- [ ] Handle Date objects with `.toISOString()`
- [ ] Ensure tests are independent and idempotent
- [ ] Run tests and verify 100% coverage of new code

## 12. Common Patterns

### 12.1 Testing Validation Errors

```typescript
test('should return validation error when payload is missing', async () => {
  const response = await request(app).post('/api/endpoint').send({});

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toBe('Validation Error');
  expect(response.body.errors).toBeDefined();
  expect(response.body.errors).toEqual([
    { field: 'username', message: 'Username is required' },
    // ... other validation errors
  ]);
});
```

### 12.2 Testing Role-Based Access

```typescript
test('should throw error when requested user role is student', async () => {
  mockJwt.verify.mockReturnValue({
    userId: 'mock-user',
    role: Role.student,
  } as never);

  const response = await request(app)
    .get('/api/admin/endpoint')
    .set('Cookie', 'token=fake-token');

  expect(response.status).toBe(403);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toBe('Access is denied');
});
```

### 12.3 Testing Search and Filter

```typescript
test('should search users by username or email', async () => {
  prismaMock.user.findMany.mockResolvedValue(mockUsers);

  const response = await request(app)
    .get('/api/users?search=test&sortBy=username&order=asc')
    .set('Cookie', 'token=fake-token');

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  // Verify Prisma was called with correct where clause
  expect(prismaMock.user.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        OR: expect.any(Array),
      }),
    })
  );
});
```

## 13. Best Practices Summary

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Arrange-Act-Assert**: Structure tests clearly with setup, action, and assertions
3. **Mock External Dependencies**: Never hit real databases or external services
4. **Test Behavior, Not Implementation**: Focus on what the endpoint does, not how
5. **Descriptive Test Names**: Use clear names that describe the expected behavior
6. **Clean Up**: Reset mocks and avoid state leakage between tests
7. **Type Safety**: Leverage TypeScript to catch errors early
8. **Coverage**: Aim for comprehensive coverage including error paths
9. **Consistency**: Follow established patterns in existing tests
10. **Documentation**: Add comments for complex test scenarios

## 14. Troubleshooting

### 14.1 Common Issues

**Issue**: `TypeError: Cannot read property 'mockResolvedValue' of undefined`
**Solution**: Ensure the mock is properly set up and the import path matches the actual module.

**Issue**: Date comparison failures
**Solution**: Use `.toISOString()` when comparing dates in responses.

**Issue**: Cookie parsing errors
**Solution**: Use the `validateCookie` helper or properly parse cookie strings.

**Issue**: Mock not being called
**Solution**: Check that the mock implementation is set before the request is made.

### 14.2 Debugging Tips

1. Use `console.log` sparingly in tests (remove before committing)
2. Run individual tests with: `npm run test -- -t "test name pattern"`
3. Check Jest mock state with: `expect(mockFn).toHaveBeenCalled()`
4. Use `--detectOpenHandles` to debug hanging tests

## 15. Examples Reference

See `backend/test/auth.test.ts` for comprehensive examples of:

- Register endpoint tests (validation, happy path, errors)
- Login endpoint tests (password hashing, auth failures)
- Protected route tests (JWT validation, role-based access)
- Search and sort tests (query parameters, Prisma where clauses)

---

**Remember**: Unit tests are living documentation. They should clearly communicate the expected behavior of your code and protect against regressions.
