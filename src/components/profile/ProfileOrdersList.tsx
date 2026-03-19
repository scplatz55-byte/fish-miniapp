type OrderStatus = "assembling" | "on_the_way" | "delivered" | "canceled";

type OrderForUi = {
  id: string;
  total_amount: string;
  status: OrderStatus;
  created_at: string;
};

type ProfileOrdersListProps = {
  profileLoading: boolean;
  profileError: string | null;
  orders: OrderForUi[];
  onSelectOrder: (orderId: string) => void;
  formatDateTime: (iso: string) => string;
  formatPriceRub: (value: string | number) => string;
  smallMutedStyle: React.CSSProperties;
  renderStatusBadge: (status: OrderStatus) => React.ReactNode;
};

export default function ProfileOrdersList({
  profileLoading,
  profileError,
  orders,
  onSelectOrder,
  formatDateTime,
  formatPriceRub,
  smallMutedStyle,
  renderStatusBadge,
}: ProfileOrdersListProps) {
  if (profileLoading) {
    return (
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="app-skeleton" style={{ height: 96, borderRadius: 16, width: "100%" }} />
        <div className="app-skeleton" style={{ height: 96, borderRadius: 16, width: "100%" }} />
      </div>
    );
  }

  if (profileError) {
    return (
      <div style={{ marginTop: 12, color: "#D43314", whiteSpace: "pre-wrap" }}>
        Ошибка: {profileError}
      </div>
    );
  }

  if (orders.length === 0) {
    return <div style={{ marginTop: 12, opacity: 0.75 }}>📦 Заказов пока нет.</div>;
  }

  return (
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      {orders.map((o) => (
        <button
          key={o.id}
          onClick={() => onSelectOrder(o.id)}
          style={{
            textAlign: "left",
            borderRadius: 16,
            border: "1px solid rgba(10,19,23,0.10)",
            background: "rgba(255,255,255,0.96)",
            padding: 14,
            cursor: "pointer",
            boxShadow: "0 10px 24px rgba(10,19,23,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <div>
              <div style={{ fontWeight: 900, fontSize: 14 }}>Заказ #{o.id.slice(0, 8)}</div>
              <div style={{ ...smallMutedStyle, marginTop: 4 }}>{formatDateTime(o.created_at)}</div>
            </div>
            {renderStatusBadge(o.status)}
          </div>
          <div style={{ marginTop: 10, fontWeight: 900, fontSize: 16 }}>
            {formatPriceRub(o.total_amount)}
          </div>
        </button>
      ))}
    </div>
  );
}
