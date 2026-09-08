import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { config } from './env';

export function initSentry(): void {
  if (!config.sentry.isConfigured) return;

  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.sentry.environment,
    tracesSampleRate: config.sentry.tracesSampleRate,
    profilesSampleRate: config.sentry.tracesSampleRate,
    integrations: [nodeProfilingIntegration()],

    // Strip anything sensitive before the event leaves the server.
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      if (event.request?.data && typeof event.request.data === 'object') {
        const data = event.request.data as Record<string, unknown>;
        const redactKeys = [
          'password',
          'currentPassword',
          'newPassword',
          'confirmPassword',
          'otp',
          'code',
          'token',
          'refreshToken',
          'accessToken',
          'razorpay_signature',
        ];
        redactKeys.forEach((key) => {
          if (key in data) data[key] = '[REDACTED]';
        });
      }
      return event;
    },
  });
}

export { Sentry };
