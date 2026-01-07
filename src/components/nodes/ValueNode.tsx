import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { NodeData } from '../../types';

interface ValueNodeData extends NodeData {
  valuePath: string;
  valueType?: string;
}

function ValueNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ValueNodeData;

  return (
    <div
      className={`
        px-3 py-2 rounded-md border-2 min-w-[120px]
        transition-all duration-200
        bg-helm-purple/10 border-helm-purple/60
        ${selected ? 'ring-2 ring-helm-accent ring-offset-2 ring-offset-helm-bg' : ''}
        ${nodeData.isHighlighted ? 'shadow-lg shadow-helm-purple/30' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-helm-purple !border-helm-bg !w-2.5 !h-2.5"
      />
      
      <div className="flex items-center gap-2">
        <span className="text-helm-purple text-xs font-mono">.Values.</span>
        <span className="text-sm font-mono text-helm-text">
          {nodeData.label}
        </span>
      </div>
      
      {nodeData.valueType && (
        <span className="text-xs text-helm-text/40 font-mono">
          {nodeData.valueType}
        </span>
      )}
      
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-helm-purple !border-helm-bg !w-2.5 !h-2.5"
      />
    </div>
  );
}

export default memo(ValueNode);

