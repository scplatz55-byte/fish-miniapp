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
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 900, fontSize: 16 }}>Заказ #{order.id.slice(0, 8)}</div>
      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
        {renderStatusBadge(order.status)}
        <div style={{ ...smallMutedStyle }}>{formatDateTime(order.created_at)}</div>
        <div>📍 {order.address}</div>
        <div>💳 {order.payment_method}</div>
        <div>💰 {formatPriceRub(order.total_amount)}</div>
        {order.comment ? <div style={{ whiteSpace: "pre-wrap" }}>💬 {order.comment}</div> : null}
        <div style={{ marginTop: 6, fontWeight: 900 }}>Состав заказа</div>
        <div style={{ whiteSpace: "pre-wrap", fontSize: 14, opacity: 0.95 }}>
          {order.items_text || "Нет данных"}
        </div>
      </div>
    </div>
  );
}
