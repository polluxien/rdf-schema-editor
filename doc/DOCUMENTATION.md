# Documentation for the Expert Schema Editor UI

## Overview

This document provides an overview of the Expert Schema Editor UI, a web application for creating and managing RDF schemas as requested in the software engineering project and described (briefly) by the Lastenheft. The application is built using React, TypeScript, and Tailwind CSS and is based on the semantic functionality of [Karma](https://usc-isi-i2.github.io/karma/).
This documentation is meant to be a living document that will be updated as the project evolves and is divided into two major parts. (1) semantic and non-technical descriptions of the application and (2) technical documentation for developers.

## (1) Non-Technical Description

### Features

- Create and manage RDF schemas
- Import ontologies from two sources: a local OWL file or the https://data.biodivportal.gfbio.org/ API
- Import source data from CSV files
- Visual representation of schema structure
- Interactive schema editor with drag-and-drop functionality
- User registration/login and session management with JWT authentication, login works with either username or email
- Admin user-management area (list/edit/delete users)
- Workspace persistence to a MongoDB database, scoped per user, with local-only fallback when logged out

Note: functionality of this application, especially the export of models and rdf, goes hand-in-hand with WP8 and might therefore not be thoroughly documented here.

## (2) Technical Description

### Repository Layout

The project is a monorepo split into an independent frontend and backend:

```
├── web-view/        # React + Vite frontend
├── backend/         # Express + MongoDB backend
├── sharedTypes/      # TypeScript types shared by both sides
└── doc/              # This documentation
```

### Architecture

The frontend follows a component-based architecture with the following key components:

- **AppController**: Main application controller that manages the overall state and coordinates between different components.
- **WorkspaceProvider** (`WorkspaceContext`): Manages the workspace state and provides context for workspace-related operations.
- **AppProvider** (`AppContext`): Provides global application context and state management.
- **LoginContext**: Manages user authentication state and provides login information.
- **WorkspaceBar**: Displays the workspace bar with navigation and workspace management controls.
- **OntologyCanvas**: Renders the ontology canvas for visual schema representation, built on React Flow.
- **DatasetTable**: Displays dataset information in a table format.
- **ProtectedAdminRoute**: Route guard that restricts admin pages (`pages/admin/`) to users with `isAdmin`.

### API Integration

The frontend integrates with two external APIs:

- The backend API (below) for authentication, user management, and workspace persistence
- The https://data.biodivportal.gfbio.org/ API for retrieving ontologies

#### OWL API

The application uses an API to fetch OWL files from the https://data.biodivportal.gfbio.org/ API. The documentation of that API can be found at https://data.biodivportal.gfbio.org/documentation. To use the API the user of the app needs a valid API key, which can be obtained by creating an account at https://data.biodivportal.gfbio.org/. The key is entered once in the app's API key settings (`components/Profile/ApiKeySettings.tsx`) and cached locally.

As the documentation doesn't provide a clear and comprehensive overview of the API and neither explains the proper way to download an OWL file for a specific ontology, the implementation is based on trial and error and might not be the most efficient or correct way to do it.

The way we used is the following:
A list of all available ontologies can be retrieved by calling the `/ontologies` endpoint.
In our code, this is done in the `listAvailableOwlFiles` function in `web-view/src/api/owlApi.ts`, which returns a list of tuples (name, acronym). This list can then be provided to the user in the frontend to select an ontology.

Given the acronym of the selected ontology, we can retrieve the OWL file by calling the `/ontologies/{acronym}/submissions?display=all` endpoint. This returns a list of objects, each containing the URL to the OWL file. The zeroth element of this list is the most recent version of the ontology. By using the `dataDump` property of this object, we can retrieve the URL to download the OWL file.

As this url doesn't always work, we provide a fallback which replaces the domain `192.168.56.10:8080` with `data.biodivportal.gfbio.org`. This approach is fairly hacky, but works. Therefore we use this approach as there wasn't a more elegant solution found.

In the header of the requests, we set the `Authorization` field to the API key of the user, by setting it precisely to: `Authorization: apikey token={apikey}`. This is indicated in the API documentation.

### State Management

The application uses React's Context API for state management, with the following key contexts:

- **LoginContext**: Manages user authentication state and provides login information.
- **WorkspaceContext**: Manages workspace state and provides context for workspace-related operations. Automatically syncs with the backend when the user is logged in (with 2-second debounce), and mirrors state to `localStorage` (`lib/workspaceLocalCache.ts`) so an open workspace survives a page reload even without a backend round-trip.
- **AppContext**: Provides global application context and state management.
- **FileImportContext**: Handles file import state and provides context for file import functionality.

### Backend Architecture

The backend is an **Express 5** API server (TypeScript, run via `tsx`), with **MongoDB** and **Mongoose** for data persistence.

#### Backend Project Structure

```
backend/
├── package.json
├── .env                      # Environment configuration
├── tsconfig.json
├── mock/
│   └── prefill.ts            # Seeds dummy users when PREFILL_USERS=true
└── src/
    ├── app.ts                # Express app: middleware, request logging, routes, error handler
    ├── index.ts               # Entry point: loads env, connects to Mongo, starts the server
    ├── configCORS.ts          # CORS configuration
    ├── logger.ts               # Structured logging helper
    ├── routes/
    │   ├── loginRoute.ts       # POST/GET/DELETE /api/login
    │   ├── userRoute.ts        # /api/users CRUD
    │   ├── workspaceRoute.ts   # /api/workspaces CRUD
    │   └── authentification.ts # requiresAuthentication / optionalAuthentication middleware
    ├── services/
    │   ├── loginAuthService.ts # credential lookup (name or email) + password check
    │   ├── JWTServices.ts       # sign/verify the access_token JWT
    │   ├── userServices.ts      # user CRUD business logic
    │   ├── workspaceServices.ts # workspace CRUD business logic
    │   └── mongodb.ts           # Database connection singleton
    └── models/
        ├── User.ts              # User Mongoose schema
        ├── Workspace.ts          # Workspace Mongoose schema (ontology/mappings/flow layout)
        └── WorkspaceDataset.ts   # Imported dataset, stored separately per workspace
```

#### Database Models

**User Model** (`src/models/User.ts`):
- `name`: Unique username (string)
- `email`: Unique email address (string)
- `password`: Bcrypt-hashed password
- `gender`: One of `Male` / `Female` / `Divers` / `Prefer not to say` (default)
- `isAdmin`: Boolean, grants access to admin-only routes and pages
- `apiKey`: Optional API key for external services
- `createdAt`, `updatedAt`: Timestamps

**Workspace Model** (`src/models/Workspace.ts`):
- `userId`: Reference to owning User
- `name`: Workspace name
- `description`: Optional description
- `data`: Embedded object containing:
  - `ontology`: The loaded ontology (or null)
  - `mappings`: Array of column-to-class mappings
  - `flowNodes`: React Flow nodes for the canvas
  - `flowEdges`: React Flow edges for the canvas
- `createdAt`, `updatedAt`: Timestamps

**WorkspaceDataset Model** (`src/models/WorkspaceDataset.ts`):
- `workspaceId`: Reference to the owning Workspace (1:1)
- `dataset`: The imported CSV dataset (or null)
- `createdAt`, `updatedAt`: Timestamps

The imported dataset is kept in its own collection rather than embedded in the Workspace document: a single MongoDB document is capped at 16MB (BSON limit), and embedding the full dataset alongside ontology/mappings/flow layout made that limit easy to hit.

#### Authentication

Authentication uses **JWT tokens** (`jsonwebtoken`, HS256) stored in an `access_token` HTTP-only cookie:
- `JWTServices.verifyPasswordAndCreateJWT(identifier, password)` looks up the user via `loginAuthService.login`, which matches `identifier` against **either** `name` or `email` (`User.findOne({ $or: [{ name }, { email }] })`), then signs a token containing `{ sub: userId, isAdmin, exp }`.
- `JWTServices.verifyJWT(token)` verifies and decodes a token, throwing `JsonWebTokenError` if invalid/expired.
- `routes/authentification.ts` exposes two middlewares: `requiresAuthentication` (401s without a valid cookie, populates `req.userID`/`req.isAdmin`) and `optionalAuthentication` (same, but never rejects — used by `GET /api/login` to report session state).
- Cookie `Secure`/`SameSite=None` attributes are controlled by `COOKIE_SECURE`, independent of `NODE_ENV`, since the docker-compose stack serves production builds over plain `http://localhost`.

#### API Endpoints

**Health**
- `GET /api/healthy`: Liveness check, returns `{ status, uptime }`.

**Authentication** (`/api/login`):
- `POST`: Login with `{ name, password }`. `name` is checked against both username and email. Returns `{ id, isAdmin, exp }` and sets the `access_token` cookie.
- `GET`: Check current session. Returns the same payload or `false`.
- `DELETE`: Logout (clears the auth cookie).

**Users** (`/api/users`):
- `POST`: Register a new user (public). Body: `{ name, email, password, gender?, isAdmin? }`.
- `GET`: List all users (admin only).
- `GET /:id`: Get a single user (authenticated).
- `PUT /:id`: Update a user (self or admin only).
- `DELETE /:id`: Delete a user (self or admin only).

**Workspaces** (`/api/workspaces`, all routes require authentication and are scoped to `req.userID`):
- `GET`: List all workspaces for the authenticated user.
- `POST`: Create new workspace with `{ name?, description?, data? }`.
- `GET /:id`: Get workspace with full data.
- `PUT /:id`: Update workspace with `{ name?, description?, data? }`.
- `DELETE /:id`: Delete workspace.

#### Frontend API Integration

The frontend API client lives in `web-view/src/api/` and provides, among others:
- `loginAPI.ts`: `postLogin`, `getLogin`, `deleteLogin`
- `userAPI.ts`: user CRUD calls
- `workspaceApi.ts`: `getWorkspaces`, `getWorkspace(id)`, `createWorkspace(workspace)`, `updateWorkspace(id, updates)`, `deleteWorkspace(id)`

The `WorkspaceContext` automatically:
1. Loads workspaces from the backend on login
2. Syncs workspace data changes with debounced saves (2 seconds), sending only the changed `mappings`/`flowNodes`/`flowEdges` (ontology/dataset are cached client-side)
3. Falls back to local-only state (via `lib/workspaceLocalCache.ts`) when not logged in, or between reloads

#### Environment Configuration

**Backend** (`backend/.env`):
```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/rse
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_TTL=300
CORS_ORIGIN=http://localhost:5173
# COOKIE_SECURE=true
# PREFILL_USERS=true
```

**Frontend** (`web-view/.env`):
```env
VITE_USE_MOCK_DATA=false      # Set to false to use real backend
VITE_REAL_FETCH=true          # Set to true to enable API calls
VITE_APP_API_BASE_URL=http://localhost:4000
VITE_FRONTEND_BASE_URL=http://localhost:3000
```

## Styling

The application uses Tailwind CSS for styling, providing a consistent and responsive design across different screen sizes. Custom styles are defined in `web-view/src/index.css`.

## Development

### Prerequisites

- Node.js >= 20
- MongoDB (local or Docker)

### Running the Application

1. **Start MongoDB** (using Docker):
   ```bash
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

2. **Start the backend**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   Backend runs at `http://localhost:4000`

3. **Configure frontend** (`web-view/.env`):
   ```env
   VITE_USE_MOCK_DATA=false
   VITE_REAL_FETCH=true
   ```

4. **Start the frontend**:
   ```bash
   cd web-view
   npm install
   npm run dev
   ```
   Frontend runs at `http://localhost:5173`

### Development without Backend

To run without the backend (mock data mode), set in `web-view/.env`:
```env
VITE_USE_MOCK_DATA=true
VITE_REAL_FETCH=false
```

### Testing

**Frontend** (Vitest):
```bash
cd web-view
npm run test
```

**Backend** (Jest, against `mongodb-memory-server` — no real database needed):
```bash
cd backend
npm test
```

### Building for Production

**Frontend:**
```bash
cd web-view
npm run build
```

**Backend:**
```bash
cd backend
npm run build   # type-check only (tsc --noEmit); runtime uses tsx, no bundling step
npm start
```

### Docker

```bash
docker-compose up --build
```
Starts frontend (`:3000`), backend (`:4000`), and MongoDB (`:27017`) together. See `docker-compose.yml` for the exact environment passed to each service.
</content>
