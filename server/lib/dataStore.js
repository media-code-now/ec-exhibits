import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory relative to server root
const DATA_DIR = path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log('[INFO] Created data directory:', DATA_DIR);
}

/**
 * Save data to a JSON file atomically
 * Uses temp file + rename to ensure data integrity
 */
export function saveData(filename, data) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    const tempPath = `${filePath}.tmp`;
    
    // Write to temp file first
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    
    // Atomic rename (replaces old file)
    fs.renameSync(tempPath, filePath);
    
    return true;
  } catch (error) {
    console.error(`[ERROR] Failed to save ${filename}:`, error.message);
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
  const filePath = path.join(DATA_DIR, filename);
  const tempPath = `${filePath}.tmp`;
  
  fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8', (err) => {
    if (err) {
      console.error(`[ERROR] Failed to save ${filename}:`, err.message);
      return;
    }
    
    fs.rename(tempPath, filePath, (err) => {
      if (err) {
        console.error(`[ERROR] Failed to rename ${filename}:`, err.message);
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
