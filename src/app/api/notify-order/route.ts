import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function timingSafeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * Telegram Mini Apps initData verification
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function verifyTelegramInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData);

  const hash = params.get("hash");
  if (!hash) return { ok: false as const, error: "No hash in initData" };

  params.delete("hash");

  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const ok = timingSafeEqual(computedHash, hash);
  return ok ? { ok: true as const } : { ok: false as const, error: "Invalid hash" };
}

function formatRub(n: number) {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " ₽";
}

export async function POST(req: Request) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const adminId = process.env.ADMIN_TELEGRAM_ID;

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!botToken || !adminId || !supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { ok: false, error: "Server not configured (missing env vars)" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as { initData?: string; orderId?: string };

    const initData = String(body.initData || "");
    const orderId = String(body.orderId || "");

    if (!initData || !orderId) {
      return NextResponse.json(
        { ok: false, error: "initData and orderId are required" },
        { status: 400 }
      );
    }

    // 1) Verify telegram initData (anti-spam / anti-forgery)
    const verify = verifyTelegramInitData(initData, botToken);
    if (!verify.ok) {
      return NextResponse.json({ ok: false, error: verify.error }, { status: 401 });
    }

    // Parse telegram user id from initData
    const params = new URLSearchParams(initData);
    const userRaw = params.get("user");
    const tgUser = userRaw ? JSON.parse(userRaw) : null;
    const tgUserId = tgUser?.id ? Number(tgUser.id) : null;

    // 2) Read order + items from Supabase using service role (server only)
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id,user_telegram_id,customer_name,phone,address,comment,payment_method,total_amount,status,created_at")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ ok: false, error: orderErr?.message || "Order not found" }, { status: 404 });
    }

    // Extra safety: user who created order must match initData user
    if (tgUserId && Number(order.user_telegram_id) !== tgUserId) {
      return NextResponse.json({ ok: false, error: "User mismatch" }, { status: 403 });
    }

    const { data: items, error: itemsErr } = await supabase
      .from("order_items")
      .select("product_title,price,quantity")
      .eq("order_id", orderId)
      .order("id", { ascending: true });

    if (itemsErr) {
      return NextResponse.json({ ok: false, error: itemsErr.message }, { status: 500 });
    }

    const lines =
      (items || []).map((it: any) => {
        const price = Number(it.price);
        const qty = Number(it.quantity);
        const lineTotal = price * qty;
        return `• ${it.product_title} × ${qty} — ${formatRub(lineTotal)}`;
      }) || [];

    const total = Number(order.total_amount);

    const payLabel =
      order.payment_method === "cash"
        ? "Наличные"
        : order.payment_method === "qr"
        ? "QR-код"
        : order.payment_method === "transfer"
        ? "Перевод"
        : String(order.payment_method);

    const comment = order.comment && String(order.comment).trim() ? String(order.comment).trim() : "-";

    const text =
      `🆕 Новый заказ\n` +
      `#${String(order.id).slice(0, 8)}\n\n` +
      `👤 Имя: ${order.customer_name}\n` +
      `📞 Телефон: ${order.phone}\n` +
      `📍 Адрес: ${order.address}\n` +
      `💳 Оплата: ${payLabel}\n` +
      `💬 Комментарий: ${comment}\n\n` +
      `🧺 Состав:\n` +
      (lines.length ? lines.join("\n") : "• (нет позиций)") +
      `\n\n💰 Итого: ${formatRub(total)}`;

    // 3) Send message to admin
    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: adminId,
        text,
      }),
    });

    if (!tgRes.ok) {
      const errText = await tgRes.text().catch(() => "");
      return NextResponse.json({ ok: false, error: `Telegram sendMessage failed: ${errText}` }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}