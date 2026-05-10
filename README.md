# Core Backend API

A basic starter template for a backend API built with `NestJS`, including:
- PostgreSQL + Prisma
- Redis
- Docker / Docker Compose
- Basic rate limiting and health checks

## Quick Start

```bash
npm install
npm run prisma:generate
npm run start:dev
```

The API will be available at:
- `GET /api/health`

## Auth Endpoints

Base path: `/api/auth`

- `GET /health`
  - Auth module health check.

- `POST /register`
  - Body:
    - `email` (valid email)
    - `password` (string, min `8`, max `128`)
    - `name` (string, min `2`, max `64`)

- `POST /login`
  - Body:
    - `email` (valid email)
    - `password` (string, min `8`, max `128`)
  - Response:
    - `accessToken`
    - `refreshToken`

- `POST /token/issue` (admin only, requires `Authorization: Bearer <accessToken>`)
  - Body:
    - `email` (valid email)
    - `userId` (optional string, min `2`)
  - Response:
    - `accessToken`
    - `refreshToken`

- `POST /token/verify`
  - Body:
    - `token` (valid JWT)
  - Response:
    - `payload` (`sub`, `email`)

- `POST /token/refresh`
  - Body:
    - `refreshToken` (valid JWT)
  - Response:
    - `accessToken`
    - `refreshToken`

- `POST /token/logout`
  - Body:
    - `refreshToken` (valid JWT)
  - Response:
    - `success` (boolean)

- `POST /token/logout-all`
  - Body:
    - `refreshToken` (valid JWT)
  - Response:
    - `success` (boolean)
    - `revokedCount` (number)

## Users Endpoints

Base path: `/api/users` (admin only, requires `Authorization: Bearer <accessToken>`)

- `POST /`
  - Body:
    - `email` (required)
    - `username`, `name`, `firstName`, `lastName`, `avatarUrl`, `bio`, `phone` (optional)

- `GET /`
  - Query:
    - `page` (default `1`)
    - `limit` (default `20`, max `100`)
    - `search` (email/username/name/firstName/lastName)
    - `isActive` (`true`/`false`, default `true`)
    - `sortBy` (`createdAt`, `updatedAt`, `email`, `username`, `lastLoginAt`)
    - `sortOrder` (`asc`/`desc`, default `desc`)
  - Response:
    - `items` (users array)
    - `meta` (`page`, `limit`, `total`, `totalPages`)

- `GET /:id`
  - Returns single user by id.

- `PATCH /:id`
  - Partial update of user fields.

- `DELETE /:id`
  - Soft-delete: sets `isActive=false`.

## Environment Variables

Example variables are provided in `.env.example`.

For local (non-Docker) runs, use `.env`.

JWT-related variables:
- `JWT_ACCESS_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_SECRET`
- `JWT_REFRESH_EXPIRES_IN`

## Docker Usage

```bash
docker compose up --build
```

Services:
- API: `http://localhost:3000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

## Prisma

```bash
npm run prisma:migrate
npm run prisma:generate
```


