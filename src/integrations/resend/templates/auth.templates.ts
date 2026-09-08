import { baseLayout, button } from './base';

export function welcomeEmail(firstName: string): { subject: string; html: string } {
  return {
    subject: 'Welcome to Sports Store',
    html: baseLayout(
      'Welcome',
      `<h2 style="margin:0 0 16px;">Welcome, ${firstName}</h2>
       <p>Your account is ready. You can now browse gear across every sport we stock and track your orders from your account page.</p>`,
    ),
  };
}

export function passwordResetEmail(
  firstName: string,
  resetUrl: string,
): { subject: string; html: string } {
  return {
    subject: 'Reset your password',
    html: baseLayout(
      'Reset your password',
      `<h2 style="margin:0 0 16px;">Reset your password</h2>
       <p>Hi ${firstName}, we received a request to reset your password. This link is valid for one hour and can be used once.</p>
       <p style="margin:24px 0;">${button('Reset password', resetUrl)}</p>
       <p style="color:#888;font-size:13px;">If you did not request this, you can ignore this email — your password will not change.</p>`,
    ),
  };
}
