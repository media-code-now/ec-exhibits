import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Upload, Download, FileText, Image, Package, Palette, Settings, Check, X, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';

const FILE_CATEGORIES = {
  'invoices-estimates': 'Invoices & Estimates',
  'production-files': 'Production Files',
  'furniture': 'Furniture',
  'graphics': 'Graphics',
  'pre-build': 'Pre-build'
};

const CATEGORY_ICONS = {
  'invoices-estimates': FileText,
  'production-files': Settings,
  'furniture': Package,
  'graphics': Palette, 
  'pre-build': Plus
};

function FileIcon({ mimetype, size = 24 }) {
  if (mimetype?.startsWith('image/')) {
    return <Image size={size} className="text-blue-600" />;
  } else if (mimetype === 'application/pdf') {
    return <FileText size={size} className="text-red-600" />;
  } else if (mimetype?.includes('word') || mimetype?.includes('document')) {
    return <FileText size={size} className="text-blue-800" />;
  } else if (mimetype?.includes('excel') || mimetype?.includes('spreadsheet')) {
    return <FileText size={size} className="text-green-600" />;
  } else {
    return <FileText size={size} className="text-gray-600" />;
  }
}

function FilePreview({ file, onDownload }) {
  const isImage = file.mimetype?.startsWith('image/');
  
  if (isImage) {
    return (
      <div className="group relative">
        <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden border">
          <img 
            src={`/projects/${file.projectId}/files/${file.id}/download`} 
            alt={file.originalName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
          <button
            onClick={() => onDownload(file)}
            className="bg-white text-gray-800 px-3 py-1 rounded-md text-sm font-medium shadow-lg hover:bg-gray-50 transition-colors"
          >
            <Eye size={16} className="inline mr-1" />
            View
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-32 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500">
      <FileIcon mimetype={file.mimetype} size={32} />
      <span className="text-xs mt-2 text-center px-2">
        {file.originalName.length > 20 ? file.originalName.substring(0, 20) + '...' : file.originalName}
      </span>
    </div>
  );
}

function FilesCard({ category, files, onUpload, onUpdate, onDelete, onDownload, user }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);

  const categoryName = FILE_CATEGORIES[category];
  const Icon = CATEGORY_ICONS[category];

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      await handleUploadFiles(droppedFiles);
    }
  }, []);

  const handleUploadFiles = async (filesToUpload) => {
    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      await onUpload(category, filesToUpload);
      setUploadProgress(100);
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 1000);
    } catch (error) {
      setUploadError(error.response?.data?.error || 'Upload failed. Please try again.');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canDelete = user?.role === 'owner' || user?.role === 'staff';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div 
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <Icon size={24} className="text-blue-600" />
          <div>
            <h3 className="font-semibold text-gray-900">{categoryName}</h3>
            <p className="text-sm text-gray-500">
              {files.length} file{files.length !== 1 ? 's' : ''} • {files.filter(f => f.addressed).length} addressed
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {files.filter(f => !f.addressed).length > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              {files.filter(f => !f.addressed).length} pending
            </span>
          )}
          <button className="text-gray-400 hover:text-gray-600">
            {isExpanded ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200">
          {/* Upload Area */}
          <div 
            className={`m-4 p-6 border-2 border-dashed rounded-lg transition-colors ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="text-center">
              {uploadError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{uploadError}</p>
                  <button 
                    onClick={() => setUploadError(null)}
                    className="mt-2 text-xs text-red-500 hover:text-red-700 underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}
              {uploading ? (
                <div className="space-y-2">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-sm text-gray-600">Uploading files...</p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor={`file-upload-${category}`} className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Drop files here or click to upload
                      </span>
                      <span className="mt-1 block text-xs text-gray-500">
                        Support for PDF, images, documents, and more
                      </span>
                    </label>
                    <input
                      id={`file-upload-${category}`}
                      name="file-upload"
                      type="file"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        const files = Array.from(e.target.files);
                        if (files.length > 0) {
                          handleUploadFiles(files);
                        }
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Files List */}
          {files.length > 0 && (
            <div className="px-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {files.map((file) => (
                  <div key={file.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <FilePreview file={file} onDownload={onDownload} />
                    
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-sm text-gray-900 truncate pr-2">
                          {file.originalName}
                        </h4>
                        {canDelete && (
                          <button
                            onClick={() => onDelete(file.id)}
                            className="text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
                            title="Delete file"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-500 space-y-1">
                        <div>{formatFileSize(file.size)} • {formatDate(file.uploadedAt)}</div>
                        <div>Uploaded by: {file.uploadedBy}</div>
                      </div>

                      {/* Label Input */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Label
                        </label>
                        <input
                          type="text"
                          value={file.label || ''}
                          onChange={(e) => onUpdate(file.id, { label: e.target.value })}
                          placeholder="Add a label..."
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      {/* Remarks Input */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Remarks
                        </label>
                        <textarea
                          value={file.remarks || ''}
                          onChange={(e) => onUpdate(file.id, { remarks: e.target.value })}
                          placeholder="Add remarks..."
                          rows={2}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        />
                      </div>

                      {/* Addressed Toggle */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-xs font-medium text-gray-700">Addressed?</span>
                        <button
                          onClick={() => onUpdate(file.id, { addressed: !file.addressed })}
                          className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                            file.addressed
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          }`}
                        >
                          {file.addressed ? (
                            <>
                              <Check size={12} />
                              <span>Yes</span>
                            </>
                          ) : (
                            <>
                              <X size={12} />
                              <span>No</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Download Button */}
                      <button
                        onClick={() => onDownload(file)}
                        className="w-full flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                      >
                        <Download size={12} />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {files.length === 0 && (
            <div className="px-4 pb-4 text-center text-gray-500 text-sm">
              No files uploaded yet. Drop files above to get started.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FilesTab({ projectId, user }) {
  const [filesByCategory, setFilesByCategory] = useState({});
  const [categories, setCategories] = useState({});
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFiles = async () => {
    try {
      const { data } = await axios.get(`/projects/${projectId}/files`);
      setFilesByCategory(data.filesByCategory || {});
      setCategories(data.categories || {});
      setStats(data.stats || {});
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load files. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [projectId]);

  const handleUpload = async (category, files) => {
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      // Add metadata for each file
      const meta = files.map(() => ({ label: '', remarks: '' }));
      formData.append('meta', JSON.stringify(meta));

      await axios.post(`/projects/${projectId}/files/${category}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Refresh files after upload
      await fetchFiles();
    } catch (error) {
      throw error;
    }
  };

  const handleUpdate = async (fileId, updates) => {
    try {
      await axios.patch(`/projects/${projectId}/files/${fileId}`, updates);

      // Optimistically update the UI
      setFilesByCategory(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(category => {
          updated[category] = updated[category].map(file => 
            file.id === fileId ? { ...file, ...updates } : file
          );
        });
        return updated;
      });
    } catch (error) {
      // Refresh on error to revert optimistic update
      fetchFiles();
    }
  };

  const handleDelete = async (fileId) => {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`/projects/${projectId}/files/${fileId}`);

      // Refresh files after delete
      await fetchFiles();
    } catch (error) {
      alert('Failed to delete file. Please try again.');
    }
  };

  const handleDownload = async (file) => {
    try {
      const response = await axios.get(`/projects/${projectId}/files/${file.id}/download`, {
        responseType: 'blob'
      });
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to download file. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800">
          <strong>Error:</strong> {error}
        </div>
        <button 
          onClick={fetchFiles}
          className="mt-2 text-red-700 hover:text-red-900 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Files</h2>
          <p className="text-gray-600 mt-1">
            Manage project files by category with drag-and-drop uploads, previews, and tracking.
          </p>
        </div>
        
        {stats.total > 0 && (
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm font-medium text-blue-900">File Summary</div>
            <div className="text-xs text-blue-700 mt-1">
              {stats.total} total • {stats.addressed} addressed • {stats.pending} pending
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {Object.entries(FILE_CATEGORIES).map(([categoryKey, categoryName]) => (
          <FilesCard
            key={categoryKey}
            category={categoryKey}
            files={filesByCategory[categoryKey] || []}
            onUpload={handleUpload}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onDownload={handleDownload}
            user={user}
          />
        ))}
      </div>
    </div>
  );
}