type ProfileDataScreenProps = {
  inputStyle: React.CSSProperties;
  fullName: string;
  phone: string;
  address: string;
  onChangeFullName: (value: string) => void;
  onChangePhone: (value: string) => void;
  onChangeAddress: (value: string) => void;
  onSave: () => void;
  saveLoading: boolean;
  primaryButtonStyle: React.CSSProperties;
};

export default function ProfileDataScreen({
  inputStyle,
  fullName,
  phone,
  address,
  onChangeFullName,
  onChangePhone,
  onChangeAddress,
  onSave,
  saveLoading,
  primaryButtonStyle,
}: ProfileDataScreenProps) {
  return (
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <input
        style={inputStyle}
        placeholder="ФИО"
        value={fullName}
        onChange={(e) => onChangeFullName(e.target.value)}
      />
      <input
        style={inputStyle}
        placeholder="Телефон"
        value={phone}
        onChange={(e) => onChangePhone(e.target.value)}
      />
      <input
        style={inputStyle}
        placeholder="Адрес"
        value={address}
        onChange={(e) => onChangeAddress(e.target.value)}
      />
      <button
        style={{ ...primaryButtonStyle, width: "100%", opacity: saveLoading ? 0.7 : 1 }}
        onClick={onSave}
        disabled={saveLoading}
      >
        {saveLoading ? "Сохраняем..." : "Сохранить"}
      </button>
    </div>
  );
}
