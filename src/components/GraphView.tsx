import { useCallback, useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Node,
  Edge,
  ConnectionMode,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { HelmChart, GraphNode, GraphEdge } from '../types';
import { buildGraphData, autoOrganizeLayout } from '../graph/graph-builder';
import { FileNode, ValueNode, ChartNode, ReleaseNode, HelperNode } from './nodes';

interface GraphViewProps {
  chart: HelmChart;
  selectedFile: string | null;
  onSelectFile: (file: string | null) => void;
}

const nodeTypes = {
  file: FileNode,
  value: ValueNode,
  chart: ChartNode,
  release: ReleaseNode,
  helper: HelperNode,
};

// Custom edge styles based on reference type
const getEdgeStyle = (referenceType: string) => {
  switch (referenceType) {
    case 'values':
      return { stroke: '#a371f7', strokeWidth: 2 };
    case 'include':
    case 'template':
      return { stroke: '#39c5cf', strokeWidth: 2 };
    case 'chart':
      return { stroke: '#3fb950', strokeWidth: 2 };
    case 'release':
      return { stroke: '#58a6ff', strokeWidth: 2 };
    default:
      return { stroke: '#30363d', strokeWidth: 1 };
  }
};

export default function GraphView({ chart, selectedFile, onSelectFile }: GraphViewProps) {
  const { fitView } = useReactFlow();
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false);
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(false);
  
  // Build initial graph data
  const initialGraphData = useMemo(() => {
    return buildGraphData(chart);
  }, [chart]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialGraphData.nodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraphData.edges as Edge[]);

  // Update nodes/edges when chart changes
  useEffect(() => {
    const data = buildGraphData(chart);
    setNodes(data.nodes as Node[]);
    setEdges(data.edges as Edge[]);
    // Fit view after a short delay to allow React Flow to render
    // Use larger padding to avoid overlap with UI panels
    setTimeout(() => fitView({ padding: 0.3 }), 100);
  }, [chart, setNodes, setEdges, fitView]);

  // Auto-organize handler
  const handleAutoOrganize = useCallback(() => {
    setNodes((currentNodes) => {
      // Convert to GraphNode type for the layout function
      const graphNodes = currentNodes.map(n => ({
        id: n.id,
        type: n.type || 'file',
        position: n.position,
        data: n.data,
      })) as GraphNode[];
      
      const graphEdges = edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        type: e.type,
        animated: e.animated,
        data: e.data,
      })) as GraphEdge[];
      
      const organized = autoOrganizeLayout(graphNodes, graphEdges);
      
      // Fit view after organizing with larger padding
      setTimeout(() => fitView({ padding: 0.3, duration: 500 }), 50);
      
      return organized as Node[];
    });
  }, [edges, setNodes, fitView]);

  // Highlight connected nodes when a file is selected
  useEffect(() => {
    if (!selectedFile) {
      // Reset all nodes to non-highlighted
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          data: { ...node.data, isHighlighted: false },
        }))
      );
      setEdges((eds) =>
        eds.map((edge) => {
          const edgeData = edge.data as Record<string, unknown> | undefined;
          return {
            ...edge,
            animated: false,
            style: getEdgeStyle(String(edgeData?.referenceType || '')),
          };
        })
      );
      return;
    }

    const selectedNodeId = `file:${selectedFile}`;

    // Find connected edges
    const connectedEdgeIds = new Set<string>();
    const connectedNodeIds = new Set<string>([selectedNodeId]);

    edges.forEach((edge) => {
      if (edge.source === selectedNodeId || edge.target === selectedNodeId) {
        connectedEdgeIds.add(edge.id);
        connectedNodeIds.add(edge.source);
        connectedNodeIds.add(edge.target);
      }
    });

    // Update nodes
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isHighlighted: connectedNodeIds.has(node.id),
        },
      }))
    );

    // Update edges
    setEdges((eds) =>
      eds.map((edge) => {
        const edgeData = edge.data as Record<string, unknown> | undefined;
        return {
          ...edge,
          animated: connectedEdgeIds.has(edge.id),
          style: {
            ...getEdgeStyle(String(edgeData?.referenceType || '')),
            opacity: connectedEdgeIds.has(edge.id) ? 1 : 0.2,
          },
        };
      })
    );
  }, [selectedFile, edges, setNodes, setEdges]);

  // Handle node click
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.id.startsWith('file:')) {
        const filePath = node.id.replace('file:', '');
        onSelectFile(filePath === selectedFile ? null : filePath);
      }
    },
    [onSelectFile, selectedFile]
  );

  // Handle background click to deselect
  const onPaneClick = useCallback(() => {
    onSelectFile(null);
  }, [onSelectFile]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
        }}
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1} 
          color="#30363d" 
        />
        <Controls 
          className="!bg-helm-surface !border-helm-border !rounded-lg"
          showInteractive={false}
          position="bottom-right"
        />
        <MiniMap
          className="!bg-helm-surface !border-helm-border !rounded-lg"
          nodeColor={(node) => {
            switch (node.type) {
              case 'file':
                return '#d29922';
              case 'value':
                return '#a371f7';
              case 'chart':
                return '#3fb950';
              case 'release':
                return '#58a6ff';
              case 'helper':
                return '#39c5cf';
              default:
                return '#30363d';
            }
          }}
          maskColor="rgba(13, 17, 23, 0.8)"
          position="top-right"
        />
        
        {/* Top toolbar panel */}
        <Panel position="top-center" className="flex gap-2">
          <button
            onClick={handleAutoOrganize}
            className="flex items-center gap-2 px-4 py-2 bg-helm-surface border border-helm-border rounded-lg
                       text-helm-text text-sm font-medium hover:bg-helm-accent/20 hover:border-helm-accent
                       transition-all duration-200 shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Auto Organize
          </button>
          <button
            onClick={() => fitView({ padding: 0.3, duration: 500 })}
            className="flex items-center gap-2 px-4 py-2 bg-helm-surface border border-helm-border rounded-lg
                       text-helm-text text-sm font-medium hover:bg-helm-accent/20 hover:border-helm-accent
                       transition-all duration-200 shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            Fit View
          </button>
        </Panel>

        {/* Legend Panel - Collapsible */}
        <Panel position="bottom-left" className="pointer-events-auto">
          <div className="bg-helm-surface/95 backdrop-blur-sm border border-helm-border rounded-lg shadow-lg overflow-hidden">
            <button
              onClick={() => setIsLegendCollapsed(!isLegendCollapsed)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-helm-border/30 transition-colors"
            >
              <h3 className="text-xs font-semibold text-helm-text/60 uppercase tracking-wider">
                Legend
              </h3>
              <svg 
                className={`w-4 h-4 text-helm-text/60 transition-transform ${isLegendCollapsed ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {!isLegendCollapsed && (
              <div className="px-3 pb-3 flex flex-col gap-1.5 text-xs border-t border-helm-border/50">
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-3 h-3 rounded bg-helm-orange" />
                  <span className="text-helm-text">Templates</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-helm-purple" />
                  <span className="text-helm-text">Values</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-helm-green" />
                  <span className="text-helm-text">Chart</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-helm-accent" />
                  <span className="text-helm-text">Release</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-helm-cyan" />
                  <span className="text-helm-text">Helpers</span>
                </div>
              </div>
            )}
          </div>
        </Panel>

        {/* Stats Panel - Collapsible */}
        <Panel position="top-left" className="pointer-events-auto">
          <div className="bg-helm-surface/95 backdrop-blur-sm border border-helm-border rounded-lg shadow-lg overflow-hidden">
            <button
              onClick={() => setIsStatsCollapsed(!isStatsCollapsed)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-helm-border/30 transition-colors"
            >
              <h3 className="text-xs font-semibold text-helm-text/60 uppercase tracking-wider">
                {chart.name}
              </h3>
              <svg 
                className={`w-4 h-4 text-helm-text/60 transition-transform ${isStatsCollapsed ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {!isStatsCollapsed && (
              <div className="px-3 pb-3 border-t border-helm-border/50">
                <p className="text-helm-text/60 text-xs mt-2">v{chart.version}</p>
                <div className="mt-2 pt-2 border-t border-helm-border/50 text-xs text-helm-text/60 space-y-0.5">
                  <p>{chart.files.length} files</p>
                  <p>{chart.references.length} refs</p>
                  <p>{chart.helpers.length} helpers</p>
                </div>
              </div>
            )}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
