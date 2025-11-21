import { useState } from 'react';
import axios from 'axios';

export default function CreateProjectForm({ onProjectCreated, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    show: '',
    size: '',
    moveInDate: '',
    openingDay: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('[CreateProject] Submitting:', formData);
      const { data } = await axios.post('/projects', formData);
      console.log('[CreateProject] Response received:', data);
      console.log('[CreateProject] data.success:', data.success);
      console.log('[CreateProject] data.project:', data.project);
      if (data.success && data.project) {
        console.log('[CreateProject] Calling onProjectCreated with:', data.project);
        onProjectCreated(data.project);
      } else {
        console.warn('[CreateProject] Response missing success or project:', data);
      }
    } catch (err) {
      console.error('Failed to create project:', err);
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-xl">
      <h2 className="mb-6 text-2xl font-bold text-slate-900">Create Your First Project</h2>
      
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Project Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
            Project Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Tech Expo 2025"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Show/Event Name */}
        <div>
          <label htmlFor="show" className="block text-sm font-medium text-slate-700 mb-1">
            Show/Event Name
          </label>
          <input
            type="text"
            id="show"
            name="show"
            value={formData.show}
            onChange={handleChange}
            placeholder="e.g., CES Las Vegas"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Booth Size */}
        <div>
          <label htmlFor="size" className="block text-sm font-medium text-slate-700 mb-1">
            Booth Size
          </label>
          <input
            type="text"
            id="size"
            name="size"
            value={formData.size}
            onChange={handleChange}
            placeholder="e.g., 20x30 ft"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Move-In Date */}
        <div>
          <label htmlFor="moveInDate" className="block text-sm font-medium text-slate-700 mb-1">
            Move-In Date
          </label>
          <input
            type="date"
            id="moveInDate"
            name="moveInDate"
            value={formData.moveInDate}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Opening Day */}
        <div>
          <label htmlFor="openingDay" className="block text-sm font-medium text-slate-700 mb-1">
            Opening Day
          </label>
          <input
            type="date"
            id="openingDay"
            name="openingDay"
            value={formData.openingDay}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Brief description of the project..."
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading || !formData.name}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Project'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
