"use client";

import { useEffect, useState } from "react";

type TgUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

export default function Page() {
  const [user, setUser] = useState<TgUser | null>(null);
  const [initData, setInitData] = useState<string>("");
  const [serverCheck, setServerCheck] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tg = (window as any)?.Telegram?.WebApp;
    if (!tg) return;

    tg.ready();
    tg.expand();

    setInitData(tg.initData || "");
    const u = tg.initDataUnsafe?.user as TgUser | undefined;
    if (u) setUser(u);
  }, []);

  async function verifyOnServer() {
    try {
      setLoading(true);
      setServerCheck(null);

      const res = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
      });

      const data = await res.json();
      setServerCheck({ status: res.status, data });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ margin: 0 }}>Fish Mini App (MVP)</h1>
      <p style={{ opacity: 0.8 }}>
        Данные Telegram появляются только если открыть через Telegram.
      </p>

      <button
        onClick={verifyOnServer}
        disabled={!initData || loading}
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #444",
          background: loading ? "#333" : "#111",
          color: "#fff",
          cursor: !initData || loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Проверяем..." : "Проверить initData на сервере"}
      </button>

      <div style={{ marginTop: 16 }}>
        <h3>Telegram user (client)</h3>
        <pre style={{ background: "#111", color: "#0f0", padding: 12, borderRadius: 10 }}>
          {user ? JSON.stringify(user, null, 2) : "Нет данных. Открой через Telegram."}
        </pre>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>initData</h3>
        <pre
          style={{
            background: "#111",
            color: "#fff",
            padding: 12,
            borderRadius: 10,
            overflowX: "auto",
          }}
        >
          {initData || "Нет initData. Открой через Telegram."}
        </pre>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Server verification result</h3>
        <pre
          style={{
            background: "#111",
            color: "#fff",
            padding: 12,
            borderRadius: 10,
            overflowX: "auto",
          }}
        >
          {serverCheck ? JSON.stringify(serverCheck, null, 2) : "Нажми кнопку проверки выше"}
        </pre>
      </div>
    </main>
  );
}