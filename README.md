# Image Text Composer

An in-browser editor to compose PNG images with rich text overlays. Upload a PNG, add and style multiple text layers, and export the result — all client-side.

## Quick Start

Prerequisites:
- Node.js 18+ and npm

Install and run:
```bash
npm install
npm run dev
```
The app starts at http://localhost:8080

No environment variables or backend services are required.

## Features

- Multiple text layers with selection and reordering
- Font family with search, Google Fonts loading, and custom font upload (TTF/OTF/WOFF/WOFF2)
- Typography controls: size, weight, color, opacity, line height, letter spacing
- Text shadow: color, blur, offset X/Y
- Curved text (arranged around a circle)
- Layer actions: show/hide, lock/unlock, duplicate, move up/down
- Undo/redo (bounded history)
- Auto-save to localStorage; restore on refresh
- Export to PNG; reset editor to upload screen
- Spacing guides between selected objects (visual hints during move/selection)

## Architecture Overview

- `src/pages/Index.tsx` — Mounts the editor page.
- `src/components/ImageEditor.tsx` — Core orchestrator.
  - Manages the Fabric.js canvas lifecycle and synchronizes React state <-> canvas objects.
  - Persists editor state to localStorage; restores on mount.
  - Rebuilds Fabric objects from `TextLayer` state (`rebuildLayerOnCanvas`).
  - Renders spacing hints on the Canvas `contextTop` on `after:render`.
- `src/components/Toolbar.tsx` — Add text, export, reset, undo/redo.
- `src/components/PropertiesPanel.tsx` — Edit text/layer styles.
  - Font family select with search field and Google Fonts loader.
  - Custom font upload stored in localStorage and registered via `FontFace`.
- `src/components/LayersPanel.tsx` — Visual layer list with visibility, lock, duplicate, and reordering.
- `src/components/UploadArea.tsx` — PNG-only upload area (drag-and-drop or file picker).

State model:
- `TextLayer` describes the source of truth for each layer (font, size, position, effects, curvature, etc.).
- Fabric object `data.id` ties canvas objects to `TextLayer` entries.
- History is a bounded array of serialized Fabric canvas states (including the custom `data` field) for undo/redo.

Data flow:
1. User changes a property in `PropertiesPanel` or manipulates objects on canvas.
2. `ImageEditor` updates the Fabric object and React state, then persists to history and localStorage.
3. On re-render or reload, `rebuildLayerOnCanvas` creates canvas objects from the `TextLayer` state.

## Technology Choices & Trade-offs

- React + TypeScript + Vite
  - Fast dev server and typed UI code.
- Fabric.js for canvas
  - Mature 2D canvas abstraction with text, groups, shadows, transforms.
  - Trade-off: heavyweight for very large scenes; uses its own units (e.g., `charSpacing` = 1/1000 em).
- Tailwind CSS + shadcn/ui
  - Rapid, consistent UI styling with accessible primitives.
- Google Fonts via `<link>` injection
  - Simple, zero-config loading.
  - Trade-off: First-time font load may cause layout shift; network-dependent.
- Custom fonts via `FontFace`
  - Works offline after upload; persisted in localStorage.
  - Trade-off: Increases localStorage usage; cannot exceed browser limits.
- Local-only app (no backend)
  - Privacy-friendly; easy to run.
  - Trade-off: No multi-device sync or server-side rendering.

## Implemented Bonus Points

- Custom font upload (TTF/OTF/WOFF) with persistence
- Ability to edit line-height, letter-spacing
- Lock / unlock layers, duplicate layers
- Curved text rendering as a group of characters along a circle
- Text shadow controls (customizable color, blur, and offset)
- Font family search and on-demand Google Fonts loading
- Spacing guides between simultaneously selected objects
- Alert component for image editing reset confirmation

## Known Limitations

- History length is limited (to keep memory usage reasonable);
- Font weights depend on the variants a font provides; some weights may not be available for all Google Fonts;
- Export resolution matches the canvas;
- LocalStorage persistence means changes are per-browser and may hit storage quotas.

---