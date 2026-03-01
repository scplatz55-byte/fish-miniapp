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

  async function submitOrder() {
    if (!tgUserId) return alert("Ошибка авторизации");
    if (!name || !phone || !address) return alert("Заполните все поля");

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

    const orderId = data.id;

    const items = cart.map((item) => ({
      order_id: orderId,
      product_id: item.product.id,
      product_title: item.product.title,
      price: item.product.price,
      quantity: item.quantity,
    }));

    await supabase.from("order_items").insert(items);

    alert("Заказ оформлен!");
    setCart([]);
    setView("catalog");
  }

  return (
    <main style={{ minHeight: "100vh", padding: 16, background: "#0b0b0f", color: "#fff", fontFamily: "system-ui" }}>
      <h1>🐟 Fish Delivery</h1>

      <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
        <button onClick={() => setView("catalog")}>Каталог</button>
        <button onClick={() => setView("cart")}>Корзина ({cart.length})</button>
      </div>

      {view === "catalog" && (
        <>
          <div style={{ marginTop: 20 }}>
            {categories.map((c) => (
              <button key={c.id} onClick={() => setSelectedCategoryId(c.id)}>
                {c.name}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 20 }}>
            {products.map((p) => (
              <div key={p.id} style={{ marginBottom: 12 }}>
                <div>{p.title}</div>
                <div>{formatPriceRub(p.price)}</div>
                <button onClick={() => addToCart(p)}>Добавить</button>
              </div>
            ))}
          </div>
        </>
      )}

      {view === "cart" && (
        <div style={{ marginTop: 20 }}>
          {cart.map((item) => (
            <div key={item.product.id}>
              {item.product.title} x {item.quantity}
              <button onClick={() => changeQuantity(item.product.id, -1)}>-</button>
              <button onClick={() => changeQuantity(item.product.id, 1)}>+</button>
            </div>
          ))}

          {cart.length > 0 && (
            <>
              <div style={{ marginTop: 20 }}>Итого: {formatPriceRub(total)}</div>
              <button onClick={() => setView("checkout")}>Оформить</button>
            </>
          )}
        </div>
      )}

      {view === "checkout" && (
        <div style={{ marginTop: 20 }}>
          <h3>Оформление заказа</h3>

          <input placeholder="Имя" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Телефон" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input placeholder="Адрес" value={address} onChange={(e) => setAddress(e.target.value)} />
          <textarea placeholder="Комментарий" value={comment} onChange={(e) => setComment(e.target.value)} />

          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="cash">Наличные</option>
            <option value="transfer">Перевод</option>
            <option value="qr">QR-код</option>
          </select>

          <div style={{ marginTop: 20 }}>
            <button onClick={submitOrder}>Подтвердить заказ</button>
          </div>
        </div>
      )}
    </main>
  );
}