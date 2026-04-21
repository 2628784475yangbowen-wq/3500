# Campus Work-Study HR Portal Lite

Full-stack implementation for the CPS 3500 SESMag final project. The app uses Angular, Tailwind CSS, Node.js, Express, PostgreSQL, and a provider-swappable AI matchmaking endpoint for OpenAI or Gemini.

## Project Structure

- `database/`: PostgreSQL schema and seed data.
- `backend/src/`: Express API, middleware, routes, and services.
- `frontend/src/app/`: Angular shell with dedicated routes for `/applicant` (DAV portal + AI chat) and `/manager` (HR dashboard), plus a reusable `ai-chat` component and a shared pure-logic module (`logic.js`).
- `scripts/run-sql.js`: cross-platform SQL runner used by `db:schema` and `db:seed` so the workflow works the same on Windows PowerShell, cmd, and Unix shells.
- `tests/`: backend unit tests (`time.unit.test.js`, `aiService.unit.test.js`, `jobService.unit.test.js`, `backend.unit.test.js`), integration tests (`api.integration.test.js`, `applicantRoutes.integration.test.js`), and frontend pure-logic tests (`frontend.logic.test.js`).
- `docs/written-assignments.md`: SESMag written assignment responses.

## Step 1: Database

Create a PostgreSQL database, then run:

```powershell
copy .env.example .env
npm install
npm run db:schema
npm run db:seed
```

The schema includes:

- `applicants`: student profile, contact preference, access needs, and maximum weekly hours.
- `applicant_skills`: normalized skill tags for matching.
- `availability_blocks`: day/time schedule blocks that students can update.
- `departments` and `managers`: department-head data for the dashboard.
- `jobs`, `job_required_skills`, and `job_shifts`: work-study positions and schedule needs.
- `applications`: applicant-job workflow state.
- `audit_events`: snapshots that support future Save/Undo behavior.

## Step 2: API

Start the Express server:

```powershell
npm run dev
```

Useful endpoints:

- `GET /api/health`
- `GET /api/applicants/:id`
- `PATCH /api/applicants/:id/profile`
- `PUT /api/applicants/:id/skills`
- `PUT /api/applicants/:id/availability`
- `GET /api/jobs`
- `GET /api/managers/dashboard`
- `GET /api/managers/jobs/:jobId/matches`
- `POST /api/ai/recommendations`
- `POST /api/ai/chat`

Example AI request:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3000/api/ai/recommendations `
  -ContentType application/json `
  -Body '{"message":"I am free on Tuesday mornings and I know basic troubleshooting. What jobs can I do?","applicantId":"30000000-0000-0000-0000-000000000001"}'
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

- `/applicant` route: DAV Portal with low-cognitive-load forms, availability rows, prominent Save/Undo controls, and the AI matchmaking chat alongside.
- `/manager` route: Management Dashboard with aggregate HR metrics, department load, availability-by-day, job selector, and candidate matches.
- Top-level tab nav between the two routes, so each persona only sees the surface they need.
- Reusable `app-ai-chat` component that accepts natural language availability and skills.
- Responsive Tailwind layout designed to stay text-first and lightweight for low-end devices.

## Step 4: Testing

Run backend unit and integration tests:

```powershell
npm test
```

Build the Angular frontend:

```powershell
npm run frontend:build
```

The integration tests stub database-facing services so they can verify API behavior without requiring a local PostgreSQL process.

## Step 5: Written Assignment

The SESMag reflection and architecture analysis are in:

```text
docs/written-assignments.md
```

## Demo Notes

For a local demo, use `AI_PROVIDER=mock` first. This makes the chatbot deterministic and avoids needing a paid API key during the screen recording. To show live database behavior, run `npm run db:reset`, start the backend, start the frontend, update applicant availability, and refresh the manager dashboard.
