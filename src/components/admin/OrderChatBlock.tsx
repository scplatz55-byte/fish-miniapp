type OrderChatMessage = {
  id: string;
  order_id: string;
  telegram_user_id: number;
  direction: "incoming" | "outgoing";
  text: string;
  bot_message_id?: number | null;
  reply_to_bot_message_id?: number | null;
  sender_role: "admin" | "customer" | "system";
  created_at: string;
};

type OrderChatBlockProps = {
  title: string;
  chatOpen: boolean;
  chatClosedUnread: number;
  chatLoading: boolean;
  chatError: string | null;
  chatMessages: OrderChatMessage[];
  chatAtBottom: boolean;
  chatUnreadCount: number;
  chatText: string;
  chatSending: boolean;
  inputStyle: React.CSSProperties;
  primaryButtonStyle: React.CSSProperties;
  ghostButtonStyle: React.CSSProperties;
  brandAccent: string;
  brandInk: string;
  chatListRef: React.RefObject<HTMLDivElement | null>;
  onToggleOpen: () => void;
  onRefresh: () => void;
  onScroll: () => void;
  onScrollToBottom: () => void;
  onChangeText: (value: string) => void;
  onSend: () => void;
  formatDateTime: (iso: string) => string;
  renderSkeleton: (key: string, width?: string) => React.ReactNode;
};

export default function OrderChatBlock({
  title,
  chatOpen,
  chatClosedUnread,
  chatLoading,
  chatError,
  chatMessages,
  chatAtBottom,
  chatUnreadCount,
  chatText,
  chatSending,
  inputStyle,
  primaryButtonStyle,
  ghostButtonStyle,
  brandAccent,
  brandInk,
  chatListRef,
  onToggleOpen,
  onRefresh,
  onScroll,
  onScrollToBottom,
  onChangeText,
  onSend,
  formatDateTime,
  renderSkeleton,
}: OrderChatBlockProps) {
  return (
    <div
      style={{
        marginTop: 14,
        borderRadius: 16,
        border: "1px solid rgba(10,19,23,0.08)",
        background: "rgba(10,19,23,0.03)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 14px",
          borderBottom: "1px solid rgba(10,19,23,0.08)",
          fontWeight: 900,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span>{title}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={{ ...ghostButtonStyle, position: "relative" }}
            onClick={onToggleOpen}
          >
            {chatOpen ? "Скрыть" : "Открыть"}
            {!chatOpen && chatClosedUnread > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  background: brandAccent,
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {chatClosedUnread > 9 ? "9+" : chatClosedUnread}
              </span>
            )}
          </button>
          <button
            style={{
              ...ghostButtonStyle,
              width: 40,
              display: "flex",
              justifyContent: "center",
            }}
            onClick={onRefresh}
            title="Обновить"
          >
            ↻
          </button>
        </div>
      </div>

      {chatOpen && (
        <>
          <div style={{ position: "relative" }}>
            <div
              ref={chatListRef}
              onScroll={onScroll}
              style={{
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                maxHeight: 320,
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {chatLoading ? (
                <>
                  {renderSkeleton("chat-1")}
                  {renderSkeleton("chat-2", "82%")}
                </>
              ) : chatError ? (
                <div style={{ color: brandAccent, whiteSpace: "pre-wrap" }}>
                  Ошибка: {chatError}
                </div>
              ) : chatMessages.length === 0 ? (
                <div style={{ opacity: 0.72 }}>Сообщений пока нет.</div>
              ) : (
                chatMessages.map((msg) => {
                  const outgoing = msg.direction === "outgoing";
                  return (
                    <div
                      key={msg.id}
                      style={{
                        alignSelf: outgoing ? "flex-end" : "flex-start",
                        maxWidth: "86%",
                        padding: "10px 12px",
                        borderRadius: 14,
                        background: outgoing
                          ? "rgba(212,51,20,0.10)"
                          : "rgba(255,255,255,0.90)",
                        border: outgoing
                          ? "1px solid rgba(212,51,20,0.18)"
                          : "1px solid rgba(10,19,23,0.08)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          lineHeight: 1.4,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {msg.text}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 11, opacity: 0.6 }}>
                        {outgoing ? "Вы" : "Клиент"} • {formatDateTime(msg.created_at)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {!chatAtBottom && (
              <button
                style={{
                  position: "absolute",
                  right: 14,
                  bottom: 14,
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  border: "1px solid rgba(10,19,23,0.10)",
                  background: "rgba(255,255,255,0.96)",
                  boxShadow: "0 10px 24px rgba(10,19,23,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  zIndex: 2,
                }}
                onClick={onScrollToBottom}
                title="К последним сообщениям"
              >
                <span style={{ fontSize: 18, lineHeight: 1, color: brandInk }}>↓</span>
                {chatUnreadCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -4,
                      width: 18,
                      height: 18,
                      padding: 0,
                      borderRadius: 999,
                      background: brandAccent,
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 900,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
                  </span>
                )}
              </button>
            )}
          </div>

          <div
            style={{
              padding: 12,
              borderTop: "1px solid rgba(10,19,23,0.08)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <textarea
              style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
              placeholder="Напишите сообщение клиенту..."
              value={chatText}
              onChange={(e) => onChangeText(e.target.value)}
            />
            <button
              style={{
                ...primaryButtonStyle,
                width: "100%",
                opacity: chatSending ? 0.7 : 1,
              }}
              onClick={onSend}
              disabled={chatSending}
            >
              {chatSending ? "Отправляем..." : "Отправить сообщение"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
