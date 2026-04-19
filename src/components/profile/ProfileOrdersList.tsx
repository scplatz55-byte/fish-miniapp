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

function OrderIconBadge({ status }: { status: OrderStatus }) {
  const icon =
    status === "delivered"
      ? "✓"
      : status === "canceled"
        ? "✕"
        : status === "on_the_way"
          ? "→"
          : "•";

  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, rgba(43,128,164,0.16) 0%, rgba(43,128,164,0.10) 100%)",
        border: "1px solid rgba(43,128,164,0.12)",
        boxShadow: "0 8px 18px rgba(10,19,23,0.05), inset 0 1px 0 rgba(255,255,255,0.82)",
        color: "#0A1317",
        fontWeight: 900,
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
  );
}

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
        <div className="app-skeleton" style={{ height: 112, borderRadius: 20, width: "100%" }} />
        <div className="app-skeleton" style={{ height: 112, borderRadius: 20, width: "100%" }} />
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
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
      {orders.map((o) => (
        <button
          key={o.id}
          onClick={() => onSelectOrder(o.id)}
          onPointerDown={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.transform = "translateY(1px) scale(0.992)";
            el.style.boxShadow = "0 10px 22px rgba(10,19,23,0.06), inset 0 1px 0 rgba(255,255,255,0.82)";
            el.style.background = "linear-gradient(180deg, rgba(245,247,249,0.98) 0%, rgba(240,243,246,0.96) 100%)";
            el.style.borderColor = "rgba(10,19,23,0.12)";
          }}
          onPointerUp={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.transform = "translateY(0) scale(1)";
            el.style.boxShadow = "0 14px 28px rgba(10,19,23,0.05), inset 0 1px 0 rgba(255,255,255,0.84)";
            el.style.background = "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,249,251,0.94) 100%)";
            el.style.borderColor = "rgba(10,19,23,0.08)";
          }}
          onPointerCancel={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.transform = "translateY(0) scale(1)";
            el.style.boxShadow = "0 14px 28px rgba(10,19,23,0.05), inset 0 1px 0 rgba(255,255,255,0.84)";
            el.style.background = "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,249,251,0.94) 100%)";
            el.style.borderColor = "rgba(10,19,23,0.08)";
          }}
          onPointerLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.transform = "translateY(0) scale(1)";
            el.style.boxShadow = "0 14px 28px rgba(10,19,23,0.05), inset 0 1px 0 rgba(255,255,255,0.84)";
            el.style.background = "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,249,251,0.94) 100%)";
            el.style.borderColor = "rgba(10,19,23,0.08)";
          }}
          style={{
            textAlign: "left",
            borderRadius: 20,
            border: "1px solid rgba(10,19,23,0.08)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,249,251,0.94) 100%)",
            padding: 14,
            cursor: "pointer",
            boxShadow: "0 14px 28px rgba(10,19,23,0.05), inset 0 1px 0 rgba(255,255,255,0.84)",
            transition: "transform 140ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease",
            WebkitTapHighlightColor: "transparent",
            WebkitTouchCallout: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            touchAction: "manipulation",
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
            <div style={{ display: "flex", gap: 12, minWidth: 0, flex: 1 }}>
              <OrderIconBadge status={o.status} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    opacity: 0.5,
                  }}
                >
                  История заказа
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontWeight: 900,
                    fontSize: 16,
                    letterSpacing: "-0.02em",
                    color: "#0A1317",
                  }}
                >
                  Заказ #{o.id.slice(0, 8)}
                </div>
                <div style={{ ...smallMutedStyle, marginTop: 6 }}>{formatDateTime(o.created_at)}</div>
              </div>
            </div>
            <div style={{ flexShrink: 0 }}>{renderStatusBadge(o.status)}</div>
          </div>

          <div
            style={{
              marginTop: 14,
              borderRadius: 16,
              border: "1px solid rgba(10,19,23,0.06)",
              background: "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(247,248,250,0.90) 100%)",
              padding: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                opacity: 0.5,
              }}
            >
              Сумма заказа
            </div>
            <div
              style={{
                fontWeight: 900,
                fontSize: 20,
                letterSpacing: "-0.03em",
                color: "#0A1317",
              }}
            >
              {formatPriceRub(o.total_amount)}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
