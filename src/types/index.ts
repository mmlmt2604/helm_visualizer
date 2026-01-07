// Helm Chart Types

export interface HelmChart {
  name: string;
  version: string;
  description?: string;
  files: HelmFile[];
  values: ValuesData;
  chartYaml: ChartYaml;
  references: Reference[];
  helpers: HelperDefinition[];
  dependencies: ChartDependency[];
}

export interface HelmFile {
  path: string;
  name: string;
  type: FileType;
  content: string;
}

export type FileType = 
  | 'chart'        // Chart.yaml
  | 'values'       // values.yaml
  | 'template'     // templates/*.yaml
  | 'helper'       // _helpers.tpl
  | 'notes'        // NOTES.txt
  | 'other';

export interface ChartYaml {
  name: string;
  version: string;
  apiVersion: string;
  description?: string;
  type?: string;
  appVersion?: string;
  dependencies?: ChartDependency[];
}

export interface ChartDependency {
  name: string;
  version: string;
  repository?: string;
  condition?: string;
  alias?: string;
}

export interface ValuesData {
  raw: Record<string, unknown>;
  flatKeys: ValueKey[];
}

export interface ValueKey {
  path: string;           // e.g., "config.nodeEnv"
  fullPath: string;       // e.g., ".Values.config.nodeEnv"
  value: unknown;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null';
}

// Reference types for connections between files

export interface Reference {
  id: string;
  type: ReferenceType;
  source: ReferenceSource;
  target: ReferenceTarget;
  expression: string;     // The actual template expression found
  line?: number;          // Line number in source file
}

export type ReferenceType = 
  | 'values'              // .Values.x.y.z
  | 'include'             // {{ include "helper" . }}
  | 'template'            // {{ template "helper" }}
  | 'chart'               // .Chart.Name, .Chart.Version
  | 'release'             // .Release.Name, .Release.Namespace
  | 'files'               // .Files.Get, .Files.Glob
  | 'capabilities';       // .Capabilities.*

export interface ReferenceSource {
  file: string;           // File path
  line?: number;          // Line number
}

export interface ReferenceTarget {
  type: 'value' | 'helper' | 'chart' | 'release' | 'file' | 'capability';
  path: string;           // For values: "config.nodeEnv", for helpers: "mychart.labels"
}

export interface HelperDefinition {
  name: string;           // e.g., "mychart.labels"
  file: string;           // File where it's defined
  line?: number;
  content: string;        // The helper template content
}

// Graph Types for React Flow

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
}

export type NodeType = 'file' | 'value' | 'chart' | 'release' | 'helper';

export interface NodeData {
  label: string;
  fileType?: FileType;
  filePath?: string;
  valuePath?: string;
  valueType?: string;
  helperName?: string;
  referenceCount?: number;
  isHighlighted?: boolean;
  [key: string]: unknown;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
  animated?: boolean;
  data?: EdgeData;
}

export interface EdgeData {
  referenceType: ReferenceType;
  expression: string;
  [key: string]: unknown;
}

// UI State Types

export interface FileTreeItem {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeItem[];
  fileType?: FileType;
}

