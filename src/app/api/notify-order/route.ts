import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const adminId = process.env.ADMIN_TELEGRAM_ID;

    if (!botToken || !adminId) {
      return NextResponse.json(
        { ok: false, error: "Server not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();

    const message = `
🆕 Новый заказ!

👤 Имя: ${body.customer_name}
📞 Телефон: ${body.phone}
📍 Адрес: ${body.address}
💬 Комментарий: ${body.comment || "-"}
💳 Оплата: ${body.payment_method}

💰 Сумма: ${body.total_amount} ₽
`;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: adminId,
        text: message,
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}