# Edu-Hub

A modern, production-ready learning management system backend built with Node.js, Express, TypeScript, and Prisma ORM.

## 🚀 Features

- **User Authentication & Authorization** - JWT-based auth with role-based access control (Student/Educator)
- **Course Management** - Create, read, update, delete courses with categorization
- **Enrollment System** - Manage student enrollments with status tracking
- **Material Management** - Upload and manage course materials (lecture slides, videos, quizzes)
- **Production-Ready** - Docker containerization, automated deployment to GCP
- **Deployment Metadata** - Track deployed commit hash, build time, and timestamps in IST
- **Comprehensive Testing** - Jest unit tests with 95%+ coverage targets
- **Type-Safe** - Full TypeScript implementation with strict mode
- **Validated Inputs** - Zod schema validation for all requests

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 24.x | Runtime |
| Express | 5.2.1 | Web Framework |
| TypeScript | 5.9.3 | Type Safety |
| Prisma | 7.4.2 | Database ORM |
| PostgreSQL | - | Database |
| Docker | - | Containerization |
| Jest | 30.2.0 | Testing Framework |
| ESLint | 9.39.4 | Code Quality |
| Prettier | 3.8.1 | Code Formatting |

## 📋 Prerequisites

- Node.js 24+ (for local development)
- Docker & Docker Compose (for containerization)
- PostgreSQL database (or Neon/Cloud SQL)
- Git

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── app.ts              # Express app setup & routes
│   ├── index.ts            # Server entry point
│   ├── prisma.ts           # Prisma client singleton
│   ├── controllers/        # Request handlers
│   │   ├── auth.ts
│   │   ├── course.ts
│   │   ├── enrollment.ts
│   │   └── material.ts
│   ├── middlewares/        # Custom middleware
│   │   ├── auth.ts
│   │   └── validation.ts
│   ├── routes/             # API route definitions
│   │   ├── auth.ts
│   │   ├── course.ts
│   │   ├── enrollment.ts
│   │   └── material.ts
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   └── validation/         # Zod schemas
├── test/                   # Jest test files
├── prisma/                 # Database schema & migrations
├── scripts/                # Deployment scripts
├── docs/                   # Documentation
├── Dockerfile              # Multi-stage production build
├── docker-compose.yml      # Development compose config
├── docker-compose.prod.yml # Production compose config
└── package.json
```

## 🚦 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/Manju0810/edu-hub.git
cd edu-hub/backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```

### 4. Set Up Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

### 5. Start Development Server

```bash
npm run dev
```

The server will start at `http://localhost:5000`

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🏗️ Build for Production

```bash
# Build TypeScript
npm run build

# Check types without building
npm run build:check
```

## 📦 Docker Deployment

### Build Docker Image

```bash
docker build -t edu-hub-backend:latest -f backend/Dockerfile .
```

### Run with Docker Compose (Development)

```bash
docker compose -f backend/docker-compose.yml up -d
```

### Run with Docker Compose (Production)

```bash
docker compose -f backend/docker-compose.prod.yml up -d
```

## ☁️ Production Deployment

This project uses GitHub Actions for automated deployment to Google Cloud Platform (GCP) Virtual Machine.

### Deployment Features

- ✅ **Automated CI/CD** - Deploys on push to `main` branch
- ✅ **Pre-deployment Validation** - Tests Docker image on GitHub runner before deploying
- ✅ **Retry Logic** - Health checks with 10 retries, 3s delay
- ✅ **Deployment Metadata** - Track commit hash, build time (UTC & IST)
- ✅ **Zero-Downtime** - Graceful container replacement

### Setup Instructions

See [`.github/workflows/DEPLOYMENT_SETUP.md`](./.github/workflows/DEPLOYMENT_SETUP.md) for complete deployment guide.

**Quick Setup:**

1. Add required GitHub Secrets:
   - `GCP_VM_HOST`
   - `GCP_VM_USERNAME`
   - `GCP_SSH_PRIVATE_KEY`
   - `GCP_VM_PORT` (optional, default: 22)
   - `GCP_SSH_PASSPHRASE` (optional)
   - `JWT_SECRET`
   - `DATABASE_URL`

2. Push to `main` branch - deployment triggers automatically

3. Monitor deployment in GitHub Actions tab

### Verify Deployment

```bash
# Check health endpoint
curl http://your-vm-ip:5000/api/ping

# Expected response with deployment metadata:
{
  "message": "server is running",
  "deployment": {
    "commitHash": "abc123...",
    "commitDate": "2025-03-14 08:30:00 +0000",
    "commitDateIST": "14 March 2026 at 10:09:55 am",
    "buildTime": "2025-03-14T08:30:00Z",
    "buildTimeIST": "14 March 2026 at 04:00:55 pm"
  }
}
```

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | User login | Public |
| GET | `/api/auth/user/getAllStudents` | Get all students | Educator only |

### Courses
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/course/addCourse` | Create course | Educator |
| GET | `/api/course/getAllCourses` | Get all courses | Authenticated |
| GET | `/api/course/getCourseByCourseId/:courseId` | Get course by ID | Authenticated |
| GET | `/api/course/getCoursesByUserId/:userId` | Get courses by user | Authenticated |
| PUT | `/api/course/updateCourseByCourseId/:courseId` | Update course | Educator (owner) |
| DELETE | `/api/course/deleteCourseByCourseId/:courseId` | Delete course | Educator (owner) |

### Enrollments
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/enroll/getAllEnrolls` | Get all enrollments | Educator |
| POST | `/api/enroll/addEnroll` | Create enrollment | Authenticated |
| GET | `/api/enroll/getEnrollByEnrollId/:enrollId` | Get enrollment by ID | Authenticated |
| GET | `/api/enroll/getEnrollsByUserId/:userId` | Get enrollments by user | Authenticated |
| GET | `/api/enroll/getEnrollsByCourseId/:courseId` | Get enrollments by course | Authenticated |
| PUT | `/api/enroll/updateEnrollByEnrollID/:enrollId` | Update enrollment status | Educator |
| DELETE | `/api/enroll/deleteEnrollByEnrollID/:enrollId` | Delete enrollment | Educator |

### Materials
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/material/addMaterial` | Add material to course | Educator |
| GET | `/api/material/getMaterialByMaterialId/:materialId` | Get material by ID | Educator |
| PUT | `/api/material/updateMaterialByMaterialId/:materialId` | Update material | Educator |
| DELETE | `/api/material/deleteMaterialByMaterialId/:materialId` | Delete material | Educator |
| GET | `/api/material/getMaterialByCourseId/:courseId` | Get materials by course | Authenticated |

### Health & Info
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ping` | Health check with deployment metadata |

## 📊 Database Schema

### Core Models

- **User** - User accounts with roles (student/educator)
- **Course** - Course information with creator relationship
- **Material** - Course materials with type classification
- **Enrollment** - Student enrollments with status tracking

### Key Relationships

- User (1) → (N) Course (creator)
- User (1) → (N) Enrollment
- Course (1) → (N) Material
- Course (1) → (N) Enrollment

See [`backend/prisma/schema.prisma`](./backend/prisma/schema.prisma) for full schema.

## 🔒 Security Features

- JWT-based authentication with HTTP-only cookies
- Role-based access control (RBAC)
- Password hashing with bcrypt
- CORS configuration
- Input validation with Zod
- SQL injection prevention via Prisma ORM
- Rate limiting (to be implemented)
- Helmet security headers (to be implemented)

## 📈 Production Readiness

This project follows production-ready best practices:

- ✅ Multi-stage Docker builds
- ✅ Environment-based configuration
- ✅ Comprehensive error handling
- ✅ Structured logging (in progress)
- ✅ Health check endpoints
- ✅ Automated deployment pipeline
- ✅ TypeScript strict mode
- ✅ ESLint + Prettier configuration
- ✅ High test coverage targets (95%+)

See [`backend/PRODUCTION_READINESS.md`](./backend/PRODUCTION_READINESS.md) for complete production-readiness roadmap.

## 🧩 Development Guidelines

### Code Quality

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Check formatting
npm run prettier

# Fix formatting
npm run prettier:fix
```

### Pre-commit Hooks

Set up Husky for automatic linting and formatting:

```bash
# Install husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint && npm run build:check"
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Server port (default: 5000) |
| `JWT_SECRET` | Yes | Secret key for JWT signing |
| `DATABASE_URL` | Yes | PostgreSQL connection string |

## 🐛 Troubleshooting

### Common Issues

**Database connection errors:**
- Verify `DATABASE_URL` is correct
- Check database is running and accessible
- Ensure SSL mode is properly configured for Neon/Cloud SQL

**JWT errors:**
- Ensure `JWT_SECRET` is set and matches across deployments
- Check token expiration settings

**Docker build fails:**
- Clear Docker cache: `docker builder prune -af`
- Verify `.dockerignore` excludes unnecessary files

**Tests fail:**
- Ensure test database is configured separately
- Mock external dependencies properly

## 📚 Documentation

- [Deployment Setup](./.github/workflows/DEPLOYMENT_SETUP.md) - GCP deployment guide
- [Production Readiness](./backend/PRODUCTION_READINESS.md) - Roadmap to production
- [Prisma Schema](./backend/prisma/schema.prisma) - Database schema
- [API Testing](./backend/test/) - Test examples

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### PR Requirements

- ✅ All tests passing
- ✅ TypeScript compilation successful
- ✅ ESLint errors resolved
- ✅ Code formatted with Prettier
- ✅ Coverage thresholds met (95%+)
- ✅ Documentation updated (if needed)

## 📄 License

ISC

## 👏 Acknowledgments

- Built with [Express.js](https://expressjs.com/)
- Database ORM by [Prisma](https://www.prisma.io/)
- Testing with [Jest](https://jestjs.io/)
- Linting by [ESLint](https://eslint.org/)
- Formatting with [Prettier](https://prettier.io/)

---

**Status:** 🚧 Under Active Development | Production-Ready with CI/CD