type OrderStatus = "assembling" | "on_the_way" | "delivered" | "canceled";

type OrderForUi = {
  id: string;
  customer_name: string;
  phone: string;
  total_amount: string;
  status: OrderStatus;
  created_at: string;
  items_text?: string;
};

type AdminOrdersListProps = {
  orders: OrderForUi[];
  smallMutedStyle: React.CSSProperties;
  formatDateTime: (iso: string) => string;
  formatPriceRub: (value: string | number) => string;
  orderPreviewItems: (itemsText?: string, maxLines?: number) => string[];
  renderStatusBadge: (status: OrderStatus) => React.ReactNode;
  onSelectOrder: (orderId: string) => void;
  onBeforeOpenOrder: () => void;
};

export default function AdminOrdersList({
  orders,
  smallMutedStyle,
  formatDateTime,
  formatPriceRub,
  orderPreviewItems,
  renderStatusBadge,
  onSelectOrder,
  onBeforeOpenOrder,
}: AdminOrdersListProps) {
  if (orders.length === 0) {
    return <div style={{ marginTop: 10, opacity: 0.75 }}>📦 Пока нет заказов в системе.</div>;
  }

  return (
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      {orders.map((o) => {
        const previewLines = orderPreviewItems(o.items_text, 2);

        return (
          <button
            key={o.id}
            onClick={() => {
              onBeforeOpenOrder();
              onSelectOrder(o.id);
            }}
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

            <div style={{ marginTop: 10, fontWeight: 900 }}>{o.customer_name}</div>

            {previewLines.length > 0 && (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                {previewLines.map((line, index) => (
                  <div key={index} style={{ fontSize: 13, opacity: 0.82 }}>
                    • {line}
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                marginTop: 12,
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.65 }}>{o.phone}</div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>{formatPriceRub(o.total_amount)}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
