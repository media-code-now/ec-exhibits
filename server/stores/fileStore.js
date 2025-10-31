import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File categories for the Files tab
export const FILE_CATEGORIES = {
  INVOICES_ESTIMATES: 'invoices-estimates',
  PRODUCTION_FILES: 'production-files',
  FURNITURE: 'furniture',
  GRAPHICS: 'graphics',
  PRE_BUILD: 'pre-build'
};

export const CATEGORY_LABELS = {
  [FILE_CATEGORIES.INVOICES_ESTIMATES]: 'Invoices & Estimates',
  [FILE_CATEGORIES.PRODUCTION_FILES]: 'Production Files',
  [FILE_CATEGORIES.FURNITURE]: 'Furniture',
  [FILE_CATEGORIES.GRAPHICS]: 'Graphics',
  [FILE_CATEGORIES.PRE_BUILD]: 'Pre-build'
};

class FileStore {
  constructor() {
    this.files = new Map(); // fileId -> file metadata
    this.projectFiles = new Map(); // projectId -> Set of fileIds
    this.nextFileId = 1;
  }

  /**
   * Upload a file to a project with category and metadata
   */
  uploadFile({ projectId, category, filename, originalName, mimetype, size, uploadedBy, label = '', remarks = '' }) {
    if (!Object.values(FILE_CATEGORIES).includes(category)) {
      throw new Error(`Invalid category: ${category}`);
    }

    const fileId = `file-${this.nextFileId++}`;
    const uploadedAt = new Date().toISOString();

    const fileData = {
      id: fileId,
      projectId,
      category,
      filename, // actual file on disk
      originalName, // original upload name
      mimetype,
      size,
      uploadedBy,
      uploadedAt,
      label,
      remarks,
      addressed: false // Yes/No toggle for "addressed?"
    };

    this.files.set(fileId, fileData);

    // Add to project files
    if (!this.projectFiles.has(projectId)) {
      this.projectFiles.set(projectId, new Set());
    }
    this.projectFiles.get(projectId).add(fileId);

    return fileData;
  }

  /**
   * Get all files for a project, optionally filtered by category
   */
  getProjectFiles(projectId, category = null) {
    const projectFileIds = this.projectFiles.get(projectId) || new Set();
    const files = Array.from(projectFileIds)
      .map(fileId => this.files.get(fileId))
      .filter(file => file && (category === null || file.category === category))
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    return files;
  }

  /**
   * Get files grouped by category for a project
   */
  getProjectFilesByCategory(projectId) {
    const files = this.getProjectFiles(projectId);
    const grouped = {};

    // Initialize all categories
    Object.values(FILE_CATEGORIES).forEach(category => {
      grouped[category] = [];
    });

    // Group files by category
    files.forEach(file => {
      if (grouped[file.category]) {
        grouped[file.category].push(file);
      }
    });

    return grouped;
  }

  /**
   * Get a specific file by ID
   */
  getFile(fileId) {
    return this.files.get(fileId);
  }

  /**
   * Update file metadata (label, remarks, addressed status)
   */
  updateFile(fileId, updates) {
    const file = this.files.get(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    const allowedUpdates = ['label', 'remarks', 'addressed'];
    const validUpdates = {};
    
    allowedUpdates.forEach(key => {
      if (updates.hasOwnProperty(key)) {
        validUpdates[key] = updates[key];
      }
    });

    const updatedFile = { ...file, ...validUpdates };
    this.files.set(fileId, updatedFile);

    return updatedFile;
  }

  /**
   * Delete a file
   */
  deleteFile(fileId) {
    const file = this.files.get(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    // Remove from project files
    const projectFileIds = this.projectFiles.get(file.projectId);
    if (projectFileIds) {
      projectFileIds.delete(fileId);
    }

    // Remove file record
    this.files.delete(fileId);

    return file;
  }

  /**
   * Get file statistics for a project
   */
  getProjectFileStats(projectId) {
    const files = this.getProjectFiles(projectId);
    const stats = {
      total: files.length,
      addressed: files.filter(f => f.addressed).length,
      pending: files.filter(f => !f.addressed).length,
      byCategory: {}
    };

    Object.values(FILE_CATEGORIES).forEach(category => {
      const categoryFiles = files.filter(f => f.category === category);
      stats.byCategory[category] = {
        total: categoryFiles.length,
        addressed: categoryFiles.filter(f => f.addressed).length,
        pending: categoryFiles.filter(f => !f.addressed).length
      };
    });

    return stats;
  }

  /**
   * Search files within a project
   */
  searchFiles(projectId, query) {
    const files = this.getProjectFiles(projectId);
    const lowerQuery = query.toLowerCase();

    return files.filter(file => 
      file.originalName.toLowerCase().includes(lowerQuery) ||
      file.label.toLowerCase().includes(lowerQuery) ||
      file.remarks.toLowerCase().includes(lowerQuery)
    );
  }
}

// Create and export singleton instance
export const fileStore = new FileStore();

// Demo data for development
fileStore.uploadFile({
  projectId: 'proj-1',
  category: FILE_CATEGORIES.INVOICES_ESTIMATES,
  filename: 'invoice_001.pdf',
  originalName: 'Initial Project Invoice.pdf',
  mimetype: 'application/pdf',
  size: 245760,
  uploadedBy: 'user-owner',
  label: 'Project Setup Invoice',
  remarks: 'Initial invoice for project setup and planning phase'
});

fileStore.uploadFile({
  projectId: 'proj-1',
  category: FILE_CATEGORIES.PRODUCTION_FILES,
  filename: 'blueprint_v1.dwg',
  originalName: 'Exhibition Layout Blueprint v1.dwg',
  mimetype: 'application/acad',
  size: 1024000,
  uploadedBy: 'user-staff',
  label: 'Layout Blueprint v1',
  remarks: 'Initial layout design - needs client approval'
});

fileStore.uploadFile({
  projectId: 'proj-1',
  category: FILE_CATEGORIES.GRAPHICS,
  filename: 'logo_brand.ai',
  originalName: 'Company Logo Brand Guidelines.ai',
  mimetype: 'application/illustrator',
  size: 512000,
  uploadedBy: 'user-staff',
  label: 'Brand Guidelines',
  remarks: 'Updated brand guidelines with new color scheme'
});

// Mark as addressed after creation
fileStore.updateFile('file-3', { addressed: true });