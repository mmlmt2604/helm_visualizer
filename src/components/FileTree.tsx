import { useMemo, useState } from 'react';
import { HelmChart, HelmFile, FileType, FileTreeItem } from '../types';

interface FileTreeProps {
  chart: HelmChart;
  selectedFile: string | null;
  onSelectFile: (file: string | null) => void;
}

const fileTypeIcons: Record<FileType, string> = {
  chart: '📊',
  values: '⚙️',
  template: '📄',
  helper: '🔧',
  notes: '📝',
  other: '📁',
};

const fileTypeColors: Record<FileType, string> = {
  chart: 'text-helm-green',
  values: 'text-helm-purple',
  template: 'text-helm-orange',
  helper: 'text-helm-cyan',
  notes: 'text-helm-text',
  other: 'text-helm-text/60',
};

export default function FileTree({ chart, selectedFile, onSelectFile }: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['templates']));

  // Build tree structure from flat files
  const fileTree = useMemo(() => {
    return buildFileTree(chart.files);
  }, [chart.files]);

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderTreeItem = (item: FileTreeItem, depth: number = 0) => {
    const isExpanded = expandedFolders.has(item.path);
    const isSelected = item.type === 'file' && item.path === selectedFile;
    const paddingLeft = depth * 16 + 12;

    if (item.type === 'folder') {
      return (
        <div key={item.path}>
          <button
            onClick={() => toggleFolder(item.path)}
            className={`
              w-full flex items-center gap-2 py-1.5 px-3 text-left
              text-helm-text hover:bg-helm-border/30 transition-colors
            `}
            style={{ paddingLeft }}
          >
            <span className={`text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
              ▶
            </span>
            <span className="text-sm">📁</span>
            <span className="text-sm truncate">{item.name}</span>
          </button>
          {isExpanded && item.children && (
            <div>
              {item.children.map((child) => renderTreeItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    const icon = fileTypeIcons[item.fileType || 'other'];
    const colorClass = fileTypeColors[item.fileType || 'other'];

    return (
      <button
        key={item.path}
        onClick={() => onSelectFile(isSelected ? null : item.path)}
        className={`
          w-full flex items-center gap-2 py-1.5 px-3 text-left
          transition-colors
          ${isSelected 
            ? 'bg-helm-accent/20 text-helm-accent' 
            : 'text-helm-text hover:bg-helm-border/30'
          }
        `}
        style={{ paddingLeft }}
      >
        <span className="text-sm">{icon}</span>
        <span className={`text-sm truncate ${colorClass}`}>{item.name}</span>
      </button>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-helm-border">
        <h2 className="text-sm font-semibold text-helm-text/80 uppercase tracking-wider">
          Files
        </h2>
        <p className="text-xs text-helm-text/40 mt-1">
          {chart.files.length} files in chart
        </p>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-2">
        {fileTree.map((item) => renderTreeItem(item))}
      </div>

      {/* Reference Summary */}
      <div className="p-4 border-t border-helm-border">
        <h3 className="text-xs font-semibold text-helm-text/60 mb-2 uppercase tracking-wider">
          References
        </h3>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-helm-text/60">
            <span>.Values.*</span>
            <span className="text-helm-purple">
              {chart.references.filter(r => r.type === 'values').length}
            </span>
          </div>
          <div className="flex justify-between text-helm-text/60">
            <span>include/template</span>
            <span className="text-helm-cyan">
              {chart.references.filter(r => r.type === 'include' || r.type === 'template').length}
            </span>
          </div>
          <div className="flex justify-between text-helm-text/60">
            <span>.Chart.*</span>
            <span className="text-helm-green">
              {chart.references.filter(r => r.type === 'chart').length}
            </span>
          </div>
          <div className="flex justify-between text-helm-text/60">
            <span>.Release.*</span>
            <span className="text-helm-accent">
              {chart.references.filter(r => r.type === 'release').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Build a tree structure from flat file list
 */
function buildFileTree(files: HelmFile[]): FileTreeItem[] {
  const root: Map<string, FileTreeItem> = new Map();

  // Sort files by path for consistent ordering
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

  sortedFiles.forEach((file) => {
    const parts = file.path.split('/');
    let currentLevel = root;

    parts.forEach((part, index) => {
      const isLastPart = index === parts.length - 1;
      const currentPath = parts.slice(0, index + 1).join('/');

      if (isLastPart) {
        // This is a file
        const item: FileTreeItem = {
          name: part,
          path: file.path,
          type: 'file',
          fileType: file.type,
        };
        currentLevel.set(part, item);
      } else {
        // This is a folder
        let folder = currentLevel.get(part);
        if (!folder) {
          folder = {
            name: part,
            path: currentPath,
            type: 'folder',
            children: [],
          };
          currentLevel.set(part, folder);
        }
        // Move to next level
        if (!folder.children) {
          folder.children = [];
        }
        // Convert children array to map for easier lookup
        const childMap = new Map<string, FileTreeItem>();
        folder.children.forEach((child) => childMap.set(child.name, child));
        currentLevel = childMap;
        // Update folder children from map
        folder.children = Array.from(childMap.values());
      }
    });
  });

  // Convert root map to array and sort
  return Array.from(root.values()).sort((a, b) => {
    // Folders first, then files
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

