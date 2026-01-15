import { useEffect, useState } from 'react';

export function OverdueAlert({ tasks = [], invoices = [], onDismiss }) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenDismissed, setHasBeenDismissed] = useState(false);

  // Filter overdue items (show alerts 1 day before due date)
  const overdueTasks = tasks.filter(task => {
    if (task.state === 'completed' || !task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    // Set both to start of day for accurate comparison
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    // Calculate days difference
    const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    // Show alert if due tomorrow or already overdue (daysDiff <= 1)
    return daysDiff <= 1 && (task.isOverdue || daysDiff <= 1);
  });
  
  const overdueInvoices = invoices.filter(invoice => {
    if (invoice.status === 'paid' || !invoice.dueDate) return false;
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    // Set both to start of day for accurate comparison
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    // Calculate days difference
    const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    // Show alert if due tomorrow or already overdue (daysDiff <= 1)
    return daysDiff <= 1;
  });

  const hasOverdueItems = overdueTasks.length > 0 || overdueInvoices.length > 0;

  // Show popup with fade-in animation
  useEffect(() => {
    if (hasOverdueItems && !hasBeenDismissed) {
      // Small delay before showing for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [hasOverdueItems, hasBeenDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setHasBeenDismissed(true);
    onDismiss?.();
  };

  if (!hasOverdueItems || hasBeenDismissed) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleDismiss}
      />

      {/* Alert Popup */}
      <div
        className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg mx-4 transition-all duration-300 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className="bg-gradient-to-br from-rose-600 to-rose-700 rounded-2xl shadow-2xl p-6 text-white border-4 border-rose-400 animate-pulse-subtle">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-3xl">⚠️</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">Urgent Items Alert!</h2>
                <p className="text-rose-100 text-sm">Items due tomorrow or overdue</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white/80 hover:text-white transition p-1 rounded-full hover:bg-white/20"
              aria-label="Dismiss alert"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {/* Overdue Tasks */}
            {overdueTasks.length > 0 && (
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <span>📋</span>
                  <span>Urgent Tasks ({overdueTasks.length})</span>
                </h3>
                <ul className="space-y-2">
                  {overdueTasks.map((task) => {
                    const dueDate = new Date(task.dueDate);
                    const today = new Date();
                    dueDate.setHours(0, 0, 0, 0);
                    today.setHours(0, 0, 0, 0);
                    const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                    const dueDateLabel = daysDiff === 1 ? 'Due Tomorrow' : daysDiff === 0 ? 'Due Today' : 'Overdue';
                    
                    return (
                      <li
                        key={task.id}
                        className="bg-white/10 rounded-lg p-3 hover:bg-white/20 transition"
                      >
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-rose-100 mt-1">
                          Stage: {task.stageName || 'Unknown'} • {dueDateLabel}: {new Date(task.dueDate).toLocaleDateString()}
                        </p>
                        {task.assignee && (
                          <p className="text-xs text-rose-100 mt-1">Assigned to: {task.assignee}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Overdue Invoices */}
            {overdueInvoices.length > 0 && (
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <span>💰</span>
                  <span>Urgent Invoices ({overdueInvoices.length})</span>
                </h3>
                <ul className="space-y-2">
                  {overdueInvoices.map((invoice) => {
                    const dueDate = new Date(invoice.dueDate);
                    const today = new Date();
                    dueDate.setHours(0, 0, 0, 0);
                    today.setHours(0, 0, 0, 0);
                    const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                    const dueDateLabel = daysDiff === 1 ? 'Due Tomorrow' : daysDiff === 0 ? 'Due Today' : 'Overdue';
                    
                    return (
                      <li
                        key={invoice.id}
                        className="bg-white/10 rounded-lg p-3 hover:bg-white/20 transition"
                      >
                        <p className="font-medium">{invoice.description || `Invoice #${invoice.invoiceNumber}`}</p>
                        <p className="text-sm text-rose-100 mt-1">
                          Amount: ${invoice.amount} • {dueDateLabel}: {new Date(invoice.dueDate).toLocaleDateString()}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-white/20">
            <button
              onClick={handleDismiss}
              className="w-full bg-white text-rose-600 font-semibold py-3 px-6 rounded-xl hover:bg-rose-50 transition shadow-lg"
            >
              I Understand - Dismiss Alert
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-subtle {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(255, 255, 255, 0);
          }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
