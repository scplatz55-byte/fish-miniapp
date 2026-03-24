type OrderStatus = "assembling" | "on_the_way" | "delivered" | "canceled";

type OrderForUi = {
  id: string;
  address: string;
  comment: string | null;
  payment_method: string;
  total_amount: string;
  status: OrderStatus;
  created_at: string;
  items_text?: string;
};

type ProfileOrderDetailsProps = {
  order: OrderForUi | null;
  formatDateTime: (iso: string) => string;
  formatPriceRub: (value: string | number) => string;
  smallMutedStyle: React.CSSProperties;
  renderStatusBadge: (status: OrderStatus) => React.ReactNode;
};

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "34px 1fr",
        gap: 10,
        alignItems: "start",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, rgba(43,128,164,0.14) 0%, rgba(43,128,164,0.08) 100%)",
          border: "1px solid rgba(43,128,164,0.12)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
          fontSize: 16,
        }}
      >
        {icon}
      </div>

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            opacity: 0.5,
          }}
        >
          {label}
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 14,
            lineHeight: 1.5,
            color: "#0A1317",
            wordBreak: "break-word",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

export default function ProfileOrderDetails({
  order,
  formatDateTime,
  formatPriceRub,
  smallMutedStyle,
  renderStatusBadge,
}: ProfileOrderDetailsProps) {
  if (!order) {
    return <div style={{ marginTop: 12, opacity: 0.75 }}>Заказ не найден.</div>;
  }

  return (
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          borderRadius: 24,
          border: "1px solid rgba(10,19,23,0.08)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(246,248,250,0.95) 100%)",
          boxShadow: "0 16px 32px rgba(10,19,23,0.06), inset 0 1px 0 rgba(255,255,255,0.88)",
          padding: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                opacity: 0.5,
              }}
            >
              Детали заказа
            </div>
            <div
              style={{
                marginTop: 4,
                fontWeight: 900,
                fontSize: 22,
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
                color: "#0A1317",
              }}
            >
              Заказ #{order.id.slice(0, 8)}
            </div>
            <div style={{ marginTop: 8, ...smallMutedStyle }}>{formatDateTime(order.created_at)}</div>
          </div>

          <div style={{ flexShrink: 0 }}>{renderStatusBadge(order.status)}</div>
        </div>

        <div
          style={{
            marginTop: 16,
            borderRadius: 18,
            border: "1px solid rgba(10,19,23,0.06)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(248,249,251,0.90) 100%)",
            padding: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                opacity: 0.5,
              }}
            >
              Итого
            </div>
            <div
              style={{
                marginTop: 4,
                fontWeight: 900,
                fontSize: 22,
                letterSpacing: "-0.03em",
                color: "#0A1317",
              }}
            >
              {formatPriceRub(order.total_amount)}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          borderRadius: 22,
          border: "1px solid rgba(10,19,23,0.08)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,249,251,0.94) 100%)",
          boxShadow: "0 14px 28px rgba(10,19,23,0.05), inset 0 1px 0 rgba(255,255,255,0.82)",
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <InfoRow label="Адрес" value={order.address} icon="📍" />
        <InfoRow label="Оплата" value={order.payment_method} icon="💳" />
        {order.comment ? <InfoRow label="Комментарий" value={<span style={{ whiteSpace: "pre-wrap" }}>{order.comment}</span>} icon="💬" /> : null}
      </div>

      <div
        style={{
          borderRadius: 22,
          border: "1px solid rgba(10,19,23,0.08)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,249,251,0.94) 100%)",
          boxShadow: "0 14px 28px rgba(10,19,23,0.05), inset 0 1px 0 rgba(255,255,255,0.82)",
          padding: 14,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            opacity: 0.5,
          }}
        >
          Состав заказа
        </div>
        <div
          style={{
            marginTop: 8,
            whiteSpace: "pre-wrap",
            fontSize: 14,
            lineHeight: 1.6,
            color: "#0A1317",
          }}
        >
          {order.items_text || "Нет данных"}
        </div>
      </div>
    </div>
  );
}
