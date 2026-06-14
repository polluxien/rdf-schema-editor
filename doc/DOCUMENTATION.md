# Documentation for the Expert Schema Editor UI

## Overview

This document provides an overview of the Expert Schema Editor UI, a web application for creating and managing RDF schemas as requested in the software engineering project and described (briefly) by the Lastenheft. The application is built using React, TypeScript, and Tailwind CSS and is based on the semantic functionality of [Karma](https://usc-isi-i2.github.io/karma/).
This documentation is meant to be a living document that will be updated as the project evolves and is divided into two major parts. (1) semantic and non-technical descriptions of the application and (2) technical documentation for developers.

## (1) Non-Technical Description

### Features

- Create and manage RDF schemas
- Import schemas from two sources: local files or the https://data.biodivportal.gfbio.org/ API
- Export schemas as model or as RDF.
- Visual representation of schema structure
- Interactive schema editor with drag-and-drop functionality
- User login and session management with JWT authentication
- Workspace persistence to MongoDB database

Note: functionality of this application, especially the export of models and rdf, goes hand-in-hand with WP8 and might therefore not be thoroughly documented here.

## (2) Technical Description

### Architecture

The application follows a component-based architecture with the following key components:

- **AppController**: Main application controller that manages the overall state and coordinates between different components.
- **WorkspaceProvider**: Manages the workspace state and provides context for workspace-related operations.
- **AppProvider**: Provides global application context and state management.
- **FileImportProvider**: Handles file import operations and provides context for file import functionality.
- **WorkspaceBar**: Displays the workspace bar with navigation and workspace management controls.
- **OntologyCanvas**: Renders the ontology canvas for visual schema representation.
- **DatasetTable**: Displays dataset information in a table format.

### API Integration

The application integrates with the backend API for various operations, including:

- User authentication and session management
- Retrieval of ontologies from the https://data.biodivportal.gfbio.org/ API

#### OWL API

The application uses an API to fetch OWL files from the https://data.biodivportal.gfbio.org/ API. The documentation of that API can be found at https://data.biodivportal.gfbio.org/documentation. To use ethe API the user of the app needs a valid API key, which can be obtained by creating an account at https://data.biodivportal.gfbio.org/.

As the documentation doesn't provide a clear and comprehensive overview of the API and neither explains the proper way to download an OWL file for a specific ontology, the implementation is based on trial and error and might not be the most efficient or correct way to do it.

The way we used is the following:
A list of all available ontologies can be retrieved by calling the `/ontologies` endpoint.
In our code, this is done in the `listAvailableOwlFiles` function in `src/backend/owlApi.ts`, which returns a list of tuples (name, acronym). This list can then be provided to the user in the frontend to select an ontology.

Given the acronym of the selected ontology, we can retrieve the OWL file by calling the `/ontologies/{acronym}/submissions?display=all` endpoint. This returns a list of objects, each containing the URL to the OWL file. The zeroth element of this list is the most recent version of the ontology. By using the `dataDump` property of this object, we can retrieve the URL to download the OWL file.

As this url doesn't always work, we provide a fallback which replaces the domain `192.168.56.10:8080` with `data.biodivportal.gfbio.org`. This approach is fairly hacky, but works. Therefore we use this approach as there wasn't a more elegant solution found.

In the header of the requests, we set the `Authorization` field to the API key of the user, by setting it precisely to: `Authorization: apikey token={apikey}`. This is indicated in the API documentation.

### State Management

The application uses React's Context API for state management, with the following key contexts:

- **LoginContext**: Manages user authentication state and provides login information.
- **WorkspaceContext**: Manages workspace state and provides context for workspace-related operations. Automatically syncs with the backend when the user is logged in (with 2-second debounce).
- **AppContext**: Provides global application context and state management.
- **FileImportContext**: Handles file import state and provides context for file import functionality.

### Backend Architecture

The backend is a **Next.js 14** API server using the App Router, with **MongoDB** and **Mongoose** for data persistence.

#### Backend Project Structure

```
backend/
├── package.json
├── .env.local              # Environment configuration
├── next.config.js          # CORS and Next.js configuration
├── tsconfig.json
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   └── api/
    │       ├── login/route.ts       # Authentication endpoints
    │       └── workspaces/
    │           ├── route.ts         # Workspace list/create
    │           └── [id]/route.ts    # Workspace CRUD by ID
    ├── lib/
    │   ├── mongodb.ts       # Database connection singleton
    │   └── auth.ts          # JWT token handling
    └── models/
        ├── User.ts          # User Mongoose schema
        └── Workspace.ts     # Workspace Mongoose schema
```

#### Database Models

**User Model** (`src/models/User.ts`):
- `name`: Unique username (string)
- `password`: Bcrypt-hashed password
- `role`: Either "a" (admin) or "u" (user)
- `apiKey`: Optional API key for external services
- `createdAt`, `updatedAt`: Timestamps

**Workspace Model** (`src/models/Workspace.ts`):
- `userId`: Reference to owning User
- `name`: Workspace name
- `description`: Optional description
- `data`: Embedded WorkspaceData object containing:
  - `ontology`: The loaded ontology (or null)
  - `dataset`: The loaded dataset (or null)
  - `mappings`: Array of column-to-class mappings
  - `flowNodes`: React Flow nodes for the canvas
  - `flowEdges`: React Flow edges for the canvas
- `createdAt`, `updatedAt`: Timestamps

#### Authentication

Authentication uses **JWT tokens** stored in HTTP-only cookies:
- Tokens are created using the `jose` library with HS256 algorithm
- Tokens expire after 7 days
- The `auth.ts` module provides helpers: `createToken`, `verifyToken`, `setAuthCookie`, `getAuthCookie`, `clearAuthCookie`, `getCurrentUser`

#### API Endpoints

**Authentication** (`/api/login`):
- `POST`: Login with `{ name, password }`. Auto-creates user if not exists. Returns `{ id, role, exp }`.
- `GET`: Check current session. Returns user info or `false`.
- `DELETE`: Logout (clears auth cookie).

**Workspaces** (`/api/workspaces`):
- `GET`: List all workspaces for authenticated user.
- `POST`: Create new workspace with `{ name, description, data }`.

**Workspace by ID** (`/api/workspaces/[id]`):
- `GET`: Get workspace with full data.
- `PUT`: Update workspace with `{ name?, description?, data? }`.
- `DELETE`: Delete workspace.

#### Frontend API Integration

The frontend API client is in `src/backend/workspaceApi.ts` and provides:
- `getWorkspaces()`: Fetch user's workspace list
- `getWorkspace(id)`: Fetch workspace with data
- `createWorkspace(workspace)`: Create new workspace
- `updateWorkspace(id, updates)`: Update workspace
- `deleteWorkspace(id)`: Delete workspace

The `WorkspaceContext` automatically:
1. Loads workspaces from backend on login
2. Syncs workspace data changes with debounced saves (2 seconds)
3. Falls back to local-only state when not logged in

#### Environment Configuration

**Backend** (`.env.local`):
```env
MONGODB_URI=mongodb://localhost:27017/rdf-schema-editor
JWT_SECRET=your-super-secret-jwt-key-change-in-production
FRONTEND_URL=http://localhost:5173
```

**Frontend** (`.env`):
```env
VITE_USE_MOCK_DATA=false      # Set to false to use real backend
VITE_REAL_FETCH=true          # Set to true to enable API calls
VITE_APP_API_BASE_URL=http://localhost:3001
```

## API Integration

The application integrates with the backend API for various operations, including:

- User authentication and session management
- Workspace persistence and synchronization
- Schema creation and management
- File import and export
- Data retrieval and manipulation

## Styling

The application uses Tailwind CSS for styling, providing a consistent and responsive design across different screen sizes. Custom styles are defined in the `src/index.css` file.

## Development

### Prerequisites

- Node.js >= 18
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
   Backend runs at `http://localhost:3001`

3. **Configure frontend** (`.env`):
   ```env
   VITE_USE_MOCK_DATA=false
   VITE_REAL_FETCH=true
   ```

4. **Start the frontend**:
   ```bash
   npm run dev
   ```
   Frontend runs at `http://localhost:5173`

### Development without Backend

To run without the backend (mock data mode), set in `.env`:
```env
VITE_USE_MOCK_DATA=true
VITE_REAL_FETCH=false
```

### Building for Production

**Frontend:**
```bash
npm run build
```

**Backend:**
```bash
cd backend
npm run build
npm run start
```