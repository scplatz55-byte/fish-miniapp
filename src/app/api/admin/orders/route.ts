export const runtime = "nodejs";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function timingSafeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

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

function statusLabel(status: string) {
  if (status === "assembling") return "Собирается";
  if (status === "on_the_way") return "В пути";
  if (status === "delivered") return "Доставлен";
  if (status === "canceled") return "Отменён";
  return status;
}

export async function POST(req: Request) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!botToken || !supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { ok: false, error: "Server not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const initData = String(body.initData || "");
    const action = body.action;

    if (!initData || !action) {
      return NextResponse.json(
        { ok: false, error: "initData and action required" },
        { status: 400 }
      );
    }

    const verify = verifyTelegramInitData(initData, botToken);
    if (!verify.ok) {
      return NextResponse.json(
        { ok: false, error: verify.error },
        { status: 401 }
      );
    }

    const params = new URLSearchParams(initData);
    const userRaw = params.get("user");
    if (!userRaw) {
      return NextResponse.json(
        { ok: false, error: "No user in initData" },
        { status: 401 }
      );
    }

    const telegramUser = JSON.parse(userRaw);
    const telegramUserId = telegramUser.id;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Проверка админа
    const { data: adminRow } = await supabase
      .from("admins")
      .select("telegram_id")
      .eq("telegram_id", telegramUserId)
      .maybeSingle();

    if (!adminRow) {
      return NextResponse.json(
        { ok: false, error: "Forbidden (not admin)" },
        { status: 403 }
      );
    }

    // LIST
    if (action.type === "list") {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      const orderIds = (orders || []).map((o: any) => o.id);

      let itemsByOrder: Record<string, any[]> = {};

      if (orderIds.length) {
        const { data: items } = await supabase
          .from("order_items")
          .select("order_id,product_title,price,quantity")
          .in("order_id", orderIds);

        itemsByOrder = (items || []).reduce((acc: any, it: any) => {
          acc[it.order_id] = acc[it.order_id] || [];
          acc[it.order_id].push(it);
          return acc;
        }, {});
      }

      const enriched = (orders || []).map((o: any) => {
        const items = itemsByOrder[o.id] || [];
        const lines = items.map((it: any) => {
          const lt = Number(it.price) * Number(it.quantity);
          return `• ${it.product_title} × ${it.quantity} — ${formatRub(lt)}`;
        });

        return {
          ...o,
          items_text: lines.join("\n"),
        };
      });

      return NextResponse.json({ ok: true, orders: enriched });
    }

    // SET STATUS + уведомление клиенту
    if (action.type === "setStatus") {
      const { orderId, status } = action;

      const allowed = ["assembling", "on_the_way", "delivered", "canceled"];
      if (!allowed.includes(status)) {
        return NextResponse.json(
          { ok: false, error: "Invalid status" },
          { status: 400 }
        );
      }

      const { data: order, error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId)
        .select()
        .single();

      if (error || !order) {
        return NextResponse.json(
          { ok: false, error: error?.message || "Order not found" },
          { status: 500 }
        );
      }

      // Отправляем клиенту уведомление
      const message = `
🛒 Обновление по заказу #${order.id.slice(0, 8)}

Статус: ${statusLabel(status)}

Сумма: ${formatRub(Number(order.total_amount))}
`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: order.user_telegram_id,
          text: message,
        }),
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { ok: false, error: "Unknown action" },
      { status: 400 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}