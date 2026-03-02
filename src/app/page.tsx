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

/** Простые иконки (SVG). Потом легко заменить на свои SVG 1:1 */
function IconCatalog({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7.5C4 6.12 5.12 5 6.5 5h11C18.88 5 20 6.12 20 7.5v9C20 17.88 18.88 19 17.5 19h-11C5.12 19 4 17.88 4 16.5v-9Z"
        stroke={active ? "#D43314" : "rgba(10,19,23,0.65)"}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M7 9h10M7 12h10M7 15h6"
        stroke={active ? "#D43314" : "rgba(10,19,23,0.65)"}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCart({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 8h14l-1.4 7.2a2 2 0 0 1-2 1.6H9.2a2 2 0 0 1-2-1.6L6 3H3"
        stroke={active ? "#D43314" : "rgba(10,19,23,0.65)"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        fill={active ? "#D43314" : "rgba(10,19,23,0.65)"}
      />
    </svg>
  );
}

function IconProfile({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
        stroke={active ? "#D43314" : "rgba(10,19,23,0.65)"}
        strokeWidth="2"
      />
      <path
        d="M4.5 20c1.8-3 4.3-4.5 7.5-4.5S17.7 17 19.5 20"
        stroke={active ? "#D43314" : "rgba(10,19,23,0.65)"}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Page() {
  const [view, setView] = useState<View>("catalog");

  // Telegram
  const [tgUserId, setTgUserId] = useState<number | null>(null);
  const [initData, setInitData] = useState<string>("");

  // Branding colors (по твоему бренду)
  const BRAND_BG = "#2B80A4"; // бирюзовый фон
  const BRAND_ACCENT = "#D43314"; // оранжево-красный
  const BRAND_INK = "#0A1317"; // тёмный
  const CARD_BG = "#FFFFFF";

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

  // Checkout overlay (на экране корзины)
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Checkout fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  // Admin visibility (определяем через сервер)
  const [isAdmin, setIsAdmin] = useState(false);

  // Profile (my orders)
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [myOrders, setMyOrders] = useState<OrderForUi[]>([]);
  const [selectedMyOrderId, setSelectedMyOrderId] = useState<string | null>(null);
  const selectedMyOrder = useMemo(
    () => myOrders.find((o) => o.id === selectedMyOrderId) || null,
    [myOrders, selectedMyOrderId]
  );

  // Admin orders
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderForUi[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  // Telegram init + внешний вид Telegram WebApp
  useEffect(() => {
    const tg = (window as any)?.Telegram?.WebApp;
    if (!tg) return;

    tg.ready();
    tg.expand();

    // Цвета приложения в Telegram
    try {
      tg.setHeaderColor?.(BRAND_BG);
      tg.setBackgroundColor?.(BRAND_BG);
    } catch {}

    // Попросим fullscreen (где поддерживается)
    try {
      tg.requestFullscreen?.();
    } catch {}

    setInitData(tg.initData || "");

    const u = tg.initDataUnsafe?.user;
    if (u?.id) setTgUserId(u.id);
    if (u?.first_name) setName(u.first_name);
  }, []);

  // Определяем админа (сервер решает)
  async function detectAdmin() {
    if (!initData) return;
    try {
      // Пытаемся получить admin list (limit 1). Если 403 — не админ.
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, action: { type: "list", limit: 1 } }),
      });
      if (res.status === 403) {
        setIsAdmin(false);
        return;
      }
      const data = await res.json();
      setIsAdmin(Boolean(res.ok && data?.ok));
    } catch {
      // если сеть упала — лучше скрыть админку
      setIsAdmin(false);
    }
  }

  useEffect(() => {
    if (initData) detectAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initData]);

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

    // notify admin (server reads from DB)
    try {
      await fetch("/api/notify-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, orderId }),
      });
    } catch {}

    alert("Заказ оформлен!");
    setCart([]);
    setCheckoutOpen(false);
    setView("profile");
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

  // Admin: list orders
  async function adminLoad() {
    if (!initData) {
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
        setAdminError("У вас нет доступа к админке");
        setOrders([]);
        setSelectedOrderId(null);
        setIsAdmin(false);
        return;
      }

      if (!res.ok || !data.ok) {
        setAdminError(data?.error || `Ошибка загрузки (HTTP ${res.status})`);
        setOrders([]);
        setSelectedOrderId(null);
        return;
      }

      const list = (data.orders || []) as OrderForUi[];
      setOrders(list);

      if (selectedOrderId && !list.some((o) => o.id === selectedOrderId)) {
        setSelectedOrderId(null);
      }
    } catch (e: any) {
      setAdminError(e?.message || "Ошибка сети");
      setOrders([]);
      setSelectedOrderId(null);
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
    if (view === "profile") loadMyOrders();
    // adminLoad вызываем только когда реально открыли админку из профиля
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // ===== UI Styles =====
  const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: BRAND_BG,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: "calc(env(safe-area-inset-top, 0px) + 14px)",
    paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)", // место под нижнюю панель
    color: BRAND_INK,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
  };

  const card: React.CSSProperties = {
    background: CARD_BG,
    borderRadius: 18,
    padding: 14,
    boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
  };

  const titleStyle: React.CSSProperties = {
    margin: 0,
    color: CARD_BG,
    fontWeight: 900,
    letterSpacing: 0.2,
    fontSize: 18,
  };

  const smallMuted: React.CSSProperties = {
    fontSize: 12,
    opacity: 0.75,
  };

  const pillBtn: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.35)",
    background: "rgba(255,255,255,0.16)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
  };

  const btnPrimary: React.CSSProperties = {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.06)",
    background: BRAND_ACCENT,
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  };

  const btnGhost: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "rgba(255,255,255,0.70)",
    color: BRAND_INK,
    fontWeight: 900,
    cursor: "pointer",
  };

  const inputStyle: React.CSSProperties = {
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(10,19,23,0.12)",
    background: "#fff",
    color: BRAND_INK,
    outline: "none",
    fontSize: 14,
  };

  const bottomNavWrap: React.CSSProperties = {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    paddingLeft: 14,
    paddingRight: 14,
    paddingTop: 10,
    paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)",
    background: "rgba(255,255,255,0.78)",
    borderTop: "1px solid rgba(10,19,23,0.08)",
    backdropFilter: "blur(10px)",
  };

  const bottomNav: React.CSSProperties = {
    maxWidth: 720,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
  };

  const navBtn = (active: boolean): React.CSSProperties => ({
    borderRadius: 16,
    border: "1px solid rgba(10,19,23,0.08)",
    background: active ? "rgba(212,51,20,0.12)" : "rgba(255,255,255,0.92)",
    padding: "10px 10px",
    cursor: "pointer",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    boxShadow: active ? "0 10px 24px rgba(212,51,20,0.18)" : "none",
    transform: active ? "translateY(-2px)" : "none",
    transition: "all 160ms ease",
  });

  // ===== RENDER =====
  return (
    <>
      <main style={pageStyle}>
        {/* Заголовок (не шапка телеги, а просто наш текст) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <h1 style={titleStyle}>Рыба на районе</h1>
          <button
            style={pillBtn}
            onClick={() => {
              const tg = (window as any)?.Telegram?.WebApp;
              try {
                tg?.close?.();
              } catch {}
            }}
            title="Закрыть"
          >
            ✕
          </button>
        </div>

        {/* CATALOG */}
        {view === "catalog" && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={card}>
              <div style={{ fontWeight: 900, fontSize: 16, color: BRAND_INK }}>Категории</div>
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {categories.map((c) => {
                  const active = selectedCategoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCategoryId(c.id)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 999,
                        border: `1px solid ${active ? "rgba(212,51,20,0.35)" : "rgba(10,19,23,0.12)"}`,
                        background: active ? "rgba(212,51,20,0.10)" : "rgba(10,19,23,0.04)",
                        color: BRAND_INK,
                        cursor: "pointer",
                        fontWeight: 900,
                      }}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={card}>
              <div style={{ fontWeight: 900, fontSize: 16, color: BRAND_INK }}>Товары</div>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                {products.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      borderRadius: 14,
                      border: "1px solid rgba(10,19,23,0.10)",
                      padding: 12,
                      background: "rgba(10,19,23,0.02)",
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>{p.title}</div>
                    {p.description && (
                      <div style={{ marginTop: 4, fontSize: 13, opacity: 0.8 }}>{p.description}</div>
                    )}
                    <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 900 }}>
                        {formatPriceRub(p.price)}{" "}
                        <span style={{ fontWeight: 700, opacity: 0.7, fontSize: 12 }}>
                          {p.unit_type === "weight" ? "за кг" : "за шт"}
                        </span>
                      </div>
                      <button
                        style={{
                          ...btnGhost,
                          background: "rgba(212,51,20,0.10)",
                          border: "1px solid rgba(212,51,20,0.22)",
                          color: BRAND_INK,
                        }}
                        onClick={() => addToCart(p)}
                      >
                        + В корзину
                      </button>
                    </div>
                  </div>
                ))}

                {products.length === 0 && <div style={smallMuted}>Пока нет товаров в этой категории.</div>}
              </div>
            </div>
          </div>
        )}

        {/* CART */}
        {view === "cart" && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={card}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Корзина</div>
              {cart.length === 0 ? (
                <div style={{ marginTop: 10, opacity: 0.75 }}>Корзина пуста</div>
              ) : (
                <>
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        style={{
                          borderRadius: 14,
                          border: "1px solid rgba(10,19,23,0.10)",
                          padding: 12,
                          background: "rgba(10,19,23,0.02)",
                        }}
                      >
                        <div style={{ fontWeight: 900 }}>{item.product.title}</div>
                        <div style={{ marginTop: 6, opacity: 0.85 }}>
                          {formatPriceRub(item.product.price)}{" "}
                          <span style={{ fontSize: 12, opacity: 0.7 }}>
                            {item.product.unit_type === "weight" ? "за кг" : "за шт"}
                          </span>
                        </div>

                        <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
                          <button style={btnGhost} onClick={() => changeQuantity(item.product.id, -1)}>
                            −
                          </button>
                          <div style={{ minWidth: 24, textAlign: "center", fontWeight: 900 }}>
                            {item.quantity}
                          </div>
                          <button style={btnGhost} onClick={() => changeQuantity(item.product.id, 1)}>
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>Итого</div>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>{formatPriceRub(total)}</div>
                  </div>

                  <button
                    style={{ ...btnPrimary, width: "100%", marginTop: 12 }}
                    onClick={() => setCheckoutOpen(true)}
                  >
                    Оформить заказ
                  </button>
                </>
              )}
            </div>

            {/* Checkout overlay */}
            {checkoutOpen && (
              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>Оформление</div>
                  <button style={btnGhost} onClick={() => setCheckoutOpen(false)}>
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
                    style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
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

                  <div style={{ marginTop: 4, fontWeight: 900 }}>
                    Итого: {formatPriceRub(total)}
                  </div>

                  <button style={{ ...btnPrimary, width: "100%" }} onClick={submitOrder}>
                    Подтвердить заказ
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PROFILE */}
        {view === "profile" && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Профиль карточка */}
            <div style={card}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Профиль</div>
              <div style={{ marginTop: 8, opacity: 0.85 }}>
                Telegram ID: <strong>{tgUserId ?? "—"}</strong>
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button style={btnGhost} onClick={loadMyOrders}>
                  Обновить заказы
                </button>

                {/* Админка показывается ТОЛЬКО админу */}
                {isAdmin && (
                  <button
                    style={{ ...btnPrimary, background: BRAND_INK }}
                    onClick={() => {
                      setSelectedOrderId(null);
                      setAdminError(null);
                      setOrders([]);
                      setView("admin");
                      adminLoad();
                    }}
                  >
                    Админка
                  </button>
                )}
              </div>
              {isAdmin && <div style={{ marginTop: 8, ...smallMuted }}>Админ-режим включён</div>}
            </div>

            {/* История заказов */}
            <div style={card}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>История заказов</div>

              {profileLoading && <div style={{ marginTop: 10, opacity: 0.75 }}>Загрузка...</div>}
              {profileError && (
                <div style={{ marginTop: 10, color: BRAND_ACCENT, whiteSpace: "pre-wrap" }}>
                  Ошибка: {profileError}
                </div>
              )}

              {!profileLoading && !profileError && (
                <>
                  {!selectedMyOrderId && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                      {myOrders.map((o) => (
                        <button
                          key={o.id}
                          onClick={() => setSelectedMyOrderId(o.id)}
                          style={{
                            textAlign: "left",
                            borderRadius: 14,
                            border: "1px solid rgba(10,19,23,0.10)",
                            background: "rgba(10,19,23,0.02)",
                            padding: 12,
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                            <div style={{ fontWeight: 900 }}>#{o.id.slice(0, 8)}</div>
                            <div style={{ fontSize: 12, opacity: 0.7 }}>{formatDateTime(o.created_at)}</div>
                          </div>
                          <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9 }}>
                            Статус: <strong>{statusLabel(o.status)}</strong>
                          </div>
                          <div style={{ marginTop: 4, fontSize: 13, opacity: 0.85 }}>
                            Сумма: {formatPriceRub(o.total_amount)}
                          </div>
                        </button>
                      ))}

                      {myOrders.length === 0 && (
                        <div style={{ marginTop: 10, opacity: 0.75 }}>Пока нет заказов.</div>
                      )}
                    </div>
                  )}

                  {selectedMyOrderId && (
                    <div style={{ marginTop: 10 }}>
                      <button style={btnGhost} onClick={() => setSelectedMyOrderId(null)}>
                        ← Назад к списку
                      </button>

                      {selectedMyOrder ? (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontWeight: 900, fontSize: 16 }}>
                            Заказ #{selectedMyOrder.id.slice(0, 8)}
                          </div>
                          <div style={{ marginTop: 8, opacity: 0.9 }}>
                            Статус: <strong>{statusLabel(selectedMyOrder.status)}</strong>
                          </div>
                          <div style={{ marginTop: 6, fontWeight: 900 }}>
                            {formatPriceRub(selectedMyOrder.total_amount)}
                          </div>
                          <div style={{ marginTop: 6, ...smallMuted }}>{formatDateTime(selectedMyOrder.created_at)}</div>

                          <div style={{ marginTop: 12, whiteSpace: "pre-wrap", fontSize: 13, opacity: 0.95 }}>
                            <strong>Состав:</strong>
                            {"\n"}
                            {selectedMyOrder.items_text || "Нет данных"}
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginTop: 10, opacity: 0.75 }}>Заказ не найден.</div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ADMIN (только через кнопку в профиле) */}
        {view === "admin" && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>Админка</div>
                <button
                  style={btnGhost}
                  onClick={() => {
                    setSelectedOrderId(null);
                    setView("profile");
                  }}
                >
                  ← В профиль
                </button>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button style={btnGhost} onClick={adminLoad}>
                  Обновить
                </button>
              </div>

              {adminLoading && <div style={{ marginTop: 10, opacity: 0.75 }}>Загрузка...</div>}
              {adminError && (
                <div style={{ marginTop: 10, color: BRAND_ACCENT, whiteSpace: "pre-wrap" }}>
                  Ошибка: {adminError}
                </div>
              )}

              {!adminLoading && !adminError && (
                <>
                  {!selectedOrderId && (
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                      {orders.map((o) => (
                        <button
                          key={o.id}
                          onClick={() => setSelectedOrderId(o.id)}
                          style={{
                            textAlign: "left",
                            borderRadius: 14,
                            border: "1px solid rgba(10,19,23,0.10)",
                            background: "rgba(10,19,23,0.02)",
                            padding: 12,
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                            <div style={{ fontWeight: 900 }}>#{o.id.slice(0, 8)}</div>
                            <div style={{ fontSize: 12, opacity: 0.7 }}>{formatDateTime(o.created_at)}</div>
                          </div>
                          <div style={{ marginTop: 6, fontWeight: 900 }}>{o.customer_name}</div>
                          <div style={{ marginTop: 4, fontSize: 13, opacity: 0.9 }}>
                            {statusLabel(o.status)} • {formatPriceRub(o.total_amount)}
                          </div>
                        </button>
                      ))}
                      {orders.length === 0 && <div style={{ marginTop: 10, opacity: 0.75 }}>Заказов нет.</div>}
                    </div>
                  )}

                  {selectedOrderId && (
                    <div style={{ marginTop: 12 }}>
                      <button style={btnGhost} onClick={() => setSelectedOrderId(null)}>
                        ← Назад к списку
                      </button>

                      {selectedOrder ? (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontWeight: 900, fontSize: 16 }}>
                            Заказ #{selectedOrder.id.slice(0, 8)}
                          </div>

                          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4, opacity: 0.95 }}>
                            <div>👤 {selectedOrder.customer_name}</div>
                            <div>📞 {selectedOrder.phone}</div>
                            <div>📍 {selectedOrder.address}</div>
                            <div>💳 {selectedOrder.payment_method}</div>
                            <div>💰 {formatPriceRub(selectedOrder.total_amount)}</div>
                            {selectedOrder.comment ? <div>💬 {selectedOrder.comment}</div> : null}
                            <div style={smallMuted}>{formatDateTime(selectedOrder.created_at)}</div>
                          </div>

                          <div style={{ marginTop: 12, whiteSpace: "pre-wrap", fontSize: 13, opacity: 0.95 }}>
                            <strong>Состав:</strong>
                            {"\n"}
                            {selectedOrder.items_text || "Нет данных"}
                          </div>

                          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button style={btnGhost} onClick={() => setOrderStatus(selectedOrder.id, "assembling")}>
                              Собирается
                            </button>
                            <button style={btnGhost} onClick={() => setOrderStatus(selectedOrder.id, "on_the_way")}>
                              В пути
                            </button>
                            <button style={btnGhost} onClick={() => setOrderStatus(selectedOrder.id, "delivered")}>
                              Доставлен
                            </button>
                            <button style={btnGhost} onClick={() => setOrderStatus(selectedOrder.id, "canceled")}>
                              Отменён
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginTop: 10, opacity: 0.75 }}>Заказ не найден.</div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Нижняя навигация (3 кнопки, только иконки, без текста) */}
      <div style={bottomNavWrap}>
        <div style={bottomNav}>
          <button style={navBtn(view === "catalog")} onClick={() => setView("catalog")} aria-label="Каталог">
            <IconCatalog active={view === "catalog"} />
          </button>

          <button style={navBtn(view === "cart")} onClick={() => setView("cart")} aria-label="Корзина">
            <div style={{ position: "relative" }}>
              <IconCart active={view === "cart"} />
              {cart.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -10,
                    minWidth: 18,
                    height: 18,
                    padding: "0 6px",
                    borderRadius: 999,
                    background: BRAND_ACCENT,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 10px 18px rgba(212,51,20,0.25)",
                  }}
                >
                  {cart.length}
                </div>
              )}
            </div>
          </button>

          <button style={navBtn(view === "profile")} onClick={() => setView("profile")} aria-label="Профиль">
            <IconProfile active={view === "profile"} />
          </button>
        </div>
      </div>
    </>
  );
}