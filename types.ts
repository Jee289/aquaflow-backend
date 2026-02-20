export enum AppRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  AGENT = 'AGENT',
  OWNER = 'OWNER'
}

export interface User {
  uid: string;
  name: string;
  phone: string;
  email?: string; // For Owner login
  role: AppRole;
  wallet: number;
  referralCode: string;
  district?: string;
  state?: string;
  city?: string;
  referredBy?: string;
  referralBalance: number;
  orderCount: number;
  homeStock: number;
  activeBarrels: number; // 1 barrel = 1 active connection
  notifiedDistricts: string[]; // Track which districts the user requested notification for
}

export interface DistrictConfig {
  district: string;
  adminPhone: string;
  agentPhones: string[];
  supportMsg?: string; // Admin customized support message
}

export interface LocationConfig {
  id: number;
  state: string;
  city: string;
  isActive: boolean;
  adminPhone?: string;
  agentPhones?: string[];
  supportMsg?: string;
}

export interface Address {
  id: string;
  type: 'home' | 'office' | 'other';
  building: string;
  flatNo: string;
  pincode: string;
  latitude: number;
  longitude: number;
  fullAddress: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  securityFee: number;
  type: 'REGULAR' | 'PREMIUM' | 'ACCESSORY';
  image: string;
  stock: number;
  note: string;
  unit?: string;
}

export interface OrderItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  items: OrderItem[];
  totalAmount: number;
  deliveryCharge: number;
  securityFees: number;
  discountApplied: number;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
  deliveryDate: string;
  district?: string;
  state?: string;
  city?: string;
  address: Address;
  paymentMethod: 'UPI' | 'WALLET';
  barrelReturns?: number;
  assignedAgentId?: string; // ID of the agent assigned to this order
  couponId?: number; // ID of the coupon used for this order
  timestamp: number;
}

export interface ReturnRequest {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  district: string; // Explicit district for reliable filtering
  address: Address;
  returnDate: string;
  barrelCount: number; // Number of connections to close
  status: 'pending' | 'completed' | 'cancelled' | 'settled';
  timestamp: number;
  refundProcessed?: boolean;
}

export interface InterestReport {
  district: string;
  count: number;
}