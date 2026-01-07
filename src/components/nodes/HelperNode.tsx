import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { NodeData } from '../../types';

interface HelperNodeData extends NodeData {
  helperName: string;
}

function HelperNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as HelperNodeData;

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 min-w-[160px]
        transition-all duration-200
        bg-helm-cyan/20 border-helm-cyan
        ${selected ? 'ring-2 ring-helm-accent ring-offset-2 ring-offset-helm-bg' : ''}
        ${nodeData.isHighlighted ? 'shadow-lg shadow-helm-cyan/30' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-helm-cyan !border-helm-bg !w-3 !h-3"
      />
      
      <div className="flex items-center gap-2">
        <span className="text-lg">🔧</span>
        <div className="flex flex-col">
          <span className="text-xs text-helm-cyan font-mono">define</span>
          <span className="text-sm font-mono text-helm-text truncate max-w-[140px]">
            "{nodeData.label}"
          </span>
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-helm-cyan !border-helm-bg !w-3 !h-3"
      />
    </div>
  );
}

export default memo(HelperNode);

