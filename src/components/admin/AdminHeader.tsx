type AdminHeaderProps = {
  selectedOrderId: string | null;
  adminSection: "orders" | "slots";
  ghostButtonStyle: React.CSSProperties;
  onBack: () => void;
  onToggleSection: () => void;
  onRefresh: () => void;
};

export default function AdminHeader({
  selectedOrderId,
  adminSection,
  ghostButtonStyle,
  onBack,
  onToggleSection,
  onRefresh,
}: AdminHeaderProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "48px 1fr auto",
        alignItems: "center",
        gap: 10,
      }}
    >
      <button
        style={{
          ...ghostButtonStyle,
          width: 48,
          height: 40,
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={onBack}
        title={selectedOrderId ? "Назад к списку" : adminSection === "slots" ? "Назад к заказам" : "В профиль"}
      >
        ←
      </button>

      <div style={{ fontWeight: 900, fontSize: 18, textAlign: "center" }}>
        {adminSection === "slots" ? "Слоты" : "Админка"}
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        {!selectedOrderId && (
          <button style={ghostButtonStyle} onClick={onToggleSection}>
            Слоты
          </button>
        )}
        <button
          style={{
            ...ghostButtonStyle,
            width: 48,
            height: 40,
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={onRefresh}
          title="Обновить"
        >
          ↻
        </button>
      </div>
    </div>
  );
}
