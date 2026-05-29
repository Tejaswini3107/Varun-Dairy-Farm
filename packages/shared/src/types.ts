// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "manager" | "delivery_staff" | "customer";

export type OrderStatus =
  | "pending"
  | "assigned"
  | "out_for_delivery"
  | "delivered"
  | "failed"
  | "cancelled";

export type SubscriptionStatus = "active" | "paused" | "vacation" | "cancelled";

export type PaymentMethod = "wallet" | "upi" | "cash" | "razorpay";

export type PaymentStatus = "pending" | "success" | "failed" | "refunded";

export type TransactionType =
  | "debit"
  | "credit"
  | "refund"
  | "auto_debit"
  | "recharge";

export type StockStatus = "healthy" | "low" | "critical" | "expiring";

export type DeliveryStatus = "not_started" | "in_progress" | "completed";

// ─── User / Auth ──────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// ─── Customer ─────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  landmark?: string;
  area: string;
  routeId: string;
  routeName?: string;
  walletBalance: number;
  autoPay: boolean;
  autoPayLimit: number;
  status: "active" | "inactive" | "blocked";
  createdAt: string;
  updatedAt: string;
}

export interface CustomerWithSubscriptions extends Customer {
  subscriptions: Subscription[];
  todayOrder?: Order;
}

// ─── Product ──────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  description?: string;
  unit: string;
  pricePerUnit: number;
  imageUrl?: string;
  category: "milk" | "curd" | "ghee" | "paneer" | "other";
  isActive: boolean;
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export interface Subscription {
  id: string;
  customerId: string;
  productId: string;
  product?: Product;
  quantity: number;
  frequency: "daily" | "alternate" | "weekly" | "monthly";
  status: SubscriptionStatus;
  pauseUntil?: string;
  vacationFrom?: string;
  vacationUntil?: string;
  nextDeliveryDate?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Order ────────────────────────────────────────────────────────────────────

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  customerId: string;
  customer?: Customer;
  routeId: string;
  deliveryAgentId?: string;
  deliveryAgent?: Staff;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  collectedAmount?: number;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  stopSequence?: number;
  otp?: string;
  proofImageUrl?: string;
  deliveredAt?: string;
  notes?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Delivery Route ───────────────────────────────────────────────────────────

export interface Route {
  id: string;
  name: string;
  area: string;
  agentId?: string;
  agent?: Staff;
  totalStops: number;
  completedStops: number;
  status: DeliveryStatus;
  date: string;
  startedAt?: string;
  completedAt?: string;
}

// ─── Staff ────────────────────────────────────────────────────────────────────

export interface Staff {
  id: string;
  userId: string;
  name: string;
  phone: string;
  role: "manager" | "delivery_agent";
  routeId?: string;
  routeName?: string;
  totalDeliveries?: number;
  completedDeliveries?: number;
  totalCollection?: number;
  status: "on_road" | "completed" | "off_duty";
  joinedAt: string;
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export interface InventoryItem {
  id: string;
  productId: string;
  product?: Product;
  batchNumber: string;
  quantity: number;
  capacity: number;
  expiryDate?: string;
  status: StockStatus;
  reorderLevel: number;
  lastUpdated: string;
}

export interface SpoilageLog {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  reason: string;
  valueLost: number;
  loggedAt: string;
  loggedBy: string;
}

// ─── Billing / Payments ───────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  customerId: string;
  customer?: Customer;
  orderId?: string;
  type: TransactionType;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  notes?: string;
  createdAt: string;
}

export interface BillingSummary {
  totalBilled: number;
  totalCollected: number;
  pendingDues: number;
  walletFloat: number;
  pendingCustomers: number;
  successRate: number;
}

// ─── Dashboard / Analytics ────────────────────────────────────────────────────

export interface DashboardKPIs {
  todayOrders: number;
  ordersChange: number;
  milkVolumeLitres: number;
  totalRoutes: number;
  collectionsToday: number;
  pendingCollections: number;
  activeSubscriptions: number;
  renewalsDue: number;
  deliveredCount: number;
  pendingDeliveries: number;
  deliveryPercent: number;
}

export interface RevenueDataPoint {
  date: string;
  label: string;
  revenue: number;
  orders: number;
}

export interface ProductDemand {
  product: string;
  quantity: number;
  revenue: number;
  color: string;
}

// ─── Realtime Events ──────────────────────────────────────────────────────────

export type RealtimeEvent =
  | { type: "order_delivered"; orderId: string; customerId: string; agentId: string }
  | { type: "payment_received"; transactionId: string; customerId: string; amount: number }
  | { type: "subscription_changed"; customerId: string; productId: string; newQty: number }
  | { type: "stock_alert"; productId: string; status: StockStatus; quantity: number }
  | { type: "agent_location"; agentId: string; lat: number; lng: number }
  | { type: "route_completed"; routeId: string; agentId: string };

// ─── API Response shapes ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}
