type EventName =
  | 'app_open'
  | 'view_venue_detail'
  | 'view_route'
  | 'favorite_venue'
  | 'open_advertise_screen'
  | 'submit_partner_lead'
  | 'redeem_coupon';

export function trackEvent(eventName: EventName, params?: Record<string, any>) {
  if (__DEV__) {
    console.log(`[ANALYTICS EVENT] ${eventName}:`, params ?? {});
  }
}