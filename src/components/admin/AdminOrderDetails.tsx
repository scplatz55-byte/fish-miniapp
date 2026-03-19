type OrderStatus = "assembling" | "on_the_way" | "delivered" | "canceled";

type OrderForUi = {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  comment: string | null;
  payment_method: string;
  total_amount: string;
  status: OrderStatus;
  created_at: string;
  items_text?: string;
};

type AdminOrderDetailsProps = {
  order: OrderForUi | null;
  smallMutedStyle: React.CSSProperties;
  brandAccent: string;
  formatDateTime: (iso: string) => string;
  formatPriceRub: (value: string | number) => string;
  orderItemsList: (itemsText?: string) => string[];
  statusActionBtn: (status: OrderStatus, active: boolean) => React.CSSProperties;
  onCopyPhone: (phone: string) => void;
  onSetStatus: (orderId: string, status: OrderStatus) => void;
  renderCopyIcon: () => React.ReactNode;
  chatBlock: React.ReactNode;
};

export default function AdminOrderDetails({
  order,
  smallMutedStyle,
  brandAccent,
  formatDateTime,
  formatPriceRub,
  orderItemsList,
  statusActionBtn,
  onCopyPhone,
  onSetStatus,
  renderCopyIcon,
  chatBlock,
}: AdminOrderDetailsProps) {
  if (!order) {
    return <div style={{ marginTop: 10, opacity: 0.75 }}>Заказ не найден.</div>;
  }

  return (
    <div
      style={{
        marginTop: 12,
        animation: "orderSheetIn 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        transformOrigin: "bottom center",
      }}
    >
      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Заказ #{order.id.slice(0, 8)}</div>
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10, opacity: 0.95 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>👤 {order.customer_name}</div>
            <div style={{ marginTop: 6, ...smallMutedStyle }}>{formatDateTime(order.created_at)}</div>
          </div>
          <div
            style={{
              display: "grid",
              gap: 8,
              padding: 12,
              borderRadius: 14,
              border: "1px solid rgba(10,19,23,0.08)",
              background: "rgba(10,19,23,0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span>📞 {order.phone}</span>
              <button
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  border: "1px solid rgba(10,19,23,0.10)",
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: 0,
                  flexShrink: 0,
                }}
                onClick={() => onCopyPhone(order.phone)}
                title="Скопировать номер"
              >
                {renderCopyIcon()}
              </button>
            </div>
            <div>📍 {order.address}</div>
            <div>💳 {order.payment_method}</div>
            <div>💰 {formatPriceRub(order.total_amount)}</div>
            {order.comment ? (
              <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word" }}>
                💬 {order.comment}
              </div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            borderRadius: 16,
            border: "1px solid rgba(10,19,23,0.08)",
            background: "rgba(10,19,23,0.03)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 14px",
              borderBottom: "1px solid rgba(10,19,23,0.08)",
              fontWeight: 900,
            }}
          >
            Состав заказа
          </div>
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {orderItemsList(order.items_text).length > 0 ? (
              orderItemsList(order.items_text).map((line, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.82)",
                    border: "1px solid rgba(10,19,23,0.06)",
                    fontSize: 14,
                  }}
                >
                  <span style={{ color: brandAccent, fontWeight: 900 }}>•</span>
                  <span>{line}</span>
                </div>
              ))
            ) : (
              <div style={{ opacity: 0.7 }}>Нет данных</div>
            )}
          </div>
        </div>

        {chatBlock}

        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            style={statusActionBtn("assembling", order.status === "assembling")}
            onClick={() => onSetStatus(order.id, "assembling")}
          >
            Собирается
          </button>
          <button
            style={statusActionBtn("on_the_way", order.status === "on_the_way")}
            onClick={() => onSetStatus(order.id, "on_the_way")}
          >
            В пути
          </button>
          <button
            style={statusActionBtn("delivered", order.status === "delivered")}
            onClick={() => onSetStatus(order.id, "delivered")}
          >
            Доставлен
          </button>
          <button
            style={statusActionBtn("canceled", order.status === "canceled")}
            onClick={() => onSetStatus(order.id, "canceled")}
          >
            Отменён
          </button>
        </div>
      </div>
    </div>
  );
}
