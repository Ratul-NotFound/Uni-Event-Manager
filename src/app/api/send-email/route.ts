import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, subject, html, text, attachment, smtpConfig } = body;

    if (!to || !subject) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: to, subject" },
        { status: 400 }
      );
    }

    // Default to Gmail or Custom SMTP
    const host = smtpConfig?.smtpHost || "smtp.gmail.com";
    const port = smtpConfig?.smtpPort || 465;
    const secure = smtpConfig?.smtpSecure !== undefined ? smtpConfig.smtpSecure : port === 465;
    const user = smtpConfig?.smtpUser || process.env.SMTP_USER;
    const pass = smtpConfig?.smtpPass || process.env.SMTP_PASS;
    const from = smtpConfig?.fromEmail
      ? `"${smtpConfig.fromName || "Club Event"}" <${smtpConfig.fromEmail}>`
      : user;

    if (!user || !pass) {
      return NextResponse.json(
        {
          success: false,
          error: "SMTP credentials not provided. Please provide SMTP User/Password or configure in settings.",
        },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 8000,
    });

    const mailOptions: any = {
      from,
      to,
      subject,
      text: text || html?.replace(/<[^>]*>?/gm, "") || "",
      html: html || text,
    };

    if (attachment && attachment.filename && attachment.content) {
      mailOptions.attachments = [
        {
          filename: attachment.filename,
          content: attachment.content,
          encoding: "base64",
        },
      ];
    }

    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
    });
  } catch (error: any) {
    console.error("Failed to dispatch email:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unknown SMTP error occurred",
      },
      { status: 500 }
    );
  }
}
