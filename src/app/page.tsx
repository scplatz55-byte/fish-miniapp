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
  const [view, setView] = useState<"catalog" | "cart" | "checkout">("catalog");

  const [tgUserId, setTgUserId] = useState<number | null>(null);
  const [initData, setInitData] = useState<string>("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  useEffect(() => {
    const tg = (window as any)?.Telegram?.WebApp;
    if (!tg) return;

    tg.ready();
    tg.expand();

    setInitData(tg.initData || "");

    const u = tg.initDataUnsafe?.user;
    if (u?.id) setTgUserId(u.id);
    if (u?.first_name) setName(u.first_name);
  }, []);

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
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function changeQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) =>
          c.product.id === productId ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0)
    );
  }

  const total = useMemo(() => {
    return cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  }, [cart]);

  async function submitOrder() {
    if (!tgUserId) return alert("Ошибка авторизации (нет Telegram user id)");
    if (!name || !phone || !address) return alert("Заполните имя, телефон и адрес");
    if (cart.length === 0) return alert("Корзина пуста");

    // 1) Create order
    const { data, error } = await supabase
      .from("orders")
      .insert([
        {
          user_telegram_id: tgUserId,
          customer_name: name,
          phone,
          address,
          comment,
          payment_method: paymentMethod,
          total_amount: total,
        },
      ])
      .select()
      .single();

    if (error) return alert(error.message);

    const orderId = data.id as string;

    // 2) Insert items
    const items = cart.map((item) => ({
      order_id: orderId,
      product_id: item.product.id,
      product_title: item.product.title,
      price: item.product.price,
      quantity: item.quantity,
    }));

    const { error: itemsErr } = await supabase.from("order_items").insert(items);
    if (itemsErr) return alert(itemsErr.message);

    // 3) Notify admin with full composition (server pulls from DB)
    try {
      await fetch("/api/notify-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, orderId }),
      });
    } catch {
      // Even if notification fails, order is saved.
    }

    alert("Заказ оформлен!");
    setCart([]);
    setView("catalog");
  }

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
        <button onClick={() => setView("catalog")}>Каталог</button>
        <button onClick={() => setView("cart")}>Корзина ({cart.length})</button>
      </div>

      {view === "catalog" && (
        <>
          <div style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategoryId(c.id)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: selectedCategoryId === c.id ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
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
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ fontWeight: 700 }}>{p.title}</div>
                {p.description && <div style={{ fontSize: 13, opacity: 0.75 }}>{p.description}</div>}
                <div style={{ marginTop: 8, fontWeight: 700 }}>
                  {formatPriceRub(p.price)}{" "}
                  <span style={{ fontWeight: 500, opacity: 0.75, fontSize: 12 }}>
                    {p.unit_type === "weight" ? "за кг" : "за шт"}
                  </span>
                </div>
                <button
                  onClick={() => addToCart(p)}
                  style={{
                    marginTop: 10,
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.10)",
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
          {cart.length === 0 && <div style={{ opacity: 0.8 }}>Корзина пуста</div>}

          {cart.map((item) => (
            <div
              key={item.product.id}
              style={{
                marginBottom: 12,
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ fontWeight: 700 }}>{item.product.title}</div>

              <div style={{ marginTop: 6, opacity: 0.85 }}>
                {formatPriceRub(item.product.price)}{" "}
                <span style={{ fontSize: 12, opacity: 0.75 }}>
                  {item.product.unit_type === "weight" ? "за кг" : "за шт"}
                </span>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
                <button onClick={() => changeQuantity(item.product.id, -1)}>-</button>
                <div style={{ minWidth: 24, textAlign: "center" }}>{item.quantity}</div>
                <button onClick={() => changeQuantity(item.product.id, 1)}>+</button>
              </div>
            </div>
          ))}

          {cart.length > 0 && (
            <>
              <div style={{ marginTop: 20, fontSize: 16, fontWeight: 800 }}>
                Итого: {formatPriceRub(total)}
              </div>
              <button
                onClick={() => setView("checkout")}
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.14)",
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                Оформить
              </button>
            </>
          )}
        </div>
      )}

      {view === "checkout" && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ marginTop: 0 }}>Оформление заказа</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input placeholder="Имя" value={name} onChange={(e) => setName(e.target.value)} />
            <input placeholder="Телефон" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input placeholder="Адрес" value={address} onChange={(e) => setAddress(e.target.value)} />
            <textarea placeholder="Комментарий" value={comment} onChange={(e) => setComment(e.target.value)} />

            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="cash">Наличные</option>
              <option value="transfer">Перевод</option>
              <option value="qr">QR-код</option>
            </select>

            <div style={{ marginTop: 10, fontWeight: 800 }}>
              Итого: {formatPriceRub(total)}
            </div>

            <button onClick={submitOrder} style={{ padding: "10px 12px", borderRadius: 12 }}>
              Подтвердить заказ
            </button>
            <button onClick={() => setView("cart")} style={{ padding: "10px 12px", borderRadius: 12 }}>
              Назад в корзину
            </button>
          </div>
        </div>
      )}
    </main>
  );
}