import { useState, useCallback, DragEvent } from 'react';

interface DropZoneProps {
  onFilesDropped: (files: Map<string, string>) => void;
  isLoading: boolean;
}

export default function DropZone({ onFilesDropped, isLoading }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const readFileEntry = async (entry: FileSystemFileEntry): Promise<{ path: string; content: string } | null> => {
    return new Promise((resolve) => {
      entry.file((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            path: entry.fullPath,
            content: reader.result as string,
          });
        };
        reader.onerror = () => resolve(null);
        reader.readAsText(file);
      }, () => resolve(null));
    });
  };

  const readDirectoryEntry = async (entry: FileSystemDirectoryEntry): Promise<Map<string, string>> => {
    const files = new Map<string, string>();
    const reader = entry.createReader();

    const readEntries = (): Promise<FileSystemEntry[]> => {
      return new Promise((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });
    };

    const processEntries = async () => {
      let entries = await readEntries();
      while (entries.length > 0) {
        for (const entry of entries) {
          if (entry.isFile) {
            const fileEntry = entry as FileSystemFileEntry;
            const result = await readFileEntry(fileEntry);
            if (result) {
              files.set(result.path, result.content);
            }
          } else if (entry.isDirectory) {
            const dirEntry = entry as FileSystemDirectoryEntry;
            const subFiles = await readDirectoryEntry(dirEntry);
            subFiles.forEach((content, path) => files.set(path, content));
          }
        }
        entries = await readEntries();
      }
    };

    await processEntries();
    return files;
  };

  const handleDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setError(null);

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) {
      setError('No files detected. Please drop a Helm chart folder.');
      return;
    }

    const files = new Map<string, string>();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const entry = item.webkitGetAsEntry();
      
      if (!entry) continue;

      if (entry.isDirectory) {
        const dirFiles = await readDirectoryEntry(entry as FileSystemDirectoryEntry);
        dirFiles.forEach((content, path) => files.set(path, content));
      } else if (entry.isFile) {
        const result = await readFileEntry(entry as FileSystemFileEntry);
        if (result) {
          files.set(result.path, result.content);
        }
      }
    }

    // Validate it's a Helm chart
    const hasChartYaml = Array.from(files.keys()).some(path => 
      path.toLowerCase().endsWith('chart.yaml') || path.toLowerCase().endsWith('chart.yml')
    );

    if (!hasChartYaml) {
      setError('No Chart.yaml found. Please drop a valid Helm chart folder.');
      return;
    }

    onFilesDropped(files);
  }, [onFilesDropped]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        w-full max-w-2xl aspect-video
        rounded-2xl border-2 border-dashed
        flex flex-col items-center justify-center gap-6
        transition-all duration-300 cursor-pointer
        ${isDragging 
          ? 'border-helm-accent bg-helm-accent/10 scale-105' 
          : 'border-helm-border hover:border-helm-accent/50 bg-helm-surface/50'
        }
      `}
    >
      {isLoading ? (
        <>
          <div className="w-16 h-16 border-4 border-helm-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-helm-text text-lg">Parsing Helm chart...</p>
        </>
      ) : (
        <>
          <div className="relative">
            <svg 
              className={`w-20 h-20 transition-transform duration-300 ${isDragging ? 'scale-110' : ''}`}
              viewBox="0 0 100 100" 
              fill="none"
            >
              {/* Folder icon */}
              <path
                d="M10 25 L10 80 L90 80 L90 35 L50 35 L40 25 Z"
                fill={isDragging ? '#58a6ff' : '#30363d'}
                className="transition-colors duration-300"
              />
              <path
                d="M10 35 L10 80 L90 80 L90 35 Z"
                fill={isDragging ? '#79c0ff' : '#484f58'}
                className="transition-colors duration-300"
              />
              {/* Upload arrow */}
              <path
                d="M50 45 L50 65 M40 55 L50 45 L60 55"
                stroke={isDragging ? '#ffffff' : '#8b949e'}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-colors duration-300"
              />
            </svg>
          </div>

          <div className="text-center">
            <p className="text-helm-text text-lg font-medium mb-2">
              {isDragging ? 'Drop your Helm chart here' : 'Drag & Drop Helm Chart'}
            </p>
            <p className="text-helm-text/60 text-sm">
              Drop a folder containing Chart.yaml, values.yaml, and templates/
            </p>
          </div>

          {error && (
            <div className="bg-helm-red/20 border border-helm-red/50 rounded-lg px-4 py-2">
              <p className="text-helm-red text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-4 text-xs text-helm-text/40">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-helm-green" />
              Chart.yaml
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-helm-purple" />
              values.yaml
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-helm-orange" />
              templates/
            </span>
          </div>
        </>
      )}
    </div>
  );
}

