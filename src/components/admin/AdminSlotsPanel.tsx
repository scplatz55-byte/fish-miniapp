type DeliverySlotRow = {
  id: string;
  slot_date: string;
  slot_label: string;
  delivery_type: "delivery" | "pickup";
  is_active: boolean;
  sort_order: number;
};

type AdminSlotsPanelProps = {
  inputStyle: React.CSSProperties;
  primaryButtonStyle: React.CSSProperties;
  ghostButtonStyle: React.CSSProperties;
  tabButtonStyle: (active: boolean) => React.CSSProperties;
  brandAccent: string;
  slotFormDate: string;
  slotFormLabel: string;
  slotFormType: "delivery" | "pickup";
  adminSlots: DeliverySlotRow[];
  adminSlotsLoading: boolean;
  adminSlotsError: string | null;
  onChangeDate: (value: string) => void;
  onChangeLabel: (value: string) => void;
  onChangeType: (value: "delivery" | "pickup") => void;
  onCreateSlot: () => void;
  onToggleSlot: (id: string, nextActive: boolean) => void;
  onDeleteSlot: (id: string) => void;
  renderSkeleton: (key: string) => React.ReactNode;
};

export default function AdminSlotsPanel({
  inputStyle,
  primaryButtonStyle,
  ghostButtonStyle,
  tabButtonStyle,
  brandAccent,
  slotFormDate,
  slotFormLabel,
  slotFormType,
  adminSlots,
  adminSlotsLoading,
  adminSlotsError,
  onChangeDate,
  onChangeLabel,
  onChangeType,
  onCreateSlot,
  onToggleSlot,
  onDeleteSlot,
  renderSkeleton,
}: AdminSlotsPanelProps) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 900, fontSize: 16 }}>Слоты доставки и самовывоза</div>
      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <input
          style={inputStyle}
          type="date"
          value={slotFormDate}
          onChange={(e) => onChangeDate(e.target.value)}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
          <button
            type="button"
            style={tabButtonStyle(slotFormType === "delivery")}
            onClick={() => onChangeType("delivery")}
          >
            Доставка
          </button>
          <button
            type="button"
            style={tabButtonStyle(slotFormType === "pickup")}
            onClick={() => onChangeType("pickup")}
          >
            Самовывоз
          </button>
        </div>
        <input
          style={inputStyle}
          placeholder="Интервал, например 13:00–16:00"
          value={slotFormLabel}
          onChange={(e) => onChangeLabel(e.target.value)}
        />
        <button style={{ ...primaryButtonStyle, width: "100%" }} onClick={onCreateSlot}>
          Добавить слот
        </button>
      </div>

      {adminSlotsLoading ? (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {renderSkeleton("slot-1")}
          {renderSkeleton("slot-2")}
        </div>
      ) : adminSlotsError ? (
        <div style={{ marginTop: 12, color: brandAccent, whiteSpace: "pre-wrap" }}>
          Ошибка: {adminSlotsError}
        </div>
      ) : (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {adminSlots.map((slot) => (
            <div
              key={slot.id}
              style={{
                borderRadius: 14,
                border: "1px solid rgba(10,19,23,0.08)",
                background: slot.is_active ? "rgba(255,255,255,0.96)" : "rgba(10,19,23,0.04)",
                padding: 12,
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 14 }}>
                  {slot.delivery_type === "delivery" ? "Доставка" : "Самовывоз"}
                </div>
                <div style={{ marginTop: 4, fontSize: 13, opacity: 0.82 }}>
                  {slot.slot_date} • {slot.slot_label}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  style={tabButtonStyle(slot.is_active)}
                  onClick={() => onToggleSlot(slot.id, !slot.is_active)}
                >
                  {slot.is_active ? "Вкл" : "Выкл"}
                </button>
                <button
                  style={ghostButtonStyle}
                  onClick={() => onDeleteSlot(slot.id)}
                  title="Удалить слот"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          {adminSlots.length === 0 && (
            <div style={{ fontSize: 13, opacity: 0.72 }}>Слотов пока нет.</div>
          )}
        </div>
      )}
    </div>
  );
}
