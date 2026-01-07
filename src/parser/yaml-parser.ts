import yaml from 'js-yaml';
import { ChartYaml, ValuesData, ValueKey, ChartDependency } from '../types';

/**
 * Parse Chart.yaml content
 */
export function parseChartYaml(content: string): ChartYaml {
  const parsed = yaml.load(content) as Record<string, unknown>;
  
  return {
    name: String(parsed.name || 'unknown'),
    version: String(parsed.version || '0.0.0'),
    apiVersion: String(parsed.apiVersion || 'v2'),
    description: parsed.description ? String(parsed.description) : undefined,
    type: parsed.type ? String(parsed.type) : undefined,
    appVersion: parsed.appVersion ? String(parsed.appVersion) : undefined,
    dependencies: parseDependencies(parsed.dependencies),
  };
}

/**
 * Parse dependencies from Chart.yaml
 */
function parseDependencies(deps: unknown): ChartDependency[] {
  if (!Array.isArray(deps)) return [];
  
  return deps.map((dep) => {
    const d = dep as Record<string, unknown>;
    return {
      name: String(d.name || ''),
      version: String(d.version || ''),
      repository: d.repository ? String(d.repository) : undefined,
      condition: d.condition ? String(d.condition) : undefined,
      alias: d.alias ? String(d.alias) : undefined,
    };
  });
}

/**
 * Parse values.yaml content and flatten keys
 */
export function parseValuesYaml(content: string): ValuesData {
  let raw: Record<string, unknown>;
  
  try {
    raw = yaml.load(content) as Record<string, unknown> || {};
  } catch {
    raw = {};
  }
  
  const flatKeys = flattenValues(raw);
  
  return { raw, flatKeys };
}

/**
 * Flatten nested values object into dot-notation keys
 */
function flattenValues(
  obj: unknown,
  prefix: string = '',
  result: ValueKey[] = []
): ValueKey[] {
  if (obj === null || obj === undefined) {
    return result;
  }

  if (typeof obj !== 'object') {
    // Primitive value
    result.push({
      path: prefix,
      fullPath: `.Values.${prefix}`,
      value: obj,
      type: getValueType(obj),
    });
    return result;
  }

  if (Array.isArray(obj)) {
    // Array - add the array itself and its indexed items
    result.push({
      path: prefix,
      fullPath: `.Values.${prefix}`,
      value: obj,
      type: 'array',
    });
    
    obj.forEach((item, index) => {
      const newPrefix = prefix ? `${prefix}[${index}]` : `[${index}]`;
      flattenValues(item, newPrefix, result);
    });
    return result;
  }

  // Object
  if (prefix) {
    result.push({
      path: prefix,
      fullPath: `.Values.${prefix}`,
      value: obj,
      type: 'object',
    });
  }

  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    flattenValues(record[key], newPrefix, result);
  }

  return result;
}

/**
 * Determine the type of a value
 */
function getValueType(value: unknown): ValueKey['type'] {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  
  switch (typeof value) {
    case 'string': return 'string';
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    case 'object': return 'object';
    default: return 'string';
  }
}

/**
 * Get a value from nested object using dot notation path
 */
export function getValueByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  
  return current;
}

