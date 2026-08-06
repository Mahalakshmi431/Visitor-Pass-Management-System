# Visitor Pass Management System

A full-stack visitor pass management system with role-based access control.

- **Frontend:** React 19 + Vite + Bootstrap 5 (`client/`)
- **Backend:** Node.js + Express 5 + Mongoose (`server/`)
- **Database:** MongoDB Atlas

## Roles & Flows

| Role | Capabilities |
| --- | --- |
| **Administrator** | Full access — manage users, approve/reject, check in/out, reports, activity logs |
| **Receptionist** | Register visitors, issue pass codes, check in approved visitors, check out, cancel |
| **Employee** | Approve/reject visitor requests assigned to them, view their own visitors |

Visit lifecycle: `PENDING → APPROVED → CHECKED_IN → CHECKED_OUT` (or `REJECTED` / `CANCELLED`).

### Business rules enforced (server-side)
1. A visitor cannot have more than one active visit at the same time.
2. No duplicate registration for the same visitor on the same date.
3. Visit date cannot be earlier than the current date.
4. Today's expected arrival time cannot be earlier than the current time.
5. An employee can have at most 3 pending requests awaiting approval.
6. Check-in only allowed after approval.
7. Already checked-in visitors cannot be checked in again.
8. Check-out time must be later than check-in time.
9. Rejected requests cannot be checked in.
10. Cancelled visits are hidden from active lists (visible with `includeCancelled=true`).

## Getting Started

### 1. Backend setup

```bash
cd server
npm install
```

Create `server/.env` (already present locally, **never commit it**):

```
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/visitor_pass_db
JWT_SECRET=change_this_to_a_long_random_string
```

> **Note for IPv6/NAT64 or DNS-restricted networks:** if `mongodb+srv://` fails with
> `querySrv ECONNREFUSED`, replace it with the resolved non-SRV form, e.g.
> `mongodb://<user>:<password>@ac-fhjseqz-shard-00-00.y9ummov.mongodb.net:27017,ac-fhjseqz-shard-00-01.y9ummov.mongodb.net:27017,ac-fhjseqz-shard-00-02.y9ummov.mongodb.net:27017/visitor_pass_db?authSource=admin&replicaSet=atlas-v68m55-shard-0&tls=true`
> Also ensure your IP (or `0.0.0.0/0`) is whitelisted under Atlas → Security → Network Access.

### 2. Seed the database (creates users + sample visitors)

```bash
cd server
npm run seed
```

### 3. Run the backend

```bash
cd server
npm run dev      # nodemon (development)
# or
npm start        # node server.js
```

Server runs at `http://localhost:5000`.

### 4. Frontend setup

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`.

The frontend calls the API at the same-origin `/api` (configured in `client/src/services/api.js`).
In development, the Vite dev server proxies `/api` → `http://localhost:5000` (`client/vite.config.js`).
To point at a backend on another domain, set `VITE_API_URL` at build time.

### 5. Production build

```bash
cd client
npm run build      # outputs to client/dist
npm run preview
```

## Deploying to Netlify (frontend + API as serverless functions)

The Express API runs as a single **Netlify Function** via `serverless-http`, so the whole
stack (React SPA + API + MongoDB Atlas) can live on one Netlify site.

1. Push this repo to GitHub and import it in Netlify (or run `netlify deploy` locally).
   - `netlify.toml` handles: build (`npm run build`), publish dir (`client/dist`),
     `/api/*` → function redirect, and the SPA fallback.
2. In Netlify → **Site configuration → Environment variables**, add:
   - `MONGO_URI` — your Atlas connection string
   - `JWT_SECRET` — your JWT secret
3. Trigger a deploy. Netlify installs root dependencies (Express, Mongoose, `serverless-http`,
   etc.), bundles `netlify/functions/api.js`, builds the client, and publishes it.
4. Optional: run `npm run seed` locally once to populate demo users/visitors in Atlas.

The API function reuses the MongoDB connection across warm invocations
(`netlify/functions/api.js`). The client calls same-origin `/api`, so no CORS config is needed.

### Local Netlify testing (optional)

```bash
npm install -g netlify-cli
netlify dev          # serves functions + static site locally with .env
```

### Why not "just host the server on Netlify"?

Netlify only runs short-lived serverless functions, not a persistent `node server.js`.
That's why the Express app is wrapped with `serverless-http` (`server/app.js` holds the
route/middleware wiring; `server/server.js` is used for local development only).

## Login Credentials (seeded by `npm run seed`)

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@system.com` | `admin123` |
| Receptionist | `receptionist@system.com` | `receptionist123` |
| Employee 1 | `employee@system.com` | `employee123` |
| Employee 2 | `john.employee@system.com` | `employee123` |

## API Overview (all under `/api`, JWT-protected except login)

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/auth/login` | Public |
| GET | `/auth/me` | All |
| PUT | `/auth/change-password` | All |
| GET | `/users/employees` | All |
| GET/POST | `/users` | Admin |
| PUT | `/users/:id/toggle-status` | Admin |
| GET/POST | `/visitors` | Receptionist/Admin create; all list |
| GET/PUT | `/visitors/:id` | All get; Receptionist/Admin update |
| PUT | `/visitors/:id/approve` | Employee/Admin |
| PUT | `/visitors/:id/reject` | Employee/Admin |
| PUT | `/visitors/:id/checkin` | Receptionist/Admin |
| PUT | `/visitors/:id/checkout` | Receptionist/Admin |
| PUT | `/visitors/:id/cancel` | Receptionist/Admin |
| GET | `/dashboard/stats` | All (role-scoped) |
| GET | `/reports/visitors` | All (role-scoped) |
| GET | `/reports/activity-logs` | Admin |

## Project Structure

```
server/
  config/db.js          MongoDB connection
  models/               User, Visitor, ActivityLog
  controllers/          auth, visitor, report logic + business rules
  routes/               Express routers
  middleware/           JWT auth + role checks + error handlers
  app.js                Express app wiring (shared by server.js and the Netlify function)
  server.js             Local dev entry (seeds default users on boot)
  seed.js               Full data seed script (npm run seed)

netlify/
  functions/api.js      serverless-http wrapper — runs the whole API on Netlify
netlify.toml            Netlify build/publish config + /api redirect + SPA fallback

client/
  src/pages/            Login, Dashboard, VisitorList/Details/Add/Edit, Reports, UserManagement, Profile, ChangePassword
  src/components/       Navbar, Sidebar, VisitorForm, ConfirmModal, SearchBar, Pagination, Loader, ProtectedRoute
  src/context/          AuthContext (JWT session)
  src/services/         Axios API wrappers
  src/routes/           Route definitions + role guards
```
