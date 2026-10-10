import * as nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { z } from "zod";
import DOMPurify from "isomorphic-dompurify";
import { checkRateLimit, createRateLimitResponse, getClientIp } from "@/common/libs/rate-limit";

const emailSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000),
});

export const POST = async (request: Request) => {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`email_${ip}`, { limit: 5, windowMs: 60000 });
    if (!rateCheck.success) {
      return createRateLimitResponse(rateCheck.reset);
    }

    const body = await request.json();
    const parseResult = emailSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: parseResult.error.issues[0]?.message || "Validation failed",
          errors: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { name, email, message } = parseResult.data;
    const safeName = DOMPurify.sanitize(name);
    const safeMessage = DOMPurify.sanitize(message);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PW,
      },
    });

    const htmlTemplate = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #333; border-bottom: 2px solid #0070f3; padding-bottom: 10px;">Pesan Baru dari Portfolio</h2>
        <p style="font-size: 16px; color: #555;">Anda mendapatkan pesan baru dari seseorang yang mengunjungi website Anda.</p>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; color: #888; width: 100px;">Nama:</td>
            <td style="padding: 10px 0; font-weight: bold; color: #333;">${safeName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #888;">Email:</td>
            <td style="padding: 10px 0; font-weight: bold; color: #333;">${email}</td>
          </tr>
        </table>

        <div style="margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #0070f3; color: #444; font-style: italic;">
          "${safeMessage}"
        </div>

        <footer style="margin-top: 30px; font-size: 12px; color: #aaa; text-align: center;">
          Pesan ini dikirim via sistem otomatis Portfolio Satria.
        </footer>
      </div>
    `;

    await transporter.sendMail({
      from: `"${safeName}" <${process.env.NODEMAILER_EMAIL}>`,
      replyTo: email,
      to: "satriaaxel7703@gmail.com",
      subject: `🚀 Contact Form: ${safeName}`,
      text: `${safeMessage} | Dikirim oleh: ${email}`,
      html: htmlTemplate,
    });

    return NextResponse.json(
      { success: true, message: "Email berhasil dikirim!" },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Nodemailer Error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengirim email", error: error.message },
      { status: 500 },
    );
  }
};
