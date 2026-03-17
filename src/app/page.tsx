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
  telegram_username?: string;
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
type ProfileScreen = "menu" | "history" | "data";

type TgUser = {
  id?: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
};

type UserProfile = {
  telegram_user_id: number;
  telegram_username: string | null;
  telegram_first_name: string | null;
  telegram_last_name: string | null;
  telegram_photo_url: string | null;
  full_name: string | null;
  phone: string | null;
  address: string | null;
};

type OrderChatMessage = {
  id: string;
  order_id: string;
  telegram_user_id: number;
  direction: "incoming" | "outgoing";
  text: string;
  bot_message_id?: number | null;
  reply_to_bot_message_id?: number | null;
  sender_role: "admin" | "customer" | "system";
  created_at: string;
};

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

function statusColor(s: OrderStatus) {
  if (s === "assembling") return "#E6A23C";
  if (s === "on_the_way") return "#2B80A4";
  if (s === "delivered") return "#2FA36B";
  if (s === "canceled") return "#D43314";
  return "#888";
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const color = statusColor(status);
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 900,
        background: color + "22",
        color: color,
        border: `1px solid ${color}55`,
      }}
    >
      {statusLabel(status)}
    </span>
  );
}

function orderPreviewItems(itemsText?: string, maxLines = 2) {
  if (!itemsText) return [];
  return itemsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, maxLines);
}

function orderItemsList(itemsText?: string) {
  if (!itemsText) return [];
  return itemsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
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

function IconTrash({ ink }: { ink: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 3.75h6" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M5 6.75h14" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
      <path
        d="M8 6.75l.55 10.1a1.5 1.5 0 0 0 1.5 1.42h3.9a1.5 1.5 0 0 0 1.5-1.42L16 6.75"
        stroke={ink}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 10.25v4.75M14 10.25v4.75" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function IconCopy({ ink }: { ink: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="10" height="10" rx="2" stroke={ink} strokeWidth="2" />
      <path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" stroke={ink} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SkeletonBlock({
  height = 16,
  radius = 12,
  style = {},
}: {
  height?: number;
  radius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="app-skeleton"
      style={{
        height,
        borderRadius: radius,
        width: "100%",
        ...style,
      }}
    />
  );
}

export default function Page() {
  const [view, setView] = useState<View>("catalog");
  const [profileScreen, setProfileScreen] = useState<ProfileScreen>("menu");
  const [closingProfileScreen, setClosingProfileScreen] = useState<Exclude<ProfileScreen, "menu"> | null>(null);

  // Telegram
  const [tgUserId, setTgUserId] = useState<number | null>(null);
  const [initData, setInitData] = useState<string>("");
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [tgUser, setTgUser] = useState<TgUser | null>(null);

  // Brand colors
  const BRAND_BG = "#2B80A4";
  const BRAND_ACCENT = "#D43314";
  const BRAND_INK = "#0A1317";
  const CARD_BG = "#FFFFFF";

  // Header
  const HEADER_H = 64;
  const HEADER_TOP_PAD = 2;

  // Bottom nav
  const NAV_BTN_W = 58;
  const NAV_BTN_H = 48;
  const NAV_GAP = 10;
  const NAV_PAD = 10;
  const NAV_LIFT = 18;

  // Boot loading
  const [bootLoading, setBootLoading] = useState(true);

  // Loading flags
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [profileSaveLoading, setProfileSaveLoading] = useState(false);

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
  const [orderFullName, setOrderFullName] = useState("");
  const [orderPhone, setOrderPhone] = useState("");
  const [orderAddress, setOrderAddress] = useState("");
  const [orderComment, setOrderComment] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [promoCode, setPromoCode] = useState("");

  // Admin
  const [isAdmin, setIsAdmin] = useState(false);

  // Profile data
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [profileFormFullName, setProfileFormFullName] = useState("");
  const [profileFormPhone, setProfileFormPhone] = useState("");
  const [profileFormAddress, setProfileFormAddress] = useState("");

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
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<OrderChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatListRef = useRef<HTMLDivElement | null>(null);
  const lastChatMessageIdRef = useRef<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatText, setChatText] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  // ===== Spring indicator animation =====
  const viewIndex = view === "catalog" ? 0 : view === "cart" ? 1 : 2;

  const targetLeft = NAV_PAD + viewIndex * (NAV_BTN_W + NAV_GAP);

  const [indicatorLeft, setIndicatorLeft] = useState<number>(targetLeft);
  const animRef = useRef<number | null>(null);
  const xRef = useRef<number>(targetLeft);
  const vRef = useRef<number>(0);

  useEffect(() => {
    const target = targetLeft;

    if (animRef.current) cancelAnimationFrame(animRef.current);

    const stiffness = 0.12;
    const damping = 0.78;
    const maxStep = 24;

    const tick = () => {
      const x = xRef.current;
      let v = vRef.current;

      const force = (target - x) * stiffness;
      v = v * damping + force;

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
  }, [targetLeft]);

  // Telegram init
  useEffect(() => {
    let meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "viewport";
      document.head.appendChild(meta);
    }
    meta.content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";

    document.documentElement.style.touchAction = "manipulation";
    document.body.style.touchAction = "manipulation";

    const tg = (window as any)?.Telegram?.WebApp;
    if (!tg) return;

    tg.ready();

    try {
      tg.setHeaderColor?.(BRAND_BG);
      tg.setBackgroundColor?.(BRAND_BG);
    } catch {}

    try {
      const ua = navigator.userAgent.toLowerCase();
      const isDesktopUA =
        ua.includes("windows") ||
        ua.includes("macintosh") ||
        ua.includes("linux x86_64") ||
        ua.includes("x11");
      const platform = String(tg.platform || "").toLowerCase();
      const isDesktopPlatform =
        platform === "tdesktop" || platform === "macos" || platform === "web" || platform === "weba" || platform === "webk";
      const isPhoneLike = !isDesktopUA && !isDesktopPlatform && window.innerWidth < 900;

      if (isPhoneLike) {
        tg.expand?.();
        try {
          tg.requestFullscreen?.();
        } catch {}
      }
    } catch {}

    setInitData(tg.initData || "");

    const u = (tg.initDataUnsafe?.user || null) as TgUser | null;
    setTgUser(u);

    if (u?.id) setTgUserId(u.id);

    // Скролл только внутри контента
    try {
      document.documentElement.style.height = "100%";
      document.body.style.height = "100%";
      document.body.style.margin = "0";
      document.body.style.overflow = "hidden";
    } catch {}
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;

    const isTextField = (el: HTMLElement | null) => {
      return Boolean(
        el &&
          (el.tagName === "INPUT" ||
            el.tagName === "TEXTAREA" ||
            el.tagName === "SELECT" ||
            el.isContentEditable)
      );
    };

    const updateKeyboard = () => {
      const active = document.activeElement as HTMLElement | null;
      const diff = vv ? window.innerHeight - vv.height : 0;
      setKeyboardOpen(Boolean(isTextField(active) && diff > 0));
    };

    const forceOpen = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (isTextField(target)) setKeyboardOpen(true);
    };

    const forceClose = () => {
      requestAnimationFrame(() => {
        const active = document.activeElement as HTMLElement | null;
        if (!isTextField(active)) setKeyboardOpen(false);
      });
    };

    if (vv) {
      vv.addEventListener("resize", updateKeyboard);
      vv.addEventListener("scroll", updateKeyboard);
    }
    document.addEventListener("focusin", forceOpen, true);
    document.addEventListener("focusout", forceClose, true);

    return () => {
      if (vv) {
        vv.removeEventListener("resize", updateKeyboard);
        vv.removeEventListener("scroll", updateKeyboard);
      }
      document.removeEventListener("focusin", forceOpen, true);
      document.removeEventListener("focusout", forceClose, true);
    };
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
  }, [initData]);

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      setCategoriesLoading(true);

      const { data } = await supabase
        .from("categories")
        .select("id,name,sort_order")
        .order("sort_order", { ascending: true });

      const list = (data || []) as Category[];
      setCategories(list);
      if (!selectedCategoryId && list.length > 0) setSelectedCategoryId(list[0].id);

      setCategoriesLoading(false);
    }

    loadCategories();
  }, []);

  // Load products
  useEffect(() => {
    async function loadProducts() {
      if (!selectedCategoryId) return;

      setProductsLoading(true);

      const { data } = await supabase
        .from("products")
        .select("id,category_id,title,description,price,unit_type,is_active")
        .eq("category_id", selectedCategoryId)
        .eq("is_active", true);

      setProducts((data || []) as Product[]);
      setProductsLoading(false);
    }

    loadProducts();
  }, [selectedCategoryId]);

  // Boot loading ends when basic data is there
  useEffect(() => {
    if (!categoriesLoading && initData !== "") {
      const t = setTimeout(() => setBootLoading(false), 450);
      return () => clearTimeout(t);
    }
  }, [categoriesLoading, initData]);

  // Load user profile
  useEffect(() => {
    async function loadUserProfile() {
      if (!tgUserId) return;

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("telegram_user_id", tgUserId)
        .maybeSingle();

      if (error) return;

      if (data) {
        const row = data as UserProfile;
        setProfileData(row);

        setProfileFormFullName(row.full_name || "");
        setProfileFormPhone(row.phone || "");
        setProfileFormAddress(row.address || "");

        // Автоподставляем в оформление
        setOrderFullName(row.full_name || tgDisplayName());
        setOrderPhone(row.phone || "");
        setOrderAddress(row.address || "");
      } else {
        // Если профиля нет — хотя бы имя телеги подставим
        const fallbackName = tgDisplayName();
        setProfileFormFullName(fallbackName);
        setOrderFullName(fallbackName);
      }
    }

    loadUserProfile();
  }, [tgUserId]);

  function tgDisplayName() {
    const first = tgUser?.first_name || "";
    const last = tgUser?.last_name || "";
    const full = `${first} ${last}`.trim();
    return full || tgUser?.username || "";
  }

  async function saveProfileData() {
    if (!tgUserId) {
      alert("Не удалось определить Telegram ID");
      return;
    }

    setProfileSaveLoading(true);

    const payload: UserProfile = {
      telegram_user_id: tgUserId,
      telegram_username: tgUser?.username || null,
      telegram_first_name: tgUser?.first_name || null,
      telegram_last_name: tgUser?.last_name || null,
      telegram_photo_url: tgUser?.photo_url || null,
      full_name: profileFormFullName.trim() || null,
      phone: profileFormPhone.trim() || null,
      address: profileFormAddress.trim() || null,
    };

    const { error } = await supabase
      .from("user_profiles")
      .upsert(payload, { onConflict: "telegram_user_id" });

    setProfileSaveLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setProfileData(payload);

    // Автоподставляем в оформление
    setOrderFullName(payload.full_name || tgDisplayName());
    setOrderPhone(payload.phone || "");
    setOrderAddress(payload.address || "");

    alert("Данные сохранены");
  }

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

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((c) => c.product.id !== productId));
  }

  function getCartItem(productId: string) {
    return cart.find((c) => c.product.id === productId) || null;
  }

  // Submit order
  async function submitOrder() {
    if (!tgUserId) return alert("Ошибка авторизации (нет Telegram user id)");
if (!orderFullName || !orderPhone || !orderAddress) {
  return alert("Заполните ФИО, телефон и адрес");
}
if (cart.length === 0) {
  return alert("🧺 Корзина пока пуста\n\nДобавьте товары из каталога, чтобы оформить заказ.");
}

    const { data, error } = await supabase
      .from("orders")
      .insert([
        {
          user_telegram_id: tgUserId,
          customer_name: orderFullName,
          phone: orderPhone,
          address: orderAddress,
          comment: orderComment,
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
    setOrderComment("");
    setPromoCode("");
    setView("profile");
    setProfileScreen("history");
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

  async function loadOrderChat(orderId: string, silent = false) {
    if (!initData) return;

    if (!silent) {
      setChatLoading(true);
    }
    setChatError(null);

    try {
      const res = await fetch("/api/admin/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, orderId }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setChatError(data?.error || `Ошибка загрузки чата (HTTP ${res.status})`);
        if (!silent) {
          setChatMessages([]);
        }
        return;
      }

      setChatMessages((data.messages || []) as OrderChatMessage[]);
    } catch (e: any) {
      setChatError(e?.message || "Ошибка сети");
      if (!silent) {
        setChatMessages([]);
      }
    } finally {
      if (!silent) {
        setChatLoading(false);
      }
    }
  }

  async function sendOrderChat(orderId: string) {
    const text = chatText.trim();
    if (!text || !initData) return;

    setChatSending(true);
    setChatError(null);

    try {
      const res = await fetch("/api/admin/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, orderId, text }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setChatError(data?.error || `Ошибка отправки (HTTP ${res.status})`);
        return;
      }

      setChatText("");
      await loadOrderChat(orderId);
    } catch (e: any) {
      setChatError(e?.message || "Ошибка сети");
    } finally {
      setChatSending(false);
    }
  }

  function openSupport() {
    const SUPPORT_LINK = process.env.NEXT_PUBLIC_SUPPORT_LINK || "";
    if (!SUPPORT_LINK) {
      alert("Не задан NEXT_PUBLIC_SUPPORT_LINK в .env.local");
      return;
    }

    const tg = (window as any)?.Telegram?.WebApp;
    try {
      tg?.openTelegramLink?.(SUPPORT_LINK);
      return;
    } catch {}

    window.open(SUPPORT_LINK, "_blank");
  }

  async function copyPhone(phone: string) {
    try {
      await navigator.clipboard.writeText(phone);
      alert("Номер скопирован");
    } catch {
      alert(`Не удалось скопировать автоматически. Номер: ${phone}`);
    }
  }

  async function openUserChat(telegramUserId?: number, telegramUsername?: string) {
    const tg = (window as any)?.Telegram?.WebApp;

    if (telegramUsername) {
      const clean = telegramUsername.replace(/^@/, "");
      const url = `https://t.me/${clean}`;
      try {
        tg?.openTelegramLink?.(url);
        return;
      } catch {}
      window.open(url, "_blank");
      return;
    }

    if (telegramUserId) {
      try {
        await navigator.clipboard.writeText(String(telegramUserId));
      } catch {}
      alert("У пользователя нет публичного @username. Telegram ID скопирован, но прямой переход в чат по одному ID в mini app работает нестабильно.");
      return;
    }

    alert("Не найден Telegram username или ID пользователя");
  }

  function openProfileScreen(screen: Exclude<ProfileScreen, "menu">) {
    setClosingProfileScreen(null);
    setProfileScreen(screen);
  }

  function closeProfileScreen() {
    if (profileScreen === "menu") return;
    setClosingProfileScreen(profileScreen);
    setProfileScreen("menu");
    window.setTimeout(() => {
      setClosingProfileScreen(null);
    }, 220);
  }

  useEffect(() => {
    if (view === "profile" && profileScreen === "history") loadMyOrders();
  }, [view, profileScreen]);

  useEffect(() => {
    if (selectedOrderId && chatOpen) {
      loadOrderChat(selectedOrderId);
    }
  }, [selectedOrderId, chatOpen]);

  useEffect(() => {
    if (!chatOpen || !selectedOrderId) return;

    const t = window.setInterval(() => {
      loadOrderChat(selectedOrderId, true);
    }, 5000);

    return () => window.clearInterval(t);
  }, [chatOpen, selectedOrderId]);

  useEffect(() => {
    if (!chatOpen) return;
    const el = chatListRef.current;
    if (!el) return;

    const lastId = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1].id : null;
    const shouldScroll = lastId !== lastChatMessageIdRef.current;
    lastChatMessageIdRef.current = lastId;

    if (!shouldScroll) return;

    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [chatMessages, chatOpen]);

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
    justifyContent: "center",
    paddingLeft: 16,
    paddingRight: 16,
    background: "rgba(43,128,164,0.92)",
    backdropFilter: "blur(10px)",
  };

  // Лого: чуть увеличили
const logoStyle: React.CSSProperties = {
  height: "clamp(56px, 12vw, 84px)",
  width: "auto",
  display: "block",
  filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.18))",
  pointerEvents: "none",
  userSelect: "none",
  transform: "translateY(34px)",
};

  const navTotalHeight = NAV_PAD * 2 + NAV_BTN_H;
  const contentBottomPadding = `calc(env(safe-area-inset-bottom, 0px) + ${NAV_LIFT}px + ${navTotalHeight}px + 22px)`;

  const content: React.CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    top: `calc(env(safe-area-inset-top, 0px) + ${HEADER_H - 16}px)`,
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

  const statusActionBtn = (status: OrderStatus, active: boolean): React.CSSProperties => ({
    padding: "10px 12px",
    borderRadius: 14,
    border: active
      ? `1px solid ${statusColor(status)}`
      : "1px solid rgba(0,0,0,0.10)",
    background: active ? `${statusColor(status)}22` : "rgba(255,255,255,0.85)",
    color: active ? statusColor(status) : BRAND_INK,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: active ? `0 8px 18px ${statusColor(status)}22` : "none",
  });

  const btnTab = (active: boolean): React.CSSProperties => ({
    padding: "10px 12px",
    borderRadius: 14,
    border: active
      ? "1px solid rgba(212,51,20,0.30)"
      : "1px solid rgba(0,0,0,0.10)",
    background: active ? "rgba(212,51,20,0.10)" : "rgba(255,255,255,0.85)",
    color: BRAND_INK,
    fontWeight: 900,
    cursor: "pointer",
  });

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
  const hideBottomNav = keyboardOpen || checkoutOpen;

  const navWrap: React.CSSProperties = {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 60,
    paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${NAV_LIFT}px)`,
    display: "flex",
    justifyContent: "center",
    pointerEvents: hideBottomNav ? "none" : "none",
    opacity: hideBottomNav ? 0 : 1,
    transform: hideBottomNav ? "translateY(180px)" : "translateY(0)",
    transition: "opacity 160ms ease, transform 160ms ease",
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

  const IND_INSET = 1;
  const indicator: React.CSSProperties = {
    position: "absolute",
    top: NAV_PAD + IND_INSET,
    left: indicatorLeft + IND_INSET,
    width: NAV_BTN_W - IND_INSET * 2,
    height: NAV_BTN_H - IND_INSET * 2,
    borderRadius: 13,
    background: "rgba(212,51,20,0.22)",
    border: "1px solid rgba(212,51,20,0.35)",
    boxShadow: "0 12px 28px rgba(212,51,20,0.25)",
    transition: "none",
  };

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

  const avatarSrc =
    tgUser?.photo_url ||
    profileData?.telegram_photo_url ||
    "";

  const activeProfileOverlayScreen =
    profileScreen !== "menu" ? profileScreen : closingProfileScreen;
  const isProfileOverlayVisible = profileScreen !== "menu";

  if (bootLoading) {
    return (
      <div style={root}>
        <style>{`
          @keyframes appPulse {
            0% { opacity: 0.45; }
            50% { opacity: 1; }
            100% { opacity: 0.45; }
          }
          .app-skeleton {
            background: linear-gradient(
              90deg,
              rgba(255,255,255,0.35) 0%,
              rgba(255,255,255,0.65) 50%,
              rgba(255,255,255,0.35) 100%
            );
            background-size: 200% 100%;
            animation: appShimmer 1.2s ease-in-out infinite;
          }
          @keyframes appShimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>

        <div
          style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              width: "min(360px, 100%)",
              background: "rgba(255,255,255,0.20)",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 28,
              padding: 24,
              backdropFilter: "blur(10px)",
              boxShadow: "0 18px 50px rgba(0,0,0,0.22)",
            }}
          >
            <img
              src="/logo.png"
              alt="logo"
              style={{
                display: "block",
                margin: "0 auto",
                height: 54,
                width: "auto",
                animation: "appPulse 1.3s ease-in-out infinite",
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div
              style={{
                color: "#fff",
                textAlign: "center",
                marginTop: 14,
                fontWeight: 900,
                fontSize: 16,
              }}
            >
              Загружаем приложение…
            </div>

            <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 12 }}>
              <SkeletonBlock height={18} radius={12} />
              <SkeletonBlock height={18} radius={12} style={{ width: "76%" }} />
              <SkeletonBlock height={72} radius={18} />
              <SkeletonBlock height={72} radius={18} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={root}>
      <style>{`
        @keyframes appShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes orderSheetIn {
          0% { opacity: 0; transform: translateY(28px) scale(0.985); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .app-skeleton {
          background: linear-gradient(
            90deg,
            rgba(10,19,23,0.06) 0%,
            rgba(10,19,23,0.12) 50%,
            rgba(10,19,23,0.06) 100%
          );
          background-size: 200% 100%;
          animation: appShimmer 1.2s ease-in-out infinite;
        }
      `}</style>

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

              {categoriesLoading ? (
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <SkeletonBlock height={34} radius={999} style={{ width: 90 }} />
                  <SkeletonBlock height={34} radius={999} style={{ width: 110 }} />
                  <SkeletonBlock height={34} radius={999} style={{ width: 100 }} />
                </div>
              ) : (
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
              )}
            </div>

            <div style={card}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Товары</div>

              {productsLoading ? (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                  <SkeletonBlock height={92} radius={14} />
                  <SkeletonBlock height={92} radius={14} />
                  <SkeletonBlock height={92} radius={14} />
                </div>
              ) : (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                  {products.map((p) => {
                    const cartItem = getCartItem(p.id);

                    return (
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
                          <div style={{ marginTop: 4, fontSize: 13, opacity: 0.8 }}>
                            {p.description}
                          </div>
                        )}

                        <div
                          style={{
                            marginTop: 10,
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                            alignItems: "center",
                          }}
                        >
                          <div style={{ fontWeight: 900 }}>
                            {formatPriceRub(p.price)}{" "}
                            <span style={{ fontWeight: 700, opacity: 0.7, fontSize: 12 }}>
                              {p.unit_type === "weight" ? "за кг" : "за шт"}
                            </span>
                          </div>

                          {!cartItem ? (
                            <button
                              style={{
                                padding: "10px 16px",
                                borderRadius: 999,
                                border: "1px solid rgba(212,51,20,0.25)",
                                background: "rgba(212,51,20,0.10)",
                                color: BRAND_INK,
                                fontWeight: 900,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                              onClick={() => addToCart(p)}
                            >
                              + Добавить
                            </button>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "4px",
                                borderRadius: 999,
                                border: "1px solid rgba(10,19,23,0.10)",
                                background: "rgba(255,255,255,0.9)",
                              }}
                            >
                              <button
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 999,
                                  border: "1px solid rgba(10,19,23,0.10)",
                                  background: "#fff",
                                  fontWeight: 900,
                                  cursor: "pointer",
                                }}
                                onClick={() => changeQuantity(p.id, -1)}
                              >
                                −
                              </button>

                              <div
                                style={{
                                  minWidth: 26,
                                  textAlign: "center",
                                  fontWeight: 900,
                                  fontSize: 14,
                                }}
                              >
                                {cartItem.quantity}
                              </div>

                              <button
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 999,
                                  border: "1px solid rgba(10,19,23,0.10)",
                                  background: "#fff",
                                  fontWeight: 900,
                                  cursor: "pointer",
                                }}
                                onClick={() => changeQuantity(p.id, 1)}
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {products.length === 0 && (
                    <div style={smallMuted}>Пока нет товаров в этой категории.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CART */}
        {view === "cart" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={card}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Корзина</div>

              {cart.length === 0 ? (
                <div
                  style={{
                    marginTop: 14,
                    padding: 18,
                    borderRadius: 16,
                    border: "1px dashed rgba(10,19,23,0.14)",
                    background: "rgba(10,19,23,0.02)",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 26, lineHeight: 1 }}>🧺</div>
                  <div style={{ marginTop: 10, fontWeight: 900, fontSize: 16 }}>
                    Корзина пока пуста
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, opacity: 0.72 }}>
                    Добавьте товары из каталога, чтобы оформить заказ.
                  </div>
                </div>
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

                        <div
                          style={{
                            marginTop: 10,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px",
                            borderRadius: 999,
                            border: "1px solid rgba(10,19,23,0.10)",
                            background: "rgba(255,255,255,0.9)",
                            width: "fit-content",
                          }}
                        >
                          <button
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 999,
                              border: "1px solid rgba(10,19,23,0.10)",
                              background: "#fff",
                              fontWeight: 900,
                              cursor: "pointer",
                            }}
                            onClick={() => changeQuantity(item.product.id, -1)}
                          >
                            −
                          </button>
                          <div
                            style={{
                              minWidth: 26,
                              textAlign: "center",
                              fontWeight: 900,
                              fontSize: 14,
                            }}
                          >
                            {item.quantity}
                          </div>
                          <button
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 999,
                              border: "1px solid rgba(10,19,23,0.10)",
                              background: "#fff",
                              fontWeight: 900,
                              cursor: "pointer",
                            }}
                            onClick={() => changeQuantity(item.product.id, 1)}
                          >
                            +
                          </button>
                          <button
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 999,
                              border: "1px solid rgba(10,19,23,0.10)",
                              background: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              padding: 0,
                            }}
                            onClick={() => removeFromCart(item.product.id)}
                            title="Убрать из корзины"
                          >
                            <span style={{color: "#D43314", fontSize: 18, fontWeight: 900, lineHeight: 1}}>✕</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
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

            {checkoutOpen && (
              <div style={card}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: 16 }}>Оформление</div>
                  <button style={btnGhost} onClick={() => setCheckoutOpen(false)}>
                    Закрыть
                  </button>
                </div>

                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontWeight: 900, fontSize: 14 }}>Получатель</div>

                  <input
                    style={inputStyle}
                    placeholder="ФИО"
                    value={orderFullName}
                    onChange={(e) => setOrderFullName(e.target.value)}
                  />

                  <input
                    style={inputStyle}
                    placeholder="Телефон"
                    value={orderPhone}
                    onChange={(e) => setOrderPhone(e.target.value)}
                  />

                  <input
                    style={inputStyle}
                    placeholder="Адрес"
                    value={orderAddress}
                    onChange={(e) => setOrderAddress(e.target.value)}
                  />

                  <div style={{ fontWeight: 900, fontSize: 14, marginTop: 6 }}>Способ оплаты</div>

                  <select
                    style={inputStyle}
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="cash">Наличные</option>
                    <option value="transfer">Перевод</option>
                    <option value="qr">QR-код</option>
                  </select>

                  <div style={{ fontWeight: 900, fontSize: 14, marginTop: 6 }}>Промокод</div>
                  <input
                    style={inputStyle}
                    placeholder="Введите промокод"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                  />

                  <div style={{ fontWeight: 900, fontSize: 14, marginTop: 6 }}>Комментарий</div>
                  <textarea
                    style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
                    placeholder="Комментарий к заказу"
                    value={orderComment}
                    onChange={(e) => setOrderComment(e.target.value)}
                  />

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
          <div style={{ display: "flex", flexDirection: "column", gap: 12, position: "relative" }}>
            {profileScreen === "menu" && (
              <>
            {/* Верх профиля */}
            <div style={card}>
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "rgba(10,19,23,0.08)",
                    flexShrink: 0,
                    border: "1px solid rgba(10,19,23,0.10)",
                  }}
                >
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt="avatar"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        fontSize: 22,
                        opacity: 0.65,
                      }}
                    >
                      {tgDisplayName()?.[0] || "U"}
                    </div>
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>
                    {tgDisplayName() || "Пользователь"}
                  </div>

                  {tgUser?.username ? (
                    <div style={{ marginTop: 4, opacity: 0.75 }}>@{tgUser.username}</div>
                  ) : null}

                  <div style={{ marginTop: 6, ...smallMuted }}>
                    ID: {tgUserId ?? "—"}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                style={{
                  ...card,
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  textAlign: "left",
                  cursor: "pointer",
                  border: "1px solid rgba(10,19,23,0.08)",
                  color: BRAND_INK,
                }}
                onClick={() => {
                  setSelectedMyOrderId(null);
                  openProfileScreen("history");
                }}
              >
                <div>
                  <div style={{ fontWeight: 900, fontSize: 17 }}>История заказов</div>
                  <div style={{ ...smallMuted, marginTop: 4 }}>Все ваши оформленные заказы</div>
                </div>
                <span style={{ opacity: 0.55, fontSize: 22, fontWeight: 900 }}>›</span>
              </button>

              <button
                style={{
                  ...card,
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  textAlign: "left",
                  cursor: "pointer",
                  border: "1px solid rgba(10,19,23,0.08)",
                  color: BRAND_INK,
                }}
                onClick={() => openProfileScreen("data")}
              >
                <div>
                  <div style={{ fontWeight: 900, fontSize: 17 }}>Мои данные</div>
                  <div style={{ ...smallMuted, marginTop: 4 }}>ФИО, телефон и адрес доставки</div>
                </div>
                <span style={{ opacity: 0.55, fontSize: 22, fontWeight: 900 }}>›</span>
              </button>

              <button
                style={{
                  ...card,
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  textAlign: "left",
                  cursor: "pointer",
                  border: "1px solid rgba(10,19,23,0.08)",
                  color: BRAND_INK,
                }}
                onClick={openSupport}
              >
                <div>
                  <div style={{ fontWeight: 900, fontSize: 17 }}>Тех. поддержка</div>
                  <div style={{ ...smallMuted, marginTop: 4 }}>Связаться с нами в Telegram</div>
                </div>
                <span style={{ opacity: 0.55, fontSize: 22, fontWeight: 900 }}>›</span>
              </button>

              {isAdmin && (
                <button
                  style={{
                    ...card,
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    textAlign: "left",
                    cursor: "pointer",
                    border: "1px solid rgba(212,51,20,0.18)",
                    boxShadow: "0 10px 30px rgba(212,51,20,0.10)",
                    color: BRAND_INK,
                  }}
                  onClick={() => {
                    setSelectedOrderId(null);
                    setAdminError(null);
                    setOrders([]);
                    setView("admin");
                    setProfileScreen("menu");
                    adminLoad();
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 17 }}>Админка</div>
                    <div style={{ ...smallMuted, marginTop: 4 }}>Просмотр и управление заказами</div>
                  </div>
                  <span style={{ opacity: 0.55, fontSize: 22, fontWeight: 900 }}>›</span>
                </button>
              )}
            </div>
              </>
            )}

            {activeProfileOverlayScreen && (
              <div
                style={{
                  position: "fixed",
                  left: 0,
                  right: 0,
                  top: `calc(env(safe-area-inset-top, 0px) + ${HEADER_H - 16}px)`,
                  bottom: 0,
                  zIndex: 70,
                  pointerEvents: activeProfileOverlayScreen ? "auto" : "none",
                  opacity: isProfileOverlayVisible ? 1 : 0,
                  transform: isProfileOverlayVisible ? "translateY(0)" : "translateY(100%)",
                  transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease",
                  overflowY: "auto",
                  WebkitOverflowScrolling: "touch",
                  padding: 16,
                  paddingBottom: contentBottomPadding,
                  background: BRAND_BG,
                }}
              >
                <div
                  style={{
                    ...card,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <button style={btnGhost} onClick={closeProfileScreen}>
                      ← Назад
                    </button>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>
                      {activeProfileOverlayScreen === "history" ? "История заказов" : "Мои данные"}
                    </div>
                    <div style={{ width: 76 }} />
                  </div>

                  {activeProfileOverlayScreen === "history" && (
                    <>
                      {profileLoading ? (
                        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                          <SkeletonBlock height={84} radius={14} />
                          <SkeletonBlock height={84} radius={14} />
                        </div>
                      ) : profileError ? (
                        <div style={{ marginTop: 10, color: BRAND_ACCENT, whiteSpace: "pre-wrap" }}>
                          Ошибка: {profileError}
                        </div>
                      ) : (
                        <>
                          {!selectedMyOrderId && (
                            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                              {myOrders.map((o) => {
                                const previewLines = orderPreviewItems(o.items_text, 2);
                                return (
                                <button
                                  key={o.id}
                                  onClick={() => setSelectedMyOrderId(o.id)}
                                  style={{
                                    textAlign: "left",
                                    borderRadius: 16,
                                    border: "1px solid rgba(10,19,23,0.10)",
                                    background: "rgba(255,255,255,0.96)",
                                    padding: 14,
                                    cursor: "pointer",
                                    boxShadow: "0 10px 24px rgba(10,19,23,0.05)",
                                  }}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                                    <div>
                                      <div style={{ fontWeight: 900, fontSize: 14 }}>Заказ #{o.id.slice(0, 8)}</div>
                                      <div style={{ ...smallMuted, marginTop: 4 }}>{formatDateTime(o.created_at)}</div>
                                    </div>
                                    <StatusBadge status={o.status} />
                                  </div>

                                  {previewLines.length > 0 && (
                                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                                      {previewLines.map((line, index) => (
                                        <div key={index} style={{ fontSize: 13, opacity: 0.82 }}>
                                          • {line}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                                    <div style={{ fontSize: 12, opacity: 0.65 }}>Нажмите, чтобы открыть детали</div>
                                    <div style={{ fontWeight: 900, fontSize: 16 }}>{formatPriceRub(o.total_amount)}</div>
                                  </div>
                                </button>
                                );
                              })}

                              {myOrders.length === 0 && (
                                <div style={{ marginTop: 10, opacity: 0.75 }}>📦 У вас пока нет заказов.

После оформления они будут появляться здесь.</div>
                              )}
                            </div>
                          )}

                          {selectedMyOrderId && (
                            <div
                              style={{
                                marginTop: 10,
                                animation: "orderSheetIn 220ms cubic-bezier(0.22, 1, 0.36, 1)",
                                transformOrigin: "bottom center",
                              }}
                            >
                              <button style={btnGhost} onClick={() => setSelectedMyOrderId(null)}>
                                ← Назад к списку
                              </button>

                              {selectedMyOrder ? (
                                <div style={{ marginTop: 12 }}>
                                  <div style={{ fontWeight: 900, fontSize: 16 }}>
                                    Заказ #{selectedMyOrder.id.slice(0, 8)}
                                  </div>
                                  <div style={{ marginTop: 8, opacity: 0.9 }}>
                                    Статус: <StatusBadge status={selectedMyOrder.status} />
                                  </div>
                                  <div style={{ marginTop: 6, fontWeight: 900 }}>
                                    {formatPriceRub(selectedMyOrder.total_amount)}
                                  </div>
                                  <div style={{ marginTop: 6, ...smallMuted }}>
                                    {formatDateTime(selectedMyOrder.created_at)}
                                  </div>

                                  <div
                                    style={{
                                      marginTop: 12,
                                      whiteSpace: "pre-wrap",
                                      fontSize: 13,
                                      opacity: 0.95,
                                    }}
                                  >
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
                    </>
                  )}

                  {activeProfileOverlayScreen === "data" && (
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                      <input
                        style={inputStyle}
                        placeholder="ФИО"
                        value={profileFormFullName}
                        onChange={(e) => setProfileFormFullName(e.target.value)}
                      />

                      <input
                        style={inputStyle}
                        placeholder="Телефон"
                        value={profileFormPhone}
                        onChange={(e) => setProfileFormPhone(e.target.value)}
                      />

                      <textarea
                        style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
                        placeholder="Адрес"
                        value={profileFormAddress}
                        onChange={(e) => setProfileFormAddress(e.target.value)}
                      />

                      <div style={smallMuted}>
                        Эти данные будут автоматически подставляться в оформление заказа.
                      </div>

                      <button
                        style={{
                          ...btnPrimary,
                          width: "100%",
                          opacity: profileSaveLoading ? 0.7 : 1,
                        }}
                        onClick={saveProfileData}
                        disabled={profileSaveLoading}
                      >
                        {profileSaveLoading ? "Сохраняем..." : "Сохранить данные"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ADMIN */}
        {view === "admin" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 16 }}>Админка</div>
                <button
                  style={btnGhost}
                  onClick={() => {
                    setSelectedOrderId(null);
                    setView("profile");
                    setProfileScreen("menu");
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

              {adminLoading ? (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  <SkeletonBlock height={84} radius={14} />
                  <SkeletonBlock height={84} radius={14} />
                </div>
              ) : adminError ? (
                <div style={{ marginTop: 10, color: BRAND_ACCENT, whiteSpace: "pre-wrap" }}>
                  Ошибка: {adminError}
                </div>
              ) : (
                <>
                  {!selectedOrderId && (
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                      {orders.map((o) => {
                        const previewLines = orderPreviewItems(o.items_text, 2);
                        return (
                        <button
                          key={o.id}
                          onClick={() => {
                            setSelectedOrderId(o.id);
                            setChatOpen(false);
                            setChatMessages([]);
                            setChatError(null);
                            setChatText("");
                          }}
                          style={{
                            textAlign: "left",
                            borderRadius: 16,
                            border: "1px solid rgba(10,19,23,0.10)",
                            background: "rgba(255,255,255,0.96)",
                            padding: 14,
                            cursor: "pointer",
                            boxShadow: "0 10px 24px rgba(10,19,23,0.05)",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                            <div>
                              <div style={{ fontWeight: 900, fontSize: 14 }}>Заказ #{o.id.slice(0, 8)}</div>
                              <div style={{ ...smallMuted, marginTop: 4 }}>{formatDateTime(o.created_at)}</div>
                            </div>
                            <StatusBadge status={o.status} />
                          </div>

                          <div style={{ marginTop: 10, fontWeight: 900 }}>{o.customer_name}</div>

                          {previewLines.length > 0 && (
                            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                              {previewLines.map((line, index) => (
                                <div key={index} style={{ fontSize: 13, opacity: 0.82 }}>
                                  • {line}
                                </div>
                              ))}
                            </div>
                          )}

                          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                            <div style={{ fontSize: 12, opacity: 0.65 }}>{o.phone}</div>
                            <div style={{ fontWeight: 900, fontSize: 16 }}>{formatPriceRub(o.total_amount)}</div>
                          </div>
                        </button>
                        );
                      })}
                      {orders.length === 0 && (
                        <div style={{ marginTop: 10, opacity: 0.75 }}>📦 Пока нет заказов в системе.</div>
                      )}
                    </div>
                  )}

                  {selectedOrderId && (
                    <div
                      style={{
                        marginTop: 12,
                        animation: "orderSheetIn 220ms cubic-bezier(0.22, 1, 0.36, 1)",
                        transformOrigin: "bottom center",
                      }}
                    >
                      <button style={btnGhost} onClick={() => setSelectedOrderId(null)}>
                        ← Назад к списку
                      </button>

                      {selectedOrder ? (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontWeight: 900, fontSize: 16 }}>
                            Заказ #{selectedOrder.id.slice(0, 8)}
                          </div>

                          <div
                            style={{
                              marginTop: 10,
                              display: "flex",
                              flexDirection: "column",
                              gap: 10,
                              opacity: 0.95,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                gap: 10,
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 900, fontSize: 16 }}>👤 {selectedOrder.customer_name}</div>
                                <div style={{ marginTop: 6, ...smallMuted }}>
                                  {formatDateTime(selectedOrder.created_at)}
                                </div>
                              </div>

                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                <button
                                  style={{
                                    ...btnGhost,
                                    border: chatOpen
                                      ? `1px solid ${BRAND_ACCENT}`
                                      : btnGhost.border,
                                    background: chatOpen
                                      ? "rgba(212,51,20,0.10)"
                                      : btnGhost.background,
                                  }}
                                  onClick={() => {
                                    const next = !chatOpen;
                                    setChatOpen(next);
                                    if (!chatOpen) {
                                      setChatMessages([]);
                                      setChatError(null);
                                      loadOrderChat(selectedOrder.id);
                                    }
                                  }}
                                  title="Открыть чат"
                                >
                                  Чат
                                </button>
                              </div>
                            </div>

                            <div
                              style={{
                                display: "grid",
                                gap: 8,
                                padding: 12,
                                borderRadius: 14,
                                border: "1px solid rgba(10,19,23,0.08)",
                                background: "rgba(10,19,23,0.03)",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <span>📞 {selectedOrder.phone}</span>
                                <button
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 999,
                                    border: "1px solid rgba(10,19,23,0.10)",
                                    background: "#fff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    padding: 0,
                                    flexShrink: 0,
                                  }}
                                  onClick={() => copyPhone(selectedOrder.phone)}
                                  title="Скопировать номер"
                                >
                                  <IconCopy ink={BRAND_INK} />
                                </button>
                              </div>
                              <div>📍 {selectedOrder.address}</div>
                              <div>💳 {selectedOrder.payment_method}</div>
                              <div>💰 {formatPriceRub(selectedOrder.total_amount)}</div>
                              {selectedOrder.comment ? <div>💬 {selectedOrder.comment}</div> : null}
                            </div>
                          </div>

                          <div
                            style={{
                              marginTop: 14,
                              borderRadius: 16,
                              border: "1px solid rgba(10,19,23,0.08)",
                              background: "rgba(10,19,23,0.03)",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                padding: "12px 14px",
                                borderBottom: "1px solid rgba(10,19,23,0.08)",
                                fontWeight: 900,
                              }}
                            >
                              Состав заказа
                            </div>
                            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                              {orderItemsList(selectedOrder.items_text).length > 0 ? (
                                orderItemsList(selectedOrder.items_text).map((line, index) => (
                                  <div
                                    key={index}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8,
                                      padding: "10px 12px",
                                      borderRadius: 12,
                                      background: "rgba(255,255,255,0.82)",
                                      border: "1px solid rgba(10,19,23,0.06)",
                                      fontSize: 14,
                                    }}
                                  >
                                    <span style={{ color: BRAND_ACCENT, fontWeight: 900 }}>•</span>
                                    <span>{line}</span>
                                  </div>
                                ))
                              ) : (
                                <div style={{ opacity: 0.7 }}>Нет данных</div>
                              )}
                            </div>
                          </div>

                          {chatOpen && (
                            <div
                              style={{
                                marginTop: 14,
                                borderRadius: 16,
                                border: "1px solid rgba(10,19,23,0.08)",
                                background: "rgba(10,19,23,0.03)",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  padding: "12px 14px",
                                  borderBottom: "1px solid rgba(10,19,23,0.08)",
                                  fontWeight: 900,
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  gap: 10,
                                }}
                              >
                                <span>Чат по заказу</span>
                                <button style={btnGhost} onClick={() => loadOrderChat(selectedOrder.id)}>
                                  Обновить
                                </button>
                              </div>

                              <div
                                ref={chatListRef}
                                style={{
                                  padding: 12,
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 10,
                                  maxHeight: 320,
                                  overflowY: "auto",
                                  WebkitOverflowScrolling: "touch",
                                }}
                              >
                                {chatLoading ? (
                                  <>
                                    <SkeletonBlock height={54} radius={14} />
                                    <SkeletonBlock height={54} radius={14} style={{ width: "82%" }} />
                                  </>
                                ) : chatError ? (
                                  <div style={{ color: BRAND_ACCENT, whiteSpace: "pre-wrap" }}>
                                    Ошибка: {chatError}
                                  </div>
                                ) : chatMessages.length === 0 ? (
                                  <div style={{ opacity: 0.72 }}>Сообщений пока нет.</div>
                                ) : (
                                  chatMessages.map((msg) => {
                                    const outgoing = msg.direction === "outgoing";
                                    return (
                                      <div
                                        key={msg.id}
                                        style={{
                                          alignSelf: outgoing ? "flex-end" : "flex-start",
                                          maxWidth: "86%",
                                          padding: "10px 12px",
                                          borderRadius: 14,
                                          background: outgoing
                                            ? "rgba(212,51,20,0.10)"
                                            : "rgba(255,255,255,0.90)",
                                          border: outgoing
                                            ? "1px solid rgba(212,51,20,0.18)"
                                            : "1px solid rgba(10,19,23,0.08)",
                                        }}
                                      >
                                        <div style={{ fontSize: 13, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
                                          {msg.text}
                                        </div>
                                        <div style={{ marginTop: 6, fontSize: 11, opacity: 0.6 }}>
                                          {outgoing ? "Вы" : "Клиент"} • {formatDateTime(msg.created_at)}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>

                              <div
                                style={{
                                  padding: 12,
                                  borderTop: "1px solid rgba(10,19,23,0.08)",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 10,
                                }}
                              >
                                <textarea
                                  style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
                                  placeholder="Напишите сообщение клиенту..."
                                  value={chatText}
                                  onChange={(e) => setChatText(e.target.value)}
                                />
                                <button
                                  style={{
                                    ...btnPrimary,
                                    width: "100%",
                                    opacity: chatSending ? 0.7 : 1,
                                  }}
                                  onClick={() => sendOrderChat(selectedOrder.id)}
                                  disabled={chatSending}
                                >
                                  {chatSending ? "Отправляем..." : "Отправить сообщение"}
                                </button>
                              </div>
                            </div>
                          )}

                          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button
                              style={statusActionBtn("assembling", selectedOrder.status === "assembling")}
                              onClick={() => setOrderStatus(selectedOrder.id, "assembling")}
                            >
                              Собирается
                            </button>
                            <button
                              style={statusActionBtn("on_the_way", selectedOrder.status === "on_the_way")}
                              onClick={() => setOrderStatus(selectedOrder.id, "on_the_way")}
                            >
                              В пути
                            </button>
                            <button
                              style={statusActionBtn("delivered", selectedOrder.status === "delivered")}
                              onClick={() => setOrderStatus(selectedOrder.id, "delivered")}
                            >
                              Доставлен
                            </button>
                            <button
                              style={statusActionBtn("canceled", selectedOrder.status === "canceled")}
                              onClick={() => setOrderStatus(selectedOrder.id, "canceled")}
                            >
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
            onClick={() => {
              setView("profile");
              setProfileScreen("menu");
              setClosingProfileScreen(null);
            }}
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