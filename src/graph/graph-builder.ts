import { HelmChart, GraphData, GraphNode, GraphEdge, Reference, FileType } from '../types';

interface LayoutConfig {
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  groupPadding: number;
}

const DEFAULT_LAYOUT: LayoutConfig = {
  nodeWidth: 200,
  nodeHeight: 60,
  horizontalSpacing: 500,
  verticalSpacing: 100,
  groupPadding: 50,
};

/**
 * Build React Flow graph data from a parsed Helm chart
 */
export function buildGraphData(chart: HelmChart): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  
  // Column 1: Template files (left) - these are the sources
  const templateFiles = chart.files.filter(f => 
    f.type === 'template' || f.type === 'helper' || f.type === 'notes'
  );
  templateFiles.forEach((file) => {
    nodes.push(createFileNode(file.path, file.name, file.type, 0, 0));
  });
  
  // Column 2: Chart.yaml and Release info (center-left)
  const chartFile = chart.files.find(f => f.type === 'chart');
  if (chartFile) {
    nodes.push(createFileNode(chartFile.path, chartFile.name, 'chart', 0, 0));
  }
  
  // Release node (virtual)
  nodes.push(createReleaseNode(0, 0));
  
  // Column 3: Values.yaml file node
  const valuesFile = chart.files.find(f => f.type === 'values');
  if (valuesFile) {
    nodes.push(createFileNode(valuesFile.path, valuesFile.name, 'values', 0, 0));
  }
  
  // Create value nodes for referenced values only
  const referencedValuePaths = getReferencedValuePaths(chart);
  referencedValuePaths.forEach((path) => {
    const label = path.includes('.') ? path.split('.').pop() || path : path;
    nodes.push(createValueNode(path, label, 0, 0));
  });
  
  // Column 4: Helper definitions (right)
  chart.helpers.forEach((helper) => {
    nodes.push(createHelperNode(helper.name, 0, 0));
  });
  
  // Create edges for references
  chart.references.forEach((ref) => {
    const edge = createEdge(ref, chart);
    if (edge) {
      edges.push(edge);
    }
  });
  
  // Apply smart layout
  const layoutedNodes = autoOrganizeLayout(nodes, edges);
  
  return { nodes: layoutedNodes, edges };
}

/**
 * Create a file node
 */
function createFileNode(
  path: string,
  name: string,
  fileType: FileType,
  x: number,
  y: number
): GraphNode {
  return {
    id: `file:${path}`,
    type: 'file',
    position: { x, y },
    data: {
      label: name,
      fileType,
      filePath: path,
    },
  };
}

/**
 * Create a value node
 */
function createValueNode(
  path: string,
  label: string,
  x: number,
  y: number
): GraphNode {
  return {
    id: `value:${path}`,
    type: 'value',
    position: { x, y },
    data: {
      label,
      valuePath: path,
    },
  };
}

/**
 * Create a helper node
 */
function createHelperNode(
  name: string,
  x: number,
  y: number
): GraphNode {
  return {
    id: `helper:${name}`,
    type: 'helper',
    position: { x, y },
    data: {
      label: name,
      helperName: name,
    },
  };
}

/**
 * Create a release info node
 */
function createReleaseNode(x: number, y: number): GraphNode {
  return {
    id: 'release:info',
    type: 'release',
    position: { x, y },
    data: {
      label: '.Release',
    },
  };
}

/**
 * Create an edge from a reference
 */
function createEdge(ref: Reference, chart: HelmChart): GraphEdge | null {
  const sourceId = `file:${ref.source.file}`;
  let targetId: string;
  
  switch (ref.type) {
    case 'values':
      targetId = `value:${ref.target.path}`;
      break;
    
    case 'include':
    case 'template':
      targetId = `helper:${ref.target.path}`;
      break;
    
    case 'chart': {
      const chartFile = chart.files.find(f => f.type === 'chart');
      targetId = chartFile ? `file:${chartFile.path}` : '';
      break;
    }
    
    case 'release':
      targetId = 'release:info';
      break;
    
    default:
      return null;
  }
  
  if (!targetId) return null;
  
  return {
    id: ref.id,
    source: sourceId,
    target: targetId,
    label: ref.expression,
    type: 'smoothstep',
    animated: false,
    data: {
      referenceType: ref.type,
      expression: ref.expression,
    },
  };
}

/**
 * Get unique value paths that are referenced
 */
function getReferencedValuePaths(chart: HelmChart): string[] {
  const paths = new Set<string>();
  
  chart.references
    .filter(ref => ref.type === 'values')
    .forEach(ref => {
      paths.add(ref.target.path);
    });
  
  return Array.from(paths);
}

/**
 * Auto-organize layout with smart positioning
 * Groups nodes by type, minimizes edge crossings, and creates a clean hierarchical layout
 */
export function autoOrganizeLayout(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] {
  // Build adjacency information
  const outgoingEdges = new Map<string, string[]>();
  const incomingEdges = new Map<string, string[]>();
  
  edges.forEach(edge => {
    const sources = outgoingEdges.get(edge.source) || [];
    sources.push(edge.target);
    outgoingEdges.set(edge.source, sources);
    
    const targets = incomingEdges.get(edge.target) || [];
    targets.push(edge.source);
    incomingEdges.set(edge.target, targets);
  });
  
  // Define columns: source files -> meta (chart/release) -> values -> helpers
  // Using large spacing (500px) between columns for better readability
  const columns: { types: string[], x: number }[] = [
    { types: ['file'], x: 0 },                    // Template files
    { types: ['chart', 'release'], x: 500 },      // Chart & Release
    { types: ['value'], x: 1000 },                // Values
    { types: ['helper'], x: 1600 },               // Helpers
  ];
  
  // Group nodes into columns
  const columnNodes: GraphNode[][] = columns.map(() => []);
  const nodeToColumn = new Map<string, number>();
  
  nodes.forEach(node => {
    // Determine which column this node belongs to
    let columnIndex = 0;
    
    if (node.type === 'file') {
      const fileType = node.data.fileType as FileType;
      if (fileType === 'chart' || fileType === 'values') {
        columnIndex = 1; // Meta column for Chart.yaml and values.yaml file nodes
      } else {
        columnIndex = 0; // Template files
      }
    } else if (node.type === 'chart' || node.type === 'release') {
      columnIndex = 1;
    } else if (node.type === 'value') {
      columnIndex = 2;
    } else if (node.type === 'helper') {
      columnIndex = 3;
    }
    
    columnNodes[columnIndex].push(node);
    nodeToColumn.set(node.id, columnIndex);
  });
  
  // Sort nodes within each column to minimize edge crossings
  // Use barycenter heuristic: position nodes based on average position of connected nodes
  
  // First pass: sort by connection count (more connections = higher priority)
  columnNodes.forEach(col => {
    col.sort((a, b) => {
      const aConnections = (outgoingEdges.get(a.id)?.length || 0) + (incomingEdges.get(a.id)?.length || 0);
      const bConnections = (outgoingEdges.get(b.id)?.length || 0) + (incomingEdges.get(b.id)?.length || 0);
      return bConnections - aConnections; // More connections first
    });
  });
  
  // Assign initial Y positions
  const nodePositions = new Map<string, { x: number, y: number }>();
  
  columnNodes.forEach((col, colIndex) => {
    const x = columns[colIndex].x;
    col.forEach((node, rowIndex) => {
      nodePositions.set(node.id, { 
        x, 
        y: rowIndex * DEFAULT_LAYOUT.verticalSpacing 
      });
    });
  });
  
  // Iterative refinement: adjust Y positions to reduce edge crossings
  for (let iteration = 0; iteration < 5; iteration++) {
    // Process columns left to right, then right to left
    for (let colIndex = 1; colIndex < columnNodes.length; colIndex++) {
      optimizeColumnOrder(columnNodes[colIndex], nodePositions, incomingEdges, outgoingEdges);
    }
    for (let colIndex = columnNodes.length - 2; colIndex >= 0; colIndex--) {
      optimizeColumnOrder(columnNodes[colIndex], nodePositions, incomingEdges, outgoingEdges);
    }
  }
  
  // Group values by their top-level key for better organization
  const valueNodes = columnNodes[2];
  if (valueNodes.length > 0) {
    const valueGroups = groupValueNodesByPrefix(valueNodes);
    let currentY = 0;
    
    valueGroups.forEach((group) => {
      // Sort within group by path depth then alphabetically
      group.sort((a, b) => {
        const aPath = a.data.valuePath || '';
        const bPath = b.data.valuePath || '';
        const aDepth = aPath.split('.').length;
        const bDepth = bPath.split('.').length;
        if (aDepth !== bDepth) return aDepth - bDepth;
        return aPath.localeCompare(bPath);
      });
      
      group.forEach((node, idx) => {
        const pos = nodePositions.get(node.id)!;
        const indent = (node.data.valuePath?.split('.').length || 1) > 1 ? 30 : 0;
        nodePositions.set(node.id, { 
          x: pos.x + indent, 
          y: currentY + idx * (DEFAULT_LAYOUT.verticalSpacing * 0.7)
        });
      });
      
      currentY += group.length * (DEFAULT_LAYOUT.verticalSpacing * 0.7) + DEFAULT_LAYOUT.groupPadding;
    });
  }
  
  // Center all columns vertically
  centerColumnsVertically(columnNodes, nodePositions);
  
  // Apply positions to nodes
  return nodes.map(node => ({
    ...node,
    position: nodePositions.get(node.id) || node.position,
  }));
}

/**
 * Optimize the order of nodes in a column using barycenter method
 */
function optimizeColumnOrder(
  columnNodes: GraphNode[],
  nodePositions: Map<string, { x: number, y: number }>,
  incomingEdges: Map<string, string[]>,
  outgoingEdges: Map<string, string[]>
): void {
  // Calculate barycenter for each node
  const barycenters = columnNodes.map(node => {
    const connectedNodes = [
      ...(incomingEdges.get(node.id) || []),
      ...(outgoingEdges.get(node.id) || [])
    ];
    
    if (connectedNodes.length === 0) {
      return { node, barycenter: Infinity };
    }
    
    const sum = connectedNodes.reduce((acc, connectedId) => {
      const pos = nodePositions.get(connectedId);
      return acc + (pos?.y || 0);
    }, 0);
    
    return { node, barycenter: sum / connectedNodes.length };
  });
  
  // Sort by barycenter
  barycenters.sort((a, b) => a.barycenter - b.barycenter);
  
  // Reassign positions
  const x = nodePositions.get(columnNodes[0]?.id)?.x || 0;
  barycenters.forEach(({ node }, index) => {
    nodePositions.set(node.id, { x, y: index * DEFAULT_LAYOUT.verticalSpacing });
  });
}

/**
 * Group value nodes by their top-level prefix
 */
function groupValueNodesByPrefix(nodes: GraphNode[]): GraphNode[][] {
  const groups = new Map<string, GraphNode[]>();
  
  nodes.forEach(node => {
    const path = node.data.valuePath || '';
    const topLevel = path.split('.')[0] || 'other';
    const group = groups.get(topLevel) || [];
    group.push(node);
    groups.set(topLevel, group);
  });
  
  // Sort groups by name
  const sortedGroups = Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, group]) => group);
  
  return sortedGroups;
}

/**
 * Center all columns vertically relative to each other
 */
function centerColumnsVertically(
  columnNodes: GraphNode[][],
  nodePositions: Map<string, { x: number, y: number }>
): void {
  // Find the maximum height across all columns
  let maxHeight = 0;
  
  columnNodes.forEach(col => {
    if (col.length === 0) return;
    
    let minY = Infinity;
    let maxY = -Infinity;
    
    col.forEach(node => {
      const pos = nodePositions.get(node.id);
      if (pos) {
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y);
      }
    });
    
    maxHeight = Math.max(maxHeight, maxY - minY);
  });
  
  // Center each column
  columnNodes.forEach(col => {
    if (col.length === 0) return;
    
    let minY = Infinity;
    let maxY = -Infinity;
    
    col.forEach(node => {
      const pos = nodePositions.get(node.id);
      if (pos) {
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y);
      }
    });
    
    const colHeight = maxY - minY;
    const offset = (maxHeight - colHeight) / 2 - minY;
    
    col.forEach(node => {
      const pos = nodePositions.get(node.id);
      if (pos) {
        nodePositions.set(node.id, { x: pos.x, y: pos.y + offset });
      }
    });
  });
}

/**
 * Legacy function for compatibility - now just calls autoOrganizeLayout
 */
export function calculateLayout(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] {
  return autoOrganizeLayout(nodes, edges);
}

/**
 * Filter graph to show only connections related to a specific file
 */
export function filterGraphByFile(
  graphData: GraphData,
  filePath: string
): GraphData {
  const fileNodeId = `file:${filePath}`;
  
  const connectedEdges = graphData.edges.filter(
    edge => edge.source === fileNodeId || edge.target === fileNodeId
  );
  
  const connectedNodeIds = new Set<string>([fileNodeId]);
  connectedEdges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });
  
  const filteredNodes = graphData.nodes.filter(node => 
    connectedNodeIds.has(node.id)
  );
  
  return {
    nodes: filteredNodes,
    edges: connectedEdges,
  };
}

/**
 * Get statistics about the graph
 */
export function getGraphStats(graphData: GraphData) {
  const nodesByType = new Map<string, number>();
  const edgesByType = new Map<string, number>();
  
  graphData.nodes.forEach(node => {
    const count = nodesByType.get(node.type) || 0;
    nodesByType.set(node.type, count + 1);
  });
  
  graphData.edges.forEach(edge => {
    const type = edge.data?.referenceType || 'unknown';
    const count = edgesByType.get(type) || 0;
    edgesByType.set(type, count + 1);
  });
  
  return {
    totalNodes: graphData.nodes.length,
    totalEdges: graphData.edges.length,
    nodesByType: Object.fromEntries(nodesByType),
    edgesByType: Object.fromEntries(edgesByType),
  };
}
