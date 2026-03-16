import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getTelegramUserFromInitData,
  isTelegramAdmin,
  verifyTelegramInitData,
} from "@/lib/telegramServer";

type Payload = {
  initData: string;
  orderId: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;

    const initData = String(body.initData || "");
    const orderId = String(body.orderId || "");

    if (!initData || !orderId) {
      return NextResponse.json({ ok: false, error: "Missing params" }, { status: 400 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN!;
    if (!botToken) {
      return NextResponse.json({ ok: false, error: "Missing TELEGRAM_BOT_TOKEN" }, { status: 500 });
    }

    const verified = verifyTelegramInitData(initData, botToken);
    if (!verified) {
      return NextResponse.json({ ok: false, error: "Invalid initData" }, { status: 403 });
    }

    const user = getTelegramUserFromInitData(initData);
    const adminId = user?.id ?? null;

    if (!isTelegramAdmin(adminId)) {
      return NextResponse.json({ ok: false, error: "Нет доступа" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("order_chat_messages")
      .select("id,order_id,telegram_user_id,direction,text,bot_message_id,reply_to_bot_message_id,sender_role,created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      messages: data || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}