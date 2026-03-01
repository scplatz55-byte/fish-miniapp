"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Category = {
  id: string;
  name: string;
  sort_order: number;
};

type Product = {
  id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  price: string; // supabase numeric приходит как string
  unit_type: "unit" | "weight";
  is_active: boolean;
};

function formatPriceRub(value: string | number) {
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
}

export default function Page() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) || null,
    [categories, selectedCategoryId]
  );

  useEffect(() => {
    async function loadCategories() {
      try {
        setLoadingCategories(true);
        setError(null);

        const { data, error } = await supabase
          .from("categories")
          .select("id,name,sort_order")
          .order("sort_order", { ascending: true });

        if (error) throw error;

        const list = (data || []) as Category[];
        setCategories(list);

        // Автовыбор первой категории
        if (!selectedCategoryId && list.length > 0) {
          setSelectedCategoryId(list[0].id);
        }
      } catch (e: any) {
        setError(e?.message || "Ошибка загрузки категорий");
      } finally {
        setLoadingCategories(false);
      }
    }

    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function loadProducts(categoryId: string) {
      try {
        setLoadingProducts(true);
        setError(null);

        const { data, error } = await supabase
          .from("products")
          .select("id,category_id,title,description,price,unit_type,is_active")
          .eq("category_id", categoryId)
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setProducts(((data || []) as Product[]) ?? []);
      } catch (e: any) {
        setError(e?.message || "Ошибка загрузки товаров");
      } finally {
        setLoadingProducts(false);
      }
    }

    if (selectedCategoryId) loadProducts(selectedCategoryId);
    else setProducts([]);
  }, [selectedCategoryId]);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 16,
        fontFamily: "system-ui",
        background: "#0b0b0f",
        color: "#fff",
      }}
    >
      <h1 style={{ margin: 0, fontSize: 20 }}>🐟 Fish Delivery</h1>
      <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>
        Каталог (черновик)
      </div>

      {/* Ошибка */}
      {error && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 12,
            background: "rgba(255, 0, 0, 0.12)",
            border: "1px solid rgba(255, 0, 0, 0.25)",
            color: "#ff6b6b",
            fontSize: 13,
          }}
        >
          Ошибка: {error}
        </div>
      )}

      {/* Категории */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 14, marginBottom: 10, opacity: 0.9 }}>
          Категории
        </div>

        {loadingCategories ? (
          <div style={{ opacity: 0.8 }}>Загрузка категорий...</div>
        ) : (
          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              paddingBottom: 4,
            }}
          >
            {categories.map((c) => {
              const active = c.id === selectedCategoryId;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategoryId(c.id)}
                  style={{
                    flex: "0 0 auto",
                    padding: "10px 12px",
                    borderRadius: 999,
                    border: active ? "1px solid rgba(255,255,255,0.35)" : "1px solid rgba(255,255,255,0.12)",
                    background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 14,
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Товары */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 14, marginBottom: 10, opacity: 0.9 }}>
          {selectedCategory ? `Товары: ${selectedCategory.name}` : "Товары"}
        </div>

        {loadingProducts ? (
          <div style={{ opacity: 0.8 }}>Загрузка товаров...</div>
        ) : products.length === 0 ? (
          <div style={{ opacity: 0.75 }}>Товаров пока нет</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {products.map((p) => (
              <div
                key={p.id}
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  padding: 12,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 15 }}>{p.title}</div>

                {p.description ? (
                  <div style={{ marginTop: 4, opacity: 0.75, fontSize: 13 }}>
                    {p.description}
                  </div>
                ) : null}

                <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 700 }}>
                    {formatPriceRub(p.price)}{" "}
                    <span style={{ fontWeight: 500, opacity: 0.75, fontSize: 12 }}>
                      {p.unit_type === "weight" ? "за кг" : "за шт"}
                    </span>
                  </div>

                  <button
                    onClick={() => alert("Скоро: добавление в корзину")}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "rgba(255,255,255,0.10)",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    В корзину
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}