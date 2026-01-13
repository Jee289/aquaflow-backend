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
  referredBy?: string; 
  referralBalance: number; 
  orderCount: number; 
  activeBarrels: number; // 1 barrel = 1 active connection
  notifiedDistricts: string[]; // Track which districts the user requested notification for
}

export interface DistrictConfig {
  district: string;
  adminPhone: string;
  agentPhones: string[];
  supportMsg?: string; // Admin customized support message
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
  district: string; 
  address: Address;
  paymentMethod: 'UPI' | 'WALLET';
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