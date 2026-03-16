import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getTelegramUserFromInitData,
  isTelegramAdmin,
  sendTelegramMessage,
  verifyTelegramInitData,
} from "@/lib/telegramServer";

type Payload = {
  initData: string;
  orderId: string;
  text: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;

    const initData = String(body.initData || "");
    const orderId = String(body.orderId || "");
    const text = String(body.text || "").trim();

    if (!initData) {
      return NextResponse.json({ ok: false, error: "Missing initData" }, { status: 400 });
    }

    if (!orderId) {
      return NextResponse.json({ ok: false, error: "Missing orderId" }, { status: 400 });
    }

    if (!text) {
      return NextResponse.json({ ok: false, error: "Введите текст сообщения" }, { status: 400 });
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

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id,user_telegram_id,customer_name")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ ok: false, error: "Заказ не найден" }, { status: 404 });
    }

    const customerTelegramId = Number(order.user_telegram_id);
    if (!customerTelegramId) {
      return NextResponse.json(
        { ok: false, error: "У заказа нет Telegram ID клиента" },
        { status: 400 }
      );
    }

    const outgoingText =
      `Сообщение по заказу #${order.id.slice(0, 8)}\n\n` +
      `${text}`;

    const sent = await sendTelegramMessage(customerTelegramId, outgoingText);

    const { error: insertError } = await supabaseAdmin.from("order_chat_messages").insert({
      order_id: order.id,
      telegram_user_id: customerTelegramId,
      direction: "outgoing",
      text,
      bot_message_id: sent.message_id,
      sender_role: "admin",
    });

    if (insertError) {
      return NextResponse.json(
        { ok: false, error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      messageId: sent.message_id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}