import ProfileDataScreen from "@/components/profile/ProfileDataScreen";
import ProfileOrdersList from "@/components/profile/ProfileOrdersList";
import ProfileOrderDetails from "@/components/profile/ProfileOrderDetails";

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

type ProfileOverlayScreen = "history" | "data";

type ProfileOverlayProps = {
  isVisible: boolean;
  activeScreen: ProfileOverlayScreen | null;
  headerOffsetTop: string;
  bottomPadding: string;
  backgroundColor: string;
  cardStyle: React.CSSProperties;
  ghostButtonStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
  primaryButtonStyle: React.CSSProperties;
  smallMutedStyle: React.CSSProperties;
  selectedMyOrderId: string | null;
  selectedMyOrder: OrderForUi | null;
  profileLoading: boolean;
  profileError: string | null;
  myOrders: OrderForUi[];
  profileFormFullName: string;
  profileFormPhone: string;
  profileFormAddress: string;
  profileSaveLoading: boolean;
  onBack: () => void;
  onChangeFullName: (value: string) => void;
  onChangePhone: (value: string) => void;
  onChangeAddress: (value: string) => void;
  onSaveProfile: () => void;
  onSelectOrder: (orderId: string) => void;
  formatDateTime: (iso: string) => string;
  formatPriceRub: (value: string | number) => string;
  renderStatusBadge: (status: OrderStatus) => React.ReactNode;
};

export default function ProfileOverlay({
  isVisible,
  activeScreen,
  headerOffsetTop,
  bottomPadding,
  backgroundColor,
  cardStyle,
  ghostButtonStyle,
  inputStyle,
  primaryButtonStyle,
  smallMutedStyle,
  selectedMyOrderId,
  selectedMyOrder,
  profileLoading,
  profileError,
  myOrders,
  profileFormFullName,
  profileFormPhone,
  profileFormAddress,
  profileSaveLoading,
  onBack,
  onChangeFullName,
  onChangePhone,
  onChangeAddress,
  onSaveProfile,
  onSelectOrder,
  formatDateTime,
  formatPriceRub,
  renderStatusBadge,
}: ProfileOverlayProps) {
  if (!isVisible || !activeScreen) return null;

  return (
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
            title="Назад"
          >
            ←
          </button>
          <div style={{ fontWeight: 900, fontSize: 18, textAlign: "center" }}>
            {activeScreen === "history" ? "История заказов" : "Мои данные"}
          </div>
          <div />
        </div>

        {activeScreen === "data" && (
          <ProfileDataScreen
            inputStyle={inputStyle}
            fullName={profileFormFullName}
            phone={profileFormPhone}
            address={profileFormAddress}
            onChangeFullName={onChangeFullName}
            onChangePhone={onChangePhone}
            onChangeAddress={onChangeAddress}
            onSave={onSaveProfile}
            saveLoading={profileSaveLoading}
            primaryButtonStyle={primaryButtonStyle}
          />
        )}

        {activeScreen === "history" && (
          <>
            {!selectedMyOrderId ? (
              <ProfileOrdersList
                profileLoading={profileLoading}
                profileError={profileError}
                orders={myOrders}
                onSelectOrder={onSelectOrder}
                formatDateTime={formatDateTime}
                formatPriceRub={formatPriceRub}
                smallMutedStyle={smallMutedStyle}
                renderStatusBadge={renderStatusBadge}
              />
            ) : (
              <ProfileOrderDetails
                order={selectedMyOrder}
                formatDateTime={formatDateTime}
                formatPriceRub={formatPriceRub}
                smallMutedStyle={smallMutedStyle}
                renderStatusBadge={renderStatusBadge}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
