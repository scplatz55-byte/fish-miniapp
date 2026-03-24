export default function ProfileMainScreen({
  cardStyle,
  avatarSrc,
  profileData,
  tgUser,
  tgUserId,
  tgDisplayName,
  isAdmin,
  onOpenHistory,
  onOpenData,
  onOpenSupport,
  onOpenAdmin,
}: ProfileMainScreenProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          ...cardStyle,
          padding: 16,
          borderRadius: 24,
          background: "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(246,248,250,0.95) 100%)",
          boxShadow: "0 16px 32px rgba(10,19,23,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt="avatar"
              style={{
                width: 70,
                height: 70,
                borderRadius: 999,
                objectFit: "cover",
                border: "1px solid rgba(10,19,23,0.08)",
                boxShadow: "0 10px 22px rgba(10,19,23,0.06)",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 70,
                height: 70,
                borderRadius: 999,
                background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(239,244,247,0.94) 100%)",
                border: "1px solid rgba(10,19,23,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                boxShadow: "0 10px 22px rgba(10,19,23,0.05), inset 0 1px 0 rgba(255,255,255,0.88)",
                flexShrink: 0,
              }}
            >
              TG
            </div>
          )}

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 11, opacity: 0.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Профиль
            </div>
            <div style={{ marginTop: 4, fontWeight: 900, fontSize: 20, letterSpacing: "-0.02em" }}>
              {profileData?.full_name || tgDisplayName() || "Профиль"}
            </div>
            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.72, lineHeight: 1.45 }}>
              {tgUser?.username ? `@${tgUser.username}` : `ID: ${tgUserId || "—"}`}
            </div>
          </div>
        </div>
      </div>

      <PremiumMenuCard
        title="История заказов"
        description="Все ваши оформленные заказы"
        icon="🧾"
        accent="linear-gradient(180deg, rgba(43,128,164,0.18) 0%, rgba(43,128,164,0.10) 100%)"
        onClick={onOpenHistory}
      />

      <PremiumMenuCard
        title="Мои данные"
        description="Имя, телефон и адрес доставки"
        icon="👤"
        accent="linear-gradient(180deg, rgba(76,110,245,0.16) 0%, rgba(76,110,245,0.10) 100%)"
        onClick={onOpenData}
      />

      <PremiumMenuCard
        title="Тех. поддержка"
        description="Связаться с нами в Telegram"
        icon="💬"
        accent="linear-gradient(180deg, rgba(37,211,102,0.16) 0%, rgba(37,211,102,0.10) 100%)"
        onClick={onOpenSupport}
      />

      {isAdmin && (
        <PremiumMenuCard
          title="Админка"
          description="Просмотр и управление заказами"
          icon="🛠️"
          accent="linear-gradient(180deg, rgba(255,184,77,0.18) 0%, rgba(255,184,77,0.10) 100%)"
          onClick={onOpenAdmin}
        />
      )}
    </div>
  );
}
