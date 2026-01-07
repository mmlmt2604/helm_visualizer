import { useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import DropZone from './components/DropZone';
import GraphView from './components/GraphView';
import FileTree from './components/FileTree';
import { HelmChart } from './types';
import { parseHelmChart } from './parser/helm-parser';

function App() {
  const [helmChart, setHelmChart] = useState<HelmChart | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFilesDropped = async (files: Map<string, string>) => {
    setIsLoading(true);
    try {
      const chart = parseHelmChart(files);
      setHelmChart(chart);
    } catch (error) {
      console.error('Error parsing Helm chart:', error);
    }
    setIsLoading(false);
  };

  const handleReset = () => {
    setHelmChart(null);
    setSelectedFile(null);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-helm-bg overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 h-14 border-b border-helm-border bg-helm-surface flex items-center px-6 justify-between">
        <div className="flex items-center gap-3">
          <img src="/helm.svg" alt="Helm" className="w-8 h-8" />
          <h1 className="text-xl font-semibold text-helm-text">
            Helm Chart Visualizer
          </h1>
        </div>
        {helmChart && (
          <button
            onClick={handleReset}
            className="px-4 py-1.5 text-sm bg-helm-border hover:bg-helm-red/20 hover:border-helm-red text-helm-text rounded-md border border-helm-border transition-colors"
          >
            Reset
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {!helmChart ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <DropZone onFilesDropped={handleFilesDropped} isLoading={isLoading} />
          </div>
        ) : (
          <>
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0 border-r border-helm-border bg-helm-surface overflow-y-auto">
              <FileTree
                chart={helmChart}
                selectedFile={selectedFile}
                onSelectFile={setSelectedFile}
              />
            </aside>

            {/* Graph View */}
            <div className="flex-1 relative">
              <ReactFlowProvider>
                <GraphView
                  chart={helmChart}
                  selectedFile={selectedFile}
                  onSelectFile={setSelectedFile}
                />
              </ReactFlowProvider>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;

