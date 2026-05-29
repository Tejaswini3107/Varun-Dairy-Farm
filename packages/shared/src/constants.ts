export const ROUTES = {
  DASHBOARD: "/",
  CUSTOMERS: "/customers",
  INVENTORY: "/inventory",
  ORDERS: "/orders",
  DELIVERY: "/delivery",
  BILLING: "/billing",
  REPORTS: "/reports",
  STAFF: "/staff",
  SETTINGS: "/settings",
} as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "New",
  assigned: "Assigned",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  failed: "Failed",
  cancelled: "Cancelled",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  wallet: "Wallet",
  upi: "UPI",
  cash: "Cash",
  razorpay: "Razorpay",
};

export const STOCK_STATUS_LABELS: Record<string, string> = {
  healthy: "Healthy",
  low: "Low",
  critical: "Critical",
  expiring: "Expiring",
};

export const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Daily",
  alternate: "Alternate days",
  weekly: "Weekly",
  monthly: "Monthly",
};

export const PRODUCT_CATEGORIES = [
  "milk",
  "curd",
  "ghee",
  "paneer",
  "other",
] as const;

export const CURRENCY = "₹";
export const CURRENCY_CODE = "INR";

export const DEFAULT_WALLET_LIMIT = 2000;
export const LOW_STOCK_THRESHOLD = 0.3;
export const CRITICAL_STOCK_THRESHOLD = 0.1;

export const OTP_LENGTH = 4;
export const OTP_EXPIRY_MINUTES = 10;
