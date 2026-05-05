/**
 * Resend をデフォルトプロバイダにしたメール送信ラッパ。
 * RESEND_API_KEY が未設定の場合はモック送信（開発用）。
 */

export interface MailSendResult {
  success: boolean;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export async function sendMail(args: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<MailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? 'no-reply@example.jp';

  if (!apiKey) {
    return {
      success: true,
      providerMessageId: `mock-mail-${Date.now()}`,
    };
  }

  if (!args.to) {
    return {
      success: false,
      errorCode: 'NO_EMAIL',
      errorMessage: 'メールアドレスが未設定です',
    };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: args.to,
        subject: args.subject,
        text: args.text,
        html: args.html,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) {
      return {
        success: false,
        errorCode: `HTTP_${res.status}`,
        errorMessage: json.message ?? 'mail provider error',
      };
    }
    return { success: true, providerMessageId: json.id };
  } catch (e) {
    return {
      success: false,
      errorCode: 'NETWORK',
      errorMessage: (e as Error).message,
    };
  }
}
