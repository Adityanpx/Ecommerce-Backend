export function baseLayout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#111111;padding:20px 32px;">
                <span style="color:#ffffff;font-size:20px;font-weight:bold;">Sports Store</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#333333;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background:#fafafa;color:#888888;font-size:12px;">
                This is an automated message. Please do not reply to this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function button(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:#111111;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">${text}</a>`;
}
