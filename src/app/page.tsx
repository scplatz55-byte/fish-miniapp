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
  price: string;
  unit_type: "unit" | "weight";
  is_active: boolean;
};

type CartItem = {
  product: Product;
  quantity: number;
};

function formatPriceRub(value: string | number) {
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
}

export default function Page() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [view, setView] = useState<"catalog" | "cart">("catalog");

  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });

      const list = (data || []) as Category[];
      setCategories(list);
      if (list.length > 0) setSelectedCategoryId(list[0].id);
    }

    loadCategories();
  }, []);

  useEffect(() => {
    async function loadProducts() {
      if (!selectedCategoryId) return;

      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("category_id", selectedCategoryId)
        .eq("is_active", true);

      setProducts((data || []) as Product[]);
    }

    loadProducts();
  }, [selectedCategoryId]);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        return prev.map((c) =>
          c.product.id === product.id
            ? { ...c, quantity: c.quantity + 1 }
            : c
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function changeQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) =>
          c.product.id === productId
            ? { ...c, quantity: c.quantity + delta }
            : c
        )
        .filter((c) => c.quantity > 0)
    );
  }

  const total = useMemo(() => {
    return cart.reduce((sum, item) => {
      return sum + Number(item.product.price) * item.quantity;
    }, 0);
  }, [cart]);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 16,
        background: "#0b0b0f",
        color: "#fff",
        fontFamily: "system-ui",
      }}
    >
      <h1 style={{ margin: 0 }}>🐟 Fish Delivery</h1>

      <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
        <button
          onClick={() => setView("catalog")}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #444",
            background: view === "catalog" ? "#222" : "#111",
            color: "#fff",
          }}
        >
          Каталог
        </button>

        <button
          onClick={() => setView("cart")}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #444",
            background: view === "cart" ? "#222" : "#111",
            color: "#fff",
          }}
        >
          Корзина ({cart.length})
        </button>
      </div>

      {view === "catalog" && (
        <>
          <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategoryId(c.id)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 20,
                  border: "1px solid #333",
                  background:
                    selectedCategoryId === c.id ? "#333" : "#111",
                  color: "#fff",
                }}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            {products.map((p) => (
              <div
                key={p.id}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #333",
                  background: "#111",
                }}
              >
                <div style={{ fontWeight: 600 }}>{p.title}</div>
                {p.description && (
                  <div style={{ fontSize: 13, opacity: 0.7 }}>
                    {p.description}
                  </div>
                )}
                <div style={{ marginTop: 8 }}>
                  {formatPriceRub(p.price)}{" "}
                  {p.unit_type === "weight" ? "за кг" : "за шт"}
                </div>
                <button
                  onClick={() => addToCart(p)}
                  style={{
                    marginTop: 10,
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid #444",
                    background: "#222",
                    color: "#fff",
                  }}
                >
                  Добавить
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {view === "cart" && (
        <div style={{ marginTop: 20 }}>
          {cart.length === 0 && <div>Корзина пуста</div>}

          {cart.map((item) => (
            <div
              key={item.product.id}
              style={{
                marginBottom: 12,
                padding: 12,
                borderRadius: 12,
                border: "1px solid #333",
                background: "#111",
              }}
            >
              <div style={{ fontWeight: 600 }}>
                {item.product.title}
              </div>

              <div style={{ marginTop: 6 }}>
                {formatPriceRub(item.product.price)}
              </div>

              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <button
                  onClick={() =>
                    changeQuantity(item.product.id, -1)
                  }
                >
                  -
                </button>

                <div>{item.quantity}</div>

                <button
                  onClick={() =>
                    changeQuantity(item.product.id, 1)
                  }
                >
                  +
                </button>
              </div>
            </div>
          ))}

          {cart.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                Итого: {formatPriceRub(total)}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}