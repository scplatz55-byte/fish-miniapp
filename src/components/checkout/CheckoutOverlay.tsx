import { useEffect, useRef } from "react";

type PickupPoint = {
  id: string;
  title: string;
  address: string;
  worktime_text?: string | null;
};

type CheckoutOverlayProps = {
  isOpen: boolean;
  headerOffsetTop: string;
  bottomPadding: string;
  backgroundColor: string;
  cardStyle: React.CSSProperties;
  ghostButtonStyle: React.CSSProperties;
  primaryButtonStyle: React.CSSProperties;
  tabButtonStyle: (active: boolean) => React.CSSProperties;
  inputStyle: React.CSSProperties;
  iosSwitchWrap: (active: boolean) => React.CSSProperties;
  iosSwitchKnob: (active: boolean) => React.CSSProperties;
  brandAccent: string;
  deliveryType: "delivery" | "pickup";
  pickupPoints: readonly PickupPoint[];
  pickupPointId: string;
  isPrivateHouse: boolean;
  orderFullName: string;
  orderPhone: string;
  orderAddress: string;
  orderEntrance: string;
  orderFloor: string;
  orderApartment: string;
  orderIntercom: string;
  deliveryDate: string;
  deliverySlot: string;
  paymentMethod: string;
  promoCode: string;
  orderComment: string;
  totalLabel: string;
  availableDates: { value: string; label: string }[];
  availableTimeSlots: string[];
  onBack: () => void;
  onChangeDeliveryType: (value: "delivery" | "pickup") => void;
  onChangePickupPointId: (value: string) => void;
  onTogglePrivateHouse: () => void;
  onChangeFullName: (value: string) => void;
  onChangePhone: (value: string) => void;
  onChangeAddress: (value: string) => void;
  onChangeEntrance: (value: string) => void;
  onChangeFloor: (value: string) => void;
  onChangeApartment: (value: string) => void;
  onChangeIntercom: (value: string) => void;
  onChangeDeliveryDate: (value: string) => void;
  onChangeDeliverySlot: (value: string) => void;
  onChangePaymentMethod: (value: string) => void;
  onChangePromoCode: (value: string) => void;
  onChangeOrderComment: (value: string) => void;
  onSubmit: () => void;
};

function formatPhoneInput(value: string) {
  return value
    .split("")
    .filter((ch) => "0123456789+()- ".includes(ch))
    .join("")
    .slice(0, 24);
}

function sanitizePhoneForSubmit(value: string) {
  const digits = value
    .split("")
    .filter((ch) => "0123456789".includes(ch))
    .join("");

  if (!digits) return "";

  let normalized = digits;
  if (normalized[0] === "8") normalized = "7" + normalized.slice(1);
  else if (normalized[0] === "9") normalized = "7" + normalized;

  const d = normalized.slice(0, 11);
  if (d[0] !== "7") return value;

  let result = "+7";
  if (d.length > 1) result += " (" + d.slice(1, 4);
  if (d.length >= 4) result += ")";
  if (d.length > 4) result += " " + d.slice(4, 7);
  if (d.length > 7) result += "-" + d.slice(7, 9);
  if (d.length > 9) result += "-" + d.slice(9, 11);
  return result;
}

export default function CheckoutOverlay({
  isOpen,
  headerOffsetTop,
  bottomPadding,
  backgroundColor,
  cardStyle,
  ghostButtonStyle,
  primaryButtonStyle,
  tabButtonStyle,
  inputStyle,
  iosSwitchWrap,
  iosSwitchKnob,
  brandAccent,
  deliveryType,
  pickupPoints,
  pickupPointId,
  isPrivateHouse,
  orderFullName,
  orderPhone,
  orderAddress,
  orderEntrance,
  orderFloor,
  orderApartment,
  orderIntercom,
  deliveryDate,
  deliverySlot,
  paymentMethod,
  promoCode,
  orderComment,
  totalLabel,
  availableDates,
  availableTimeSlots,
  onBack,
  onChangeDeliveryType,
  onChangePickupPointId,
  onTogglePrivateHouse,
  onChangeFullName,
  onChangePhone,
  onChangeAddress,
  onChangeEntrance,
  onChangeFloor,
  onChangeApartment,
  onChangeIntercom,
  onChangeDeliveryDate,
  onChangeDeliverySlot,
  onChangePaymentMethod,
  onChangePromoCode,
  onChangeOrderComment,
  onSubmit,
}: CheckoutOverlayProps) {
	  
	  const fullNameRef = useRef<HTMLInputElement | null>(null);
  const phoneRef = useRef<HTMLInputElement | null>(null);
  const addressRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => {
      if (!orderFullName.trim()) {
        fullNameRef.current?.focus();
        return;
      }
      if (!orderPhone.trim()) {
        phoneRef.current?.focus();
        return;
      }
      if (deliveryType === "delivery" && !orderAddress.trim()) {
        addressRef.current?.focus();
      }
    }, 120);

    return () => window.clearTimeout(timer);
    // only autofocus when overlay opens
  }, [isOpen]);
	
  if (!isOpen) return null;

  const showDeliveryUnavailable = deliveryType === "delivery" && availableDates.length === 0;

  return (
    <>
      <style>{`
        @keyframes checkoutFadeSlideIn {
          0% {
            opacity: 0;
            transform: translateY(6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        top: headerOffsetTop,
        bottom: 0,
        zIndex: 70,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        padding: 16,
        paddingBottom: bottomPadding,
        background: backgroundColor,
      }}
    >
      <div style={cardStyle}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "48px 1fr 48px",
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
            title="Назад в корзину"
          >
            ←
          </button>
          <div style={{ fontWeight: 900, fontSize: 18, textAlign: "center" }}>Оформление</div>
          <div />
        </div>

        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              style={tabButtonStyle(deliveryType === "delivery")}
              onClick={() => onChangeDeliveryType("delivery")}
            >
              Доставка
            </button>
            <button
              type="button"
              style={tabButtonStyle(deliveryType === "pickup")}
              onClick={() => onChangeDeliveryType("pickup")}
            >
              Самовывоз
            </button>
          </div>

<input
  ref={fullNameRef}
  style={inputStyle}
  placeholder="Имя"
            value={orderFullName}
            onChange={(e) => onChangeFullName(e.target.value)}
          />

          <input
  ref={phoneRef}
  style={inputStyle}
  type="tel"
  inputMode="tel"
  autoComplete="tel"
  placeholder="+7 (999) 123-45-67"
  value={orderPhone}
            onBlur={() => onChangePhone(sanitizePhoneForSubmit(orderPhone))}
            onChange={(e) => onChangePhone(formatPhoneInput(e.target.value))}
/>

          {deliveryType === "delivery" ? (
            <>
              <input
                ref={addressRef}
                style={inputStyle}
                placeholder="Адрес доставки"
                value={orderAddress}
                onChange={(e) => onChangeAddress(e.target.value)}
              />

              <button
                type="button"
                onClick={onTogglePrivateHouse}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 14 }}>Частный дом</div>
                <div style={iosSwitchWrap(isPrivateHouse)}>
                  <div style={iosSwitchKnob(isPrivateHouse)} />
                </div>
              </button>

              {!isPrivateHouse && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 10,
                    width: "100%",
                  }}
                >
                  <input
                    style={{ ...inputStyle, width: "100%", minWidth: 0, boxSizing: "border-box" }}
                    placeholder="Подъезд"
                    value={orderEntrance}
                    onChange={(e) => onChangeEntrance(e.target.value)}
                  />
                  <input
                    style={{ ...inputStyle, width: "100%", minWidth: 0, boxSizing: "border-box" }}
                    placeholder="Этаж"
                    value={orderFloor}
                    onChange={(e) => onChangeFloor(e.target.value)}
                  />
                  <input
                    style={{ ...inputStyle, width: "100%", minWidth: 0, boxSizing: "border-box" }}
                    placeholder="Квартира"
                    value={orderApartment}
                    onChange={(e) => onChangeApartment(e.target.value)}
                  />
                  <input
                    style={{ ...inputStyle, width: "100%", minWidth: 0, boxSizing: "border-box" }}
                    placeholder="Домофон"
                    value={orderIntercom}
                    onChange={(e) => onChangeIntercom(e.target.value)}
                  />
                </div>
              )}

              <div style={{ fontWeight: 900, fontSize: 14, marginTop: 6 }}>Дата и время</div>
              {showDeliveryUnavailable ? (
                <div
                  style={{
                    borderRadius: 16,
                    border: "1px solid rgba(212,51,20,0.28)",
                    background: "linear-gradient(180deg, rgba(255,245,243,0.96) 0%, rgba(255,240,236,0.92) 100%)",
                    padding: 14,
                    color: "#7A1E0D",
                    animation: "checkoutFadeSlideIn 220ms ease",
                    boxShadow: "0 10px 24px rgba(212,51,20,0.08)",
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(212,51,20,0.12)",
                        flexShrink: 0,
                        fontSize: 15,
                      }}
                    >
                      ⚠️
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 900, marginBottom: 4, fontSize: 15 }}>
                        Доставка временно недоступна
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>
                        Мы пока не принимаем заказы на доставку. Попробуйте чуть позже или воспользуйтесь самовывозом.
                      </div>
                      <button
                        type="button"
                        style={{
                          ...ghostButtonStyle,
                          border: "1px solid rgba(212,51,20,0.22)",
                          background: "rgba(255,255,255,0.82)",
                          color: "#7A1E0D",
                          fontWeight: 800,
                        }}
                        onClick={() => onChangeDeliveryType("pickup")}
                      >
                        Переключиться на самовывоз
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {availableDates.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        style={tabButtonStyle(deliveryDate === d.value)}
                        onClick={() => onChangeDeliveryDate(d.value)}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                    {availableTimeSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        style={tabButtonStyle(deliverySlot === slot)}
                        onClick={() => onChangeDeliverySlot(slot)}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pickupPoints.map((point) => {
                const active = pickupPointId === point.id;
                return (
                  <button
                    key={point.id}
                    type="button"
                    style={{
                      ...cardStyle,
                      padding: 12,
                      textAlign: "left",
                      cursor: "pointer",
                      border: active
                        ? "1px solid rgba(212,51,20,0.30)"
                        : "1px solid rgba(10,19,23,0.10)",
                      background: active ? "rgba(212,51,20,0.08)" : "rgba(255,255,255,0.96)",
                      boxShadow: active ? "0 10px 24px rgba(212,51,20,0.10)" : "none",
                    }}
                    onClick={() => onChangePickupPointId(point.id)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <div style={{ fontWeight: 900, fontSize: 15 }}>{point.title}</div>
                      {active && <span style={{ color: brandAccent, fontWeight: 900 }}>✓</span>}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 13, opacity: 0.78 }}>{point.address}</div>
                  </button>
                );
              })}
            </div>
          )}

          {deliveryType === "pickup" && (
            <div
              style={{
                borderRadius: 14,
                border: "1px solid rgba(10,19,23,0.10)",
                background: "rgba(10,19,23,0.04)",
                padding: 12,
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              {pickupPoints.find((point) => point.id === pickupPointId)?.worktime_text ||
                (pickupPointId === "strelna"
                  ? "Режим работы магазина: 10:00–21:00 ежедневно."
                  : "Режим работы магазина: 9:00–21:00 ежедневно.")}
            </div>
          )}

          <div style={{ fontWeight: 900, fontSize: 14, marginTop: 6 }}>Способ оплаты</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            <button type="button" style={tabButtonStyle(paymentMethod === "cash")} onClick={() => onChangePaymentMethod("cash")}>Наличные</button>
            <button type="button" style={tabButtonStyle(paymentMethod === "transfer")} onClick={() => onChangePaymentMethod("transfer")}>Перевод</button>
            <button type="button" style={tabButtonStyle(paymentMethod === "qr")} onClick={() => onChangePaymentMethod("qr")}>QR-код</button>
          </div>

          <div style={{ fontWeight: 900, fontSize: 14, marginTop: 6 }}>Промокод</div>
          <input
            style={inputStyle}
            placeholder="Введите промокод"
            value={promoCode}
            onChange={(e) => onChangePromoCode(e.target.value)}
          />

          <div style={{ fontWeight: 900, fontSize: 14, marginTop: 6 }}>Комментарий</div>
          <textarea
            style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
            placeholder="Комментарий к заказу"
            value={orderComment}
            onChange={(e) => onChangeOrderComment(e.target.value)}
          />

          <div style={{ marginTop: 4, fontWeight: 900 }}>Итого: {totalLabel}</div>
          <button
            style={{
              ...primaryButtonStyle,
              width: "100%",
              opacity: showDeliveryUnavailable ? 0.55 : 1,
              cursor: showDeliveryUnavailable ? "not-allowed" : "pointer",
            }}
            onClick={onSubmit}
            disabled={showDeliveryUnavailable}
          >
            {showDeliveryUnavailable
              ? "Доставка недоступна"
              : "Подтверди{showDeliveryUnavailable    </div>
    </>
  );
}
