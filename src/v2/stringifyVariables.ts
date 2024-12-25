/**
 * Converts any JavaScript/TypeScript value into a stable string representation.
 *
 * Key features:
 * - Produces consistent output regardless of key order in objects
 * - Handles all JavaScript types: objects, arrays, primitives, functions
 * - Memory efficient using a stack-based iterative approach
 * - Performant string building using array chunks
 *
 * Example outputs:
 * - Object: {"a":1,"b":2}
 * - Array: [1,2,3]
 * - Function: [Function: functionName]
 * - Primitives: "string", 123, true, null, undefined
 *
 * @param value - Any JavaScript/TypeScript value to stringify
 * @returns A deterministic string representation of the value
 */
export function stringifyVariables(value: unknown): string {
  // Accumulator for string parts - more efficient than string concatenation
  const chunks: string[] = [];

  /**
   * Stack entry type for processing nested structures
   * @property value - The actual value being processed
   * @property state - Processing state ('start' or 'processing')
   * @property keys - For objects: sorted keys array
   * @property currentKey - Current processing index for arrays/objects
   */
  type StackEntry = {
    value: unknown;
    state: 'start' | 'processing';
    keys?: string[]; // For objects: sorted keys
    currentKey?: number; // Current index being processed
  };

  // Stack for handling nested structures without recursion
  const stack: StackEntry[] = [];

  /**
   * Processes a single value, either handling it directly (for primitives)
   * or pushing it to the stack (for objects/arrays)
   *
   * @param val - Value to process
   */
  function processValue(val: unknown): void {
    // Handle primitive cases directly
    if (val === null) {
      chunks.push('null');
      return;
    }
    if (val === undefined) {
      chunks.push('undefined');
      return;
    }

    if (typeof val !== 'object') {
      if (typeof val === 'function') {
        chunks.push(`[Function: ${val.name || 'anonymous'}]`);
        return;
      }
      chunks.push(JSON.stringify(val));
      return;
    }

    // Push objects/arrays to stack for iterative processing
    stack.push({
      value: val,
      state: 'start',
    });
  }

  // Start processing with initial value
  processValue(value);

  // Main processing loop
  while (stack.length > 0) {
    const current = stack[stack.length - 1];

    if (current.state === 'start') {
      // Initialize processing of a new object/array
      current.state = 'processing';

      if (Array.isArray(current.value)) {
        // Handle array start
        chunks.push('[');
        const arr = current.value;
        if (arr.length > 0) {
          // Start processing first element
          current.currentKey = 0;
          processValue(arr[0]);
          continue;
        }
      } else {
        // Handle object start
        chunks.push('{');
        const obj = current.value as Record<string, unknown>;
        // Sort keys for consistent output
        current.keys = Object.keys(obj).sort();
        if (current.keys.length > 0) {
          // Start processing first key-value pair
          const firstKey = current.keys[0];
          chunks.push(`"${firstKey}":`);
          current.currentKey = 0;
          processValue(obj[firstKey]);
          continue;
        }
      }
    }

    if (Array.isArray(current.value)) {
      // Process remaining array elements
      if (current.currentKey !== undefined && current.currentKey < (current.value as unknown[]).length - 1) {
        chunks.push(',');
        current.currentKey++;
        processValue(current.value[current.currentKey]);
        continue;
      }
      chunks.push(']');
    } else {
      // Process remaining object key-value pairs
      if (current.currentKey !== undefined && current.keys && current.currentKey < current.keys.length - 1) {
        chunks.push(',');
        current.currentKey++;
        const nextKey = current.keys[current.currentKey];
        chunks.push(`"${nextKey}":`);
        processValue((current.value as Record<string, unknown>)[nextKey]);
        continue;
      }
      chunks.push('}');
    }

    // Processing of current object/array is complete
    stack.pop();
  }

  // Combine all chunks into final string
  return chunks.join('');
}
