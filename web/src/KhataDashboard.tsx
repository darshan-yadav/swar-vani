import { useState, useEffect, useCallback } from 'react';

const API_URL = (import.meta.env.VITE_API_URL || 'https://eq2chssg7j.execute-api.us-east-1.amazonaws.com/dev').replace(/\/$/, '');

interface KhataCustomer {
  customerName: string;
  normalizedName: string;
  outstanding: number;
  totalPurchases: number;
  totalPayments: number;
  purchaseCount: number;
  paymentCount: number;
  lastTransaction: string;
}

interface KhataTransaction {
  transactionType: 'PURCHASE' | 'PAYMENT';
  amount: number;
  items: string | null;
  dateTime: string;
}

export function KhataDashboard() {
  const [customers, setCustomers] = useState<KhataCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<KhataTransaction[]>([]);
  const [txnLoading, setTxnLoading] = useState(false);

  // Add purchase/payment modal
  const [showModal, setShowModal] = useState<'purchase' | 'payment' | null>(null);
  const [modalName, setModalName] = useState('');
  const [modalAmount, setModalAmount] = useState('');
  const [modalItems, setModalItems] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/khata?storeId=store-001`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setCustomers(data.customers || []);
      setError('');
    } catch {
      setError('Could not load khata data');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTransactions = useCallback(async (customerName: string) => {
    try {
      setTxnLoading(true);
      const normalized = customerName.toLowerCase().replace(/\s+/g, '_');
      const res = await fetch(`${API_URL}/khata/${normalized}/transactions?storeId=store-001`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch {
      setTransactions([]);
    } finally {
      setTxnLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    if (selectedCustomer) loadTransactions(selectedCustomer);
  }, [selectedCustomer, loadTransactions]);

  const handleSubmit = async () => {
    if (!modalName.trim() || !modalAmount.trim()) return;
    setModalSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/khata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: 'store-001',
          action: showModal,
          customerName: modalName.trim(),
          amount: parseFloat(modalAmount),
          items: modalItems.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      setShowModal(null);
      setModalName('');
      setModalAmount('');
      setModalItems('');
      await loadCustomers();
      if (selectedCustomer === modalName.trim()) {
        await loadTransactions(selectedCustomer);
      }
    } catch {
      alert('Failed to save. Try again.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const totalOutstanding = customers.reduce((sum, c) => sum + c.outstanding, 0);
  const highRisk = customers.filter(c => c.outstanding > 10000);

  return (
    <div className="khata-tab">
      {/* Summary Bar */}
      <div className="khata-summary-bar">
        <div className="khata-stat">
          <span className="khata-stat-value">{customers.length}</span>
          <span className="khata-stat-label">Customers</span>
        </div>
        <div className="khata-stat">
          <span className="khata-stat-value">₹{totalOutstanding.toLocaleString('en-IN')}</span>
          <span className="khata-stat-label">Total Outstanding</span>
        </div>
        <div className="khata-stat alert">
          <span className="khata-stat-value">{highRisk.length}</span>
          <span className="khata-stat-label">High Risk (&gt;₹10K)</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="khata-actions">
        <button className="khata-btn purchase" onClick={() => { setShowModal('purchase'); setModalName(selectedCustomer || ''); }}>
          ➕ Add Purchase
        </button>
        <button className="khata-btn payment" onClick={() => { setShowModal('payment'); setModalName(selectedCustomer || ''); }}>
          💰 Record Payment
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="khata-modal-overlay" onClick={() => setShowModal(null)}>
          <div className="khata-modal" onClick={e => e.stopPropagation()}>
            <h3>{showModal === 'purchase' ? '➕ Add Purchase (उधार)' : '💰 Record Payment (भुगतान)'}</h3>
            <div className="khata-form">
              <input
                placeholder="Customer name (ग्राहक का नाम)"
                value={modalName}
                onChange={e => setModalName(e.target.value)}
                autoFocus
              />
              <input
                placeholder="Amount ₹ (राशि)"
                type="number"
                value={modalAmount}
                onChange={e => setModalAmount(e.target.value)}
              />
              {showModal === 'purchase' && (
                <input
                  placeholder="Items (optional — सामान)"
                  value={modalItems}
                  onChange={e => setModalItems(e.target.value)}
                />
              )}
              <div className="khata-form-buttons">
                <button onClick={() => setShowModal(null)}>Cancel</button>
                <button
                  className="primary"
                  onClick={handleSubmit}
                  disabled={!modalName.trim() || !modalAmount.trim() || modalSubmitting}
                >
                  {modalSubmitting ? '...' : showModal === 'purchase' ? 'Add ₹' + (modalAmount || '0') : 'Record ₹' + (modalAmount || '0')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="khata-content">
        {/* Customer List */}
        <div className="khata-customer-list">
          <h3>📒 Khata Accounts</h3>
          {loading ? (
            <div className="khata-loading">Loading...</div>
          ) : error ? (
            <div className="khata-error">{error}</div>
          ) : customers.length === 0 ? (
            <div className="khata-empty">
              <p>No khata accounts yet.</p>
              <p>Use voice: "Ramesh ka 500 rupees ka saman"</p>
              <p>Or click "Add Purchase" above.</p>
            </div>
          ) : (
            customers.sort((a, b) => b.outstanding - a.outstanding).map(c => (
              <div
                key={c.normalizedName}
                className={'khata-customer-card' + (selectedCustomer === c.customerName ? ' selected' : '') + (c.outstanding > 10000 ? ' high-risk' : '')}
                onClick={() => setSelectedCustomer(c.customerName)}
              >
                <div className="khata-cust-header">
                  <span className="khata-cust-name">{c.customerName}</span>
                  {c.outstanding > 10000 && <span className="khata-alert-badge">⚠️</span>}
                </div>
                <div className="khata-cust-amount">₹{c.outstanding.toLocaleString('en-IN')}</div>
                <div className="khata-cust-meta">
                  {c.purchaseCount} purchases · {c.paymentCount} payments
                </div>
              </div>
            ))
          )}
        </div>

        {/* Transaction Detail */}
        <div className="khata-detail">
          {selectedCustomer ? (
            <>
              <h3>📄 {selectedCustomer} — Transactions</h3>
              {txnLoading ? (
                <div className="khata-loading">Loading...</div>
              ) : transactions.length === 0 ? (
                <div className="khata-empty">No transactions found.</div>
              ) : (
                <div className="khata-txn-list">
                  {transactions.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()).map((txn, i) => (
                    <div key={i} className={'khata-txn-item ' + txn.transactionType.toLowerCase()}>
                      <div className="khata-txn-icon">
                        {txn.transactionType === 'PURCHASE' ? '🛒' : '💰'}
                      </div>
                      <div className="khata-txn-info">
                        <div className="khata-txn-type">
                          {txn.transactionType === 'PURCHASE' ? 'Purchase' : 'Payment'}
                        </div>
                        {txn.items && <div className="khata-txn-items">{txn.items}</div>}
                        <div className="khata-txn-date">
                          {new Date(txn.dateTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                      </div>
                      <div className={'khata-txn-amount ' + txn.transactionType.toLowerCase()}>
                        {txn.transactionType === 'PURCHASE' ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="khata-empty">
              <p>👈 Select a customer to see transactions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
