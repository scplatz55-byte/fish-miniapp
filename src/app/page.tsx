"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type TgUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

type Category = {
  id: string;
  name: string;
  sort_order: number;
};

export default function Page() {
  const [user, setUser] = useState<TgUser | null>(null);
  const [initData, setInitData] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Telegram init
  useEffect(() => {
    if (typeof window === "undefined") return;

    const tg = (window as any)?.Telegram?.WebApp;
    if (!tg) return;

    tg.ready();
    tg.expand();

    setInitData(tg.initData || "");

    const u = tg.initDataUnsafe?.user as TgUser | undefined;
    if (u) setUser(u);
  }, []);

  // Загрузка категорий
  useEffect(() => {
    async function loadCategories() {
      try {
        setLoadingCategories(true);
        setError(null);

        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .order("sort_order", { ascending: true });

        if (error) throw error;

        setCategories(data || []);
      } catch (e: any) {
        setError(e?.message || "Ошибка загрузки категорий");
      } finally {
        setLoadingCategories(false);
      }
    }

    loadCategories();
  }, []);

  return (
    <main style={{ padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ marginBottom: 8 }}>🐟 Fish Delivery</h1>

      {user && (
        <div style={{ marginBottom: 16, fontSize: 14, opacity: 0.8 }}>
          Привет, {user.first_name} 👋
        </div>
      )}

      <h2 style={{ marginTop: 20 }}>Категории</h2>

      {loadingCategories && <p>Загрузка...</p>}

      {error && (
        <div style={{ color: "red", marginTop: 8 }}>
          Ошибка: {error}
        </div>
      )}

      {!loadingCategories && categories.length === 0 && (
        <p>Категории не найдены</p>
      )}

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {categories.map((cat) => (
          <div
            key={cat.id}
            style={{
              padding: 14,
              borderRadius: 12,
              border: "1px solid #ddd",
              background: "#f5f5f5",
              fontWeight: 500,
            }}
          >
            {cat.name}
          </div>
        ))}
      </div>
    </main>
  );
}