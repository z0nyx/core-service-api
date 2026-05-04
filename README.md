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

## Environment Variables

Example variables are provided in `.env.example`.

For local (non-Docker) runs, use `.env`.

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
