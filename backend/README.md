# RDF Schema Editor Backend

Express + TypeScript API backend with MongoDB (via Mongoose) for the RDF Schema Editor.

## Prerequisites

- Node.js >= 20
- MongoDB (local or remote)

## Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Configure environment variables in `.env`:
```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/rse
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_TTL=300
CORS_ORIGIN=http://localhost:5173
# COOKIE_SECURE=true      # set when served over real HTTPS (enables Secure/SameSite=None cookies)
# PREFILL_USERS=true      # seed dummy users on startup, see mock/prefill.ts
```

3. Start MongoDB (if using local):
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or install MongoDB locally
```

4. Start the development server:
```bash
npm run dev
```

The API runs at `http://localhost:4000` (or `PORT` if set).

## API Endpoints

### Health
- `GET /api/healthy` - Liveness check (`{ status, uptime }`)

### Authentication (`/api/login`)
- `POST /api/login` - Login with `{ name, password }`. `name` is matched against both the username and email, so either works. Sets an `access_token` HTTP-only cookie and returns `{ id, isAdmin, exp }`.
- `GET /api/login` - Check current session; returns the same payload or `false`.
- `DELETE /api/login` - Logout (clears the auth cookie).

### Users (`/api/users`)
- `POST /api/users` - Register a new user (public). Body: `{ name, email, password, gender?, isAdmin? }`.
- `GET /api/users` - List all users (admin only).
- `GET /api/users/:id` - Get a single user (authenticated).
- `PUT /api/users/:id` - Update a user (self or admin only).
- `DELETE /api/users/:id` - Delete a user (self or admin only).

### Workspaces (`/api/workspaces`)
All workspace routes require authentication and are scoped to the current user.
- `GET /api/workspaces` - List the current user's workspaces
- `POST /api/workspaces` - Create a workspace with `{ name?, description?, data? }`
- `GET /api/workspaces/:id` - Get a workspace with its data
- `PUT /api/workspaces/:id` - Update a workspace
- `DELETE /api/workspaces/:id` - Delete a workspace

## Running with Frontend

1. Start MongoDB
2. Start backend: `cd backend && npm run dev`
3. Start frontend: `cd web-view && npm run dev`
4. In `web-view/.env`, set `VITE_USE_MOCK_DATA=false` and `VITE_REAL_FETCH=true` (with `VITE_APP_API_BASE_URL` pointing at the backend) to use the real backend instead of mock data.

## Tests

```bash
npm test
```

Runs the Jest suite against an in-memory MongoDB instance (`mongodb-memory-server`), so no real database is needed.
</content>
