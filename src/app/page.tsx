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

type OrderStatus = "assembling" | "on_the_way" | "delivered" | "canceled";

type OrderForUi = {
  id: string;
  user_telegram_id?: number;
  customer_name: string;
  phone: string;
  address: string;
  comment: string | null;
  payment_method: string;
  total_amount: string;
  status: OrderStatus;
  created_at: string;
  items_text?: string;
};

type View = "catalog" | "cart" | "profile" | "admin";

function formatPriceRub(value: string | number) {
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return String(value);
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

function statusLabel(s: OrderStatus) {
  if (s === "assembling") return "Собирается";
  if (s === "on_the_way") return "В пути";
  if (s === "delivered") return "Доставлен";
  if (s === "canceled") return "Отменён";
  return s;
}

export default function Page() {
  const [view, setView] = useState<View>("catalog");

  // Telegram
  const [tgUserId, setTgUserId] = useState<number | null>(null);
  const [initData, setInitData] = useState<string>("");

  // Shop
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const total = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0),
    [cart]
  );

  // Checkout modal-like state (same page)
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Checkout fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  // Profile (my orders)
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [myOrders, setMyOrders] = useState<OrderForUi[]>([]);
  const [selectedMyOrderId, setSelectedMyOrderId] = useState<string | null>(null);
  const selectedMyOrder = useMemo(
    () => myOrders.find((o) => o.id === selectedMyOrderId) || null,
    [myOrders, selectedMyOrderId]
  );

  // Admin
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderForUi[]>([]);
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

  // Load products
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

  // Cart ops
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
          status: "assembling",
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
    setCheckoutOpen(false);
    setView("profile"); // логично после заказа показать профиль/историю
    await loadMyOrders();
  }

  // Profile: load my orders
  async function loadMyOrders() {
    if (!initData) {
      setProfileError("Открой мини-апп через Telegram.");
      return;
    }

    setProfileLoading(true);
    setProfileError(null);

    try {
      const res = await fetch("/api/my-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, limit: 30 }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setProfileError(data?.error || `Ошибка загрузки (HTTP ${res.status})`);
        setMyOrders([]);
        setSelectedMyOrderId(null);
        return;
      }

      const list = (data.orders || []) as OrderForUi[];
      setMyOrders(list);

      if (selectedMyOrderId && !list.some((o) => o.id === selectedMyOrderId)) {
        setSelectedMyOrderId(null);
      }
    } catch (e: any) {
      setProfileError(e?.message || "Ошибка сети");
      setMyOrders([]);
      setSelectedMyOrderId(null);
    } finally {
      setProfileLoading(false);
    }
  }

  // Admin loaders
  async function adminLoad() {
    if (!initData) {
      setIsAdmin(false);
      setOrders([]);
      setSelectedOrderId(null);
      setAdminError("Нет initData — открой через Telegram.");
      return;
    }

    setAdminLoading(true);
    setAdminError(null);

    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, action: { type: "list", limit: 50 } }),
      });

      const data = await res.json();

      if (res.status === 403) {
        setIsAdmin(false);
        setOrders([]);
        setSelectedOrderId(null);
        setAdminError("У вас нет доступа к админке");
        return;
      }

      if (!res.ok || !data.ok) {
        setIsAdmin(false);
        setOrders([]);
        setSelectedOrderId(null);
        setAdminError(data?.error || `Ошибка загрузки (HTTP ${res.status})`);
        return;
      }

      const list = (data.orders || []) as OrderForUi[];
      setIsAdmin(true);
      setOrders(list);

      if (selectedOrderId && !list.some((o) => o.id === selectedOrderId)) {
        setSelectedOrderId(null);
      }
    } catch (e: any) {
      setIsAdmin(false);
      setOrders([]);
      setSelectedOrderId(null);
      setAdminError(e?.message || "Ошибка сети");
    } finally {
      setAdminLoading(false);
    }
  }

  async function setOrderStatus(orderId: string, status: OrderStatus) {
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
        setAdminError(data?.error || `Не удалось изменить статус (HTTP ${res.status})`);
        return;
      }

      await adminLoad();
    } catch (e: any) {
      setAdminError(e?.message || "Ошибка сети");
    } finally {
      setAdminLoading(false);
    }
  }

  // When switching views: load needed data
  useEffect(() => {
    if (view === "admin") adminLoad();
    if (view === "profile") loadMyOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // UI styles
  const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    padding: 16,
    paddingBottom: 88, // место под нижнюю навигацию
    background: "#0b0b0f",
    color: "#fff",
    fontFamily: "system-ui",
  };

  const card: React.CSSProperties = {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
  };

  const primaryBtn: React.CSSProperties = {
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.14)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  };

  const ghostBtn: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.10)",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  };

  const inputStyle: React.CSSProperties = {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    outline: "none",
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: 90,
    resize: "vertical",
  };

  const bottomNavStyle: React.CSSProperties = {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 10,
    background: "rgba(10,10,14,0.92)",
    borderTop: "1px solid rgba(255,255,255,0.10)",
    backdropFilter: "blur(8px)",
  };

  const navRowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
    maxWidth: 720,
    margin: "0 auto",
  };

  const navBtn = (active: boolean): React.CSSProperties => ({
    padding: "10px 10px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: active ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.08)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
  });

  return (
    <>
      <main style={pageStyle}>
        <h1 style={{ margin: 0 }}>🐟 Fish Delivery</h1>

        {/* CATALOG */}
        {view === "catalog" && (
          <>
            <div style={{ marginTop: 16, opacity: 0.85 }}>Категории</div>

            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategoryId(c.id)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.15)",
                    background:
                      selectedCategoryId === c.id
                        ? "rgba(255,255,255,0.14)"
                        : "rgba(255,255,255,0.06)",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 16, opacity: 0.85 }}>Товары</div>

            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
              {products.map((p) => (
                <div key={p.id} style={card}>
                  <div style={{ fontWeight: 900 }}>{p.title}</div>
                  {p.description && (
                    <div style={{ marginTop: 4, opacity: 0.75, fontSize: 13 }}>{p.description}</div>
                  )}

                  <div style={{ marginTop: 10, fontWeight: 900 }}>
                    {formatPriceRub(p.price)}{" "}
                    <span style={{ fontWeight: 600, opacity: 0.75, fontSize: 12 }}>
                      {p.unit_type === "weight" ? "за кг" : "за шт"}
                    </span>
                  </div>

                  <button onClick={() => addToCart(p)} style={{ ...ghostBtn, marginTop: 10 }}>
                    Добавить
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* CART */}
        {view === "cart" && (
          <div style={{ marginTop: 16 }}>
            <h2 style={{ margin: "0 0 10px 0" }}>Корзина</h2>

            {cart.length === 0 ? (
              <div style={{ opacity: 0.8 }}>Корзина пуста</div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {cart.map((item) => (
                    <div key={item.product.id} style={card}>
                      <div style={{ fontWeight: 900 }}>{item.product.title}</div>
                      <div style={{ marginTop: 6, opacity: 0.85 }}>
                        {formatPriceRub(item.product.price)}{" "}
                        <span style={{ fontSize: 12, opacity: 0.75 }}>
                          {item.product.unit_type === "weight" ? "за кг" : "за шт"}
                        </span>
                      </div>

                      <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
                        <button onClick={() => changeQuantity(item.product.id, -1)} style={ghostBtn}>
                          −
                        </button>
                        <div style={{ minWidth: 24, textAlign: "center", fontWeight: 900 }}>
                          {item.quantity}
                        </div>
                        <button onClick={() => changeQuantity(item.product.id, 1)} style={ghostBtn}>
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 16, fontWeight: 900, fontSize: 16 }}>
                  Итого: {formatPriceRub(total)}
                </div>

                <button
                  style={{ ...primaryBtn, marginTop: 12, width: "100%" }}
                  onClick={() => {
                    if (cart.length === 0) return alert("Корзина пуста");
                    setCheckoutOpen(true);
                  }}
                >
                  Оформить заказ
                </button>
              </>
            )}
          </div>
        )}

        {/* CHECKOUT (overlay in cart) */}
        {view === "cart" && checkoutOpen && (
          <div style={{ marginTop: 16, ...card }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Оформление</div>
              <button onClick={() => setCheckoutOpen(false)} style={ghostBtn}>
                Закрыть
              </button>
            </div>

            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              <input style={inputStyle} placeholder="Имя" value={name} onChange={(e) => setName(e.target.value)} />
              <input
                style={inputStyle}
                placeholder="Телефон"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <input
                style={inputStyle}
                placeholder="Адрес"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <textarea
                style={textareaStyle}
                placeholder="Комментарий"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />

              <select
                style={inputStyle}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="cash">Наличные</option>
                <option value="transfer">Перевод</option>
                <option value="qr">QR-код</option>
              </select>

              <div style={{ marginTop: 6, fontWeight: 900 }}>
                Итого: {formatPriceRub(total)}
              </div>

              <button style={{ ...primaryBtn, width: "100%" }} onClick={submitOrder}>
                Подтвердить заказ
              </button>
            </div>
          </div>
        )}

        {/* PROFILE */}
        {view === "profile" && (
          <div style={{ marginTop: 16 }}>
            <h2 style={{ margin: "0 0 10px 0" }}>Профиль</h2>

            <div style={{ ...card, marginBottom: 12 }}>
              <div style={{ fontWeight: 900 }}>Ваш Telegram ID</div>
              <div style={{ opacity: 0.85, marginTop: 4 }}>{tgUserId ?? "—"}</div>
              <div style={{ opacity: 0.65, marginTop: 8, fontSize: 12 }}>
                Здесь будет история заказов.
              </div>

              <button style={{ ...ghostBtn, marginTop: 10 }} onClick={loadMyOrders}>
                Обновить историю
              </button>
            </div>

            {profileLoading && <div style={{ opacity: 0.85 }}>Загрузка...</div>}
            {profileError && (
              <div style={{ color: "#ff6b6b", whiteSpace: "pre-wrap" }}>Ошибка: {profileError}</div>
            )}

            {!profileLoading && !profileError && (
              <>
                {!selectedMyOrderId && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {myOrders.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => setSelectedMyOrderId(o.id)}
                        style={{ ...card, cursor: "pointer", textAlign: "left" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ fontWeight: 900 }}>#{o.id.slice(0, 8)}</div>
                          <div style={{ opacity: 0.75, fontSize: 12 }}>{formatDateTime(o.created_at)}</div>
                        </div>
                        <div style={{ marginTop: 6, opacity: 0.9, fontSize: 13 }}>
                          Статус: <span style={{ fontWeight: 900 }}>{statusLabel(o.status)}</span>
                        </div>
                        <div style={{ marginTop: 4, opacity: 0.8, fontSize: 13 }}>
                          Сумма: {formatPriceRub(o.total_amount)}
                        </div>
                      </button>
                    ))}

                    {myOrders.length === 0 && (
                      <div style={{ opacity: 0.8 }}>Пока нет заказов.</div>
                    )}
                  </div>
                )}

                {selectedMyOrderId && (
                  <div style={{ marginTop: 6 }}>
                    <button
                      onClick={() => setSelectedMyOrderId(null)}
                      style={{ ...ghostBtn, marginBottom: 12 }}
                    >
                      ← Назад к списку
                    </button>

                    {selectedMyOrder ? (
                      <div style={card}>
                        <div style={{ fontWeight: 900, fontSize: 16 }}>
                          Заказ #{selectedMyOrder.id.slice(0, 8)}
                        </div>

                        <div style={{ marginTop: 8, opacity: 0.95 }}>
                          <div>
                            Статус: <strong>{statusLabel(selectedMyOrder.status)}</strong>
                          </div>
                          <div style={{ marginTop: 6 }}>💰 {formatPriceRub(selectedMyOrder.total_amount)}</div>
                          <div style={{ marginTop: 6, opacity: 0.85, fontSize: 12 }}>
                            {formatDateTime(selectedMyOrder.created_at)}
                          </div>
                        </div>

                        <div style={{ marginTop: 12, whiteSpace: "pre-wrap", fontSize: 13 }}>
                          <strong>🧺 Состав:</strong>
                          {"\n"}
                          {selectedMyOrder.items_text || "Нет данных"}
                        </div>
                      </div>
                    ) : (
                      <div style={{ opacity: 0.85 }}>Заказ не найден (обнови историю).</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ADMIN */}
        {view === "admin" && (
          <div style={{ marginTop: 16 }}>
            <h2 style={{ margin: "0 0 10px 0" }}>Админка</h2>

            <button style={ghostBtn} onClick={adminLoad}>
              Обновить
            </button>

            {adminLoading && <div style={{ marginTop: 10, opacity: 0.85 }}>Загрузка...</div>}
            {adminError && (
              <div style={{ marginTop: 10, color: "#ff6b6b", whiteSpace: "pre-wrap" }}>
                Ошибка: {adminError}
              </div>
            )}

            {!adminLoading && !adminError && !isAdmin && (
              <div style={{ marginTop: 10, opacity: 0.85 }}>У вас нет доступа к админке.</div>
            )}

            {isAdmin && !adminLoading && !adminError && (
              <>
                {!selectedOrderId && (
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                    {orders.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => setSelectedOrderId(o.id)}
                        style={{ textAlign: "left", ...card, cursor: "pointer" }}
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
                    ))}

                    {orders.length === 0 && <div style={{ marginTop: 10, opacity: 0.8 }}>Заказов нет</div>}
                  </div>
                )}

                {selectedOrderId && (
                  <div style={{ marginTop: 14 }}>
                    <button onClick={() => setSelectedOrderId(null)} style={{ ...ghostBtn, marginBottom: 12 }}>
                      ← Назад к списку
                    </button>

                    {selectedOrder ? (
                      <div style={card}>
                        <div style={{ fontWeight: 900, fontSize: 16 }}>
                          Заказ #{selectedOrder.id.slice(0, 8)}
                        </div>

                        <div style={{ marginTop: 8, opacity: 0.95 }}>
                          <div>👤 {selectedOrder.customer_name}</div>
                          <div>📞 {selectedOrder.phone}</div>
                          <div>📍 {selectedOrder.address}</div>
                          <div>💳 {selectedOrder.payment_method}</div>
                          <div>💰 {formatPriceRub(selectedOrder.total_amount)}</div>
                          {selectedOrder.comment ? <div>💬 {selectedOrder.comment}</div> : null}
                          <div style={{ marginTop: 6, opacity: 0.8, fontSize: 12 }}>
                            {formatDateTime(selectedOrder.created_at)}
                          </div>
                        </div>

                        <div style={{ marginTop: 12, whiteSpace: "pre-wrap", fontSize: 13 }}>
                          <strong>🧺 Состав:</strong>
                          {"\n"}
                          {selectedOrder.items_text || "Нет данных"}
                        </div>

                        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button onClick={() => setOrderStatus(selectedOrder.id, "assembling")}>
                            Собирается
                          </button>
                          <button onClick={() => setOrderStatus(selectedOrder.id, "on_the_way")}>
                            В пути
                          </button>
                          <button onClick={() => setOrderStatus(selectedOrder.id, "delivered")}>
                            Доставлен
                          </button>
                          <button onClick={() => setOrderStatus(selectedOrder.id, "canceled")}>
                            Отменён
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: 10, opacity: 0.85 }}>Заказ не найден (обнови список).</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Bottom nav */}
      <div style={bottomNavStyle}>
        <div style={navRowStyle}>
          <button style={navBtn(view === "catalog")} onClick={() => setView("catalog")}>
            🐟
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>Каталог</div>
          </button>

          <button style={navBtn(view === "cart")} onClick={() => setView("cart")}>
            🧺
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
              Корзина ({cart.length})
            </div>
          </button>

          <button style={navBtn(view === "profile")} onClick={() => setView("profile")}>
            👤
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>Профиль</div>
          </button>

          <button style={navBtn(view === "admin")} onClick={() => setView("admin")}>
            🛠
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>Админ</div>
          </button>
        </div>
      </div>
    </>
  );
}