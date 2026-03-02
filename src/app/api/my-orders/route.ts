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
  for (const [key, value] of params.entries()) pairs.push(`${key}=${value}`);
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

function parseTelegramUserId(initData: string): number | null {
  try {
    const params = new URLSearchParams(initData);
    const userRaw = params.get("user");
    if (!userRaw) return null;
    const u = JSON.parse(userRaw);
    return u?.id ? Number(u.id) : null;
  } catch {
    return null;
  }
}

function formatRub(n: number) {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " ₽";
}

export async function POST(req: Request) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!botToken || !supabaseUrl || !serviceKey) {
      return NextResponse.json({ ok: false, error: "Server not configured" }, { status: 500 });
    }

    const body = (await req.json()) as { initData?: string; limit?: number };
    const initData = String(body.initData || "");
    const limit = Math.min(Math.max(Number(body.limit ?? 20), 1), 50);

    if (!initData) {
      return NextResponse.json({ ok: false, error: "initData required" }, { status: 400 });
    }

    const verify = verifyTelegramInitData(initData, botToken);
    if (!verify.ok) {
      return NextResponse.json({ ok: false, error: verify.error }, { status: 401 });
    }

    const tgUserId = parseTelegramUserId(initData);
    if (!tgUserId) {
      return NextResponse.json({ ok: false, error: "Cannot parse Telegram user id" }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: orders, error } = await supabase
      .from("orders")
      .select("id,customer_name,phone,address,comment,payment_method,total_amount,status,created_at")
      .eq("user_telegram_id", tgUserId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    const orderIds = (orders || []).map((o: any) => o.id);

    let itemsByOrder: Record<string, any[]> = {};
    if (orderIds.length) {
      const { data: items, error: itemsErr } = await supabase
        .from("order_items")
        .select("order_id,product_title,price,quantity")
        .in("order_id", orderIds);

      if (itemsErr) return NextResponse.json({ ok: false, error: itemsErr.message }, { status: 500 });

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

      return { ...o, items_text: lines.join("\n") };
    });

    return NextResponse.json({ ok: true, orders: enriched });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}