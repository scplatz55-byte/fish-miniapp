import ProfileMenuCard from "@/components/profile/ProfileMenuCard";

type UserProfileLike = {
  full_name: string | null;
  telegram_photo_url: string | null;
};

type TgUserLike = {
  username?: string;
  photo_url?: string;
};

type ProfileMainScreenProps = {
  cardStyle: React.CSSProperties;
  avatarSrc: string;
  profileData: UserProfileLike | null;
  tgUser: TgUserLike | null;
  tgUserId: number | null;
  tgDisplayName: () => string;
  isAdmin: boolean;
  onOpenHistory: () => void;
  onOpenData: () => void;
  onOpenSupport: () => void;
  onOpenAdmin: () => void;
};

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
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt="avatar"
              style={{
                width: 64,
                height: 64,
                borderRadius: 999,
                objectFit: "cover",
                border: "1px solid rgba(10,19,23,0.10)",
              }}
            />
          ) : (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 999,
                background: "rgba(10,19,23,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
              }}
            >
              TG
            </div>
          )}

          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>
              {profileData?.full_name || tgDisplayName() || "Профиль"}
            </div>
            <div style={{ marginTop: 4, fontSize: 13, opacity: 0.72 }}>
              {tgUser?.username ? `@${tgUser.username}` : `ID: ${tgUserId || "—"}`}
            </div>
          </div>
        </div>
      </div>

      <ProfileMenuCard
        title="История заказов"
        description="Все ваши оформленные заказы"
        onClick={onOpenHistory}
      />

      <ProfileMenuCard
        title="Мои данные"
        description="Имя, телефон и адрес доставки"
        onClick={onOpenData}
      />

      <ProfileMenuCard
        title="Тех. поддержка"
        description="Связаться с нами в Telegram"
        onClick={onOpenSupport}
      />

      {isAdmin && (
        <ProfileMenuCard
          title="Админка"
          description="Просмотр и управление заказами"
          onClick={onOpenAdmin}
        />
      )}
    </div>
  );
}
