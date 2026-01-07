import { HelmChart, HelmFile, FileType, Reference, HelperDefinition, ValuesData, ChartYaml } from '../types';
import { parseChartYaml, parseValuesYaml } from './yaml-parser';
import { extractReferences, extractHelperDefinitions } from './template-parser';

/**
 * Parse a Helm chart from a map of file paths to contents
 */
export function parseHelmChart(files: Map<string, string>): HelmChart {
  const helmFiles: HelmFile[] = [];
  let chartYaml: ChartYaml | null = null;
  let values: ValuesData = { raw: {}, flatKeys: [] };
  const allReferences: Reference[] = [];
  const allHelpers: HelperDefinition[] = [];

  // Normalize paths and parse each file
  for (const [rawPath, content] of files.entries()) {
    // Normalize the path (remove leading slashes, handle different OS paths)
    const path = normalizePath(rawPath);
    const name = getFileName(path);
    const fileType = determineFileType(path);

    // Skip non-relevant files
    if (!isRelevantFile(path)) continue;

    const helmFile: HelmFile = {
      path,
      name,
      type: fileType,
      content,
    };
    helmFiles.push(helmFile);

    // Parse specific file types
    switch (fileType) {
      case 'chart':
        chartYaml = parseChartYaml(content);
        break;
      
      case 'values':
        values = parseValuesYaml(content);
        break;
      
      case 'template':
        const templateRefs = extractReferences(content, path);
        allReferences.push(...templateRefs);
        break;
      
      case 'helper':
        const helpers = extractHelperDefinitions(content, path);
        allHelpers.push(...helpers);
        // Also extract references from helpers
        const helperRefs = extractReferences(content, path);
        allReferences.push(...helperRefs);
        break;
      
      case 'notes':
        // NOTES.txt can also have template expressions
        const notesRefs = extractReferences(content, path);
        allReferences.push(...notesRefs);
        break;
    }
  }

  // Create default chart yaml if not found
  if (!chartYaml) {
    chartYaml = {
      name: 'unknown-chart',
      version: '0.0.0',
      apiVersion: 'v2',
    };
  }

  return {
    name: chartYaml.name,
    version: chartYaml.version,
    description: chartYaml.description,
    files: helmFiles,
    values,
    chartYaml,
    references: allReferences,
    helpers: allHelpers,
    dependencies: chartYaml.dependencies || [],
  };
}

/**
 * Normalize file path for consistent handling
 */
function normalizePath(path: string): string {
  // Remove leading slash
  let normalized = path.replace(/^\/+/, '');
  
  // Convert backslashes to forward slashes
  normalized = normalized.replace(/\\/g, '/');
  
  // Remove the root folder name if present (the dropped folder name)
  const parts = normalized.split('/');
  if (parts.length > 1) {
    // Keep the path relative to the chart root
    // e.g., "mychart/templates/deployment.yaml" -> "templates/deployment.yaml"
    const chartIndicators = ['Chart.yaml', 'Chart.yml', 'values.yaml', 'values.yml', 'templates'];
    const hasChartIndicator = parts.some(p => chartIndicators.includes(p));
    
    if (hasChartIndicator && parts.length > 1) {
      // Find where the chart root starts
      const chartYamlIndex = parts.findIndex(p => 
        p === 'Chart.yaml' || p === 'Chart.yml'
      );
      
      if (chartYamlIndex > 0) {
        // Remove folders before Chart.yaml
        normalized = parts.slice(chartYamlIndex - 1 + 1).join('/');
      } else {
        // Just remove the first folder (assumed to be the chart folder name)
        normalized = parts.slice(1).join('/');
      }
    }
  }
  
  return normalized;
}

/**
 * Get the file name from a path
 */
function getFileName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1];
}

/**
 * Determine the type of a Helm file based on its path
 */
function determineFileType(path: string): FileType {
  const lowerPath = path.toLowerCase();
  const fileName = getFileName(path).toLowerCase();
  
  if (fileName === 'chart.yaml' || fileName === 'chart.yml') {
    return 'chart';
  }
  
  if (fileName === 'values.yaml' || fileName === 'values.yml') {
    return 'values';
  }
  
  if (fileName.endsWith('.tpl')) {
    return 'helper';
  }
  
  if (fileName === 'notes.txt') {
    return 'notes';
  }
  
  if (lowerPath.includes('templates/') && (fileName.endsWith('.yaml') || fileName.endsWith('.yml'))) {
    return 'template';
  }
  
  return 'other';
}

/**
 * Check if a file is relevant for parsing
 */
function isRelevantFile(path: string): boolean {
  const lowerPath = path.toLowerCase();
  const fileName = getFileName(path).toLowerCase();
  
  // Include Chart.yaml and values.yaml
  if (fileName === 'chart.yaml' || fileName === 'chart.yml') return true;
  if (fileName === 'values.yaml' || fileName === 'values.yml') return true;
  
  // Include template files
  if (lowerPath.includes('templates/')) {
    if (fileName.endsWith('.yaml') || fileName.endsWith('.yml') || fileName.endsWith('.tpl') || fileName === 'notes.txt') {
      return true;
    }
  }
  
  // Exclude hidden files and directories
  if (fileName.startsWith('.')) return false;
  
  // Exclude charts directory (subcharts have their own parsing)
  if (lowerPath.includes('charts/')) return false;
  
  return false;
}

/**
 * Get all unique value paths referenced in templates
 */
export function getReferencedValuePaths(chart: HelmChart): string[] {
  const paths = new Set<string>();
  
  chart.references
    .filter(ref => ref.type === 'values')
    .forEach(ref => paths.add(ref.target.path));
  
  return Array.from(paths);
}

/**
 * Get all unique helper names referenced in templates
 */
export function getReferencedHelperNames(chart: HelmChart): string[] {
  const names = new Set<string>();
  
  chart.references
    .filter(ref => ref.type === 'include' || ref.type === 'template')
    .forEach(ref => names.add(ref.target.path));
  
  return Array.from(names);
}

/**
 * Find references from a specific file
 */
export function getReferencesFromFile(chart: HelmChart, filePath: string): Reference[] {
  return chart.references.filter(ref => ref.source.file === filePath);
}

/**
 * Find references to a specific value path
 */
export function getReferencesToValue(chart: HelmChart, valuePath: string): Reference[] {
  return chart.references.filter(ref => 
    ref.type === 'values' && ref.target.path === valuePath
  );
}

/**
 * Find references to a specific helper
 */
export function getReferencesToHelper(chart: HelmChart, helperName: string): Reference[] {
  return chart.references.filter(ref => 
    (ref.type === 'include' || ref.type === 'template') && 
    ref.target.path === helperName
  );
}

