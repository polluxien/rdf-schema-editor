# RDF Schema Editor Backend

Next.js API backend with MongoDB for the RDF Schema Editor.

## Prerequisites

- Node.js >= 18
- MongoDB (local or remote)

## Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Configure environment variables in `.env.local`:
```env
MONGODB_URI=mongodb://localhost:27017/rdf-schema-editor
JWT_SECRET=your-super-secret-jwt-key-change-in-production
FRONTEND_URL=http://localhost:5173
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

The API runs at `http://localhost:3001`

## API Endpoints

### Authentication
- `POST /api/login` - Login (creates user if not exists)
- `GET /api/login` - Check session status
- `DELETE /api/login` - Logout

### Workspaces
- `GET /api/workspaces` - List user's workspaces
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces/:id` - Get workspace with data
- `PUT /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace

## Running with Frontend

1. Start MongoDB
2. Start backend: `cd backend && npm run dev`
3. Start frontend: `npm run dev` (from root)
4. Set `VITE_USE_MOCK_DATA=false` and `VITE_REAL_FETCH=true` in `.env` to use real backend
