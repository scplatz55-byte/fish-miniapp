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

type AdminOrder = {
  id: string;
  user_telegram_id: number;
  customer_name: string;
  phone: string;
  address: string;
  comment: string | null;
  payment_method: string;
  total_amount: string;
  status: "new" | "in_progress" | "delivered" | "canceled";
  created_at: string;
  items_text?: string;
};

function formatPriceRub(value: string | number) {
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
}

function formatDateTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function statusLabel(s: AdminOrder["status"]) {
  if (s === "new") return "Новый";
  if (s === "in_progress") return "В работе";
  if (s === "delivered") return "Доставлен";
  if (s === "canceled") return "Отменён";
  return s;
}

export default function Page() {
  const [view, setView] = useState<"catalog" | "cart" | "checkout" | "admin">("catalog");

  // Telegram
  const [tgUserId, setTgUserId] = useState<number | null>(null);
  const [initData, setInitData] = useState<string>("");

  // Basic shop data
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const total = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0),
    [cart]
  );

  // Checkout fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  // Admin
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  // Telegram init
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

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase
        .from("categories")
        .select("id,name,sort_order")
        .order("sort_order", { ascending: true });

      const list = (data || []) as Category[];
      setCategories(list);
      if (!selectedCategoryId && list.length > 0) setSelectedCategoryId(list[0].id);
    }
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load products per category
  useEffect(() => {
    async function loadProducts() {
      if (!selectedCategoryId) return;

      const { data } = await supabase
        .from("products")
        .select("id,category_id,title,description,price,unit_type,is_active")
        .eq("category_id", selectedCategoryId)
        .eq("is_active", true);

      setProducts((data || []) as Product[]);
    }
    loadProducts();
  }, [selectedCategoryId]);

  // Add to cart
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

  // Submit order
  async function submitOrder() {
    if (!tgUserId) return alert("Ошибка авторизации (нет Telegram user id)");
    if (!name || !phone || !address) return alert("Заполните имя, телефон и адрес");
    if (cart.length === 0) return alert("Корзина пуста");

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

    const items = cart.map((item) => ({
      order_id: orderId,
      product_id: item.product.id,
      product_title: item.product.title,
      price: item.product.price,
      quantity: item.quantity,
    }));

    const { error: itemsErr } = await supabase.from("order_items").insert(items);
    if (itemsErr) return alert(itemsErr.message);

    // notify admin with composition (server reads from DB)
    try {
      await fetch("/api/notify-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, orderId }),
      });
    } catch {
      // ignore
    }

    alert("Заказ оформлен!");
    setCart([]);
    setView("catalog");
  }

  // Admin helpers
  async function adminCheckAndLoad() {
    if (!initData) return;
    setAdminLoading(true);
    setAdminError(null);

    try {
      // Проверяем, админ ли (через admin/orders list — если 403, значит не админ)
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, action: { type: "list", limit: 30 } }),
      });

      const data = await res.json();

      if (res.status === 403) {
        setIsAdmin(false);
        setOrders([]);
        setAdminError("У вас нет доступа к админке");
        return;
      }

      if (!res.ok || !data.ok) {
        setIsAdmin(false);
        setOrders([]);
        setAdminError(data?.error || "Ошибка загрузки заказов");
        return;
      }

      setIsAdmin(true);
      setOrders((data.orders || []) as AdminOrder[]);
      if (!selectedOrderId && (data.orders || []).length) {
        setSelectedOrderId(data.orders[0].id);
      }
    } catch (e: any) {
      setAdminError(e?.message || "Ошибка сети");
    } finally {
      setAdminLoading(false);
    }
  }

  async function setOrderStatus(orderId: string, status: AdminOrder["status"]) {
    if (!initData) return;

    setAdminLoading(true);
    setAdminError(null);

    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initData,
          action: { type: "setStatus", orderId, status },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setAdminError(data?.error || "Не удалось изменить статус");
        return;
      }

      // Обновим локально + перезагрузим список
      await adminCheckAndLoad();
    } catch (e: any) {
      setAdminError(e?.message || "Ошибка сети");
    } finally {
      setAdminLoading(false);
    }
  }

  // When open admin view — load
  useEffect(() => {
    if (view === "admin") adminCheckAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // UI styles
  const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    padding: 16,
    background: "#0b0b0f",
    color: "#fff",
    fontFamily: "system-ui",
  };

  const pillBtn = (active: boolean): React.CSSProperties => ({
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.15)",
    background: active ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)",
    color: "#fff",
    cursor: "pointer",
  });

  const card: React.CSSProperties = {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
  };

  return (
    <main style={pageStyle}>
      <h1 style={{ margin: 0 }}>🐟 Fish Delivery</h1>

      {/* Top tabs */}
      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button style={pillBtn(view === "catalog")} onClick={() => setView("catalog")}>
          Каталог
        </button>
        <button style={pillBtn(view === "cart")} onClick={() => setView("cart")}>
          Корзина ({cart.length})
        </button>
        <button
          style={pillBtn(view === "checkout")}
          onClick={() => setView("checkout")}
          disabled={cart.length === 0}
        >
          Оформление
        </button>

        {/* Admin tab (we still show it, but access checked on open) */}
        <button style={pillBtn(view === "admin")} onClick={() => setView("admin")}>
          Админ
        </button>
      </div>

      {/* CATALOG */}
      {view === "catalog" && (
        <>
          <div style={{ marginTop: 18, opacity: 0.85 }}>Категории</div>

          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {categories.map((c) => (
              <button
                key={c.id}
                style={pillBtn(selectedCategoryId === c.id)}
                onClick={() => setSelectedCategoryId(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 18, opacity: 0.85 }}>Товары</div>

          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
            {products.map((p) => (
              <div key={p.id} style={card}>
                <div style={{ fontWeight: 800 }}>{p.title}</div>
                {p.description && (
                  <div style={{ marginTop: 4, opacity: 0.75, fontSize: 13 }}>
                    {p.description}
                  </div>
                )}
                <div style={{ marginTop: 10, fontWeight: 800 }}>
                  {formatPriceRub(p.price)}{" "}
                  <span style={{ fontWeight: 500, opacity: 0.75, fontSize: 12 }}>
                    {p.unit_type === "weight" ? "за кг" : "за шт"}
                  </span>
                </div>

                <button
                  onClick={() => addToCart(p)}
                  style={{
                    marginTop: 10,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.10)",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  Добавить
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* CART */}
      {view === "cart" && (
        <div style={{ marginTop: 18 }}>
          {cart.length === 0 ? (
            <div style={{ opacity: 0.8 }}>Корзина пуста</div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {cart.map((item) => (
                  <div key={item.product.id} style={card}>
                    <div style={{ fontWeight: 800 }}>{item.product.title}</div>
                    <div style={{ marginTop: 6, opacity: 0.85 }}>
                      {formatPriceRub(item.product.price)}{" "}
                      <span style={{ fontSize: 12, opacity: 0.75 }}>
                        {item.product.unit_type === "weight" ? "за кг" : "за шт"}
                      </span>
                    </div>

                    <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
                      <button onClick={() => changeQuantity(item.product.id, -1)}>-</button>
                      <div style={{ minWidth: 24, textAlign: "center", fontWeight: 800 }}>
                        {item.quantity}
                      </div>
                      <button onClick={() => changeQuantity(item.product.id, 1)}>+</button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 16, fontWeight: 900, fontSize: 16 }}>
                Итого: {formatPriceRub(total)}
              </div>

              <button
                onClick={() => setView("checkout")}
                style={{
                  marginTop: 12,
                  padding: "12px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.14)",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Перейти к оформлению
              </button>
            </>
          )}
        </div>
      )}

      {/* CHECKOUT */}
      {view === "checkout" && (
        <div style={{ marginTop: 18 }}>
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

            <div style={{ marginTop: 6, fontWeight: 900 }}>
              Итого: {formatPriceRub(total)}
            </div>

            <button
              onClick={submitOrder}
              style={{ padding: "12px 12px", borderRadius: 12, fontWeight: 900 }}
            >
              Подтвердить заказ
            </button>

            <button onClick={() => setView("cart")} style={{ padding: "12px 12px", borderRadius: 12 }}>
              Назад в корзину
            </button>
          </div>
        </div>
      )}

      {/* ADMIN */}
      {view === "admin" && (
        <div style={{ marginTop: 18 }}>
          <h3 style={{ marginTop: 0 }}>Админка</h3>

          {!initData ? (
            <div style={{ opacity: 0.85 }}>Нет initData — открой через Telegram.</div>
          ) : adminLoading ? (
            <div style={{ opacity: 0.85 }}>Загрузка...</div>
          ) : adminError ? (
            <div style={{ color: "#ff6b6b" }}>Ошибка: {adminError}</div>
          ) : !isAdmin ? (
            <div style={{ opacity: 0.85 }}>У вас нет доступа к админке.</div>
          ) : (
            <>
              <button
                onClick={adminCheckAndLoad}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.10)",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Обновить
              </button>

              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                {orders.map((o) => {
                  const active = o.id === selectedOrderId;
                  return (
                    <button
                      key={o.id}
                      onClick={() => setSelectedOrderId(o.id)}
                      style={{
                        textAlign: "left",
                        ...card,
                        cursor: "pointer",
                        outline: active ? "2px solid rgba(255,255,255,0.25)" : "none",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 900 }}>#{o.id.slice(0, 8)}</div>
                        <div style={{ opacity: 0.75, fontSize: 12 }}>{formatDateTime(o.created_at)}</div>
                      </div>
                      <div style={{ marginTop: 6, fontWeight: 700 }}>{o.customer_name}</div>
                      <div style={{ marginTop: 4, opacity: 0.8, fontSize: 13 }}>
                        {statusLabel(o.status)} • {formatPriceRub(o.total_amount)}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedOrder && (
                <div style={{ marginTop: 14, ...card }}>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>
                    Заказ #{selectedOrder.id.slice(0, 8)}
                  </div>

                  <div style={{ marginTop: 8, opacity: 0.9 }}>
                    <div>👤 {selectedOrder.customer_name}</div>
                    <div>📞 {selectedOrder.phone}</div>
                    <div>📍 {selectedOrder.address}</div>
                    <div>💳 {selectedOrder.payment_method}</div>
                    <div>💰 {formatPriceRub(selectedOrder.total_amount)}</div>
                    {selectedOrder.comment ? <div>💬 {selectedOrder.comment}</div> : null}
                  </div>

                  <div style={{ marginTop: 10, opacity: 0.95, whiteSpace: "pre-wrap", fontSize: 13 }}>
                    {selectedOrder.items_text ? `🧺 Состав:\n${selectedOrder.items_text}` : "Состав: (нет данных)"}
                  </div>

                  <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => setOrderStatus(selectedOrder.id, "new")}>Новый</button>
                    <button onClick={() => setOrderStatus(selectedOrder.id, "in_progress")}>В работе</button>
                    <button onClick={() => setOrderStatus(selectedOrder.id, "delivered")}>Доставлен</button>
                    <button onClick={() => setOrderStatus(selectedOrder.id, "canceled")}>Отменён</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </main>
  );
}