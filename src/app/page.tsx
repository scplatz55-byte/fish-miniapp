"use client";

import { useEffect, useState } from "react";

type TgUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export default function Page() {
  const [user, setUser] = useState<TgUser | null>(null);
  const [initData, setInitData] = useState<string>("");

  useEffect(() => {
    const tg = (window as any)?.Telegram?.WebApp;
    if (!tg) return;

    tg.ready();
    tg.expand();

    setInitData(tg.initData || "");

    const u = tg.initDataUnsafe?.user as TgUser | undefined;
    if (u) setUser(u);
  }, []);

  return (
    <main style={{ padding: 16, fontFamily: "system-ui" }}>
      <h1>Fish Mini App (MVP)</h1>

      <div style={{ marginTop: 16 }}>
        <h3>Telegram user</h3>
        <pre style={{ background: "#111", color: "#0f0", padding: 12 }}>
          {user ? JSON.stringify(user, null, 2) : "Нет данных. Открой через Telegram."}
        </pre>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>initData</h3>
        <pre style={{ background: "#111", color: "#fff", padding: 12 }}>
          {initData || "Нет initData. Открой через Telegram."}
        </pre>
      </div>
    </main>
  );
}