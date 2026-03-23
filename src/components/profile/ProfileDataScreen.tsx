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

function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (digits[0] !== "7" && digits[0] !== "8") return false;
  return true;
}

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
  const phoneError = Boolean(phone) && !isValidPhone(phone);

  return (
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <input
        style={inputStyle}
        placeholder="ФИО"
        value={fullName}
        onChange={(e) => onChangeFullName(e.target.value)}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <input
          style={
            phoneError
              ? {
                  ...inputStyle,
                  border: "1px solid rgba(212,51,20,0.55)",
                  boxShadow: "0 0 0 1px rgba(212,51,20,0.12)",
                }
              : inputStyle
          }
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+7 (999) 123-45-67"
          value={phone}
          onBlur={() => onChangePhone(sanitizePhoneForSubmit(phone))}
          onChange={(e) => onChangePhone(formatPhoneInput(e.target.value))}
        />
        <div
          style={{
            fontSize: 12,
            color: "#D43314",
            opacity: phoneError ? 1 : 0,
            transform: phoneError ? "translateY(0)" : "translateY(-4px)",
            maxHeight: phoneError ? 20 : 0,
            overflow: "hidden",
            transition: "opacity 180ms ease, transform 180ms ease, max-height 180ms ease",
            paddingLeft: 2,
          }}
        >
          Введите корректный номер
        </div>
      </div>

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