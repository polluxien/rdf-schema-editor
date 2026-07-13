# RDF Schema Editor

<div align="center">

![Status](https://img.shields.io/badge/Status-In%20Progress-blue)
![University](https://img.shields.io/badge/University-Freie%20Universit%C3%A4t%20Berlin-green)
![Requirement](https://img.shields.io/badge/Requirement-8%20Expert%20Schema%20Editor-purple)

</div>

> Requirement 8 — Expert Schema Editor User Interface

A browser-based tool that enables domain experts (biologists, data curators) to interactively design and export RDF transformation mapping schemas — no coding required. Exported schemas are consumed by the RDF Matching Service (Requirement 5). Based on [Karma](https://github.com/usc-isi-i2/Web-Karma).

---

## Features

- Load ontologies from a local OWL file or directly from the [BioDivPortal](https://data.biodivportal.gfbio.org/) API
- Import source data via CSV upload
- Map fields to ontology properties via an interactive drag & drop canvas ([React Flow](https://reactflow.dev/))
- Live RDF triple preview on sample data
- User accounts with login/registration, JWT-based sessions, and an admin user-management area
- Workspaces are persisted per user in MongoDB (auto-saved with debounce) and fall back to local-only state when logged out

---

## Tech Stack

**Frontend** (`web-view/`)
- React 19 + TypeScript, built with Vite
- React Context API for state (`AppContext`, `WorkspaceContext`, `LoginContext`)
- `@xyflow/react` (React Flow) for the ontology canvas
- Tailwind CSS
- Vitest for tests

**Backend** (`backend/`)
- Express 5 + TypeScript, run with `tsx`
- MongoDB via Mongoose
- JWT auth (`jsonwebtoken`) stored in an HTTP-only cookie, passwords hashed with `bcryptjs`
- Jest + `mongodb-memory-server` for tests

**Shared** (`sharedTypes/`) — TypeScript types shared between frontend and backend (`UserType`, `WorkspaceType`, `LoginType`, ...)

---

## Project Structure

```
├── web-view/                      # Frontend (React + Vite)
│   └── src/
│       ├── AppController.tsx      # Main app controller
│       ├── api/                   # Backend API clients (login, users, workspaces)
│       ├── components/
│       │   ├── CsvImportDialog/   # CSV import
│       │   ├── OwlImportDialog/   # OWL import (local file or BioDivPortal API)
│       │   ├── DatasetTable/      # Dataset table view
│       │   ├── OntologyCanvas/    # Visual ontology editor (nodes, edges)
│       │   ├── Workspace/         # Workspace management, tabs, save/import/export
│       │   ├── Profile/           # Login dialog, profile, API key & user settings
│       │   ├── Usermanagement/    # Admin user management UI
│       │   ├── routing/           # Route guards (e.g. ProtectedAdminRoute)
│       │   └── Fallback/          # Error boundaries
│       ├── context/                # Global app state (React Context)
│       ├── hooks/                  # Custom hooks
│       ├── lib/                    # CSV/OWL parsers, RDF vocabulary, local cache
│       ├── pages/                  # EditorPage, SettingsPage, admin pages
│       └── types/                  # Frontend-only TypeScript types
├── backend/                        # Backend (Express + MongoDB)
│   └── src/
│       ├── app.ts                  # Express app, middleware, routes
│       ├── index.ts                # Entry point (DB connect + listen)
│       ├── models/                 # Mongoose models (User, Workspace, WorkspaceDataset)
│       ├── routes/                 # login, users, workspaces, auth middleware
│       └── services/                # Business logic per route
├── sharedTypes/                    # Types shared by frontend and backend
├── doc/                             # Documentation
├── docker-compose.yml               # frontend + backend + mongodb
└── package.json                     # Root scripts (start/test both apps)
```

---

## Getting Started

### Local Development

Requires Node.js >= 20 and a running MongoDB instance.

```bash
git clone https://github.com/polluxien/rdf-schema-editor
cd rdf-schema-editor

# frontend + backend together
npm run start
```

Or run each side separately:

```bash
cd backend && npm install && npm run dev     # http://localhost:4000
cd web-view && npm install && npm run dev    # http://localhost:5173
```

See [`backend/README.md`](backend/README.md) for backend environment variables.

### Tests

```bash
npm run test:frontend
npm run test:backend
```

### Docker

```bash
docker-compose up --build
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- MongoDB: `localhost:27017`

---

## Deliverables (*Planned*)

- Source code (this repository)
- `Dockerfile` + `docker-compose.yml`
- `doc/DOCUMENTATION.md`
- Usability test results & expert feedback (documented in final report)
- UI design rationale (documented in final report)

---

## Contact

Naouel Karam — karam@infai.org
Jan Fillies — fillies@infai.org
</content>
