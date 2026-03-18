type ProfileMenuCardProps = {
  title: string;
  description: string;
  onClick: () => void;
};

export default function ProfileMenuCard({
  title,
  description,
  onClick,
}: ProfileMenuCardProps) {
  return (
    <button
      style={{
        borderRadius: 18,
        border: "1px solid rgba(10,19,23,0.10)",
        background: "rgba(255,255,255,0.96)",
        padding: 14,
        textAlign: "left",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        boxShadow: "0 10px 24px rgba(10,19,23,0.05)",
      }}
      onClick={onClick}
    >
      <div>
        <div style={{ fontWeight: 900, fontSize: 18, color: "#000" }}>
          {title}
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 13,
            opacity: 0.68,
            color: "#000",
          }}
        >
          {description}
        </div>
      </div>

      <div
        style={{
          fontSize: 28,
          lineHeight: 1,
          opacity: 0.42,
          fontWeight: 900,
        }}
      >
        ›
      </div>
    </button>
  );
}