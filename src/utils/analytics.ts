export type AnalyticsEvent =
  | 'app_open'
  | 'venue_view'
  | 'route_click_or_favorite'
  | 'partner_screen_view'
  | 'partner_form_submit';

export function trackEvent(event: AnalyticsEvent, params?: Record<string, any>) {
  if (__DEV__) {
    console.log(`[Analytics] ${event}`, params || '');
  }
  // Integração com provedor real (ex: PostHog, Amplitude, Firebase)
}