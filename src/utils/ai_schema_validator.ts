/**
 * AI Schema Validator
 * 
 * Handles schema loading, validation, optimization, and extraction for AI consumption.
 * Extracted from ai_service.ts for better modularity and testability.
 */

import { readFileSync } from 'fs';
import path from 'path';
import { safeJsonParse } from './error_handling';
import { ESSENTIAL_ALERT_FIELDS } from './prompt_templates';
import { SchemaProperty, ParsedSchema } from './ai_service_types';

// Types and interfaces
export interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ExtractedSchema {
  extracted: ParsedSchema;
  validation: SchemaValidationResult;
  optimized: ParsedSchema;
}

/**
 * Schema Validator class for managing AI schema operations
 */
export class SchemaValidator {
  private schemaCache = new Map<string, string>();
  private essentialFields: string[];

  constructor(customEssentialFields?: string[]) {
    this.essentialFields = customEssentialFields || [...ESSENTIAL_ALERT_FIELDS];
  }

  /**
   * Load and cache schema from file
   */
  loadAndCacheSchema(schemaFile: string, maxSize?: number): string {
    const cacheKey = `${schemaFile}:${maxSize || 'unlimited'}`;
    
    if (this.schemaCache.has(cacheKey)) {
      return this.schemaCache.get(cacheKey)!;
    }

    const schema = loadMappingSchema(schemaFile, maxSize);
    this.schemaCache.set(cacheKey, schema);
    return schema;
  }

  /**
   * Validate and extract essential fields from schema
   */
  validateAndExtract(schema: ParsedSchema): ExtractedSchema {
    const validation = this.validateSchema(schema);
    const extracted = extractEssentialFields(schema, this.essentialFields);
    const optimized = optimizeSchemaForAI(extracted, 1000, this.essentialFields);

    return {
      extracted,
      validation,
      optimized,
    };
  }

  /**
   * Get essential fields list
   */
  getEssentialFields(): string[] {
    return [...this.essentialFields];
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.schemaCache.size;
  }

  /**
   * Clear schema cache
   */
  clearCache(): void {
    this.schemaCache.clear();
  }

  /**
   * Validate schema structure
   */
  private validateSchema(schema: ParsedSchema): SchemaValidationResult {
    const errors: string[] = [];

    if (!schema) {
      errors.push('Schema is null or undefined');
      return { isValid: false, errors };
    }

    if (typeof schema !== 'object') {
      errors.push('Schema must be an object');
    }

    if (!schema.properties && schema.type !== 'object') {
      errors.push('Schema must have properties or be of type object');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Load mapping schema from file with size optimization
 */
export const loadMappingSchema = (mappingFile: string, maxSize = 1000): string => {
  try {
    const filePath = path.resolve(process.cwd(), 'src/mappings', mappingFile);
    const content = readFileSync(filePath, 'utf8');

    // Try to parse and extract essential schema information
    try {
      const parsed = safeJsonParse<ParsedSchema>(content, 'Schema parsing');
      const essentialFields = extractEssentialFields(parsed);
      return JSON.stringify(essentialFields, null, 2);
    } catch {
      // Fallback to truncation if parsing fails
      return content.substring(0, maxSize);
    }
  } catch (error) {
    console.error(`Failed to load mapping schema: ${mappingFile}`, error);
    return '{}';
  }
};

/**
 * Extract only essential fields from schema to reduce token usage
 */
export const extractEssentialFields = (
  schema: ParsedSchema, 
  essentialFields: string[] = ESSENTIAL_ALERT_FIELDS
): ParsedSchema => {
  if (!schema || !schema.properties) {
    return { properties: {} };
  }

  const extractedFields: Record<string, SchemaProperty> = {};
  const properties = schema.properties;

  essentialFields.forEach((key) => {
    if (properties[key]) {
      extractedFields[key] = properties[key];
    }
  });

  return { 
    ...schema,
    properties: extractedFields 
  };
};

/**
 * Parse schema from file with error handling
 */
export const parseSchemaFromFile = (schemaFile: string): ParsedSchema => {
  try {
    const content = loadMappingSchema(schemaFile);
    return safeJsonParse<ParsedSchema>(content, 'Schema file parsing');
  } catch (error) {
    console.error(`Failed to parse schema from file: ${schemaFile}`, error);
    return { properties: {} };
  }
};

/**
 * Validate response against schema
 */
export const validateResponseSchema = (
  response: any, 
  schema: ParsedSchema
): SchemaValidationResult => {
  const errors: string[] = [];

  if (!schema) {
    errors.push('Invalid schema provided');
    return { isValid: false, errors };
  }

  if (!response) {
    errors.push('Response is null or undefined');
    return { isValid: false, errors };
  }

  // Check required fields
  if (schema.required) {
    schema.required.forEach((field: string) => {
      if (!(field in response)) {
        errors.push(`Missing required field: ${field}`);
      }
    });
  }

  // Check field types
  if (schema.properties) {
    Object.keys(schema.properties).forEach((field) => {
      const fieldSchema = schema.properties![field];
      const value = response[field];
      
      if (value !== undefined && fieldSchema.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== fieldSchema.type) {
          errors.push(`Field '${field}' has type '${actualType}', expected '${fieldSchema.type}'`);
        }
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Optimize schema for AI consumption by reducing size
 */
export const optimizeSchemaForAI = (
  schema: ParsedSchema,
  maxSize = 1000,
  priorityFields: string[] = []
): ParsedSchema => {
  if (!schema || !schema.properties) {
    return { properties: {} };
  }

  const optimized: ParsedSchema = {
    type: schema.type || 'object',
    properties: {},
  };

  let currentSize = JSON.stringify(optimized).length;
  const properties = schema.properties;

  // First, add priority fields
  priorityFields.forEach((field) => {
    if (properties[field] && currentSize < maxSize) {
      const fieldSchema = { ...properties[field] };
      
      // Remove verbose descriptions to save space
      if (fieldSchema.description && fieldSchema.description.length > 50) {
        delete fieldSchema.description;
      }
      
      optimized.properties![field] = fieldSchema;
      currentSize = JSON.stringify(optimized).length;
    }
  });

  // Then add remaining fields if space allows (with early exit)
  const remainingFields = Object.keys(properties).filter(field => !priorityFields.includes(field));
  
  for (const field of remainingFields) {
    if (currentSize >= maxSize) break; // Early exit if we've reached the limit
    
    const fieldSchema = { ...properties[field] };
    
    // Remove verbose descriptions
    if (fieldSchema.description && fieldSchema.description.length > 50) {
      delete fieldSchema.description;
    }
    
    const testSchema = { ...optimized };
    testSchema.properties![field] = fieldSchema;
    
    const testSize = JSON.stringify(testSchema).length;
    if (testSize <= maxSize) {
      optimized.properties![field] = fieldSchema;
      currentSize = testSize;
    } else {
      break; // Stop adding fields if we exceed the limit
    }
  }

  return optimized;
};