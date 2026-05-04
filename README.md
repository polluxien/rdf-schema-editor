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

- **React + TypeScript** (Vite)
- ...

---

## Project Structure (*At the Moment*)
```
rdf-schema-editor/
├── public/
├── src/
│   ├── components/
│   │   └── Fallback/
│   │       ├── ErrorBoundary.tsx
│   │       └── ErrorFallback.tsx
|   |                              # to be created
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── docs/                          
│   └── user-manual.md             # to be created
├── Dockerfile                     
├── docker-compose.yml             
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
└── README.md
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

