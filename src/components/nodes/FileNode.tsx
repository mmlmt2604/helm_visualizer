import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { NodeData, FileType } from '../../types';

const fileTypeColors: Record<FileType, { bg: string; border: string; icon: string }> = {
  chart: { bg: 'bg-helm-green/20', border: 'border-helm-green', icon: '📊' },
  values: { bg: 'bg-helm-purple/20', border: 'border-helm-purple', icon: '⚙️' },
  template: { bg: 'bg-helm-orange/20', border: 'border-helm-orange', icon: '📄' },
  helper: { bg: 'bg-helm-cyan/20', border: 'border-helm-cyan', icon: '🔧' },
  notes: { bg: 'bg-helm-text/20', border: 'border-helm-text', icon: '📝' },
  other: { bg: 'bg-helm-border/50', border: 'border-helm-border', icon: '📁' },
};

interface FileNodeData extends NodeData {
  fileType: FileType;
  filePath: string;
}

function FileNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as FileNodeData;
  const colors = fileTypeColors[nodeData.fileType] || fileTypeColors.other;

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 min-w-[160px]
        transition-all duration-200
        ${colors.bg} ${colors.border}
        ${selected ? 'ring-2 ring-helm-accent ring-offset-2 ring-offset-helm-bg' : ''}
        ${nodeData.isHighlighted ? 'shadow-lg shadow-helm-accent/30' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-helm-accent !border-helm-bg !w-3 !h-3"
      />
      
      <div className="flex items-center gap-2">
        <span className="text-lg">{colors.icon}</span>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-helm-text truncate max-w-[140px]">
            {nodeData.label}
          </span>
          <span className="text-xs text-helm-text/50 truncate max-w-[140px]">
            {nodeData.filePath}
          </span>
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-helm-accent !border-helm-bg !w-3 !h-3"
      />
    </div>
  );
}

export default memo(FileNode);

