import clsx from 'clsx';

export function InvoicesCard({ invoices = [], canEdit = false, onTogglePayment, isUpdating = false }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Invoices</h3>
          <p className="text-sm text-slate-500">Review outstanding balances</p>
        </div>
      </header>
      <div className="space-y-3">
        {invoices.map(invoice => (
          <article
            key={invoice.id}
            className="grid grid-cols-[auto,1fr,auto] items-center gap-3 rounded-xl border border-slate-200 px-4 py-3"
          >
            <div className="text-sm font-semibold text-slate-800">{invoice.number}</div>
            <div className="text-sm text-slate-500">
              <p>
                Due {invoice.dueDate} · {invoice.currency}
                {invoice.amount}
              </p>
              <p className="text-xs text-slate-400">Stage: {invoice.stage}</p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={clsx(
                  'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold',
                  invoice.paymentConfirmed
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                )}
              >
                {invoice.paymentConfirmed ? 'Yes' : 'No'}
              </span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onTogglePayment?.(invoice)}
                  className={clsx(
                    'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition',
                    invoice.paymentConfirmed
                      ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      : 'bg-indigo-600 text-white hover:bg-indigo-500'
                  )}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Updating…' : invoice.paymentConfirmed ? 'Mark unpaid' : 'Mark paid'}
                </button>
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
