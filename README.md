# Helm Chart Visualizer

An interactive web-based tool to visualize Helm chart dependencies and references. Drop a Helm chart folder and instantly see how templates connect to values, helpers, and chart metadata.

## Features

- **Drag & Drop**: Simply drag a Helm chart folder into the browser
- **Reference Detection**: Automatically detects:
  - `.Values.*` references to values.yaml
  - `include` and `template` calls to helper definitions
  - `.Chart.*` references to Chart.yaml
  - `.Release.*` references (Name, Namespace, etc.)
- **Interactive Graph**: Pan, zoom, and drag nodes to explore relationships
- **File Selection**: Click on any file node to highlight its connections
- **MiniMap**: Navigate large charts easily

## Screenshot

<img width="2554" height="1275" alt="Screenshot 2026-01-07 170015" src="https://github.com/user-attachments/assets/7f3c094c-9db3-46c5-a731-01d6c572c15e" />

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.0 or later)

### Installation

```bash
# Clone or navigate to the project
cd helm_visualizer

# Install dependencies
bun install

# Start development server
bun run dev
```

Then open http://localhost:5173 in your browser.

### Usage

1. Open the app in your browser
2. Drag and drop a Helm chart folder onto the drop zone
3. Explore the interactive graph:
   - **Pan**: Click and drag on the canvas
   - **Zoom**: Scroll or use controls
   - **Select**: Click on a file node to highlight its connections
   - **Deselect**: Click on the background

### Sample Chart

A sample Helm chart is included in the `sample-chart/` directory for testing.

## Tech Stack

- **Runtime**: Bun
- **Framework**: React 18 with TypeScript
- **Bundler**: Vite
- **Visualization**: React Flow (@xyflow/react)
- **YAML Parsing**: js-yaml
- **Styling**: Tailwind CSS

## Project Structure

```
helm_visualizer/
├── src/
│   ├── components/
│   │   ├── DropZone.tsx      # Drag-drop file handler
│   │   ├── FileTree.tsx      # Sidebar file tree
│   │   ├── GraphView.tsx     # React Flow canvas
│   │   └── nodes/            # Custom node components
│   ├── parser/
│   │   ├── helm-parser.ts    # Main parser orchestrator
│   │   ├── yaml-parser.ts    # YAML file parsing
│   │   └── template-parser.ts # Go template reference extraction
│   ├── graph/
│   │   └── graph-builder.ts  # Build React Flow nodes/edges
│   └── types/
│       └── index.ts          # TypeScript interfaces
├── sample-chart/             # Sample Helm chart for testing
└── package.json
```

## Reference Types

| Pattern | Example | Connection |
|---------|---------|------------|
| `.Values.*` | `.Values.config.nodeEnv` | Template → values.yaml key |
| `include` | `{{ include "app.labels" . }}` | Template → _helpers.tpl |
| `template` | `{{ template "app.name" }}` | Template → _helpers.tpl |
| `.Chart.*` | `.Chart.Name` | Template → Chart.yaml |
| `.Release.*` | `.Release.Name` | Template → Release info |

## Building for Production

```bash
bun run build
```

The built files will be in the `dist/` directory.

## License

MIT

