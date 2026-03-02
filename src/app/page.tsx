"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

/** Иконки (SVG) */
function IconCatalog({ active, ink, accent }: { active: boolean; ink: string; accent: string }) {
  const stroke = active ? accent : `${ink}A6`;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7.5C4 6.12 5.12 5 6.5 5h11C18.88 5 20 6.12 20 7.5v9C20 17.88 18.88 19 17.5 19h-11C5.12 19 4 17.88 4 16.5v-9Z"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M7 9h10M7 12h10M7 15h6" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconCart({ active, ink, accent }: { active: boolean; ink: string; accent: string }) {
  const stroke = active ? accent : `${ink}A6`;
  const fill = active ? accent : `${ink}A6`;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 8h14l-1.4 7.2a2 2 0 0 1-2 1.6H9.2a2 2 0 0 1-2-1.6L6 3H3"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        fill={fill}
      />
    </svg>
  );
}

function IconProfile({ active, ink, accent }: { active: boolean; ink: string; accent: string }) {
  const stroke = active ? accent : `${ink}A6`;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke={stroke} strokeWidth="2" />
      <path
        d="M4.5 20c1.8-3 4.3-4.5 7.5-4.5S17.7 17 19.5 20"
        stroke={stroke}
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

  // Brand colors
  const BRAND_BG = "#2B80A4";
  const BRAND_ACCENT = "#D43314";
  const BRAND_INK = "#0A1317";
  const CARD_BG = "#FFFFFF";

  // Header
  const HEADER_H = 64;
  const HEADER_TOP_PAD = 24; // ты поднял до 24 — закрепляем

  // Bottom nav
  const NAV_BTN_W = 58;
  const NAV_BTN_H = 48;
  const NAV_GAP = 10;
  const NAV_PAD = 10;
  const NAV_LIFT = 26;

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

  // Checkout overlay
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Checkout fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  // Admin
  const [isAdmin, setIsAdmin] = useState(false);

  // Profile orders
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

  // ===== Spring indicator animation (пружинка) =====
  const viewIndex = view === "catalog" ? 0 : view === "cart" ? 1 : 2;

  const targetLeft = NAV_PAD + viewIndex * (NAV_BTN_W + NAV_GAP);

  const [indicatorLeft, setIndicatorLeft] = useState<number>(targetLeft);
  const animRef = useRef<number | null>(null);
  const xRef = useRef<number>(targetLeft);
  const vRef = useRef<number>(0);

  useEffect(() => {
    const target = targetLeft;

    if (animRef.current) cancelAnimationFrame(animRef.current);

    const stiffness = 0.12; // жесткость
    const damping = 0.96; // затухание (чем ниже — тем сильнее "пружинит")
    const maxStep = 8; // ограничение рывка, чтобы не улетал

    const tick = () => {
      const x = xRef.current;
      let v = vRef.current;

      // spring force
      const force = (target - x) * stiffness;
      v = v * damping + force;

      // clamp speed
      if (v > maxStep) v = maxStep;
      if (v < -maxStep) v = -maxStep;

      const nextX = x + v;

      xRef.current = nextX;
      vRef.current = v;

      setIndicatorLeft(nextX);

      const done = Math.abs(target - nextX) < 0.25 && Math.abs(v) < 0.25;
      if (!done) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        // snap идеально в цель
        xRef.current = target;
        vRef.current = 0;
        setIndicatorLeft(target);
        animRef.current = null;
      }
    };

    animRef.current = requestAnimationFrame(tick);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      animRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetLeft]);

  // Telegram init
  useEffect(() => {
    const tg = (window as any)?.Telegram?.WebApp;
    if (!tg) return;

    tg.ready();
    tg.expand();

    try {
      tg.setHeaderColor?.(BRAND_BG);
      tg.setBackgroundColor?.(BRAND_BG);
    } catch {}

    try {
      tg.requestFullscreen?.();
    } catch {}

    setInitData(tg.initData || "");

    const u = tg.initDataUnsafe?.user;
    if (u?.id) setTgUserId(u.id);
    if (u?.first_name) setName(u.first_name);

    // Скролл только внутри контента
    try {
      document.documentElement.style.height = "100%";
      document.body.style.height = "100%";
      document.body.style.margin = "0";
      document.body.style.overflow = "hidden";
    } catch {}
  }, []);

  // Detect admin
  async function detectAdmin() {
    if (!initData) return;
    try {
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

  useEffect(() => {
    if (view === "profile") loadMyOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // ===== Layout styles =====
  const root: React.CSSProperties = {
    height: "100vh",
    background: BRAND_BG,
    color: BRAND_INK,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
    overflow: "hidden",
  };

  const header: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    height: HEADER_H,
    paddingTop: `calc(env(safe-area-inset-top, 0px) + ${HEADER_TOP_PAD}px)`,
    boxSizing: "border-box",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center", // 👈 центрируем лого
    paddingLeft: 16,
    paddingRight: 16,
    background: "rgba(43,128,164,0.92)",
    backdropFilter: "blur(10px)",
  };

  // Лого: чуть увеличили
  const logoStyle: React.CSSProperties = {
    height: "clamp(34px, 6.2vw, 52px)",
    width: "auto",
    display: "block",
    filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.18))",
    pointerEvents: "none",
    userSelect: "none",
  };

  // Контент: снизу оставляем место под пилюлю + safe area + lift
  const navTotalHeight = NAV_PAD * 2 + NAV_BTN_H;
  const contentBottomPadding = `calc(env(safe-area-inset-bottom, 0px) + ${NAV_LIFT}px + ${navTotalHeight}px + 22px)`;

  const content: React.CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    top: `calc(env(safe-area-inset-top, 0px) + ${HEADER_TOP_PAD}px + ${HEADER_H}px)`,
    bottom: 0,
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    padding: 16,
    paddingBottom: contentBottomPadding,
    boxSizing: "border-box",
  };

  const card: React.CSSProperties = {
    background: CARD_BG,
    borderRadius: 18,
    padding: 14,
    boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
  };

  const smallMuted: React.CSSProperties = { fontSize: 12, opacity: 0.75 };

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
    background: "rgba(255,255,255,0.85)",
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

  // ===== Bottom nav =====
  const navWrap: React.CSSProperties = {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 60,
    paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${NAV_LIFT}px)`,
    display: "flex",
    justifyContent: "center",
    pointerEvents: "none",
  };

  const navPill: React.CSSProperties = {
    pointerEvents: "auto",
    position: "relative",
    display: "flex",
    gap: NAV_GAP,
    alignItems: "center",
    padding: NAV_PAD,
    borderRadius: 18,
    background: "rgba(255,255,255,0.52)",
    border: "1px solid rgba(10,19,23,0.10)",
    backdropFilter: "blur(14px)",
    boxShadow: "0 18px 45px rgba(0,0,0,0.22)",
  };

  // Индикатор делаем ЧУТЬ МЕНЬШЕ кнопки, чтобы не торчал угол (inset = 1)
  const IND_INSET = 1;
  const indicator: React.CSSProperties = {
    position: "absolute",
    top: NAV_PAD + IND_INSET,
    left: indicatorLeft + IND_INSET,
    width: NAV_BTN_W - IND_INSET * 2,
    height: NAV_BTN_H - IND_INSET * 2,
    borderRadius: 13, // кнопка 14 -> индикатор 13
    background: "rgba(212,51,20,0.22)",
    border: "1px solid rgba(212,51,20,0.35)",
    boxShadow: "0 12px 28px rgba(212,51,20,0.25)",
    // transition отключен, потому что у нас пружинка через requestAnimationFrame
    transition: "none",
  };

  // Кнопки прозрачные
  const navBtnBase: React.CSSProperties = {
    width: NAV_BTN_W,
    height: NAV_BTN_H,
    borderRadius: 14,
    border: "1px solid rgba(10,19,23,0.06)",
    background: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
    transition: "transform 140ms ease, opacity 140ms ease",
  };

  function onPressDown(e: any) {
    try {
      (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.94)";
    } catch {}
  }
  function onPressUp(e: any) {
    try {
      (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
    } catch {}
  }

  // ===== Render =====
  return (
    <div style={root}>
      <div style={header}>
        <img
          src="/logo.png"
          alt="Рыба на районе"
          style={logoStyle}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

      <div style={content}>
        {/* CATALOG */}
        {view === "catalog" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={card}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Категории</div>
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
                        border: `1px solid ${
                          active ? "rgba(212,51,20,0.35)" : "rgba(10,19,23,0.12)"
                        }`,
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
              <div style={{ fontWeight: 900, fontSize: 16 }}>Товары</div>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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

                  <button style={{ ...btnPrimary, width: "100%", marginTop: 12 }} onClick={() => setCheckoutOpen(true)}>
                    Оформить заказ
                  </button>
                </>
              )}
            </div>

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

                  <select style={inputStyle} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="cash">Наличные</option>
                    <option value="transfer">Перевод</option>
                    <option value="qr">QR-код</option>
                  </select>

                  <div style={{ marginTop: 4, fontWeight: 900 }}>Итого: {formatPriceRub(total)}</div>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={card}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Профиль</div>
              <div style={{ marginTop: 8, opacity: 0.85 }}>
                Telegram ID: <strong>{tgUserId ?? "—"}</strong>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button style={btnGhost} onClick={loadMyOrders}>
                  Обновить заказы
                </button>

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

                      {myOrders.length === 0 && <div style={{ marginTop: 10, opacity: 0.75 }}>Пока нет заказов.</div>}
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

        {/* ADMIN */}
        {view === "admin" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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

              <div style={{ marginTop: 10 }}>
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
      </div>

      {/* Bottom pill */}
      <div style={navWrap}>
        <div style={navPill}>
          <div style={indicator} />

          <button
            style={{ ...navBtnBase, opacity: viewIndex === 0 ? 1 : 0.92 }}
            onClick={() => setView("catalog")}
            aria-label="Каталог"
            onPointerDown={onPressDown}
            onPointerUp={onPressUp}
            onPointerCancel={onPressUp}
            onPointerLeave={onPressUp}
          >
            <IconCatalog active={viewIndex === 0} ink={BRAND_INK} accent={BRAND_ACCENT} />
          </button>

          <button
            style={{ ...navBtnBase, opacity: viewIndex === 1 ? 1 : 0.92 }}
            onClick={() => setView("cart")}
            aria-label="Корзина"
            onPointerDown={onPressDown}
            onPointerUp={onPressUp}
            onPointerCancel={onPressUp}
            onPointerLeave={onPressUp}
          >
            <div style={{ position: "relative" }}>
              <IconCart active={viewIndex === 1} ink={BRAND_INK} accent={BRAND_ACCENT} />
              {cart.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: -7,
                    right: -12,
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

          <button
            style={{ ...navBtnBase, opacity: viewIndex === 2 ? 1 : 0.92 }}
            onClick={() => setView("profile")}
            aria-label="Профиль"
            onPointerDown={onPressDown}
            onPointerUp={onPressUp}
            onPointerCancel={onPressUp}
            onPointerLeave={onPressUp}
          >
            <IconProfile active={viewIndex === 2} ink={BRAND_INK} accent={BRAND_ACCENT} />
          </button>
        </div>
      </div>
    </div>
  );
}