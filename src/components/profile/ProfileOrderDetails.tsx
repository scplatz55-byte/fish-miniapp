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

function normalizeText(value: string | null | undefined) {
  return (value || "").split("\\n").join("\n").trim();
}

function getPaymentLabel(method: string) {
  switch ((method || "").toLowerCase()) {
    case "cash":
      return "Наличные";
    case "transfer":
      return "Перевод";
    case "qr":
      return "QR-код";
    default:
      return method || "—";
  }
}

function parseItems(text: string | null | undefined) {
  const normalized = normalizeText(text);
  return normalized
    .split("\n")
    .map((l) => l.replace(/^•\s*/, "").trim())
    .filter(Boolean);
}

function InfoRow({ label, value, icon }: { label: string; value: React.ReactNode; icon: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "34px 1fr", gap: 10, alignItems: "start" }}>
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
        <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.5 }}>{label}</div>
        <div style={{ marginTop: 4, fontSize: 14, lineHeight: 1.5, color: "#0A1317", wordBreak: "break-word" }}>{value}</div>
      </div>
    </div>
  );
}

function ItemRow({ line, formatPriceRub }: { line: string; formatPriceRub: any }) {
  const parts = line.split(" — ");
  const titlePart = parts[0] || line;
  const totalPart = parts.slice(1).join(" — ");

  // пытаемся вытащить количество
  const qtyMatch = titlePart.match(/×\s*(\d+)/);
  const qty = qtyMatch ? Number(qtyMatch[1]) : 1;

  // вытаскиваем сумму
  const priceNumMatch = totalPart.replace(/[^0-9]/g, "");
  const total = priceNumMatch ? Number(priceNumMatch) : 0;

  const unitPrice = qty > 0 ? Math.round(total / qty) : total;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: 12,
        borderRadius: 16,
        border: "1px solid rgba(10,19,23,0.06)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(247,248,250,0.90) 100%)",
      }}
    >
      <div style={{ display: "flex", gap: 10, minWidth: 0, flex: 1 }}>
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            marginTop: 8,
            background: "rgba(10,19,23,0.25)",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 14, color: "#0A1317" }}>{titlePart}</div>
          <div style={{ fontSize: 12, opacity: 0.5 }}>
            {formatPriceRub(unitPrice)} / шт
          </div>
        </div>
      </div>

      <div style={{ fontWeight: 900, fontSize: 15, color: "#0A1317" }}>{totalPart}</div>
    </div>
  );
}

export default function ProfileOrderDetails({ order, formatDateTime, formatPriceRub, smallMutedStyle, renderStatusBadge }: ProfileOrderDetailsProps) {
  if (!order) {
    return <div style={{ marginTop: 12, opacity: 0.75 }}>Заказ не найден.</div>;
  }

  const comment = normalizeText(order.comment);
  const items = parseItems(order.items_text);

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 22 }}>#{order.id.slice(0, 8)}</div>
            <div style={{ ...smallMutedStyle, marginTop: 6 }}>{formatDateTime(order.created_at)}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>{renderStatusBadge(order.status)}</div>
        </div>

        <div style={{ marginTop: 14, fontWeight: 900, fontSize: 22 }}>{formatPriceRub(order.total_amount)}</div>
      </div>

      <div
        style={{
          borderRadius: 22,
          border: "1px solid rgba(10,19,23,0.08)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,249,251,0.94) 100%)",
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <InfoRow label="Адрес" value={order.address} icon="📍" />
        <InfoRow label="Оплата" value={getPaymentLabel(order.payment_method)} icon="💳" />
        {comment && <InfoRow label="Детали заказа" value={<span style={{ whiteSpace: "pre-wrap" }}>{comment}</span>} icon="💬" />}
      </div>

      <div
        style={{
          borderRadius: 22,
          border: "1px solid rgba(10,19,23,0.08)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,249,251,0.94) 100%)",
          padding: 14,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", opacity: 0.5 }}>Состав заказа</div>

        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
          {items.length ? items.map((line, i) => <ItemRow key={i} line={line} formatPriceRub={formatPriceRub} />) : <div>Нет данных</div>}
        </div>

        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px dashed rgba(10,19,23,0.1)",
            display: "flex",
            justifyContent: "space-between",
            fontWeight: 900,
            fontSize: 16,
          }}
        >
          <span>Итого</span>
          <span>{formatPriceRub(order.total_amount)}</span>
        </div>
      </div>
    </div>
  );
}
