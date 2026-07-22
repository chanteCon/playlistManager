# Backend Authentication API

---

Authentication API using JWT access tokens and refresh tokens. Includes login MFA, email verification, password reset flows, and user account management.

## Tech Stack

- Application: Node.js, TypeScript, Express
- Database: PostgreSQL, Prisma
- Caching: Redis
- Testing: Jest, Testcontainers
- Development and infrastructure: Docker, Docker Compose

## Requirements

- Node.js v24
- Docker

## Installation

Clone and install dependencies:

```
git clone git@github.com:chanteCon/authAPI.git
cd authAPI
npm install
```

Create environment files:

```
cp .env.example .env
cp .env.example .env.test
```

## Local Development

Start the application and required services:

> [!NOTE]
> Docker Compose starts the required PostgreSQL, Redis and MailHog services.

```bash
npm run dev
```

In the development environment, the following are accessible:

| Resource | URL                            |
| -------- | ------------------------------ |
| API      | http://localhost:4000/api/     |
| Docs     | http://localhost:4000/api/docs |
| MailHog  | http://localhost:8025          |

## Testing

Run the test suite:

> [!NOTE]
> Testcontainers provision isolated PostgreSQL and Redis containers for integration and E2E tests. Email sending is mocked.

```bash
npm test
```

## Production

To build and start the production server:

> [!NOTE]
> Required services must be configured separately.

```bash
npm start
```

## Additional Commands

| Command                  | Description                                                       |
| ------------------------ | ----------------------------------------------------------------- |
| `npm run docker:up`      | Start PostgreSQL, Redis and MailHog services using Docker Compose |
| `npm run docker:down`    | Stop local services                                               |
| `npm run migrate`        | Create and apply migrations after Prisma schema changes           |
| `npm run migrate:deploy` | Apply existing migrations to a database                           |
