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

- Load and browse target ontologies (Darwin Core, ABCD, etc.)
- Import source fields via CSV header upload or manual entry
- Map fields to ontology properties via drag & drop
- Define transformation rules (string normalisation, unit conversion, conditional mappings) through guided forms
- Live RDF triple preview on sample data
- Export finalised mapping as JSON-LD or Turtle (compatible with RDF Matching Service)

---

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **State Management**: React Context API (`AppContext`, `WorkspaceContext`, `LoginContext`)
- **Visualization**: React Flow (Canvas, Nodes, Edges)
- **Styling**: Tailwind CSS + CSS Modules
- **Testing**: ViTes/Jest + MockData (booting via Dev-Mode -> `.env-Variable`)

---

## Project Structure (*25.05.26*)
```
├── src/
│   ├── AppController.tsx          # Main app controller
│   ├── backend/                   # API & authentication
│   │   ├── api.ts                 
│   │   ├── fetchWithErrorHandling.tsx
│   │   └── LoginInfo.tsx
│   ├── components/
│   │   ├── CsvImportDialog/       # CSV import with drag & drop
│   │   ├── DatasetTable/          # Dataset table view
│   │   ├── OntologyCanvas/        # Visual ontology editor
│   │   │   ├── Nodes/             # Class & column nodes
│   │   │   ├── Relation/          # Edges & relationship
│   │   │   └── AddObjectDialog/   # Add objects to interactiv canvas
│   │   ├── Workspace/             # Workspace management & tabs
│   │   ├── Profile/               # Login & profile display
│   │   └── Fallback/              # Error boundaries
│   ├── context/                   # Global app state (React Context)
│   ├── hooks/                     # Custom hooks
│   ├── lib/                       # CSV & OWL parsers + tests
│   └── types/                     # TypeScript types
├── mockData/                      # Mock files for dev Mode (CSV, OWL)
├── docs/                          # Documentation... in the future
├── Dockerfile
├── docker-compose.yml
└── vite.config.ts
```

---

## Getting Started

### Local Development

Requires Node.js >= 20

```bash
git clone https://github.com/polluxien/rdf-schema-editor
cd rdf-schema-editor
npm install
npm run dev
```

App runs at `http://localhost:5173`

### Docker

```bash
docker-compose up --build
```

App runs at `http://localhost:3000`

---

## Deliverables (*Planned*)

- Source code (this repository)
- `Dockerfile` + `docker-compose.yml`
- `docs/user-manual.md`
- Usability test results & expert feedback (documented in final report)
- UI design rationale (documented in final report)

---

## Contact

Naouel Karam — karam@infai.org
Jan Fillies — fillies@infai.org

