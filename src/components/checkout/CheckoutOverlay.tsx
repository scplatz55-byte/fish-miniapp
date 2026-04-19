import { useEffect, useRef } from "react";

type PickupPoint = {
  id: string;
  title: string;
  address: string;
  worktime_text?: string | null;
};

type CheckoutOverlayProps = {
  isSubmitting?: boolean;
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
  isSubmitting = false,
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
  const showTimeSlots = deliveryType === "delivery" && Boolean(deliveryDate) && availableTimeSlots.length > 0;

  const sectionTitleStyle: React.CSSProperties = {
    fontWeight: 900,
    fontSize: 14,
    marginTop: 8,
    letterSpacing: "-0.01em",
  };

  const premiumInputStyle: React.CSSProperties = {
    ...inputStyle,
    border: "1px solid rgba(10,19,23,0.10)",
    boxShadow: "0 8px 20px rgba(10,19,23,0.03), inset 0 1px 0 rgba(255,255,255,0.7)",
    transition: "border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
  };

  const premiumNoteCardStyle: React.CSSProperties = {
    borderRadius: 16,
    border: "1px solid rgba(10,19,23,0.08)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(247,248,250,0.92) 100%)",
    padding: 14,
    boxShadow: "0 12px 28px rgba(10,19,23,0.05), inset 0 1px 0 rgba(255,255,255,0.8)",
  };

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

        .checkout-premium-input {
          transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease, background 160ms ease;
        }

        .checkout-premium-input:focus {
          border-color: rgba(212,51,20,0.24) !important;
          box-shadow: 0 0 0 4px rgba(212,51,20,0.10), 0 10px 24px rgba(10,19,23,0.05), inset 0 1px 0 rgba(255,255,255,0.78) !important;
          transform: translateY(-1px);
        }

        .checkout-pressable {
          transition: transform 140ms ease, box-shadow 160ms ease, opacity 160ms ease, filter 160ms ease;
          will-change: transform;
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          user-select: none;
          -webkit-user-select: none;
          touch-action: manipulation;
        }

        .checkout-pressable:active {
          transform: translateY(1px) scale(0.992);
          filter: saturate(0.98);
        }

        .checkout-cta:active {
          transform: translateY(1px) scale(0.992);
          box-shadow: 0 10px 18px rgba(212,51,20,0.16), inset 0 1px 0 rgba(255,255,255,0.18) !important;
        }

        button,
        [role="button"] {
          -webkit-tap-highlight-color: transparent;
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
            className="checkout-pressable checkout-cta"
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
          <div
            style={{
              display: "inline-flex",
              gap: 8,
              padding: 6,
              borderRadius: 18,
              background: "rgba(255,255,255,0.70)",
              boxShadow: "inset 0 0 0 1px rgba(10,19,23,0.06), 0 10px 22px rgba(10,19,23,0.04)",
              alignSelf: "flex-start",
            }}
          >
            <button
              type="button"
              className="checkout-pressable"
              style={tabButtonStyle(deliveryType === "delivery")}
              onClick={() => onChangeDeliveryType("delivery")}
            >
              Доставка
            </button>
            <button
              type="button"
              className="checkout-pressable"
              style={tabButtonStyle(deliveryType === "pickup")}
              onClick={() => onChangeDeliveryType("pickup")}
            >
              Самовывоз
            </button>
          </div>

<input
  ref={fullNameRef}
  className="checkout-premium-input"
  style={premiumInputStyle}
  placeholder="Имя"
            value={orderFullName}
            onChange={(e) => onChangeFullName(e.target.value)}
          />

          <input
  ref={phoneRef}
  className="checkout-premium-input"
  style={premiumInputStyle}
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
                className="checkout-premium-input"
                style={premiumInputStyle}
                placeholder="Адрес доставки"
                value={orderAddress}
                onChange={(e) => onChangeAddress(e.target.value)}
              />

              <button
                type="button"
                className="checkout-pressable"
                onClick={onTogglePrivateHouse}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: 12,
                  border: "1px solid rgba(10,19,23,0.08)",
                  borderRadius: 16,
                  background: "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(247,248,250,0.92) 100%)",
                  boxShadow: "0 10px 24px rgba(10,19,23,0.04), inset 0 1px 0 rgba(255,255,255,0.75)",
                  color: "#0A1317",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                <div>
                  <div style={{ fontWeight: 900, fontSize: 14 }}>Частный дом</div>
                </div>
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
                    className="checkout-premium-input"
                    style={{ ...premiumInputStyle, width: "100%", minWidth: 0, boxSizing: "border-box" }}
                    placeholder="Подъезд"
                    value={orderEntrance}
                    onChange={(e) => onChangeEntrance(e.target.value)}
                  />
                  <input
                    className="checkout-premium-input"
                    style={{ ...premiumInputStyle, width: "100%", minWidth: 0, boxSizing: "border-box" }}
                    placeholder="Этаж"
                    value={orderFloor}
                    onChange={(e) => onChangeFloor(e.target.value)}
                  />
                  <input
                    className="checkout-premium-input"
                    style={{ ...premiumInputStyle, width: "100%", minWidth: 0, boxSizing: "border-box" }}
                    placeholder="Квартира"
                    value={orderApartment}
                    onChange={(e) => onChangeApartment(e.target.value)}
                  />
                  <input
                    className="checkout-premium-input"
                    style={{ ...premiumInputStyle, width: "100%", minWidth: 0, boxSizing: "border-box" }}
                    placeholder="Домофон"
                    value={orderIntercom}
                    onChange={(e) => onChangeIntercom(e.target.value)}
                  />
                </div>
              )}

              <div style={sectionTitleStyle}>Дата и время</div>
              {showDeliveryUnavailable ? (
                <div
                  style={{
                    borderRadius: 16,
                    border: "1px solid rgba(212,51,20,0.28)",
                    background: "linear-gradient(180deg, rgba(255,245,243,0.96) 0%, rgba(255,240,236,0.92) 100%)",
                    padding: 14,
                    color: "#7A1E0D",
                    animation: "checkoutFadeSlideIn 220ms ease",
                    boxShadow: "0 12px 28px rgba(212,51,20,0.08), inset 0 1px 0 rgba(255,255,255,0.55)",
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,243,239,0.96) 100%)",
                        border: "1px solid rgba(212,51,20,0.16)",
                        boxShadow:
                          "0 6px 14px rgba(212,51,20,0.10), inset 0 1px 0 rgba(255,255,255,0.9)",
                        flexShrink: 0,
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          transform: "rotate(45deg)",
                          borderRadius: 5,
                          background:
                            "linear-gradient(180deg, rgba(255,192,87,1) 0%, rgba(255,168,58,1) 100%)",
                          boxShadow: "0 4px 10px rgba(255,168,58,0.28)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span
                          style={{
                            transform: "rotate(-45deg)",
                            fontSize: 12,
                            fontWeight: 900,
                            color: "#7A1E0D",
                            lineHeight: 1,
                            marginTop: -0.5,
                          }}
                        >
                          !
                        </span>
                      </div>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 900, marginBottom: 4, fontSize: 15, color: "#8E2210", letterSpacing: "-0.01em" }}>
                        Доставка временно недоступна
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>
                        Мы пока не принимаем заказы на доставку. Попробуйте чуть позже или воспользуйтесь самовывозом.
                      </div>
                      <button
                        type="button"
                        className="checkout-pressable"
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
                        className="checkout-pressable"
                        style={tabButtonStyle(deliveryDate === d.value)}
                        onClick={() => onChangeDeliveryDate(d.value)}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  {showTimeSlots ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: 8,
                      padding: 6,
                      borderRadius: 18,
                      background: "rgba(255,255,255,0.70)",
                      boxShadow: "inset 0 0 0 1px rgba(10,19,23,0.06), 0 10px 22px rgba(10,19,23,0.04)",
                    }}
                  >
                    {availableTimeSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        className="checkout-pressable"
                        style={tabButtonStyle(deliverySlot === slot)}
                        onClick={() => onChangeDeliverySlot(slot)}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                ) : null}
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
                    className="checkout-pressable"
                    style={{
                      ...cardStyle,
                      padding: 14,
                      textAlign: "left",
                      cursor: "pointer",
                      border: active
                        ? "1px solid rgba(43,128,164,0.24)"
                        : "1px solid rgba(10,19,23,0.08)",
                      background: active
                        ? "linear-gradient(180deg, rgba(238,248,252,0.98) 0%, rgba(229,243,249,0.94) 100%)"
                        : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,249,251,0.94) 100%)",
                      boxShadow: active
                        ? "0 14px 28px rgba(43,128,164,0.10), inset 0 1px 0 rgba(255,255,255,0.84)"
                        : "0 10px 22px rgba(10,19,23,0.04), inset 0 1px 0 rgba(255,255,255,0.75)",
                      color: "#0A1317",
                    }}
                    onClick={() => onChangePickupPointId(point.id)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 11, opacity: 0.55, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Точка самовывоза
                        </div>
                        <div style={{ fontWeight: 900, fontSize: 15, marginTop: 2 }}>{point.title}</div>
                      </div>
                      {active && <span style={{ color: "#2B80A4", fontWeight: 900 }}>✓</span>}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 13, opacity: 0.78 }}>{point.address}</div>
                  </button>
                );
              })}
            </div>
          )}

          {deliveryType === "pickup" && (
            <div style={premiumNoteCardStyle}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(242,246,255,0.96) 100%)",
                    border: "1px solid rgba(76,110,245,0.12)",
                    boxShadow: "0 8px 18px rgba(76,110,245,0.10), inset 0 1px 0 rgba(255,255,255,0.9)",
                    flexShrink: 0,
                    color: "#3659D9",
                    fontSize: 16,
                    fontWeight: 900,
                  }}
                >
                  ⏰
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 4, letterSpacing: "-0.01em" }}>
                    Режим работы выбранной точки
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.55, opacity: 0.84 }}>
                    {pickupPoints.find((point) => point.id === pickupPointId)?.worktime_text ||
                      (pickupPointId === "strelna"
                        ? "Режим работы магазина: 10:00–21:00 ежедневно."
                        : "Режим работы магазина: 9:00–21:00 ежедневно.")}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={sectionTitleStyle}>Способ оплаты</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 8,
              padding: 6,
              borderRadius: 18,
              background: "rgba(255,255,255,0.70)",
              boxShadow: "inset 0 0 0 1px rgba(10,19,23,0.06), 0 10px 22px rgba(10,19,23,0.04)",
            }}
          >
            <button type="button" className="checkout-pressable" style={tabButtonStyle(paymentMethod === "cash")} onClick={() => onChangePaymentMethod("cash")}>Наличные</button>
            <button type="button" className="checkout-pressable" style={tabButtonStyle(paymentMethod === "transfer")} onClick={() => onChangePaymentMethod("transfer")}>Перевод</button>
            <button type="button" className="checkout-pressable" style={tabButtonStyle(paymentMethod === "qr")} onClick={() => onChangePaymentMethod("qr")}>QR-код</button>
          </div>

          <div style={sectionTitleStyle}>Промокод</div>
          <input
            className="checkout-premium-input"
            style={premiumInputStyle}
            placeholder="Введите промокод"
            value={promoCode}
            onChange={(e) => onChangePromoCode(e.target.value)}
          />

          <div style={sectionTitleStyle}>Комментарий</div>
          <textarea
            className="checkout-premium-input"
            style={{ ...premiumInputStyle, minHeight: 110, resize: "vertical" }}
            placeholder="Комментарий к заказу"
            value={orderComment}
            onChange={(e) => onChangeOrderComment(e.target.value)}
          />

          <div
            style={{
              marginTop: 8,
              borderRadius: 16,
              padding: 14,
              background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,249,251,0.94) 100%)",
              border: "1px solid rgba(10,19,23,0.08)",
              boxShadow: "0 12px 24px rgba(10,19,23,0.04), inset 0 1px 0 rgba(255,255,255,0.78)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.62, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Итого
            </div>
            <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: "-0.02em" }}>{totalLabel}</div>
          </div>
          <button
            className="checkout-pressable checkout-cta"
            style={{
              ...primaryButtonStyle,
              width: "100%",
              minHeight: 54,
              fontSize: 16,
              letterSpacing: "-0.01em",
              opacity: showDeliveryUnavailable || isSubmitting ? 0.72 : 1,
              cursor: showDeliveryUnavailable || isSubmitting ? "not-allowed" : "pointer",
              boxShadow: showDeliveryUnavailable || isSubmitting
                ? "none"
                : "0 16px 26px rgba(212,51,20,0.22), inset 0 1px 0 rgba(255,255,255,0.25)",
              transition: "opacity 160ms ease, transform 160ms ease, box-shadow 160ms ease",
            }}
            onClick={onSubmit}
            disabled={showDeliveryUnavailable || isSubmitting}
          >
            {showDeliveryUnavailable
              ? "Доставка недоступна"
              : isSubmitting
                ? "Оформляем заказ..."
                : "Подтвердить заказ"}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
