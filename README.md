# Campus Work-Study HR Portal Lite

Full-stack implementation for the CPS 3500 SESMag final project. The app uses Angular, Tailwind CSS, Node.js, Express, PostgreSQL, bcrypt + JWT for authentication, and a provider-swappable AI matchmaking endpoint for OpenAI or Gemini.

## Project Structure

- `database/`: PostgreSQL schema and seed data (applicants and managers include `password_hash` + `role`).
- `backend/src/`: Express API, middleware, routes, and services. Includes `services/authService.js`, `routes/auth.js`, and `middleware/auth.js` (requireAuth / requireRole / requireSelfOrManager).
- `frontend/src/app/`: Angular shell with `/login`, `/applicant` (DAV portal + AI chat), and `/manager` (HR dashboard) routes, auth guards, an HTTP interceptor that attaches the JWT, and a reusable `ai-chat` component.
- `scripts/run-sql.js`: cross-platform SQL runner used by `db:schema` and `db:seed` so the workflow works the same on Windows PowerShell, cmd, and Unix shells.
- `tests/`: backend unit tests, integration tests, frontend pure-logic tests, and a JWT helper (`tests/helpers/auth.js`).
- `docs/written-assignments.md`: SESMag written assignment responses.

## Security Highlights

This build implements the three security requirements from the second-draft brief:

- **Login module** — `POST /api/auth/login`, `POST /api/auth/logout`, and `GET /api/auth/me`. The frontend has a dedicated `/login` page with demo-account buttons.
- **Password hashing** — Passwords are stored as bcrypt hashes (cost 10). Seed data uses PostgreSQL's `pgcrypto` (`crypt('password123', gen_salt('bf', 10))`), and the Node backend verifies them with `bcryptjs`. Plaintext passwords are never logged or returned.
- **Role-based access control** — JWTs carry `{ sub: userId, role, email }`. The backend enforces:
  - `requireAuth` — every `/api` route except `/api/health` and `/api/auth/login`.
  - `requireRole('manager')` — guards `/api/managers/*`.
  - `requireSelfOrManager('id')` — applicants can only read or modify their own `/api/applicants/:id/*` record; managers can read any applicant.

The Angular app mirrors this with route guards (`authGuard`, `roleGuard`) and an HTTP interceptor that automatically attaches `Authorization: Bearer <token>` and logs the user out on any `401` response.

## Step 1: Database

Create a PostgreSQL database, then run:

```powershell
copy .env.example .env
npm install
npm run db:schema
npm run db:seed
```

Fill in `DATABASE_URL` and change `JWT_SECRET` in `.env` before running in any shared environment.

The schema includes:

- `applicants`: student profile, contact preference, access needs, maximum weekly hours, `password_hash`, and `role='applicant'`.
- `applicant_skills`: normalized skill tags for matching.
- `availability_blocks`: day/time schedule blocks that students can update.
- `departments` and `managers`: department-head data for the dashboard; managers carry their own `password_hash` and `role='manager'`.
- `jobs`, `job_required_skills`, and `job_shifts`: work-study positions and schedule needs.
- `applications`: applicant-job workflow state.
- `audit_events`: snapshots that support future Save/Undo behavior.

## Step 2: API

Start the Express server:

```powershell
npm run dev
```

Public endpoints:

- `GET /api/health`
- `POST /api/auth/login` — `{ email, password }` → `{ token, user }`
- `POST /api/auth/logout` — client drops the token
- `GET /api/auth/me` — returns the decoded JWT user (requires auth)

Protected endpoints (send `Authorization: Bearer <token>`):

- `GET /api/applicants/:id` — self or manager
- `PATCH /api/applicants/:id/profile` — self or manager
- `PUT /api/applicants/:id/skills` — self or manager
- `PUT /api/applicants/:id/availability` — self or manager
- `GET /api/applicants/:id/applications` — self or manager
- `POST /api/applicants/:id/applications` — self or manager
- `GET /api/jobs` — any signed-in user
- `GET /api/managers/dashboard` — manager only
- `GET /api/managers/jobs/:jobId/matches` — manager only
- `POST /api/ai/recommendations`, `POST /api/ai/chat` — any signed-in user

Example login + authenticated AI request:

```powershell
$login = Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3000/api/auth/login `
  -ContentType application/json `
  -Body '{"email":"alex.morgan@student.example","password":"password123"}'

Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3000/api/ai/recommendations `
  -ContentType application/json `
  -Headers @{ Authorization = "Bearer $($login.token)" } `
  -Body '{"message":"I am free on Tuesday mornings and I know basic troubleshooting."}'
```

The AI provider is controlled through `.env`:

- `AI_PROVIDER=mock` uses deterministic local parsing, which is best for demos without API keys.
- `AI_PROVIDER=openai` uses `OPENAI_API_KEY` and `OPENAI_MODEL`.
- `AI_PROVIDER=gemini` uses `GEMINI_API_KEY` and `GEMINI_MODEL`.

The server never lets the model write SQL. The model only extracts safe criteria, and the backend performs the database query.

## Step 3: Frontend

Run the Angular app in a second terminal while the backend is running:

```powershell
npm run frontend:dev
```

Then open:

```text
http://localhost:4200
```

The frontend includes:

- `/login` route: sign-in form with demo-account quick-fill (everyone's password is `password123` in the seed).
- `/applicant` route (applicants only): DAV Portal with low-cognitive-load forms, availability rows, prominent Save/Undo controls, and the AI matchmaking chat alongside. The portal loads the currently-signed-in applicant automatically; there is no hard-coded user id.
- `/manager` route (managers only): Management Dashboard with aggregate HR metrics, department load, availability-by-day, job selector, and candidate matches.
- Top-level header that shows the signed-in user, their role, and a logout button. The tab nav only shows the surface the current role can access.
- HTTP interceptor that attaches the JWT and force-logs-out on a `401`.
- Responsive Tailwind layout designed to stay text-first and lightweight for low-end devices.

### Demo accounts

All seeded users share the password `password123`.

| Role | Email |
| --- | --- |
| Applicant | `alex.morgan@student.example` |
| Applicant | `nina.lopez@student.example` |
| Applicant | `chris.kim@student.example` |
| Manager | `maya.rivera@kean.example` |
| Manager | `sam.patel@kean.example` |
| Manager | `grace.chen@kean.example` |
| Manager | `jordan.brooks@kean.example` |

## Step 4: Testing

Run backend unit and integration tests:

```powershell
npm test
```

Integration tests mint test JWTs through `tests/helpers/auth.js` so the role and ownership rules are exercised end-to-end. They stub database-facing services so the suite runs without requiring a local PostgreSQL process.

Build the Angular frontend:

```powershell
npm run frontend:build
```

## Step 5: Written Assignment

The SESMag reflection and architecture analysis are in:

```text
docs/written-assignments.md
```

## Demo Notes

For a local demo, use `AI_PROVIDER=mock` first. This makes the chatbot deterministic and avoids needing a paid API key during the screen recording. To show live database behavior: `npm run db:reset`, start the backend, start the frontend, sign in as an applicant, update availability, sign in as the matching manager in another browser profile, and refresh the dashboard.
