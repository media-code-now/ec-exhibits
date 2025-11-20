import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if persistence is disabled (for platforms without persistent storage)
const PERSISTENCE_DISABLED = process.env.DATA_STORAGE_DISABLED === 'true';

// Data directory relative to server root
const DATA_DIR = path.join(__dirname, '..', 'data');

// Ensure data directory exists (unless disabled)
if (!PERSISTENCE_DISABLED) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      console.log('[INFO] Created data directory:', DATA_DIR);
    }
  } catch (error) {
    console.error('[ERROR] Failed to create data directory:', error.message);
    console.error('[WARN] Data persistence disabled - using memory only');
    process.env.DATA_STORAGE_DISABLED = 'true';
  }
}

if (PERSISTENCE_DISABLED) {
  console.log('[WARN] Data persistence disabled - all data will be lost on restart');
  console.log('[INFO] To enable persistence, ensure writable filesystem or add persistent disk');
}

/**
 * Save data to a JSON file atomically
 * Uses temp file + rename to ensure data integrity
 */
export function saveData(filename, data) {
  // Skip if persistence disabled
  if (process.env.DATA_STORAGE_DISABLED === 'true') {
    return false;
  }
  
  try {
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    const filePath = path.join(DATA_DIR, filename);
    const tempPath = `${filePath}.tmp`;
    
    // Write to temp file first
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    
    // Atomic rename (replaces old file)
    fs.renameSync(tempPath, filePath);
    
    return true;
  } catch (error) {
    console.error(`[ERROR] Failed to save ${filename}:`, error.message);
    // Clean up temp file if it exists
    try {
      const tempPath = path.join(DATA_DIR, `${filename}.tmp`);
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    return false;
  }
}

/**
 * Load data from a JSON file
 * Returns null if file doesn't exist
 */
export function loadData(filename) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`[ERROR] Failed to load ${filename}:`, error.message);
    return null;
  }
}

/**
 * Save data asynchronously (non-blocking)
 * Good for frequent updates
 */
export function saveDataAsync(filename, data) {
  // Skip if persistence disabled
  if (process.env.DATA_STORAGE_DISABLED === 'true') {
    return;
  }
  
  // Ensure data directory exists before async operations
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (error) {
      console.error(`[ERROR] Failed to create data directory for ${filename}:`, error.message);
      return;
    }
  }
  
  const filePath = path.join(DATA_DIR, filename);
  const tempPath = `${filePath}.tmp`;
  
  fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8', (err) => {
    if (err) {
      console.error(`[ERROR] Failed to save ${filename}:`, err.message);
      // Clean up temp file if it exists
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      return;
    }
    
    fs.rename(tempPath, filePath, (err) => {
      if (err) {
        console.error(`[ERROR] Failed to rename ${filename}:`, err.message);
        // Clean up temp file on rename failure
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    });
  });
}

/**
 * Check if data file exists
 */
export function dataExists(filename) {
  const filePath = path.join(DATA_DIR, filename);
  return fs.existsSync(filePath);
}

/**
 * Delete a data file
 */
export function deleteData(filename) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`[ERROR] Failed to delete ${filename}:`, error.message);
    return false;
  }
}

/**
 * Helper to convert Map to JSON-serializable object
 */
export function mapToObject(map) {
  const obj = {};
  for (const [key, value] of map.entries()) {
    obj[key] = value;
  }
  return obj;
}

/**
 * Helper to convert object back to Map
 */
export function objectToMap(obj) {
  const map = new Map();
  if (obj) {
    for (const [key, value] of Object.entries(obj)) {
      map.set(key, value);
    }
  }
  return map;
}

console.log('[INFO] Data persistence module loaded. Data directory:', DATA_DIR);
