export type UserRole = 'admin' | 'pos' | 'customer';

export interface UserProfile {
  uid: string;
  name: string;
  email?: string;
  personalPhone?: string;
  role: UserRole;
  createdAt: any;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  nutritionalInfo?: string;
  price: number;
  oldPrice?: number;
  photoUrl: string;
  stockLevel: number;
  lowStockThreshold: number;
  category: string;
}

export interface Inquiry {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  message: string;
  status: 'unread' | 'read' | 'resolved';
  createdAt: any;
}

export interface AppNotification {
  id: string;
  type: 'lowStock' | 'info';
  title: string;
  message: string;
  productId?: string;
  status: 'unread' | 'read';
  createdAt: any;
}

export interface SaleItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  unit?: string;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  totalAmount: number;
  type: 'pre' | 'take';
  status: 'pending' | 'completed';
  customerId?: string;
  customerName?: string;
  posId: string;
  createdAt: any;
}

export interface AppSettings {
  logoUrl: string;
  tabIconUrl: string;
  tagline: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  heroTitle?: string;
  heroImage?: string;
  promiseTitle?: string;
  promiseText?: string;
  promiseLinkText?: string;
}
