import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import clsx from 'clsx';

const defaultMeta = file => ({
  id: crypto.randomUUID(),
  file,
  label: '',
  remarks: '',
  requiresReview: false
});

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function FileDropzone({ projectId }) {
  const [items, setItems] = useState([]);
  const [uploadError, setUploadError] = useState(null);
  const queryClient = useQueryClient();

  const onDrop = useCallback(acceptedFiles => {
    setUploadError(null);
    
    // Validate file sizes
    const oversizedFiles = acceptedFiles.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      setUploadError(`File "${oversizedFiles[0].name}" is too large. Maximum size is 10MB.`);
      return;
    }
    
    setItems(prev => [...prev, ...acceptedFiles.map(defaultMeta)]);
  }, []);

  const removeItem = id => setItems(prev => prev.filter(item => item.id !== id));

  const updateItem = (id, updates) => {
    setItems(prev => prev.map(item => (item.id === id ? { ...item, ...updates } : item)));
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      items.forEach(item => formData.append('files', item.file));
      formData.append(
        'meta',
        JSON.stringify(
          items.map(({ remarks, requiresReview }) => ({
            label: 'active-rendering', // Mark all uploads as active rendering
            remarks,
            requiresReview
          }))
        )
      );
      const { data } = await axios.post(`/projects/${projectId}/uploads`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return data;
    },
    onSuccess: () => {
      setItems([]);
      setUploadError(null);
      queryClient.invalidateQueries(['uploads', projectId]);
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.error || 'Upload failed. Please try again.';
      setUploadError(errorMsg);
    }
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false, // Only allow one file since we're replacing
    maxSize: MAX_FILE_SIZE,
    onDropRejected: (rejectedFiles) => {
      if (rejectedFiles[0]?.errors[0]?.code === 'file-too-large') {
        setUploadError(`File is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`);
      } else {
        setUploadError('File rejected. Please check the file type and size.');
      }
    }
  });

  return (
    <div className="space-y-4">
      <section
        {...getRootProps()}
        className={clsx(
          'border-2 border-dashed rounded-xl p-6 text-center transition-colors',
          isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white hover:border-indigo-400'
        )}
      >
        <input {...getInputProps()} />
        <p className="text-sm text-slate-500">Drag & drop active rendering file here, or click to browse</p>
        <p className="text-xs text-slate-400 mt-2">This will replace the current active rendering display</p>
        <p className="text-xs text-slate-400 mt-1">Maximum file size: 10MB</p>
      </section>

      {uploadError && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {uploadError}
        </div>
      )}

      {uploadMutation.error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {uploadMutation.error.response?.data?.error || 'Upload failed'}
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-3">
          {items.map(item => (
            <article key={item.id} className="bg-white rounded-lg border border-slate-200 p-4 space-y-3 shadow-sm">
              <header className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{item.file.name}</p>
                  <p className="text-xs text-slate-500">{formatFileSize(item.file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-sm text-rose-600 hover:text-rose-500"
                >
                  Remove
                </button>
              </header>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex flex-col text-sm text-slate-700 gap-1">
                  Label
                  <input
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    value={item.label}
                    onChange={event => updateItem(item.id, { label: event.target.value })}
                    placeholder="Document type"
                  />
                </label>
                <label className="flex flex-col text-sm text-slate-700 gap-1">
                  Remarks
                  <input
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    value={item.remarks}
                    onChange={event => updateItem(item.id, { remarks: event.target.value })}
                    placeholder="Reviewer notes"
                  />
                </label>
                <div className="md:col-span-2">
                  <span className="text-sm text-slate-700">Requires Review?</span>
                  <div className="inline-flex ml-3 rounded-full bg-slate-100 p-1">
                    <button
                      type="button"
                      className={clsx(
                        'px-3 py-1 text-sm rounded-full transition-colors',
                        !item.requiresReview ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                      )}
                      onClick={() => updateItem(item.id, { requiresReview: false })}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      className={clsx(
                        'px-3 py-1 text-sm rounded-full transition-colors',
                        item.requiresReview ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                      )}
                      onClick={() => updateItem(item.id, { requiresReview: true })}
                    >
                      Yes
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
          <button
            type="button"
            onClick={() => uploadMutation.mutate()}
            disabled={uploadMutation.isPending}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            {uploadMutation.isPending ? 'Uploading…' : 'Upload files'}
          </button>
        </div>
      )}
    </div>
  );
}
