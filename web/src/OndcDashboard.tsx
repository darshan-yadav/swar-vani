import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getOndcCatalog,
  getOndcOrders,
  getOndcStats,
  syncOndcCatalog,
  type OndcCatalogItem,
  type OndcOrder,
  type OndcStats,
} from './api';

const STORE_ID = 'store-001';

const formatRupee = (amount: number): string => {
  return '₹' + amount.toLocaleString('en-IN');
};

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

/* ── Skeleton placeholder ── */
function SkeletonBlock({ width, height }: { width?: string; height?: string }) {
  return (
    <div
      className="skeleton-block"
      style={{ width: width || '100%', height: height || '1rem' }}
    />
  );
}

function StatsBar({ stats, loading }: { stats: OndcStats | null; loading: boolean }) {
  const cards = [
    { label: 'Total Listed', value: stats?.totalListed ?? 0, icon: '📦', color: '#0066B3' },
    { label: 'In Stock', value: stats?.inStock ?? 0, icon: '✅', color: '#138808' },
    { label: "Today's Orders", value: (stats?.todayOrders ?? stats?.ordersToday ?? 0), icon: '🛒', color: '#FF9933' },
    { label: "Today's Revenue", value: formatRupee(stats?.todayRevenue ?? stats?.revenueToday ?? 0), icon: '💰', color: '#FFD700' },
  ];

  return (
    <div className="ondc-stats">
      {cards.map((card) => (
        <div key={card.label} className="stat-card" style={{ borderTopColor: card.color }}>
          {loading ? (
            <>
              <SkeletonBlock width="2rem" height="2rem" />
              <SkeletonBlock width="60%" height="1.6rem" />
              <SkeletonBlock width="80%" height="0.8rem" />
            </>
          ) : (
            <>
              <span className="stat-icon">{card.icon}</span>
              <span className="stat-value">{card.value}</span>
              <span className="stat-label">{card.label}</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function CatalogTable({
  catalog,
  loading,
  onSync,
  syncing,
}: {
  catalog: OndcCatalogItem[];
  loading: boolean;
  onSync: () => void;
  syncing: boolean;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return catalog;
    const q = search.toLowerCase();
    return catalog.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.nameHi.toLowerCase().includes(q) ||
        item.ondcCategory.toLowerCase().includes(q)
    );
  }, [catalog, search]);

  const statusBadge = (status: OndcCatalogItem['ondcStatus']) => {
    const cls =
      status === 'ACTIVE'
        ? 'ondc-status-active'
        : status === 'INACTIVE'
        ? 'ondc-status-inactive'
        : 'ondc-status-out';
    const label = status === 'OUT_OF_STOCK' ? 'Out of Stock' : status.charAt(0) + status.slice(1).toLowerCase();
    return <span className={`ondc-badge ${cls}`}>{label}</span>;
  };

  return (
    <div className="ondc-catalog-section">
      <div className="ondc-catalog-header">
        <h2>📋 ONDC Catalog</h2>
        <div className="ondc-catalog-actions">
          <div className="ondc-search-wrapper">
            <span className="ondc-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ondc-search"
            />
          </div>
          <button className="ondc-sync-btn" onClick={onSync} disabled={syncing}>
            {syncing ? '⏳ Syncing...' : '🔄 Sync to ONDC'}
          </button>
        </div>
      </div>

      <div className="ondc-catalog-table-wrapper">
        <table className="ondc-catalog-table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>ONDC Category</th>
              <th>Price (₹)</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Last Synced</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`skel-${i}`}>
                    <td><SkeletonBlock width="80%" /></td>
                    <td><SkeletonBlock width="60%" /></td>
                    <td><SkeletonBlock width="50%" /></td>
                    <td><SkeletonBlock width="40%" /></td>
                    <td><SkeletonBlock width="70%" /></td>
                    <td><SkeletonBlock width="60%" /></td>
                  </tr>
                ))
              : filtered.length === 0
              ? (
                  <tr>
                    <td colSpan={6} className="ondc-empty">
                      {search ? 'No items match your search' : 'No catalog items found'}
                    </td>
                  </tr>
                )
              : filtered.map((item) => (
                  <tr key={item.ondcItemId}>
                    <td>
                      <div className="ondc-item-name">
                        <span className="ondc-item-hindi">{item.nameHi}</span>
                        <span className="ondc-item-english">{item.name}</span>
                      </div>
                    </td>
                    <td>{item.ondcCategory}</td>
                    <td>
                      <span className="ondc-price">{formatRupee(item.sellingPrice)}</span>
                      {item.price !== item.sellingPrice && (
                        <span className="ondc-mrp">{formatRupee(item.price)}</span>
                      )}
                    </td>
                    <td>
                      <span className={`ondc-stock ${item.quantity <= 0 ? 'out' : item.quantity <= 5 ? 'low' : ''}`}>
                        {item.quantity}
                      </span>
                    </td>
                    <td>{statusBadge(item.ondcStatus)}</td>
                    <td className="ondc-synced-time">{timeAgo(item.lastSyncedAt)}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrdersList({ orders, loading }: { orders: OndcOrder[]; loading: boolean }) {
  const statusBadge = (status: string) => {
    const s = status.toUpperCase();
    const cls =
      s === 'PENDING'
        ? 'ondc-order-pending'
        : s === 'CONFIRMED'
        ? 'ondc-order-confirmed'
        : s === 'DISPATCHED'
        ? 'ondc-order-dispatched'
        : s === 'DELIVERED'
        ? 'ondc-order-delivered'
        : 'ondc-order-pending';
    return <span className={`ondc-badge ${cls}`}>{status}</span>;
  };

  return (
    <div className="ondc-orders-section">
      <h2>🧾 Recent ONDC Orders</h2>
      <div className="ondc-orders-list">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={`skel-order-${i}`} className="ondc-order-card">
                <SkeletonBlock width="40%" height="1rem" />
                <SkeletonBlock width="70%" height="0.8rem" />
                <SkeletonBlock width="50%" height="0.8rem" />
                <SkeletonBlock width="60%" height="0.8rem" />
              </div>
            ))
          : orders.length === 0
          ? (
              <div className="ondc-empty-orders">No orders yet</div>
            )
          : orders.map((order) => (
              <div key={order.orderId} className="ondc-order-card">
                <div className="ondc-order-top">
                  <span className="ondc-order-id">#{order.orderId.slice(-8)}</span>
                  {statusBadge(order.status)}
                </div>
                <div className="ondc-order-buyer">
                  <span className="ondc-order-buyer-icon">👤</span>
                  {order.buyerName}
                </div>
                <div className="ondc-order-items">
                  {order.items.map((item, idx) => (
                    <span key={idx} className="ondc-order-item-tag">
                      {item.name} ×{item.qty}
                    </span>
                  ))}
                </div>
                <div className="ondc-order-bottom">
                  <span className="ondc-order-total">{formatRupee(order.totalAmount)}</span>
                  <span className="ondc-order-time">{timeAgo(order.createdAt)}</span>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}

export default function OndcDashboard() {
  const [stats, setStats] = useState<OndcStats | null>(null);
  const [catalog, setCatalog] = useState<OndcCatalogItem[]>([]);
  const [orders, setOrders] = useState<OndcOrder[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setError(null);
    setLoadingStats(true);
    setLoadingCatalog(true);
    setLoadingOrders(true);

    try {
      const [statsData, catalogData, ordersData] = await Promise.allSettled([
        getOndcStats(STORE_ID),
        getOndcCatalog(STORE_ID),
        getOndcOrders(STORE_ID),
      ]);

      if (statsData.status === 'fulfilled') setStats(statsData.value);
      else setError('Failed to load stats');

      if (catalogData.status === 'fulfilled') setCatalog(catalogData.value);
      else setError((prev) => (prev ? prev + '; ' : '') + 'Failed to load catalog');

      if (ordersData.status === 'fulfilled') setOrders(ordersData.value);
      else setError((prev) => (prev ? prev + '; ' : '') + 'Failed to load orders');
    } catch {
      setError('Failed to connect to ONDC APIs');
    } finally {
      setLoadingStats(false);
      setLoadingCatalog(false);
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncOndcCatalog(STORE_ID);
      setSyncResult(`✅ Synced ${result.synced} items — ${result.active} active, ${result.outOfStock} out of stock`);
      // Refresh data
      await loadAll();
    } catch {
      setSyncResult('❌ Sync failed. Please try again.');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncResult(null), 5000);
    }
  }, [loadAll]);

  return (
    <div className="ondc-dashboard">
      {/* ONDC Header Bar */}
      <div className="ondc-header-bar">
        <div className="ondc-branding">
          <div className="ondc-logo-badge">
            <span className="ondc-logo-text">ONDC</span>
          </div>
          <div className="ondc-connected-badge">
            <span className="ondc-connected-dot" />
            Connected to ONDC Network
          </div>
        </div>
        <div className="ondc-store-badge">
          🏪 Ramesh General Store • <span className="ondc-store-id">store-001</span>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="ondc-error-banner">
          ⚠️ {error}
          <button onClick={loadAll} className="ondc-retry-btn">Retry</button>
        </div>
      )}

      {/* Sync result toast */}
      {syncResult && <div className="ondc-sync-toast">{syncResult}</div>}

      {/* Stats */}
      <StatsBar stats={stats} loading={loadingStats} />

      {/* Main content */}
      <div className="ondc-main-content">
        <CatalogTable
          catalog={catalog}
          loading={loadingCatalog}
          onSync={handleSync}
          syncing={syncing}
        />
        <OrdersList orders={orders} loading={loadingOrders} />
      </div>
    </div>
  );
}
