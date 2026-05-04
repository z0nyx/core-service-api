# Core Backend API

A basic starter template for a backend API built with `NestJS`, including:
- PostgreSQL + Prisma
- Redis
- Docker / Docker Compose
- Basic rate limiting and a health-check endpoint

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

- `POST /token/issue`
  - Body:
    - `email` (valid email)
    - `userId` (optional string, min `2`)
  - Response:
    - `token` (JWT access token)

- `POST /token/verify`
  - Body:
    - `token` (valid JWT)
  - Response:
    - `payload` (`sub`, `email`)

## Environment Variables

Example variables are provided in `.env.example`.

For local (non-Docker) runs, use `.env`.

JWT-related variables:
- `JWT_ACCESS_SECRET`
- `JWT_ACCESS_EXPIRES_IN`

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
