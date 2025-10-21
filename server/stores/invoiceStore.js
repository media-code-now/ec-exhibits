const initialInvoices = new Map([
  [
    'proj-1',
    [
      {
        id: 'inv-101',
        number: 'INV-101',
        dueDate: '2024-05-15',
        amount: '12,500',
        currency: 'USD',
        stage: 'Design',
        paymentConfirmed: false,
        updatedAt: new Date('2024-04-12').toISOString()
      },
      {
        id: 'inv-100',
        number: 'INV-100',
        dueDate: '2024-04-10',
        amount: '5,000',
        currency: 'USD',
        stage: 'Discovery',
        paymentConfirmed: true,
        updatedAt: new Date('2024-03-28').toISOString()
      }
    ]
  ],
  [
    'proj-2',
    [
      {
        id: 'inv-201',
        number: 'INV-201',
        dueDate: '2024-06-01',
        amount: '3,200',
        currency: 'USD',
        stage: 'Planning',
        paymentConfirmed: false,
        updatedAt: new Date('2024-04-25').toISOString()
      }
    ]
  ]
]);

const invoiceData = new Map(initialInvoices);

const serialiseInvoice = invoice => ({ ...invoice });

function ensureInvoices(projectId) {
  if (!invoiceData.has(projectId)) {
    invoiceData.set(projectId, []);
  }
  return invoiceData.get(projectId);
}

export const invoiceStore = {
  seedProjectInvoices(projectId) {
    ensureInvoices(projectId);
  },
  list(projectId) {
    return ensureInvoices(projectId).map(serialiseInvoice);
  },
  updateStatus({ projectId, invoiceId, paymentConfirmed }) {
    const invoices = ensureInvoices(projectId);
    const invoice = invoices.find(item => item.id === invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    invoice.paymentConfirmed = Boolean(paymentConfirmed);
    invoice.updatedAt = new Date().toISOString();
    return serialiseInvoice(invoice);
  }
};
