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
- Export the loaded dataset + current RML mapping as materialized RDF (Turtle / N-Triples / JSON-LD) via the WP8 `rdf-transform` microservice

Note: functionality of this application, especially the export of models and rdf, goes hand-in-hand with WP8 and might therefore not be thoroughly documented here.

## (2) Technical Description

### Repository Layout

The project is a monorepo split into an independent frontend and backend:

```
├── web-view/        # React + Vite frontend
├── backend/         # Express + MongoDB backend
├── sharedTypes/      # TypeScript types shared by both sides
├── BiodivPipeline/  # Nested git repo (git sparse-checkout: only modules/local/rdf_transform/)
└── doc/              # This documentation
```

`BiodivPipeline/` is a separate git repository (`git@github.com:biodivportal/BiodivPipeline.git`, branch `wp8-rdf-transform`) checked out inside the project root. Git sparse-checkout is configured so only `modules/local/rdf_transform/` is present on disk. It is **not** tracked as a submodule — it is listed in the main repo's untracked files and must be excluded from `git add` manually. The `docker-compose.override.yml` mounts it read-only into the backend container.

### Application Entry Point

The application boots from `web-view/src/main.tsx`. It mounts `AppController` inside a `<StrictMode>` and `<BrowserRouter>` wrapper into the `#root` DOM element. The global stylesheet `index.css` (which imports Tailwind CSS and defines CSS custom properties for theming) is loaded at this point.

```tsx
// web-view/src/main.tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppController />
    </BrowserRouter>
  </StrictMode>,
)
```

### Architecture Overview

The application has many context providers. The component tree is structured as a series of nested providers, each owning a specific concern. 

```
AppController
├── LoginContext.Provider          — authentication state
│   └── WorkspaceProvider          — workspace CRUD + data store
│       └── AppProvider            — canvas/ontology/dataset/mapping state
│           └── ErrorBoundary
│               ├── HeaderComponent
│               └── Routes
│                   ├── / → EditorPage
│                   │   └── FileImportProvider
│                   │       ├── WorkspaceBar
│                   │       │   ├── WorkspaceTab[]
│                   │       │   └── WorkspaceImportExport
│                   │       ├── OntologyCanvas (React Flow)
│                   │       │   ├── OntologyClassNode[]
│                   │       │   ├── DatasetColumnNode[]
│                   │       │   ├── CustomEdge[]
│                   │       │   ├── DragAndDropZone (empty state)
│                   │       │   ├── OntologyAddObjectDialog
│                   │       │   ├── RelationshipDialog
│                   │       │   ├── ClassRelationshipDialog
│                   │       │   └── NodeContextMenu
│                   │       └── DatasetTable
│                   ├── /settings → SettingsPage
│                   └── /admin/users → ProtectedAdminRoute → UserManagementPage
```

### External API Integration

The frontend integrates with two external APIs:

- The backend API (below) for authentication, user management, and workspace persistence
- The https://data.biodivportal.gfbio.org/ API for retrieving ontologies

The application uses an API to fetch OWL files from the https://data.biodivportal.gfbio.org/ API. The documentation of that API can be found at https://data.biodivportal.gfbio.org/documentation. To use the API the user of the app needs a valid API key, which can be obtained by creating an account at https://data.biodivportal.gfbio.org/. The key is entered once in the app's API key settings (`components/Profile/ApiKeySettings.tsx`) and cached locally.

A list of all available ontologies can be retrieved by calling the `/ontologies` endpoint. In our code, this is done in the `listAvailableOwlFiles` function in `web-view/src/api/owlApi.ts`, which returns a list of tuples (name, acronym). This list can then be provided to the user in the frontend to select an ontology.

### Context Providers

#### 1. LoginContext (`web-view/src/api/LoginInfo.tsx`)

Holds the authentication state:

`loginInfo`:
- `undefined`: Session check in progress (loading)
- `false`: Not authenticated
- `LoginType` object: Authenticated — contains `{ id, isAdmin, exp }`
- `userInfo: UserType | undefined`: The full user profile (`name`, `email`, `gender`, `isAdmin`, `createdAt`).

The context is created in `LoginInfo.tsx` and consumed via the `useLoginContext()` hook. `AppController` populates it on mount by calling `getLogin()` with a 3-second abort timeout.

#### 2. WorkspaceContext (`web-view/src/components/Workspace/WorkspaceContext.tsx`)

Manages the multi-workspace state. Each workspace is a tab with its own isolated `WorkspaceData` (ontology, dataset, mappings, relations, flow nodes, flow edges, base IRI).

**State shape:**

```typescript
interface WorkspaceContextType {
  workspaces: Workspace[];              // list of { id, name, description }
  activeWorkspaceId: string | null;
  activeWorkspace: Workspace | null;
  getWorkspaceData: (id: string) => WorkspaceData;
  updateWorkspaceData: (id: string, updater: (prev: WorkspaceData) => WorkspaceData) => void;
  addWorkspace: (workspace: Workspace) => void;
  renameWorkspace: (id: string, name: string) => void;
  removeWorkspace: (id: string) => void;
  setActiveWorkspace: (id: string) => void;
  switches: Record<string, boolean>;    // generic toggle store
  toggleSwitch: (key: string) => void;
}
```

- On init, creates a default workspace with id `"1"` and name `"untitled-1"`.
- `workspaceData` is a `Record<string, WorkspaceData>` — each workspace's data is stored separately and lazily initialized with `EMPTY_WORKSPACE_DATA`.
- `removeWorkspace` refuses to delete the last remaining workspace.
- `updateWorkspaceData` uses an updater function pattern, allowing fine-grained immutable patches.
- Automatically syncs with the backend when the user is logged in (with 2-second debounce), and mirrors state to `localStorage` (`lib/workspaceLocalCache.ts`) so an open workspace survives a page reload even without a backend round-trip.

#### 3. AppContext (`web-view/src/context/AppContext.tsx` + `AppContextType.ts`)

The central canvas state provider. It bridges the active workspace's `WorkspaceData` to the rest of the UI by exposing typed setter functions.


- `activeWorkspaceId` (`string \| null`): Forwarded from WorkspaceContext
- `ontology` (`Ontology \| null`): Loaded ontology with classes and properties
- `setOntology` (`(Ontology \| null) => void`): Replaces ontology; clears mappings and removes class nodes/edges
- `dataset` (`Dataset \| null`): Loaded CSV dataset with columns and rows
- `setDataset` (`(Dataset \| null) => void`): Replaces dataset; clears mappings and removes column nodes/edges
- `mappings` (`Mapping[]`): Column → class edges (each has optional `propertyId`)
- `addMapping` (`(Mapping) => void`): Appends a mapping
- `updateMappingProperty` (`(id, propertyId?) => void`): Sets/unsets the property on a mapping
- `removeMapping` (`(id) => void`): Removes a single mapping
- `removeMappingsForNode` (`(nodeId) => void`): Removes all mappings/relations touching a node
- `clearMappings` (`() => void`): Removes all mappings
- `relations` (`ClassRelation[]`): Class → class edges (object-property links)
- `addRelation` (`() => void`): Same CRUD pattern as mappings
- `updateRelationProperty` (`() => void`): Same CRUD pattern as mappings
- `removeRelation` (`() => void`): Same CRUD pattern as mappings
- `baseIri` (`string`): Base IRI for subject templates (default: `http://example.org`)
- `setBaseIri` (`(string) => void`): Updates base IRI
- `flowNodes` (`Node[]`): React Flow nodes
- `setFlowNodes` (`Dispatch<SetStateAction<Node[]>>`): Supports both direct values and updater functions
- `flowEdges` (`Edge[]`): React Flow edges
- `setFlowEdges` (`Dispatch<SetStateAction<Edge[]>>`): Same pattern
- `focusedColumnId` (`string \| null`): Column ID to scroll to in DatasetTable
- `setFocusedColumnId` (`(string \| null) => void`): Triggers DatasetTable scroll + highlight
- `colorMode` (`ColorMode`): `"light" \| "dark" \| "system"`
- `setColorMode` (`(ColorMode) => void`): Persists to localStorage and applies theme

**The `patch` pattern:** All state mutations go through a single `patch()` callback that calls `updateWorkspaceData(activeWorkspaceId, ...)` with a shallow merge. This ensures every change is routed through the WorkspaceContext's immutable update path.

**Side effects on `setOntology`/`setDataset`:** When replacing the ontology, all existing class nodes (`id.startsWith("class-")`) and their connected edges are removed from the canvas, and all mappings are cleared. The same happens for column nodes when replacing the dataset. This prevents stale references to classes/columns that no longer exist.

**Mock data loading:** When `VITE_USE_MOCK_DATA === "true"`, the `AppProvider` loads mock CSV and OWL data on first render via `loadMockData()` from `web-view/src/lib/useMock.ts`. A `useRef` guard ensures this only happens once. This was used mainly for testing purposes when the App wasn't fully matured yet. Now this is probably not needed but can might be used time to quickly test the app.

**Color mode:** The provider manages a three-way color mode (`light`, `dark`, `system`). It resolves `system` by checking `window.matchMedia("(prefers-color-scheme: dark)")` and applies the result by setting `document.documentElement.dataset.theme`, `dataset.resolvedTheme`, toggling the `dark` class, and setting `colorScheme`. When mode is `system`, a media query listener is attached to react to OS-level theme changes. The mode is persisted to `localStorage` under the key `"colorMode"`.

#### 4. FileImportContext (`web-view/src/components/FileImport/FileImportContext.tsx`)

Handles all file import operations (CSV and OWL/RDF/XML) with conflict resolution and loading overlays.

**Exposed API:**

```typescript
interface FileImportContextType {
  importFiles: (files: File[] | FileList) => void;
  importOntologyFromContent: (content: string, name: string) => void;
}
```

**File type detection:** `getFileKind()` maps extensions: `.csv` → `"csv"`, `.owl`/`.rdf`/`.xml` → `"ontology"`. Unknown types are silently skipped.

**Conflict resolution:** When a file would replace an already-loaded ontology or dataset, a modal dialog offers three choices:
1. **Cancel** — abort the import
2. **New workspace** — create a fresh workspace and load the file there
3. **Replace** — overwrite the current ontology/dataset

**CSV import flow:** CSV files are not imported immediately. Instead, a `CsvImportDialog` is shown (see below) where the user configures delimiter, charset, header row, quote character, and an option to choose the max rows to read. Only after confirmation is the file read and parsed via `parseCsvTextToDataset()`.

**OWL import flow:** OWL files are read as text and parsed via `parseOwlToOntology()`. The `importOntologyFromContent` variant accepts raw string content (used by the BioDivPortal API import path).
Currently, there is a minor bug/uncertainty, that (probably) rises up whenever "bigger" ontologies are parsed. The parsing process takes a long time and is stuck in "Importing ontology...", after a couple of minutes, the notification to replace the existing ontology pops up. Our current most reasonable guess is that the download fails (as in is extremely slow) because of the size of the ontology and the related parsing process. We will dedicate further investigation to this issue in the next 2 weeks.

**Loading overlay:** During parsing, a full-screen `LoadingComponent` overlay is shown with a label like "Importing ontology..." or "Importing CSV...".

### Pages

#### EditorPage (`web-view/src/pages/EditorPage.tsx`)

The main editor view. Composes the three primary UI regions in a vertical flexbox:

1. **WorkspaceBar** — workspace tabs + import/export controls
2. **OntologyCanvas** — the React Flow canvas (flex-1, fills remaining space)
3. **DatasetTable** — collapsible data table at the bottom

The entire page is wrapped in `FileImportProvider` so that drag-and-drop and file selection are available throughout the editor.

#### SettingsPage (`web-view/src/pages/SettingsPage.tsx`)

A settings page with a sidebar navigation and three sections:

- **Account** — displays the current user's profile (avatar initials, name, email, role badge, gender, account creation date). Uses `useCurrentUser()` hook to fetch the profile.
- **API Key** — embeds `ApiKeySettings` for managing the BioPortal API key.
- **Appearance** — light/dark theme toggle buttons.

The page has its own local `useTheme()` hook that duplicates some of the `AppContext` color mode logic (direct DOM manipulation via `classList.toggle("dark")`). A "Back to Editor" link navigates to `/`.

#### UserManagementPage (`web-view/src/pages/admin/UserManagementPage.tsx`)

Admin-only page for managing users. Allows viewing, editing, and deleting users via the `userAPI.ts` client (`getAllUsers`, `updateUser`, `deleteUser`).

### Components — Detailed Reference

#### HeaderComponent (`web-view/src/components/HeaderComponent.tsx`)

A thin top bar (height ~28px) that displays the application name "rdf-schema-editor" (clickable, navigates to `/`) and the `ProfileAvatarButton` component. The color mode toggle is commented out here — theme switching is done via the Settings page instead.

#### ProfileAvatarButton (`web-view/src/components/Profile/ProfileAvaterButComp.tsx`)

A circular avatar button in the header that serves as the authentication entry point:

- **When logged out:** Opens the `LoginDialog` on click.
- **When logged in:** Shows a dropdown menu with:
  - User name and email
  - **Admin** link (only if `loginInfo.isAdmin`) → navigates to `/admin/users`
  - **Settings** link → navigates to `/settings`
  - **Sign out** → calls `deleteLogin()` API, sets `loginInfo` to `false`

The avatar displays the first two letters of the user's name in uppercase.

#### LoginDialog (`web-view/src/components/Profile/LoginDialogCom.tsx`)

A modal login form with username and password fields. Key behaviours:

- **`required` prop:** When `true` (used by `AppController` for unauthenticated users), the dialog cannot be dismissed by clicking outside and has no close button.
- **Submit:** Calls `postLogin(name, password)`, which returns `[LoginType, UserType]`. On success, updates `LoginContext` and closes. On failure, displays the error message inline.
- **Loading state:** Shows a `LoadingComponent` overlay with "Signing in..." during submission.
- **Mock mode:** When `VITE_REAL_FETCH !== "true"`, the credentials `max`/`123` produce a mock admin user.

#### WorkspaceBar (`web-view/src/components/Workspace/WorkspaceBar.tsx`)

A horizontal tab bar for workspace management:

- Renders one `WorkspaceTab` per workspace.
- A `+` button creates a new workspace with an auto-incremented name (`untitled-1`, `untitled-2`, ...).
- Below the tabs, `WorkspaceImportExport` provides import/export controls.
- The tab bar is horizontally scrollable (`overflow-x-auto`).

#### WorkspaceTab (`web-view/src/components/Workspace/WorkspaceTab.tsx`)

An individual workspace tab with inline rename support:

- **Click:** Selects the workspace (makes it active).
- **Double-click:** Enters rename mode — shows a text input pre-filled with the current name. Enter commits, Escape cancels.
- **Close button (×):** Appears on hover. Calls `onDelete`. Only shown when `canDelete` is true (i.e., more than one workspace exists).
- Active tab is visually distinguished by background color and a bottom border.

#### WorkspaceImportExport (`web-view/src/components/Workspace/WorkspaceImportExport.tsx`)

A toolbar below the workspace tabs with import, export, and base IRI controls:

- **Import CSV:** Triggers a hidden `<input type="file" accept=".csv">`. The selected file is passed to `importFiles()`.
- **Import OWL:** Opens the `OwlImportDialog` (which itself supports file or API import).
- **Export (yarr)rml:** Opens the `RmlExportDialog`. The label "*(yarr)rml*" was chosen because the import handles both yarrrml and rml. If the label seems unreasonable or confusing, it can be fixed in the support weeks.
- **Export rdf:** Opens the `RdfExportDialog`. Triggers the full WP8 pipeline: git pull → Docker build/start → POST `/transform` → browser download.
- **Base IRI:** A text input bound to `baseIri` from `AppContext`. Defaults to `http://example.org`. This value is used by the export pipeline to construct subject IRI templates.

#### OntologyCanvas (`web-view/src/components/OntologyCanvas/OntologyCanvas.tsx`)

The central visual editor, built on **React Flow** (`@xyflow/react` v12). This is the most complex component in the application (509 lines). With reactflow, we were able to rely on an external library in designing the main visual/graphical interface of the application. Reactflow provides the main functionalities out of the box (bubbles, connections, drag and drop, panning, etc...), which allowed us to focus on the actual logic of the application. What react flow doesn't cover are any sort of alignment logic. I.e. "given a graphical representation, normalize all the distances between bubbles", "don't make bubbles overlap" etc... This functionality can be implemented in some sort of update but isn't hindering in any way to the main functionality of the application.

**React Flow configuration:**

| Setting | Value | Purpose |
|---|---|---|
| `nodeTypes` | `{ ontologyClass: OntologyClassNode, datasetColumn: DatasetColumnNode }` | Custom node renderers |
| `edgeTypes` | `{ custom: CustomEdge }` | Custom edge with edit button + label |
| `defaultEdgeOptions.type` | `"custom"` | All edges use the custom renderer |
| `colorMode` | From `AppContext` | Propagates light/dark to React Flow internals |
| `fitView` | `true` | Auto-fit canvas to content on mount |
| `attributionPosition` | `"bottom-right"` | React Flow license attribution |

**Node ID conventions:**
- Class nodes: `class-{ontologyClassId}`
- Column nodes: `column-{datasetColumnId}`

These prefixes are used throughout the codebase to distinguish edge types and route logic.

**Connection validation (`isValidConnection`):**
Only two connection types are allowed:
1. **Class → Column** (source starts with `class-`, target starts with `column-`) — creates a `Mapping`
2. **Class → Class** (both start with `class-`) — creates a `ClassRelation`

All other connection directions (e.g., column → class, column → column) are rejected.

**`onConnect` handler:**
When a valid connection is made:
1. A UUID is generated as the edge ID.
2. A new edge of type `"custom"` is added to the canvas.
3. If class → column: a `Mapping` is added to `AppContext` (`{ id, sourceId, targetId }`).
4. If class → class: a `ClassRelation` is added (`{ id, sourceClassId, targetClassId }`).
5. The `RelationshipDialog` (or `ClassRelationshipDialog`) is immediately opened for the new edge so the user can select a property.

**Edge decoration (`useMemo` on `flowEdges`):**
Each edge is enriched before being passed to React Flow:
- The `propertyId` is looked up from either `mappings` or `relations` (depending on edge type).
- If a property is found, its label is resolved from `ontology.properties`, `STANDARD_PROPERTIES`, or `ontology.classes[].properties`.
- Edges without a property are `animated: true` (dashed animation) to signal incompleteness.
- The property label (short name after `#` or `/`) is set as `edge.data.label`.

**Context menu (`onNodeContextMenu`):**
Right-clicking a node opens a `NodeContextMenu` at the cursor position. The menu offers:
- **Column nodes:** "Jump to Column in Dataset" (sets `focusedColumnId`, expanding and scrolling the DatasetTable) + "Delete". This is the closest we got to karmas old functionality where the dataset column nodes are the same as the dataset column itself.
- **Class nodes:** "Delete" only

**Node deletion (`deleteNode`):**
Removes the node from `flowNodes`, removes connected edges from `flowEdges`, and calls `removeMappingsForNode` to clean up all associated mappings and relations.

**Drag-and-drop:**
The canvas root has `onDragEnter`/`onDragLeave`/`onDrop` handlers that track a `dragCounter` (to handle nested drag events). When dragging files over the canvas, the `DragAndDropZone` overlay is shown. On drop, the files are passed to `importFiles()`.

**Canvas panels (React Flow `<Panel>` components):**

| Position | Content | Condition |
|---|---|---|
| Top-right | "Add Object" button → opens `OntologyAddObjectDialog` | Content loaded and not dragging |
| Top-left | Legend (dataset columns in blue, ontology classes in purple) | Content loaded |
| Top-center | `DragAndDropZone` | No content or dragging files |
| Bottom-left | `Controls` (zoom, fit, minimap toggle) | Content loaded and not dragging |
| Bottom-left | `MiniMap` (toggleable) | `showBigMap` is true |

**Edge edit mechanism:**
The `EdgeEditProvider` wraps the React Flow instance and provides an `onEdit(edgeId)` callback. The `CustomEdge` component calls this when its diamond-shaped edit button is clicked. The canvas's `handleEdgeClick` then opens the appropriate dialog.

**Dialogs managed by OntologyCanvas:**
- `OntologyAddObjectDialog` — for adding nodes to the canvas
- `RelationshipDialog` — for class → column edges (property selection)
- `ClassRelationshipDialog` — for class → class edges (object property selection)
- `NodeContextMenu` — right-click menu

**Debug overlay:** A small panel at the bottom-center of the canvas shows the `propertyId` of each mapping. This is always rendered (not behind a flag) and appears to be a leftover debugging aid.

#### OntologyClassNode (`web-view/src/components/OntologyCanvas/Nodes/OntologyClassNode.tsx`)

A memoized custom React Flow node representing an ontology class. Renders:
- A purple-themed card (`bg-purple-50` / `dark:bg-purple-900`) with a 2px purple border
- The class label in bold
- The class URI in smaller text (truncated, with `title` tooltip for full URI)
- Left handle (target) and right handle (source) for connections

Data shape: `{ label: string, uri: string }`

#### DatasetColumnNode (`web-view/src/components/OntologyCanvas/Nodes/DatasetColumnNode.tsx`)

A memoized custom React Flow node representing a dataset column. Renders:
- A blue-themed card (`bg-blue-50` / `dark:bg-blue-900`) with a 2px blue border
- The column name in bold
- Up to 2 sample values prefixed with "e.g.,"
- Left handle (target) only — columns are connection targets, not sources

Data shape: `{ label: string, sampleValues: string[] }`

#### NodeContextMenu (`web-view/src/components/OntologyCanvas/Nodes/NodeContextMenu.tsx`)

A fixed-position context menu rendered at the cursor's coordinates. The available actions depend on the node type:
- **Class nodes:** `["Delete"]`
- **Column nodes:** `["Jump to Column in Dataset", "Delete"]`

Styled as a white/dark dropdown with hover transitions.

#### CustomEdge (`web-view/src/components/OntologyCanvas/Relation/CustomEdge.tsx`)

A custom React Flow edge component. Renders:
1. A `<BaseEdge>` with an orange stroke (`#FFA500`, width 2.5) and 20px interaction width.
2. An edge label (if a property is selected) displayed as an orange badge above the edge midpoint. The label is the short name of the property URI (after `#` or `/`).
3. A diamond-shaped (45°-rotated) edit button at the edge midpoint. Clicking it calls `onEdit(edgeId)` via the `EdgeEditContext`, which opens the relationship dialog.

The edge path is computed using `getBezierPath` from React Flow.

#### EdgeEditContext (`web-view/src/components/OntologyCanvas/Relation/EdgeEditContext.tsx`)

A minimal context that provides a single `(edgeId: string) => void` callback. Created by `OntologyCanvas` via `EdgeEditProvider` and consumed by `CustomEdge` via `useEdgeEdit()`.

#### RelationshipDialog (`web-view/src/components/OntologyCanvas/Relation/RelationshipDialog.tsx`)

A modal dialog for configuring a **class → column** mapping (i.e., assigning an ontology property to a column-to-class edge).

**Layout:**
- Header: "Relationship" with close button
- Info bar: shows the source class (purple) and target column (blue)
- Info banner: explains that selecting the `uri` property makes the column the subject IRI; any other property maps it to a value
- Selected property card (if any)
- Search input with icon
- Scrollable property list (max 320px height)

**Property collection (`getAvailableProperties`):**
1. Starts from the source class's own properties.
2. Recursively walks up the class hierarchy via `subClassOfUris` to collect inherited properties.
3. Adds `STANDARD_PROPERTIES` from `rdfVocabulary.ts` (rdf:type, rdf:value, rdfs:label, rdfs:comment, rdfs:subClassOf, owl:sameAs).
4. Deduplicates by property ID.
5. Sorts alphabetically by label (or short URI name). *We considered sorting differently, for instance class vs. standard properties separately. If this fix is desired we could quickly implement it.*

**Property filtering:** The search query matches against `label`, `uri`, `comment`, `type`, `domainUris`, and `rangeUris` (case-insensitive substring match).

**Property selection:** Each property button shows the label, full URI, type badge (Datatype / Annotation / Object), and domain/range chips. Clicking calls `handlePropertySelect(propertyId)` which:
- If no mapping exists for this edge, creates one first
- Calls `updateMappingProperty(mappingId, propertyId)`

**Footer actions:**
- **Clear:** Removes the property assignment (`updateMappingProperty(id, undefined)`)
- **Break Link:** Deletes the edge and the mapping, then closes the dialog
- **Done:** Closes the dialog

#### ClassRelationshipDialog (`web-view/src/components/OntologyCanvas/Relation/ClassRelationshipDialog.tsx`)

A modal dialog for configuring a **class → class** relation (i.e., assigning an object property to a class-to-class edge). Similar structure to `RelationshipDialog` but:

- **Property collection (`getObjectProperties`):** Only collects properties of type `"object"` (not datatype or annotation). Also walks the class hierarchy. Standard properties are filtered to `type === "object"` only.
- **Sorting:** Properties whose `rangeUris` or `rangeUri` match the target class URI are sorted first, then alphabetically.
- **No `uri` property hint:** The info banner about subject IRI is not shown (irrelevant for class-to-class links).
- **Actions:** Clear, Break Link, Done — same as `RelationshipDialog`.

#### OntologyAddObjectDialog (`web-view/src/components/OntologyCanvas/AddObjectDialog/OntologyAddObjectDialog.tsx`)

A floating panel (top-right of canvas) for adding ontology classes or dataset columns as nodes to the canvas.

**Features:**
- **Segmented toggle** (`SegmentedToggle`): switches between "Dataset" (column) and "Ontology" (class) view modes.
- **Search:** filters items by label/name (case-insensitive substring).
- **Sort menu:** a dropdown with four sort options:
  - `BY_POSITION_START` — original order
  - `BY_POSITION_END` — reversed original order
  - `BY_NAME_ABC` — alphabetical
  - `BY_NAME_CBA` — reverse alphabetical
- **Item list:** scrollable (max 240px). Each item is a button that calls `handleAddObject(type, item)`.

**`handleAddObject`:** Creates a React Flow node:
- For columns: `{ id: "column-{id}", type: "datasetColumn", data: { label, sampleValues, columnData } }`
- For classes: `{ id: "class-{id}", type: "ontologyClass", data: { label, uri, classData } }`

All new nodes are placed at a fixed position `{ x: 50, y: 80 }` (TODO: dynamic positioning. This, as mentioned above, is not handled by ReactFlow but has to be implemented separately).

#### SegmentedToggle (`web-view/src/components/OntologyCanvas/AddObjectDialog/ToggleComponent.tsx`)

A pill-shaped toggle for switching between "Dataset" and "Ontology" modes. Uses CSS custom properties (`--toggle-bg`, `--toggle-active-bg`, `--toggle-active-text`, `--toggle-text`) defined in `index.css` for theming.

#### DragAndDropZone (`web-view/src/components/CsvImportDialog/DragAndDropZone.tsx`)

An empty-state overlay shown on the canvas when no ontology or dataset is loaded (or when files are being dragged over the canvas). Features:
- A large dashed-border drop area with an upload icon
- "Select File" button — triggers a hidden file input (`accept=".csv,.owl,.rdf,.xml"`)
- "Import from API" button — opens the `OwlImportDialog`
- Supported formats badges: OWL, CSV, RDF, Turtle
- Drag-and-drop: files dropped on the zone are passed to `importFiles()`

#### CsvImportDialog (`web-view/src/components/CsvImportDialog/CsvImportDialog.tsx`)

A full modal dialog for configuring CSV import options.

**Options:**
- **Delimiter:** Comma, Semicolon, Tab, Pipe, Space (dropdown)
- **Has header:** Checkbox (default: true). When unchecked, a "Start from row" number input appears.
- **Advanced settings (accordion):**
  - **Character Set:** UTF-8, ISO-8859-1, Windows-1252, ASCII
  - **Quote Character:** Double quote, Single quote, None

**Live preview:** The dialog reads the first 8KB of the file and renders a live preview table (5 rows) that updates as the user changes delimiter, quote char, or header settings. The preview parsing is done client-side by the `parsePreview()` function.

**Confirmation:** On "Import", calls `onConfirm({ delimiter, charset, hasHeader, quoteChar })`. The actual file reading and parsing is handled by `FileImportContext`.

#### OwlImportDialog (`web-view/src/components/OwlImportDialog/OwlImportDialog.tsx`)

A modal dialog for importing OWL ontologies from two sources.

**Mode tabs:**
1. **From File:** Shows a file picker button that triggers `onImportFromFile()`.
2. **From BioPortal:** Provides an API key input and a "Fetch" button that calls `listAvailableOwlFiles()`. The returned ontologies are listed with search filtering. Selecting one and clicking "Import" calls `downloadOwlFile()` and passes the content to `onImportFromContent()`.

**API key:** Pre-filled from `getStoredApiKey()` (localStorage). *This might be subject to change once a more sophsticated persistence layer is implemented. As of right now, we believe that this is the most reasonable way to handle this.* The key is not persisted from this dialog — that's done in Settings → API Key.

**States:** Loading list, downloading, error messages (displayed in a red banner).

#### RdfExportDialog (`web-view/src/components/RdfExportDialog/RdfExportDialog.tsx`)

A modal dialog for exporting the current canvas state as materialized **RDF** (not just the mapping) using the WP8 `rdf-transform` FastAPI microservice.

**Controls:**
- **Output format** selector: `turtle` (`.ttl`), `ntriples` (`.nt`), `jsonld` (`.jsonld`)

**Export flow:**
1. Lazily imports `buildMappingExport` to produce the RML/Turtle string from the canvas state.
2. Serializes the loaded `Dataset` back to CSV (header row + data rows, with RFC-4180 quoting).
3. `POST /api/export/rdf` with `{ rml, csv, outputFormat }` as JSON.
4. The backend handles git pull, Docker container lifecycle, and the `/transform` call; streams the RDF bytes back.
5. Browser downloads the result as `output.ttl` / `output.nt` / `output.jsonld`.

**States:** idle → loading (shows current phase text) → done (download triggered) / error (inline error message).

**Prerequisite:** A CSV dataset must be loaded; the button is disabled and a warning banner is shown otherwise. The first export can take ~30 seconds (Docker image build); subsequent exports reuse the running container.

---

#### RmlExportDialog (`web-view/src/components/RmlExportDialog/RmlExportDialog.tsx`)

A modal dialog for exporting the current canvas state to RML.

**Tabs:**
- **YARRRML** — intermediate YAML format (`.yarrrml.yml`)
- **RML / Turtle** — final deliverable (`.rml.ttl`)

**Pipeline:** On dialog open, dynamically imports `buildMappingExport` from `web-view/src/lib/exportMapping.ts` (code-split to keep the YARRRML parser out of the initial bundle). Passes the full canvas state (`ontology, dataset, mappings, relations, flowNodes, baseIri`) and receives `{ yarrrml, rml, warnings }`.

**Warnings:** Displayed as a yellow alert banner with a list of issues (e.g., "class has no uri property", "mapping has no property selected").

**Actions:**
- **Copy:** Copies the current tab's content to clipboard. Shows a checkmark for 2 seconds.
- **Download:** Creates a Blob and triggers a download with the appropriate filename and MIME type.
- **Close:** Closes the dialog.

#### DatasetTable (`web-view/src/components/DatasetTable/DatasetTable.tsx`)

A collapsible table panel at the bottom of the editor showing the loaded dataset.

**Behaviour:**
- **Collapsed state:** Shows a header bar with the dataset name, column count, row count, and a chevron icon.
- **Expanded state:** Shows a scrollable table (max 300px height) with:
  - Row numbers in the first column
  - Column headers (clickable — sets `focusedColumnId` to highlight/scroll)
  - Cell values (truncated to 200px, with `title` tooltip)
  - "Show more" / "Show less" buttons for pagination (5 rows at a time, incrementing by 10)

**Column focus interaction:** When `focusedColumnId` is set (e.g., from the canvas context menu "Jump to Column in Dataset"):
1. The table auto-expands.
2. On the next animation frame, the column header is scrolled into view (`scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })`).
3. The column is highlighted with a blue background for 2 seconds.
4. `focusedColumnId` is then cleared.

**Clicking a column header** toggles the focus state — clicking the same highlighted column clears the highlight.

#### ApiKeySettings (`web-view/src/components/Profile/ApiKeySettings.tsx`)

A settings panel for managing the BioPortal API key. Uses the `useApiKey()` hook.

**Features:**
- Password-style input with show/hide toggle (eye icon)
- "Save" button — stores the key in localStorage as base64 (obfuscation, not encryption)
- "Clear" button — removes the key from localStorage and the input
- "API key is saved" confirmation indicator (green checkmark)
- Link to `biodivportal.gfbio.org/account` for obtaining an API key

#### ErrorFallback (`web-view/src/components/Fallback/ErrorFallback.tsx`)

A crash recovery UI shown when the React Error Boundary catches an unhandled exception. Displays:
- Error type (constructor name)
- Error message
- Collapsible stack trace
- "Reload Page" button

#### LoadingComponent (`web-view/src/components/UI-NoPurpose/LoadingComp.tsx`)

A simple spinner with a label. Uses an SVG-based spinning circle animation. The label defaults to "Loading...". Used in:
- `AppController` session check overlay
- `LoginDialog` submission overlay
- `FileImportContext` import progress overlay
- `ProtectedAdminRoute` permission check

#### ColorModeToggle (`web-view/src/components/UI-NoPurpose/ColorModeToggle.tsx`)

A small circular toggle for switching between light and dark mode. Currently commented out in `HeaderComponent` (theme switching is done via Settings page instead). Contains two UI variants — a simple toggle (active) and a hover-expand multi-option picker (disabled).

### Hooks

#### `useAppContext()` (`web-view/src/hooks/useAppContext.ts`)

Standard context consumer for `AppContext`. Throws if used outside `AppProvider`.

#### `useWorkspace()` (`web-view/src/hooks/useWorkspace.ts`)

Standard context consumer for `WorkspaceContext`. Throws if used outside `WorkspaceProvider`.

#### `useApiKey()` (`web-view/src/hooks/useApiKey.ts`)

Manages the BioPortal API key in localStorage (key: `"bioportal_api_key"`). The key is stored as base64-encoded text (basic obfuscation). Returns `{ apiKey, setApiKey, clearApiKey, hasApiKey }`. Also exports a standalone `getStoredApiKey()` function for use outside React components (used by `OwlImportDialog`).

#### `useCurrentUser()` (`web-view/src/hooks/useCurrentUser.ts`)

Fetches the current user's profile via `getUser(loginInfo.id)` whenever `loginInfo` changes. Returns `{ user: UserType | null, loading: boolean }`. Cancels pending requests on cleanup.

### API Layer

All API functions live in `web-view/src/api/` and use `fetchWithErrorHandling()` as the base fetch wrapper.

#### `fetchWithErrorHandling()` (`web-view/src/api/fetchWithErrorHandling.tsx`)

A wrapper around `fetch()` that inspects the response content type on non-OK responses and throws typed errors:
- **JSON with `errors` array:** Throws `ErrorFromValidation` (express-validator format)
- **HTML response:** Throws `ErrorWithHTML` (extracts `<body>` content, includes `dangerouslySetInnerHTML` — noted as intentionally unsafe for development)
- **Plain text:** Throws `Error` with status and text

#### `loginAPI.ts`

| Function | Method | Endpoint | Purpose |
|---|---|---|---|
| `postLogin(name, password)` | POST | `/api/login` | Authenticate, returns `[LoginType, UserType]` |
| `getLogin(signal?)` | GET | `/api/login` | Check session, returns `[LoginType, UserType] \| false` |
| `deleteLogin()` | DELETE | `/api/login` | Logout (clears auth cookie) |

Mock mode (`VITE_REAL_FETCH !== "true"`): `max`/`123` returns a mock admin. `getLogin` returns `false`. `deleteLogin` is a no-op.

#### `userAPI.ts`

| Function | Method | Endpoint | Purpose |
|---|---|---|---|
| `getAllUsers()` | GET | `/api/users` | List all users (admin) |
| `getUser(id)` | GET | `/api/users/{id}` | Get single user profile |
| `updateUser(id, data)` | PUT | `/api/users/{id}` | Update user (name, email, isAdmin) |
| `deleteUser(id)` | DELETE | `/api/users/{id}` | Delete user |

Mock mode returns hardcoded user fixtures.

#### `workspaceApi.ts`

| Function | Method | Endpoint | Purpose |
|---|---|---|---|
| `getWorkspaces()` | GET | `/api/workspaces` | List user's workspaces |
| `getWorkspace(id)` | GET | `/api/workspaces/{id}` | Get workspace with full data |
| `createWorkspace(ws)` | POST | `/api/workspaces` | Create new workspace |
| `updateWorkspace(id, updates)` | PUT | `/api/workspaces/{id}` | Update workspace |
| `deleteWorkspace(id)` | DELETE | `/api/workspaces/{id}` | Delete workspace |

Mock mode (`VITE_USE_MOCK_DATA && !VITE_REAL_FETCH`): returns empty lists / no-ops.

#### `owlApi.ts`

| Function | Purpose |
|---|---|
| `listAvailableOwlFiles(config)` | GET `/ontologies` — returns `[name, acronym][]` |
| `downloadOwlFile(acronym, config)` | GET `/ontologies/{acronym}/submissions?display=all`, then fetches the `dataDump` URL from the first submission entry |
| `validateOwlContent(content, contentType)` | Stub — throws "Not implemented" |

**Authentication header:** `Authorization: apikey token={apiKey}`

**Fallback URL rewriting:** If the `dataDump` URL (which sometimes points to `192.168.56.10:8080`) fails, the domain is replaced with `data.biodivportal.gfbio.org` and retried.

### Type System

#### Core domain types (`web-view/src/types/index.ts`)

```
Ontology
├── id: string
├── name: string
├── uri: string
├── classes: OntologyClass[]
│   ├── id, uri, label
│   ├── subClassOfUris: string[]
│   └── properties: OntologyProperty[]
└── properties: OntologyProperty[]
    ├── id, uri, label?, type, comment?
    ├── domainUri? / domainUris?
    ├── rangeUri? / rangeUris?
    ├── subPropertyOfUris?, inverseOfUri?
    ├── characteristics?, datatype?
    └── type: "object" | "datatype" | "annotation"

Dataset
├── id, name
├── columns: DatasetColumn[]
│   ├── id, name
│   └── sampleValues: string[]
└── rows: string[][]

Mapping
├── id, sourceId (class), targetId (column)
└── propertyId?: string

ClassRelation
├── id, sourceClassId, targetClassId
└── propertyId?: string

ClassSubject
├── mode: "template" | "column" | "blankNode"
├── template?: string
└── column?: string
```

#### Workspace types (`web-view/src/types/workspace.ts`)

```
Workspace: { id, name, description }
WorkspaceData: { ontology, dataset, mappings, relations, flowNodes, flowEdges, baseIri }
DEFAULT_BASE_IRI = "http://example.org"
EMPTY_WORKSPACE_DATA = { ontology: null, dataset: null, mappings: [], relations: [], flowNodes: [], flowEdges: [], baseIri: DEFAULT_BASE_IRI }
```

#### Shared types (`sharedTypes/`)

```
LoginType: { id, isAdmin, exp }
UserType: { _id, name, email, gender, isAdmin, apiKey?, createdAt?, updatedAt? }
Gender: "Male" | "Female" | "Divers" | "Prefer not to say"
UpdateUserPayload: { name?, email?, isAdmin? }
CsvImportOptions: { delimiter, charset, hasHeader, quoteChar }
```

#### RDF vocabulary (`web-view/src/lib/rdfVocabulary.ts`)

Defines standard namespaces (`rdf`, `rdfs`, `owl`, `xsd`) and the `STANDARD_PROPERTIES` array — system properties always available regardless of loaded ontology:
- `rdf:type` (object, label: "uri") — the special URI property for subject resolution
- `rdf:value` (datatype)
- `rdfs:label` (annotation)
- `rdfs:comment` (annotation)
- `rdfs:subClassOf` (object)
- `owl:sameAs` (object)

The `URI_PROPERTY` constant (`rdf:type` with label "uri") is used by the `RelationshipDialog` and the export pipeline to identify which column serves as the subject IRI for a class.

### Styling

The application uses **Tailwind CSS v4** (imported via `@import "tailwindcss"` in `index.css`). Dark mode is implemented via the `dark` CSS class on `<html>` (using `@custom-variant dark (&:where(.dark, .dark *))`).

**CSS custom properties** (`index.css`):

| Variable | Light | Dark | Purpose |
|---|---|---|---|
| `--text` | `#6b6375` | `#9ca3af` | Body text |
| `--text-h` | `#08060d` | `#f3f4f6` | Heading text |
| `--bg` | `#fff` | `#16171d` | Background |
| `--border` | `#e5e4e7` | `#2e303a` | Borders |
| `--accent` | `#aa3bff` | `#c084fc` | Accent color |
| `--toggle-bg` | `#dbeafe` | `#304674` | Segmented toggle background |
| `--toggle-active-bg` | `#fff` | `#fff` | Active toggle segment |

**Color semantics in the UI:**
- **Purple** — ontology classes, class-related UI elements
- **Blue** — dataset columns, primary actions, focus highlights
- **Orange** — edges/relationships, edit buttons, property labels
- **Red** — destructive actions (delete, break link, sign out)
- **Green** — range URIs, success confirmations
- **Yellow** — warnings in export dialog

**React Flow specific CSS:** The `.react-flow__edgelabel-renderer` z-index is set to 10 to ensure edge labels render above nodes.

**`App.css`** contains legacy styles from the Vite scaffolding template (hero, counter, next-steps) that are not used by the current application.

### Backend Architecture

The backend is an **Express 5** API server (TypeScript, run via `tsx`), with **MongoDB** and **Mongoose** for data persistence.

#### Backend Project Structure

```
backend/
├── package.json
├── .env                      # Environment configuration
├── Dockerfile
├── jest.config.ts
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
    │   ├── rdfExportRoute.ts   # POST /api/export/rdf (WP8 integration)
    │   └── authentification.ts # requiresAuthentication / optionalAuthentication middleware
    ├── services/
    │   ├── loginAuthService.ts    # credential lookup (name or email) + password check
    │   ├── JWTServices.ts         # sign/verify the access_token JWT
    │   ├── userServices.ts        # user CRUD business logic
    │   ├── workspaceServices.ts   # workspace CRUD business logic
    │   ├── rdfTransformService.ts # WP8 git pull + Docker lifecycle + /transform proxy
    │   └── mongodb.ts             # Database connection singleton
    └── models/
        ├── User.ts              # User Mongoose schema
        ├── Workspace.ts          # Workspace Mongoose schema (ontology/mappings/flow layout)
        └── WorkspaceDataset.ts   # Imported dataset, stored separately per workspace
```

#### Database Models

**User Model** (`src/models/`):
- `name`: Unique username (string)
- `email`: Unique email address (string)
- `password`: Bcrypt-hashed password
- `gender`: One of `Male` / `Female` / `Divers` / `Prefer not to say` (default)
- `isAdmin`: Boolean, grants access to admin-only routes and pages
- `apiKey`: Optional API key for external services
- `createdAt`, `updatedAt`: Timestamps

**Workspace Model** (`src/models/`):
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

**RDF Export** (`/api/export`, no authentication required — stateless transform):
- `POST /rdf`: Accepts `{ rml: string, csv: string, outputFormat?: "turtle"|"ntriples"|"jsonld", delimiter?: string, sourceType?: string }`. Pulls latest `rdf-transform` source, ensures the Docker container is running, proxies the payload to `POST /transform`, and streams the RDF bytes back with `Content-Disposition: attachment`.

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

# WP8 rdf-transform integration (optional — defaults shown)
# BIODIVPIPELINE_DIR=/absolute/path/to/BiodivPipeline  # default: resolved relative to __dirname
# RDF_TRANSFORM_URL=http://localhost:8000              # default; set to http://host.docker.internal:8000 in docker-compose
```

**Frontend** (`web-view/.env`):
```env
VITE_USE_MOCK_DATA=false      # Set to false to use real backend
VITE_REAL_FETCH=true          # Set to true to enable API calls
VITE_APP_API_BASE_URL=http://localhost:4000
VITE_FRONTEND_BASE_URL=http://localhost:3000
```

## RML Export Pipeline

This section describes the full export pipeline that converts a semantic model built in the canvas editor into RML/Turtle, the format consumed by the downstream `rdf_transform` service to produce RDF output.

---

### Overview: The Three-Stage Pipeline

```
Canvas State
    │
    ▼  canvasToModel()               [src/lib/canvasToModel.ts]
RmlMappingDocument  (internal model)
    │
    ▼  toYarrrml()                   [src/lib/yarrrml.ts]
YARRRML string      (internal intermediate)
    │
    ▼  yarrrmlToRml()                [src/lib/yarrrmlToRml.ts]
RML/Turtle string   (deliverable)
```

The entry point that wires the three stages together is `buildMappingExport` in `src/lib/exportMapping.ts`. It is called lazily from `RmlExportDialog` when the user opens the export dialog.

---

### Stage 1 — Canvas → Internal Model (`canvasToModel`)

**File:** `src/lib/canvasToModel.ts`  
**Input:** `CanvasState` (ontology, dataset, mappings, relations, flow nodes, base IRI)  
**Output:** `BuildResult` → `{ document: RmlMappingDocument, warnings: string[] }`

#### What `CanvasState` contains

| Field | Description |
|---|---|
| `ontology` | Loaded ontology with classes and properties |
| `dataset` | CSV/JSON dataset with columns and sample values |
| `mappings` | Column → class edges drawn by the user; each has a `propertyId` |
| `relations` | Class → class edges (object-property links) |
| `flowNodes` | The React Flow nodes on the canvas; used to determine which classes are visible |
| `baseIri` | Workspace-level base IRI, used when a URI column holds local IDs |

#### One TriplesMap per visible class

`canvasToModel` iterates the ontology's classes in ontology order and skips any class whose node is not present on the canvas (identified by the `class-{id}` node ID convention).

For each visible class it builds one `TriplesMap` with:
- a **subject map** (IRI or blank node)
- **predicate-object maps** for column → class literal/datatype/IRI mappings
- **predicate-object maps** for class → class object-property relations

#### Subject resolution (`resolveSubjectTerm`)

The subject of a class is determined by the column mapped to it via the special **`uri` property** (`URI_PROPERTY`). Three cases:

| Condition | Result |
|---|---|
| `uri` column whose sample values start with `http(s)://` | Direct `rml:reference` to the column — values are used as-is |
| `uri` column with local IDs | IRI template: `{baseIri}/{ColumnName}` |
| No `uri` column at all | Blank node keyed by the first other mapped column: `{ClassName}_{ColumnName}` |

The resolved term is **cached** in `subjectTermCache` so that when another class links to this one, it reuses the exact same template or reference. This is the mechanism that makes inter-class links consistent without joins (see [Inter-class linking strategy](#inter-class-linking-strategy) below).

#### Column mappings (literal/datatype/IRI objects)

For each non-`uri` mapping from a column to a class, the property type decides the object:

| Property type | Object map |
|---|---|
| `annotation` | Plain literal (`rml:reference`, no termType) |
| `datatype` | Typed literal with `xsd:…` datatype |
| `object` | IRI reference (`rml:reference` + `termType: iri`) |

#### Class → class relations

For each `ClassRelation` whose source is the current class, the **target class's cached subject term** is used directly as the object value. This produces the matching IRI or blank node template without needing a join.

#### Warnings

Issues that cannot be auto-resolved are appended to `warnings` and surfaced in the export dialog. Examples:
- A class has no `uri` property and no other mapped column (blank node cannot be distinguished per row).
- A column → class mapping has no property selected.
- A class → class relation has no object property or targets an unknown class.

#### PrefixRegistry

A `PrefixRegistry` instance collects all namespaces encountered during building and assigns short prefixes (`rdf`, `rdfs`, `owl`, `xsd` for well-known namespaces; `ns1`, `ns2`, … for others). The resulting `prefixes` record is forwarded through the pipeline so the final Turtle uses readable CURIEs.

---

### Stage 2 — Internal Model → YARRRML (`toYarrrml`)

**File:** `src/lib/yarrrml.ts`  
**Input:** `RmlMappingDocument`  
**Output:** YARRRML string (YAML)

YARRRML is used as an **internal intermediate only** — it is compact and easy to generate, but it is never the deliverable. The `rdf_transform` service never receives YARRRML.

#### Internal model types (`src/types/rmlMapping.ts`)

```
RmlMappingDocument
  prefixes: Record<string, string>
  baseIri?: string
  triplesMaps: TriplesMap[]
    id: string
    label?: string
    logicalSource: LogicalSource
      source: string          // filename
      referenceFormulation    // "csv" | "jsonpath" | "xpath"
      iterator?: string       // e.g. "$[*]" for JSONPath
    subject: SubjectMap
      value: ValueExpression  // constant | reference | template | function
      termType?: TermType     // "iri" | "literal" | "blankNode"
      classes: string[]       // rdf:type CURIEs
    predicateObjectMaps: PredicateObjectMap[]
      predicates: string[]
      object: ObjectMap
        value: ValueExpression
        termType?: TermType
        datatype?: string
        language?: string
        parentTriplesMapId?: string  // explicit join (unused by canvasToModel)
```

`ValueExpression` supports four kinds: `constant`, `reference` (a single column), `template` (a string with `{Column}` placeholders), and `function` (Nested GREL / Morph-KGC FNO calls).

#### YARRRML serialization rules

- Templates use `$(Column)` syntax (the serializer converts `{Column}` → `$(Column)`).
- IRI objects use the `~iri` suffix: `[predicate, $(Column)~iri]`.
- Blank node subjects/objects use the expanded form: `value: …` + `type: blank` (the YARRRML parser has no `~blanknode` suffix).
- Datatype literals use the 3-element array: `[predicate, $(Column), xsd:double]`.
- Language-tagged literals: `[predicate, $(Column), en~lang]`.
- Functions use the `function:` / `parameters:` expanded form and can nest.
- Class `rdf:type` entries are emitted as `[a, ClassName]`.

---

### Stage 3 — YARRRML → RML/Turtle (`yarrrmlToRml`)

**File:** `src/lib/yarrrmlToRml.ts`  
**Input:** YARRRML string, optional extra prefixes  
**Output:** Promise\<string\> — RML/Turtle

Uses `@rmlio/yarrrml-parser` (the official YARRRML→RML generator) running fully in the browser to convert the YARRRML string to N3 quads, then serializes those quads to Turtle with the `n3` library.

The extra prefixes passed in (the ontology-specific ones from `PrefixRegistry`) are merged with the standard RML prefixes (`rml:`, `rr:`, `ql:`, `fnml:`, `fno:`, `rdf:`, `rdfs:`, `xsd:`) so the output uses human-readable CURIEs throughout.

---

### UI: `RmlExportDialog`

**File:** `src/components/RmlExportDialog/RmlExportDialog.tsx`

The dialog exposes two tabs:
- **YARRRML** — the intermediate YARRRML (`.yarrrml.yml`), useful for debugging the pipeline.
- **Turtle** — the final RML/Turtle (`.rml.ttl`), the actual deliverable.

Both can be copied to clipboard or downloaded. Warnings from `canvasToModel` are shown inline as alert banners.

The pipeline is triggered lazily on dialog open via a dynamic `import("../../lib/exportMapping")` to keep the YARRRML parser out of the initial bundle.

---

### Inter-class Linking Strategy

#### This system's approach (inline template reuse)

When a class A links to class B via an object property, `canvasToModel` looks up B's **cached subject term** and places it directly as the object of the predicate-object map on A:

```yaml
# Observation → hasMeasurement → Measurement
Observation:
  po:
    - [ex:hasMeasurement, http://example.org/$(ObsDataID)~iri]

Measurement:
  s: http://example.org/$(ObsDataID)
```

The object value in A is literally the same expression as the subject value in B. Because both sides are evaluated from the same source row, the generated IRI is identical, and the link is correct.

This is a **denormalized** approach: there is no explicit join instruction in the RML. Both the subject of the target TriplesMap and the object of the linking TriplesMap are derived from the same column template, so they always resolve to the same IRI.

#### Karma's approach (RefObjectMap joins)

The legacy Karma system used proper R2RML `rr:RefObjectMap` + `rr:parentTriplesMap` semantics:

```turtle
# Observation → hasMeasurement → Measurement (Karma style)
km-dev:PredicateObjectMap_50e1af89 rr:predicate oboe-core:hasMeasurement .

km-dev:RefObjectMap_b2bd219d
    a rr:RefObjectMap, rr:ObjectMap ;
    rr:parentTriplesMap km-dev:TriplesMap_b28e28ac .   # ← the Measurement map

km-dev:TriplesMap_bdc0e236   # Observation
    rr:predicateObjectMap km-dev:PredicateObjectMap_50e1af89 .
```

Here the processor is explicitly told: "join to the Measurement TriplesMap and use its subject as the object." The join semantics are part of the mapping itself, not implied by matching templates.

#### Why the two approaches produce equivalent RDF

Both approaches generate the same set of triples **as long as every link in the canvas uses the exact same column as both the target subject and the link object** — which `canvasToModel` guarantees by construction through `subjectTermCache`. The inline-template approach is simpler to generate and avoids the verbose `rr:RefObjectMap` nesting, at the cost of making the join implicit rather than explicit.

The `ObjectMap` type in `src/types/rmlMapping.ts` does retain a `parentTriplesMapId` field for cases where an explicit join is needed (e.g. cross-source joins or future extensions), but `canvasToModel` currently never populates it.

---

### Differences from the Legacy Karma Output

The reference Karma model (`plant_height_vegetative_raw-model_oboe.ttl`) provided by Miss Karam and used here for explanatory purposes maps the same OBOE ontology structure. The generated RDF will be semantically equivalent given the column-name differences noted in the user configuration (`UnitName` vs. `UnitURI`, `TaxonID` vs. `TaxonURI`, these were created with the PyTransform-Functionality of Karma and Ms. Karam explicitly indicated that this should not be implemented in our system). Key structural divergences:

| Aspect | This system | Karma |
|---|---|---|
| **Inter-class links** | Inline template reuse (denormalized) | `rr:RefObjectMap` + `rr:parentTriplesMap` (explicit join) |
| **Subject URI namespace** | `{baseIri}/{ColumnName}` (configurable) | Class-specific real URIs (e.g. `http://www.catalogueoflife.org/…` for Entity, `http://qudt.org/…` for Unit) |
| **URI pre-computation** | Done inline in the template | Karma pre-computes `TaxonURI` and `UnitURI` columns via Python transforms before mapping |
| **Blank node identity** | Compound-key blank node (e.g. `MeasuredValue_{StdValue}_{ObsDataID}`) — one distinct blank node per source row | Fully anonymous blank node — new identity per processor run |
| **Format** | RML (with `rml:LogicalSource` / `ql:CSV`) | R2RML (with `rr:LogicalTable` / `rr:tableName`) |
| **Metadata** | None | Karma-specific `km-dev:` provenance metadata embedded |

#### Deep-dive: MeasuredValue blank node identity

In the OBOE model, `MeasuredValue` is a small wrapper node that attaches a concrete value (the `hasCode` literal from `StdValue`) to a `Measurement`. Because it is purely a structural node with no independent identity — it only exists to carry the numeric value — it is modelled as a blank node rather than an IRI in both systems.

##### How Karma generates the blank node

Karma declares the `MeasuredValue` subject map with `rr:termType rr:BlankNode` and no template:

```turtle
_:node1imp7hn1lx8
    a rr:SubjectMap ;
    rr:class oboe-core:MeasuredValue ;
    rr:termType rr:BlankNode .
```

In R2RML, a blank node subject with no template means the processor allocates a **fresh, internally-managed blank node for every single row**, and it is guaranteed not to collide with blank nodes from other rows. The processor is responsible for scoping and identity — the mapping author never sees or cares about the blank node label.

For the `Measurement → hasValue → MeasuredValue` link, Karma uses a `rr:RefObjectMap` pointing to the MeasuredValue TriplesMap:

```turtle
km-dev:RefObjectMap_1873dda8
    a rr:RefObjectMap, rr:ObjectMap ;
    rr:parentTriplesMap km-dev:TriplesMap_9e718de5 .  # ← MeasuredValue map
```

Because both TriplesMaps iterate the same source, this is an implicit **same-row join**: the processor produces one Measurement and one MeasuredValue per row and links them. The Measurement's `hasValue` object is set to whatever blank node the MeasuredValue TriplesMap produced for that row.

**Result:** Every row produces a completely private, throwaway blank node for its MeasuredValue. Two rows that happen to have the same `StdValue` (e.g. both measuring 1.5 m) still get distinct blank nodes. The graph looks like:

```turtle
<obs-row1> oboe:hasMeasurement <meas-row1> .
<meas-row1> oboe:hasValue _:b0 .
_:b0 a oboe:MeasuredValue ; oboe:hasCode "1.5" .

<obs-row2> oboe:hasMeasurement <meas-row2> .
<meas-row2> oboe:hasValue _:b1 .
_:b1 a oboe:MeasuredValue ; oboe:hasCode "1.5" .
```

`_:b0` and `_:b1` are entirely separate nodes even though their `hasCode` value is identical.

##### How this system generates the blank node

Because this system does not use `rr:RefObjectMap`, the blank node must be addressable from both the MeasuredValue subject map and the Measurement `hasValue` object map using only the same row's column values. `canvasToModel` handles this in `resolveSubjectTerm`: when a class has no `uri` property mapped, it builds a **compound-key blank node** from the class's own mapped column(s) **plus the URI column of every class that links to it** (the parent URI columns):

```typescript
// src/lib/canvasToModel.ts
const slug = localName(classUri);                       // "MeasuredValue"
const keyCols = [fallbackColumn, ...parentUriColumns]   // [StdValue, ObsDataID]
  .filter((c): c is DatasetColumn => c !== undefined);
const template = keyCols.length > 0
  ? `${slug}_${keyCols.map((c) => `{${c.name}}`).join("_")}` // "MeasuredValue_{StdValue}_{ObsDataID}"
  : slug;
return { value: { kind: "template", template }, termType: "blankNode" };
```

The parent URI columns are collected in a reverse-relation index built before the main loop:

```typescript
// For every relation A → B, add A's uri-column to parentUriColumnsFor[B]
for (const relation of relations) {
  const parentUriCol = /* uri-column of relation.sourceClassId */;
  if (parentUriCol) parentUriColumnsFor.get(relation.targetClassId).push(parentUriCol);
}
```

The resulting RML uses the same compound template on both sides:

```turtle
# MeasuredValue subject map
<...s_002> rr:template "MeasuredValue_{StdValue}_{ObsDataID}" ;
           rr:termType rr:BlankNode .

# Measurement → hasValue object map  (same template, from the cached subject term)
<...om_007> rr:template "MeasuredValue_{StdValue}_{ObsDataID}" ;
            rr:termType rr:BlankNode .
```

Because `ObsDataID` is unique per row, the template evaluates to a different string for every row even when `StdValue` repeats. The inline-template link mechanism is preserved — both sides still produce the same blank node label for the same row — but distinct rows now get distinct blank nodes.

**Result:** Every row gets its own distinct blank node for MeasuredValue:

```turtle
<meas-row1> oboe:hasValue _:MeasuredValue_1.5_obs001 .
<meas-row2> oboe:hasValue _:MeasuredValue_1.5_obs002 .
_:MeasuredValue_1.5_obs001 a oboe:MeasuredValue ; oboe:hasCode "1.5" .
_:MeasuredValue_1.5_obs002 a oboe:MeasuredValue ; oboe:hasCode "1.5" .
```

##### Comparing the two behaviours

| Property | Karma (anonymous) | This system (compound-key) |
|---|---|---|
| Blank node per row | Yes — always unique | Yes — unique because the parent URI column is included in the key |
| Cross-row blank node identity | Never shared | Never shared (as long as the parent class has a `uri` property) |
| Link mechanism | `rr:RefObjectMap` same-row join | Matching template on both sides |
| Processor dependency | Processor manages identity | Template string controls identity |
| Valid RDF? | Yes | Yes |

---

### Export Pipeline File Reference

| File | Role |
|---|---|
| `src/lib/exportMapping.ts` | Pipeline entry point: `buildMappingExport` |
| `src/lib/canvasToModel.ts` | Stage 1: canvas state → `RmlMappingDocument` |
| `src/lib/yarrrml.ts` | Stage 2: `RmlMappingDocument` → YARRRML string |
| `src/lib/yarrrmlToRml.ts` | Stage 3: YARRRML → RML/Turtle |
| `src/types/rmlMapping.ts` | Internal model type definitions |
| `src/components/RmlExportDialog/RmlExportDialog.tsx` | UI dialog (tabs, download, warnings) |
| `src/lib/canvasToModel.test.ts` | Unit tests for stage 1 |
| `src/lib/yarrrml.test.ts` | Unit tests for stage 2 |
| `src/lib/yarrrmlToRml.test.ts` | Integration tests for stage 3 |
| `test/mapping.rml.ttl` | Example output generated by this system |
| `test/plant_height_vegetative_raw-model_oboe.ttl` | Reference Karma R2RML model for the same dataset |

## RDF Export — WP8 Integration

This section describes how the schema editor integrates with the WP8 `rdf-transform` FastAPI microservice to materialize RDF from the user's mapping and dataset.

### Architecture

```
UI "rdf" button (RdfExportDialog)
  ↓  builds RML + serializes CSV
  POST /api/export/rdf  (Express backend)
    ↓  git pull (sparse: only modules/local/rdf_transform)
    ↓  docker build -t rdf-transform  (if code changed or container not running)
    ↓  docker run -d -p 8000:8000 --name rdf-transform  (lazy-start, kept alive)
    ↓  POST http://[host]:8000/transform  (multipart: dataset + mapping_schema)
  ← RDF bytes streamed back → browser download
```

### BiodivPipeline — sparse checkout

The `BiodivPipeline/` directory is a nested git repository configured with **git sparse-checkout** so only `modules/local/rdf_transform/` is checked out on disk:

```bash
git -C BiodivPipeline sparse-checkout init --cone
git -C BiodivPipeline sparse-checkout set modules/local/rdf_transform
```

This means `git pull` inside `BiodivPipeline/` only downloads and updates the `rdf_transform` folder. All other pipeline modules remain absent from the working tree (they still exist in the git object store).

The checked-out folder contains a self-contained FastAPI application:
```
modules/local/rdf_transform/
├── Dockerfile        # python:3.11-slim + uvicorn + Morph-KGC
├── main.py           # FastAPI app entry point
├── requirements.txt
├── src/
│   ├── api/routes.py
│   └── core/         # Morph-KGC RML materialization
├── ontologies/       # Reference ontologies for /validate L3
└── examples/         # Sample CSV + RML mapping
```

### Backend service: `rdfTransformService.ts`

**File:** `backend/src/services/rdfTransformService.ts`

Three exported functions, called in sequence by the route handler:

#### `pullLatest()`

1. Marks `BIODIV_DIR` as a `git safe.directory` (required when the directory is a bind-mounted volume owned by a different UID).
2. Records the current HEAD SHA.
3. Runs `git pull origin wp8-rdf-transform --ff-only`. Failure is non-fatal — logs a warning and continues with whatever is on disk.
4. Returns `{ changed: boolean, sha: string }` — `changed` is true if the SHA advanced.

#### `ensureContainerRunning(changed)`

- If the container is already running **and** `changed` is false → reuses it (fast path).
- Otherwise: stops the old container (`docker rm -f`), rebuilds the image (`docker build -t rdf-transform`), starts a new container (`docker run -d --rm -p 8000:8000 --name rdf-transform`), then polls `GET /` until the health check passes (60 s timeout, 1.5 s interval).

#### `transform(rml, csv, opts)`

Builds a `multipart/form-data` request with:
- `mapping_schema` — the RML/Turtle string as `mapping.rml.ttl`
- `dataset` — the CSV string as `dataset.csv`
- `output_format`, `delimiter`, `source_type`

POSTs to `SERVICE_URL/transform` (120 s timeout). Returns `{ body: Buffer, contentType: string }`.

**Path resolution:**

| Environment | `BIODIV_DIR` | `SERVICE_URL` |
|---|---|---|
| Dev (host) | `__dirname/../../../../BiodivPipeline` | `http://localhost:8000` |
| docker-compose | `BIODIVPIPELINE_DIR` env var (`/app/BiodivPipeline`) | `RDF_TRANSFORM_URL` env var (`http://host.docker.internal:8000`) |

The `host.docker.internal` hostname is resolved via the `extra_hosts: host-gateway` entry in `docker-compose.override.yml` (required on Linux; automatic on macOS/Windows).

### Backend route: `rdfExportRoute.ts`

**File:** `backend/src/routes/rdfExportRoute.ts`  
**Mounted at:** `POST /api/export/rdf`  
**Auth:** none required

Request body (JSON):

| Field | Type | Default | Description |
|---|---|---|---|
| `rml` | `string` | required | RML/Turtle mapping |
| `csv` | `string` | required | CSV dataset |
| `outputFormat` | `"turtle"\|"ntriples"\|"jsonld"` | `"turtle"` | RDF serialization |
| `delimiter` | `"COMMA"\|"TAB"\|"SEMICOLON"\|"PIPE"` | `"COMMA"` | CSV delimiter |
| `sourceType` | `"CSV"\|"TSV"\|"JSON"` | `"CSV"` | Source type |

The response body is the raw RDF bytes with `Content-Type` set appropriately and `Content-Disposition: attachment; filename="output.<ext>"`.

### docker-compose.override.yml

Docker Compose automatically merges `docker-compose.override.yml` alongside `docker-compose.yml`. The override adds three things to the `backend` service:

```yaml
services:
  backend:
    extra_hosts:
      - "host.docker.internal:host-gateway"   # resolves on Linux
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock  # Docker-in-Docker via socket
      - ./BiodivPipeline:/app/BiodivPipeline:ro    # rdf_transform source + Dockerfile
    environment:
      BIODIVPIPELINE_DIR: /app/BiodivPipeline
      RDF_TRANSFORM_URL: http://host.docker.internal:8000
```

The Docker socket mount allows the backend container to manage sibling containers on the host daemon. The `BiodivPipeline` bind-mount is read-only; the backend only needs to read files for `docker build` and run `git pull` (git writes are to the git object store inside the directory, so `:ro` may need to be dropped if git operations fail with permission errors).

---

## Example test

We run our and Karmas export pipeline on the same dataset and compare the results. The example was the oboe example that Ms. Karam provided. We rebuild the semantic model provided by Miss Karam in our App and kept everything the same. The only difference are in `TaxonURI` and `UnitURI`: in the example a "PyTransform" was applied to create the URI. As we were explicitly told that that transformation is not needed, we omitted it and used `TaxonID` and `UnitName` respectively.

The results can be seen in `testcompare/other_rdf.ttl` and `testcompare/our_rdf.ttl`. 
For the same dataset with 20 rows, everything is semantically identical. Many syntactical differences exist.

## Development

### Prerequisites

- Node.js >= 20
- Docker and Docker Compose (for the Docker-based setup)
- MongoDB (local or Docker, for the manual setup)

### Running with Docker Compose (recommended)

The entire stack (frontend, backend, MongoDB) can be started with a single command from the project root:

```bash
docker compose up --build
```

> **RDF export in docker-compose:** `docker-compose.override.yml` is automatically merged by Compose. It adds the Docker socket mount, the `BiodivPipeline/` volume, and the two env vars (`BIODIVPIPELINE_DIR`, `RDF_TRANSFORM_URL`) to the backend service. No extra flags are needed — `docker compose up --build` picks it up automatically.

| Service       | URL                       | Docker image     |
|---------------|---------------------------|------------------|
| Frontend      | http://localhost:3000     | `rse-frontend`   |
| Backend       | http://localhost:4000     | `rse-backend`    |
| MongoDB       | mongodb://localhost:27017  | `mongo:7.0`      |
| rdf-transform | http://localhost:8000     | `rdf-transform` (started on demand by the backend) |

#### Service overview

The three services in `docker-compose.yml` start in a strict dependency order enforced by health checks:

```
mongodb  →  backend  →  frontend
```

1. **`mongodb`** starts first. It runs `mongo:7.0` with `--wiredTigerCacheSizeGB 0.25` to limit RAM usage. A health check polls `mongosh --eval "db.adminCommand('ping')"` every 10 s (up to 6 retries, 20 s start period). Data is persisted in the named volume `mongodb-data`.

2. **`backend`** starts after MongoDB passes its health check (`condition: service_healthy`). It exposes the Express API on port `4000`. Its own health check calls `GET http://localhost:4000/api/healthy` via `wget` every 10 s (up to 5 retries, 15 s start period, max 5 restarts on failure).

3. **`frontend`** starts after the backend passes its health check. It serves the compiled React application on port `3000`. It restarts on failure with no explicit retry limit.

#### Environment variables

**Backend** (`backend` service):

| Variable       | Value                            | Description                                      |
|----------------|----------------------------------|--------------------------------------------------|
| `NODE_ENV`     | `production`                     | Node environment                                 |
| `PORT`         | `4000`                           | Port the Express server listens on               |
| `MONGODB_URI`  | `mongodb://mongodb:27017/rse`    | Connection string (uses the `mongodb` service name) |
| `CORS_ORIGIN`  | `http://localhost:3000`          | Allowed CORS origin (must match frontend URL)    |
| `JWT_SECRET`   | `schlüssel`                      | **Change this before any public deployment!**    |
| `JWT_TTL`      | `300`                            | JWT lifetime in seconds                          |

> **Note:** The `PREFILL_USERS` variable is commented out (`# PREFILL_USERS: "true"`). Uncomment it to pre-populate the database with a set of seed users on first startup.

**Frontend** (`frontend` service):

| Variable            | Value        | Description                                     |
|---------------------|--------------|-------------------------------------------------|
| `NODE_ENV`          | `production` | Node environment                                |
| `VITE_REAL_FETCH`   | `"true"`     | Enables real HTTP calls to the backend API      |
| `VITE_USE_MOCK_DATA`| `"false"`    | Disables mock data; uses live backend responses |

#### Logging

All services use the `json-file` log driver:

| Service    | Max file size | Max files |
|------------|--------------|-----------|
| `frontend` | 5 MB         | 3         |
| `backend`  | 10 MB        | 5         |
| `mongodb`  | 10 MB        | 3         |

#### Volume

The named volume `mongodb-data` is mounted at `/data/db` inside the `mongodb` container and persists all database data across container restarts and rebuilds.

#### Common commands

To stop and remove containers:

```bash
docker compose down
```

To also remove the persisted MongoDB volume (wipes all data):

```bash
docker compose down -v
```

To rebuild only a specific service after a code change:

```bash
docker compose up --build frontend
```

> **Security note:** The `JWT_SECRET` in `docker-compose.yml` is set to the placeholder value `schlüssel`. Replace it with a strong, randomly generated secret before any public or production deployment.

### Running Manually

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

## Testing

The project has two independent test suites — one for the frontend library code and one for the backend services. Together they cover 84 testsacross 10 test files.

### Running the Tests

**Frontend** (from `web-view/`):
```bash
npm run test:run   # single run (CI)
npm test           # watch mode
```

**Backend** (from `backend/`):
```bash
npm test
```

> **Note:** The first backend test run downloads the MongoDB binary (~92 MB) used by `MongoMemoryServer`. Subsequent runs reuse the cached binary and complete in under 5 seconds.

---

### Frontend Tests (Vitest)

**Framework:** [Vitest](https://vitest.dev/) v4  
**Location:** `web-view/src/lib/*.test.ts`  
**Total:** 7 files, 54 tests

All frontend tests are pure unit/integration tests with no DOM or network dependencies. They exercise the library functions that implement the RML export pipeline and the file import parsers.

#### `yarrrml.test.ts` (8 tests)

Tests the `toYarrrml()` serializer (`src/lib/yarrrml.ts`) against a full OBOE plant-height example document.

| Test | What it checks |
|---|---|
| Emits prefixes and all seven mappings | Every `TriplesMap` ID appears in the YAML output |
| JSONPath logical source with iterator | `['source~jsonpath', '$[*]']` syntax |
| `{Column}` → `$(Column)` template conversion | IRI-tagged objects get `~iri` suffix |
| Literal label reference | No type suffix on plain literals |
| Already-IRI column reference | `$(TraitID)~iri` |
| Nested concat/toUpperCase function | `function: builtin:concat` + nested `grel:toUpperCase` |
| Blank node subjects/objects | `value: …` + `type: blank` (no `~blanknode`) |
| Golden snapshot | Stable output via `toMatchSnapshot()` |

The snapshot is stored in `src/lib/__snapshots__/yarrrml.test.ts.snap`.

#### `csvParse.test.ts` (23 tests)

Tests all public functions in `src/lib/csvParse.ts`.

| Function | Tests cover |
|---|---|
| `normalizeCsvNewlines` | CRLF and lone CR conversion |
| `getCsvNonEmptyLines` | Blank/whitespace-only line filtering |
| `parseCsvLine` | Delimiter splitting, quoted fields, tab delimiter, empty input, unclosed quotes |
| `parseCsvTextToGrid` | Empty input, header/no-header, header-only, CRLF normalization, `maxRows` capping |
| `csvGridToDataset` / `parseCsvTextToDataset` | Short-row padding, null on empty, deterministic IDs |

#### `canvasToModel.test.ts` (10 tests)

Tests `canvasToModel()` (`src/lib/canvasToModel.ts`) — Stage 1 of the export pipeline.

| Test | What it checks |
|---|---|
| One TriplesMap per class node, no warnings | Correct map count from canvas nodes |
| Logical source from dataset | CSV filename and reference formulation |
| Subject IRI as `baseIri + $(ColumnName)` | Template construction for local-ID columns |
| URI mapping not emitted as predicate-object | `rdf:type` is the subject marker, not a regular property |
| Class→class link reuses target subject term | `subjectTermCache` reuse for inline linking |
| Datatype literal | `[predicate, $(Column), xsd:double]` output |
| Full-IRI column used as-is | No `baseIri/` prefix when sample values start with `https://` |
| Blank node fallback (no uri property) | `value: ClassName_$(Col)` + `type: blank` |
| Blank node includes parent uri-column | Compound key `ClassName_$(Col)_$(ParentCol)` for distinct rows |
| Warning on unmapped class | `warnings` array contains the class name |

#### `owlParse.test.ts` (8 tests)

Tests `parseOwlToOntology()` (`src/lib/owlParse.ts`).

| Test | What it checks |
|---|---|
| Empty / no rdf:RDF root | Returns empty ontology with correct name |
| Extension stripping | `.OWL`, `.rdf` removed from ontology name |
| `rdfs:label` reading | Label property populated |
| Fragment fallback | Uses URI fragment as label when label is absent |
| Full-URI fallback | Uses full URI when there is no fragment |
| Multiple classes in document order | Order preserved |
| Object, datatype, annotation properties | Correct type assigned; datatype range extracted; domain→class assignment |
| Multiple domains | Property assigned to all matching classes |

#### `yarrrmlToRml.test.ts` (2 tests)

Integration tests for `yarrrmlToRml()` (`src/lib/yarrrmlToRml.ts`) — Stage 3 of the pipeline. Runs the real `@rmlio/yarrrml-parser` in the test environment.

| Test | What it checks |
|---|---|
| Parses generated YARRRML into RML/Turtle | Presence of `rr:TriplesMap`, `rml:logicalSource`, `ql:CSV`, template, `rml:reference`, `xsd:double` |
| Blank-node subject → `rr:termType rr:BlankNode` | Correct termType in the Turtle output |

#### `rmlToModel.test.ts` (1 test)

Round-trip test: `toYarrrml` → `yarrrmlToRml` → `rmlToModel` (`src/lib/rmlToModel.ts`). Verifies that an `RmlMappingDocument` survives a full serialization/parse cycle with subjects, classes, literal references, class→class links and typed datatypes all intact.

#### `modelToCanvas.test.ts` (2 tests)

End-to-end round-trip: `canvasToModel` → `toYarrrml` → `yarrrmlToRml` → `rmlToModel` → `modelToCanvas`. Two scenarios:

| Test | What it checks |
|---|---|
| Full Canvas → RML → Canvas round-trip | Classes, columns, uri-mappings, value mappings, class→class relation, flow nodes/edges counts |
| Merge onto loaded ontology + dataset (mode B) | Existing class/column IDs, labels and sample values are reused; loaded ontology/dataset is preserved in full |

---

### Backend Tests (Jest)

**Framework:** [Jest](https://jestjs.io/) v30 with `ts-jest`  
**Location:** `backend/tests/`  
**Total:** 3 files, 30 tests

#### Test Infrastructure (`tests/setup.ts`)

Runs as `setupFilesAfterEnach` (configured in `jest.config.ts`). Uses `mongodb-memory-server` to spin up an in-process MongoDB instance for each test suite, avoiding any dependency on a running database.

```
beforeAll  — MongoMemoryServer.create() + mongoose.connect()   [60 s timeout]
afterEach  — wipes all collections between tests
afterAll   — mongoose.disconnect() + mongo.stop()
```

The 60-second `beforeAll` timeout accommodates the first-run binary download. Once cached, startup takes under 2 seconds.

#### `jwtService.test.ts` (13 tests)

Tests `verifyPasswordAndCreateJWT` and `verifyJWT` from `src/services/JWTServices.ts`. The `loginAuthService` dependency is fully mocked with `jest.mock`.

**`verifyPasswordAndCreateJWT` describe (6 tests):**

| Test | What it checks |
|---|---|
| Creates a valid JWT for correct credentials | Token is a string; payload has correct `sub`, `isAdmin`, non-expired `exp` |
| Passes credentials through to `login` | Mock called exactly once with correct arguments |
| Returns `undefined` when login fails | No token produced for bad credentials |
| Throws when `JWT_SECRET` is not set | Error message: "verifyJWT or jwtTtl is not defined" |
| Throws when `JWT_TTL` is not set | Same error |

**`verifyJWT` describe (7 tests):**

| Test | What it checks |
|---|---|
| Decodes a valid token (round-trip) | `id`, `exp`, and `isAdmin` are correctly recovered |
| Throws `JsonWebTokenError` for an invalid token | Malformed string rejected |
| Throws `JsonWebTokenError` for `undefined` | `undefined` input rejected |
| Throws when signed with a different secret | Signature mismatch detected |
| Throws for an expired token | Negative TTL causes immediate expiry |
| Throws when `JWT_SECRET` is not set | Error message: "jwtSecret is not defined" |

Each `describe` block has its own `beforeEach` that restores `JWT_SECRET` and `JWT_TTL` to `"test-secret"` / `"300"`, preventing environment mutations in one suite from affecting the other.

#### `login.test.ts` (3 tests)

Tests `login()` from `src/services/loginAuthService.ts` against a real in-memory MongoDB. A `Harry` user is created in `beforeEach` (and the collection is wiped in `afterEach`).

| Test | What it checks |
|---|---|
| Correct credentials | Returns object containing `{ id, isAdmin }` |
| Wrong name | Returns falsy |
| Wrong password | Returns falsy |

#### `user.test.ts` (14 tests)

Tests all functions exported from `src/services/userServices.ts` against the in-memory database.

| Describe | Tests |
|---|---|
| `createUser` | Creates with id; persists to DB; rejects missing required field; rejects duplicate email |
| `getCurrentUser` | Returns user for valid id; throws "User could not be found" for missing id; throws on malformed id |
| `getAllUsers` | Returns empty array; returns all users |
| `updateUser` | Updates and returns new value; persists update; throws for missing user; leaves fields unchanged on empty update |
| `deleteUser` | Removes from DB; deletes only the targeted user; throws for missing user |
