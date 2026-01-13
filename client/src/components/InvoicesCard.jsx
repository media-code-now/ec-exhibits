import clsx from 'clsx';
import { useState } from 'react';

export function InvoicesCard({ invoices = [], canEdit = false, onTogglePayment, onCreateInvoice, onDeleteInvoice, isUpdating = false, projectId }) {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'estimate',
    amount: '',
    dueDate: '',
    description: '',
    file: null
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.file) {
      alert('Please fill in amount and select a file');
      return;
    }

    const data = new FormData();
    data.append('type', formData.type);
    data.append('amount', formData.amount);
    data.append('dueDate', formData.dueDate);
    data.append('description', formData.description);
    data.append('file', formData.file);

    onCreateInvoice?.(data);
    
    // Reset form
    setFormData({
      type: 'estimate',
      amount: '',
      dueDate: '',
      description: '',
      file: null
    });
    setShowUploadForm(false);
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, file: e.target.files[0] });
  };

  const handleDownload = async (invoiceId, fileName) => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      
      console.log('[INVOICE] Downloading invoice:', invoiceId, 'from project:', projectId);
      
      const response = await fetch(`${API_URL}/projects/${projectId}/invoices/${invoiceId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        let errorMessage = `Download failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        console.error('[INVOICE] Download failed:', response.status, errorMessage);
        throw new Error(errorMessage);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      console.log('[INVOICE] ✅ Download successful:', fileName);
      
      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
    } catch (error) {
      console.error('[INVOICE] Download error:', error);
      alert('Failed to download invoice:\n\n' + error.message);
    }
  };

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Invoices</h3>
          <p className="text-sm text-slate-500">Review outstanding balances</p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition"
          >
            {showUploadForm ? 'Cancel' : '+ Upload Invoice'}
          </button>
        )}
      </header>

      {/* Upload Form */}
      {showUploadForm && canEdit && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 min-w-0">
          <div className="grid grid-cols-2 gap-3 min-w-0">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="estimate">Estimate</option>
                <option value="deposit">Deposit</option>
                <option value="balance">Balance</option>
                <option value="misc">Miscellaneous</option>
              </select>
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="0.00"
                required
              />
            </div>
          </div>
          <div className="min-w-0">
            <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="min-w-0">
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              rows="2"
              placeholder="Optional description..."
            />
          </div>
          <div className="min-w-0">
            <label className="block text-sm font-medium text-slate-700 mb-1">Invoice File (PDF)</label>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              className="w-full text-sm"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition"
          >
            Upload Invoice
          </button>
        </form>
      )}

      {/* Invoice List */}
      <div className="space-y-3">
        {invoices.map(invoice => (
          <article
            key={invoice.id}
            className="flex flex-col gap-3 rounded-xl border border-slate-200 px-4 py-3"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-800">{invoice.type}</div>
              <div className="text-sm text-slate-500">
                <p>
                  Due {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'} · ${invoice.amount}
                </p>
                {invoice.description && <p className="text-xs text-slate-400 truncate">{invoice.description}</p>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={clsx(
                  'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap',
                  invoice.status === 'paid'
                    ? 'bg-emerald-100 text-emerald-700'
                    : invoice.status === 'pending'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-700'
                )}
              >
                {invoice.status}
              </span>
              {invoice.fileUrl && (
                <button
                  type="button"
                  onClick={() => handleDownload(invoice.id, invoice.fileName)}
                  className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-200 transition whitespace-nowrap"
                >
                  📥 Download
                </button>
              )}
              {canEdit && (
                <>
                  <button
                    type="button"
                    onClick={() => onTogglePayment?.(invoice)}
                    className={clsx(
                      'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition whitespace-nowrap',
                      invoice.status === 'paid'
                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        : 'bg-indigo-600 text-white hover:bg-indigo-500'
                    )}
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'Updating…' : invoice.status === 'paid' ? 'Mark unpaid' : 'Mark paid'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete invoice "${invoice.description || invoice.type}"?\n\nThis action cannot be undone.`)) {
                        onDeleteInvoice?.(invoice.id);
                      }
                    }}
                    className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-200 transition whitespace-nowrap"
                    title="Delete invoice"
                  >
                    🗑️ Delete
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
        {invoices.length === 0 && (
          <p className="text-sm text-slate-500">No invoices yet.</p>
        )}
      </div>
    </section>
  );
}
