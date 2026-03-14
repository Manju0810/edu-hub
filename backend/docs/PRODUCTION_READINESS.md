# Production Readiness TODO List

**Last Updated:** March 14, 2026  
**Status:** In Progress  
**Target:** Production Deployment  

This document outlines all tasks needed to make the edu-hub backend production-ready, based on a comprehensive codebase analysis by a Senior Backend Architect.

---

## 🔴 CRITICAL (Must Fix Before Production)

### Security
- [ ] **Remove hardcoded secrets from .env** - JWT_SECRET and DATABASE_URL are committed; rotate immediately and use GitHub Secrets
- [ ] **Implement rate limiting** - Use `express-rate-limit` to prevent brute force attacks on auth endpoints
- [ ] **Add security headers** - Integrate `helmet` middleware for XSS, HSTS, CSP protection
- [ ] **Fix CORS configuration** - Current `credentials: true` with `origin: 'http://localhost:5173'` will fail in production; implement dynamic origin or proper whitelist
- [ ] **Enforce HTTPS redirect** in production (trust proxy + secure cookies)
- [ ] **Add CSRF protection** - Consider CSRF tokens or same-site cookie enforcement
- [ ] **Implement request size limits** - Prevent large payload attacks (`express.json({ limit: '10kb' })`)
- [ ] **Sanitize user inputs** - Add sanitization to prevent XSS (even with validation)
- [ ] **Secure cookie settings** - Set `Secure: true`, `SameSite: 'Strict'` for production
- [ ] **Password hashing** - Currently using bcrypt with saltRounds=12 in .env? Need to check saltRounds value and ensure it's >=12

### Database & Data Integrity
- [ ] **Add database connection pooling** - Configure Prisma connection pool size for production load
- [ ] **Add database health check** - Implement `/health/db` endpoint to verify DB connectivity
- [ ] **Add Prisma migration safeguards** - Prevent accidental `prisma migrate dev` in production
- [ ] **Implement soft deletes** - Consider adding `isActive`/`deletedAt` for important records
- [ ] **Add database indexing** - Create indexes on foreign keys and frequently queried fields
- [ ] **Add constraints** - `duration` check constraint (endDate > startDate), positive pricing if exists

### Error Handling & Observability
- [ ] **Centralized error handler** - Create error handling middleware with proper logging
- [ ] **Structured logging** - Replace `console.error` with `winston` or `pino` with JSON output
- [ ] **Error monitoring** - Integrate Sentry or similar for production error tracking
- [ ] **Sanitize error messages** - Don't expose internal errors to clients
- [ ] **Add request ID tracing** - Generate unique request IDs for distributed tracing

---

## 🟡 HIGH (Important for Scalability & Reliability)

### Architecture & Code Quality
- [ ] **Implement service layer** - Controllers have business logic; extract to services for testability
- [ ] **Create repository pattern** - Abstract Prisma calls for easier DB swapping and testing
- [ ] **Fix N+1 query problems** - 
  - `getEnrollsByUserId` with search does 3 queries (users, courses, enrollments)
  - `getEnrollsByCourseId` with search has similar issue
  - Use Prisma includes/selects efficiently
- [ ] **Consistent API response format** - Standardize `{ success, message, data, errors }` across all endpoints
- [ ] **Add request validation for query params** - Validate and sanitize `req.query` using Zod
- [ ] **Remove duplicate code** - Consolidate CRUD patterns in controllers
- [ ] **Fix Prisma client singleton** - Ensure single Prisma instance app-wide (current implementation may cause connection leaks)
- [ ] **Add input sanitization middleware** - Sanitize strings (trim, escape HTML)

### API Design
- [ ] **Add pagination metadata** - Return `{ page, limit, total, totalPages }` with paginated responses
- [ ] **Add API versioning** - Prefix routes with `/api/v1/`
- [ ] **Implement field filtering** - Allow `?select=field1,field2` for performance
- [ ] **Add sorting validation** - Validate sortBy parameters against allowed fields (already exists but not standardized)
- [ ] **Add proper HTTP status codes** - Review all status codes (201 for create, 204 for delete, etc.)
- [ ] **Add idempotency keys** - For critical mutations (POST/PUT/DELETE) to prevent duplicates

### Testing
- [ ] **Increase test coverage** - Currently only auth controller has tests
  - Write tests for: course, enrollment, material controllers
  - Write tests for all middleware
  - Write integration tests for full request flow
- [ ] **Add API contract tests** - Use `swagger`/`openapi` specifications with Dredd or similar
- [ ] **Fix test environment** - Separate test database, use environment-based test config
- [ ] **Add mutation testing** - Use `stryker-mutator` to ensure tests are meaningful
- [ ] **Add performance tests** - Baseline response times with `autocannon` or `k6`

### DevOps & Monitoring
- [ ] **Add health check endpoints** - `/health` (liveness) and `/health/ready` (readiness)
- [ ] **Add metrics endpoint** - `/metrics` with Prometheus format (request count, latency, errors)
- [ ] **Implement structured logging** - JSON logs with correlation IDs for request tracing
- [ ] **Add request timeout** - Set timeout for long-running requests (e.g., 30s)
- [ ] **Add graceful shutdown** - Handle SIGTERM, SIGINT to close DB connections, stop server
- [ ] **Add Docker healthcheck** - Define `HEALTHCHECK` in Dockerfile
- [ ] **Create .dockerignore** - Exclude node_modules, tests, logs, env files, etc. from Docker build
- [ ] **Multi-stage build optimization** - Currently good, but add .dockerignore to reduce context size
- [ ] **Separate build and runtime dependencies** - Already using `--omit=dev`, verify all dev deps excluded

---

## 🟢 MEDIUM (Best Practices & Polish)

### Security Enhancements
- [ ] **Implement refresh token rotation** - Add refresh tokens with rotation, not long-lived JWTs
- [ ] **Add password reset flow** - Email-based password reset with token expiry
- [ ] **Add email verification** - Verify user email before allowing login
- [ ] **Implement account lockout** - After 5 failed login attempts
- [ ] **Add JWT revocation list** - Maintain blacklist/whitelist for token invalidation
- [ ] **Audit logging** - Log security events (login, logout, password changes, role changes)
- [ ] **Add content security policy** - Proper CSP headers for API responses
- [ ] **Implement request signing** - Consider HMAC signatures for sensitive operations

### Code Quality & Maintainability
- [ ] **Add TypeScript strict mode** - Enable `strict: true` in tsconfig (already strict, verify all issues resolved)
- [ ] **Add zod validation for all inputs** - Validate query, params, body with schemas
- [ ] **Remove duplicate dotenv.config()** - Only configure once in entry point (index.ts)
- [ ] **Fix ESLint warnings** - Address any "no-console" violations (currently allows warn/error/info)
- [ ] **Add Prettier hooks** - Set up pre-commit hook with Husky for formatting
- [ ] **Add JSDoc comments** - Document complex functions with types
- [ ] **Add environment-based config** - Create config module that loads based on NODE_ENV
- [ ] **Refactor CustomRequest interface** - Move to types folder and reuse across controllers
- [ ] **Extract magic strings** - Move hardcoded strings (role names, statuses) to constants

### Performance
- [ ] **Add Redis caching** - Cache frequently accessed data (courses, materials, user profiles)
- [ ] **Implement query optimization** - Add proper select/where clauses to avoid fetching unnecessary data
- [ ] **Add database connection pool monitoring** - Monitor pool usage, add connection pool metrics
- [ ] **Implement compression** - Add `compression` middleware for response compression
- [ ] **Add CDN for static assets** - If serving files (profile images, materials), use signed URLs with cloud storage
- [ ] **Optimize Docker image** - Use multi-stage builds properly, already good but could slim further

### Developer Experience
- [ ] **Add debug middleware** - Conditional debug logging in development
- [ ] **Add seed script** - Create database seed for development with sample data
- [ ] **Add migration rollback strategy** - Document and test rollback procedures
- [ ] **Create API documentation** - Use OpenAPI/Swagger with interactive docs
- [ ] **Add VS Code workspace settings** - Shared editorconfig, VSCode extensions recommendations
- [ ] **Set up pre-commit hooks** - Lint, type-check, format before commits
- [ ] **Add Makefile** - Common commands for dev, build, test, lint, db operations

### Testing & Quality Gates
- [ ] **Add mutation testing** - Ensure tests actually catch bugs
- [ ] **Add load testing** - Baseline performance metrics before scaling
- [ ] **Add security scanning** - `npm audit`, Snyk, or OWASP dependency check in CI
- [ ] **Add code quality gate** - SonarQube or CodeClimate integration
- [ ] **Implement CI/CD** - GitHub Actions: lint, type-check, test, build on PR/merge
- [ ] **Add E2E tests** - Full workflow tests with test database

---

## 🔵 LOW (Nice to Have)

### Observability & Operations
- [ ] **Add distributed tracing** - OpenTelemetry integration for microservices future
- [ ] **Add APM integration** - New Relic, Datadog, or similar for performance monitoring
- [ ] **Add business metrics** - Track signups, course creations, enrollments
- [ ] **Implement feature flags** - Use Unleash or similar for gradual rollouts
- [ ] **Add audit trail table** - Track all create/update/delete operations with user + timestamp

### Security Hardening
- [ ] **Add HIBP password check** - Check passwords against HaveIBeenPwned API
- [ ] **Implement MFA** - Two-factor authentication using TOTP
- [ ] **Add IP allowlisting** - For admin endpoints
- [ ] **Session management improvements** - Store session in DB, allow user to revoke sessions
- [ ] **Add OAuth2 providers** - Google, GitHub login options

### Code Quality
- [ ] **Add functional programming utilities** - Consider `ramda` or `lodash/fp` for composition
- [ ] **Add validation pipeline** - Chain multiple validators with proper error aggregation
- [ ] **Create shared types package** - Extract types to separate package if multiple services planned
- [ ] **Add custom test matchers** - Jest matchers for common assertions

### DevOps & Infrastructure
- [ ] **Create Terraform/Deployment configs** - IaC for GCP VM provisioning
- [ ] **Add blue-green deployment** - Zero-downtime deployments
- [ ] **Add database migration automation** - Auto-apply migrations on startup with safety checks
- [ ] **Implement backup strategy** - Automated database backups with retention policy
- [ ] **Add disaster recovery plan** - Document RTO/RPO, backup restore procedures
- [ ] **Set up staging environment** - Mirror production for testing before deploy

---

## 🎯 Recommended Implementation Order

### Phase 1 (Week 1-2): Critical Security & Stability
- Remove hardcoded secrets, rotate credentials
- Implement rate limiting, helmet, CORS fixes
- Centralized error handling + structured logging
- Database connection pooling + health check
- Graceful shutdown
- Add `.dockerignore` and Docker healthcheck

### Phase 2 (Week 3-4): Architecture Refactoring
- Implement service layer
- Create repository pattern
- Fix N+1 queries
- Consistent API response format
- Add request validation for query params
- Remove duplicate code

### Phase 3 (Week 5-6): Testing & Quality
- Increase test coverage (all controllers to 80%+)
- Integration tests
- Fix test environment
- CI/CD setup with quality gates
- API documentation (OpenAPI)
- Pre-commit hooks (Husky)

### Phase 4 (Week 7-8): Observability & Performance
- Add health checks, metrics endpoints
- Implement structured logging with request IDs
- Add compression middleware
- Implement caching (Redis)
- Performance testing and optimization
- Monitoring setup (Sentry/DataDog)

### Phase 5 (Week 9-10): Advanced Features
- Refresh token rotation
- Password reset flow
- Email verification
- Soft deletes
- Audit logging
- Feature flags
- Staging environment setup

### Phase 6 (Ongoing): Polish & DevEx
- Makefile for common tasks
- Database seed scripts
- Developer documentation
- Code reviews and refactoring
- Load testing and optimization
- Security scanning integration

---

## 📊 Current State Assessment

| Category | Status | Coverage |
|----------|--------|----------|
| **Security** | 🔴 Critical | 20% |
| **Architecture** | 🟡 Medium | 60% |
| **Testing** | 🔴 Critical | 15% (auth only) |
| **DevOps** | 🟡 Medium | 40% |
| **Observability** | 🔴 Critical | 10% |
| **Code Quality** | 🟢 Good | 70% |
| **API Design** | 🟡 Medium | 50% |

---

## ✅ Quick Wins (Can be done in 1-2 days)

1. Add `.dockerignore` file
2. Fix CORS for production (use `NODE_ENV` variable)
3. Add request timeout middleware (`express-timeout`)
4. Create health check endpoint (`/health`)
5. Standardize API responses (create helper function)
6. Remove duplicate `dotenv.config()` calls
7. Add Docker `HEALTHCHECK` instruction
8. Add rate limiting to auth endpoints
9. Add `helmet` middleware
10. Create error handling middleware

---

## 📝 Notes

- The Jest config has **95% coverage thresholds** which is good but currently only auth tests exist
- TypeScript config is strict and well-configured
- ESLint setup is comprehensive with import sorting, unused imports, spell check
- Prisma schema is well-designed with proper relationships
- Deployment workflow exists but needs security improvements (secrets management)
- No `.dockerignore` file exists currently
- No structured logging or error monitoring
- Controllers mix business logic with HTTP handling (service layer needed)
- N+1 query issues present in enrollment controllers

---

## 🔄 Progress Tracking

Update this checklist as tasks are completed. Use the following status indicators:

- [ ] Not started
- [x] Completed
- [~] In progress
- [!] Blocked

---

**Next Steps:** Start with Phase 1 CRITICAL items, especially:
1. Rotate all exposed secrets immediately
2. Set up proper GitHub Secrets for deployment
3. Implement rate limiting and security headers
4. Add health check endpoints