import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { NodeData } from '../../types';

function ChartNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as NodeData;

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 min-w-[140px]
        transition-all duration-200
        bg-helm-green/20 border-helm-green
        ${selected ? 'ring-2 ring-helm-accent ring-offset-2 ring-offset-helm-bg' : ''}
        ${nodeData.isHighlighted ? 'shadow-lg shadow-helm-green/30' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-helm-green !border-helm-bg !w-3 !h-3"
      />
      
      <div className="flex items-center gap-2">
        <span className="text-lg">📊</span>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-helm-text">
            {nodeData.label}
          </span>
          <span className="text-xs text-helm-text/50">.Chart.*</span>
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-helm-green !border-helm-bg !w-3 !h-3"
      />
    </div>
  );
}

export default memo(ChartNode);

