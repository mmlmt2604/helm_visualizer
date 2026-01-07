import { Reference, ReferenceType, HelperDefinition } from '../types';

/**
 * Extract all references from a Helm template file
 */
export function extractReferences(content: string, filePath: string): Reference[] {
  const references: Reference[] = [];
  const lines = content.split('\n');
  
  lines.forEach((line, lineIndex) => {
    const lineNum = lineIndex + 1;
    
    // Extract .Values references
    const valueRefs = extractValuesReferences(line, filePath, lineNum);
    references.push(...valueRefs);
    
    // Extract include/template references
    const includeRefs = extractIncludeReferences(line, filePath, lineNum);
    references.push(...includeRefs);
    
    // Extract .Chart references
    const chartRefs = extractChartReferences(line, filePath, lineNum);
    references.push(...chartRefs);
    
    // Extract .Release references
    const releaseRefs = extractReleaseReferences(line, filePath, lineNum);
    references.push(...releaseRefs);
    
    // Extract .Files references
    const filesRefs = extractFilesReferences(line, filePath, lineNum);
    references.push(...filesRefs);
    
    // Extract .Capabilities references
    const capabilitiesRefs = extractCapabilitiesReferences(line, filePath, lineNum);
    references.push(...capabilitiesRefs);
  });
  
  return references;
}

/**
 * Extract .Values.* references
 */
function extractValuesReferences(line: string, filePath: string, lineNum: number): Reference[] {
  const references: Reference[] = [];
  
  // Match .Values.something.else patterns
  // Handles: .Values.foo, .Values.foo.bar, .Values.foo.bar.baz
  const regex = /\.Values((?:\.[a-zA-Z_][a-zA-Z0-9_]*|\[[^\]]+\])+)/g;
  let match;
  
  while ((match = regex.exec(line)) !== null) {
    const fullPath = match[0];
    // Remove leading dot and "Values." to get the path
    const path = match[1].replace(/^\./, '');
    
    references.push({
      id: `${filePath}:${lineNum}:values:${path}`,
      type: 'values',
      source: {
        file: filePath,
        line: lineNum,
      },
      target: {
        type: 'value',
        path: path,
      },
      expression: fullPath,
      line: lineNum,
    });
  }
  
  return references;
}

/**
 * Extract include and template references
 */
function extractIncludeReferences(line: string, filePath: string, lineNum: number): Reference[] {
  const references: Reference[] = [];
  
  // Match {{ include "helper-name" ... }}
  const includeRegex = /\{\{\s*(?:-\s*)?include\s+"([^"]+)"/g;
  let match;
  
  while ((match = includeRegex.exec(line)) !== null) {
    const helperName = match[1];
    references.push({
      id: `${filePath}:${lineNum}:include:${helperName}`,
      type: 'include',
      source: {
        file: filePath,
        line: lineNum,
      },
      target: {
        type: 'helper',
        path: helperName,
      },
      expression: match[0],
      line: lineNum,
    });
  }
  
  // Match {{ template "helper-name" ... }}
  const templateRegex = /\{\{\s*(?:-\s*)?template\s+"([^"]+)"/g;
  
  while ((match = templateRegex.exec(line)) !== null) {
    const helperName = match[1];
    references.push({
      id: `${filePath}:${lineNum}:template:${helperName}`,
      type: 'template',
      source: {
        file: filePath,
        line: lineNum,
      },
      target: {
        type: 'helper',
        path: helperName,
      },
      expression: match[0],
      line: lineNum,
    });
  }
  
  return references;
}

/**
 * Extract .Chart.* references
 */
function extractChartReferences(line: string, filePath: string, lineNum: number): Reference[] {
  const references: Reference[] = [];
  
  // Match .Chart.Name, .Chart.Version, etc.
  const regex = /\.Chart\.([a-zA-Z]+)/g;
  let match;
  
  while ((match = regex.exec(line)) !== null) {
    const property = match[1];
    references.push({
      id: `${filePath}:${lineNum}:chart:${property}`,
      type: 'chart',
      source: {
        file: filePath,
        line: lineNum,
      },
      target: {
        type: 'chart',
        path: property,
      },
      expression: match[0],
      line: lineNum,
    });
  }
  
  return references;
}

/**
 * Extract .Release.* references
 */
function extractReleaseReferences(line: string, filePath: string, lineNum: number): Reference[] {
  const references: Reference[] = [];
  
  // Match .Release.Name, .Release.Namespace, .Release.Service, etc.
  const regex = /\.Release\.([a-zA-Z]+)/g;
  let match;
  
  while ((match = regex.exec(line)) !== null) {
    const property = match[1];
    references.push({
      id: `${filePath}:${lineNum}:release:${property}`,
      type: 'release',
      source: {
        file: filePath,
        line: lineNum,
      },
      target: {
        type: 'release',
        path: property,
      },
      expression: match[0],
      line: lineNum,
    });
  }
  
  return references;
}

/**
 * Extract .Files.* references
 */
function extractFilesReferences(line: string, filePath: string, lineNum: number): Reference[] {
  const references: Reference[] = [];
  
  // Match .Files.Get, .Files.Glob, etc.
  const regex = /\.Files\.([a-zA-Z]+)\s*(?:"([^"]+)")?/g;
  let match;
  
  while ((match = regex.exec(line)) !== null) {
    const method = match[1];
    const arg = match[2] || '';
    references.push({
      id: `${filePath}:${lineNum}:files:${method}:${arg}`,
      type: 'files',
      source: {
        file: filePath,
        line: lineNum,
      },
      target: {
        type: 'file',
        path: arg || method,
      },
      expression: match[0],
      line: lineNum,
    });
  }
  
  return references;
}

/**
 * Extract .Capabilities.* references
 */
function extractCapabilitiesReferences(line: string, filePath: string, lineNum: number): Reference[] {
  const references: Reference[] = [];
  
  // Match .Capabilities.APIVersions, .Capabilities.KubeVersion, etc.
  const regex = /\.Capabilities((?:\.[a-zA-Z]+)+)/g;
  let match;
  
  while ((match = regex.exec(line)) !== null) {
    const path = match[1].replace(/^\./, '');
    references.push({
      id: `${filePath}:${lineNum}:capabilities:${path}`,
      type: 'capabilities',
      source: {
        file: filePath,
        line: lineNum,
      },
      target: {
        type: 'capability',
        path: path,
      },
      expression: match[0],
      line: lineNum,
    });
  }
  
  return references;
}

/**
 * Extract helper definitions from _helpers.tpl files
 */
export function extractHelperDefinitions(content: string, filePath: string): HelperDefinition[] {
  const helpers: HelperDefinition[] = [];
  
  // Match {{- define "helper-name" -}} or {{ define "helper-name" }}
  const defineRegex = /\{\{-?\s*define\s+"([^"]+)"\s*-?\}\}([\s\S]*?)\{\{-?\s*end\s*-?\}\}/g;
  let match;
  
  while ((match = defineRegex.exec(content)) !== null) {
    const name = match[1];
    const helperContent = match[2].trim();
    
    // Calculate line number
    const beforeMatch = content.substring(0, match.index);
    const lineNum = (beforeMatch.match(/\n/g) || []).length + 1;
    
    helpers.push({
      name,
      file: filePath,
      line: lineNum,
      content: helperContent,
    });
  }
  
  return helpers;
}

/**
 * Get unique reference types from an array of references
 */
export function getUniqueReferenceTypes(references: Reference[]): ReferenceType[] {
  const types = new Set<ReferenceType>();
  references.forEach(ref => types.add(ref.type));
  return Array.from(types);
}

/**
 * Group references by their type
 */
export function groupReferencesByType(references: Reference[]): Map<ReferenceType, Reference[]> {
  const grouped = new Map<ReferenceType, Reference[]>();
  
  references.forEach(ref => {
    const existing = grouped.get(ref.type) || [];
    existing.push(ref);
    grouped.set(ref.type, existing);
  });
  
  return grouped;
}

/**
 * Group references by source file
 */
export function groupReferencesBySourceFile(references: Reference[]): Map<string, Reference[]> {
  const grouped = new Map<string, Reference[]>();
  
  references.forEach(ref => {
    const file = ref.source.file;
    const existing = grouped.get(file) || [];
    existing.push(ref);
    grouped.set(file, existing);
  });
  
  return grouped;
}

