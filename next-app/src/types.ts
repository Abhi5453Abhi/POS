// API Types matching backend models

export type Role = 'admin' | 'manager';

export interface User {
  id: number;
  username: string;
  role: Role;
  full_name: string;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  expire_at: number;
}

export type TractorStatus = 'in_stock' | 'sold';
export type TractorType = 'new' | 'used';

export interface Tractor {
  id: number;
  brand: string;
  model: string;
  year: number;
  type: TractorType;
  chassis_number: string;
  engine_number: string;
  purchase_price: number;
  sale_price?: number;
  status: TractorStatus;
  supplier_name: string;
  purchase_date: string;
  sale_date?: string;
  customer_name?: string;
  notes?: string;
  exchange_tractor_id?: number;
  exchange_tractor?: Tractor; // Nested exchange tractor details
}

export interface SparePart {
  id: number;
  name: string;
  part_number: string;
  category: string;
  stock_quantity: number;
  unit_price: number;
  min_stock: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceRecord {
  id: number;
  tractor_id?: number;
  customer_name: string;
  description: string;
  labor_cost: number;
  parts_cost: number;
  total_cost: number;
  parts_used: string;
  service_date: string;
  status: string;
}

export type ExpenseCategory = 'salary' | 'rent' | 'bill' | 'misc';

export interface Expense {
  id: number;
  category: ExpenseCategory;
  amount: number;
  description: string;
  recipient?: string;
  date: string;
  created_by: number;
  created_at: string;
}

export interface DashboardData {
  tractors_in_stock: number;
  low_stock_parts: number;
  recent_expenses: Expense[];
  total_sales: number;
  total_expenses: number;
}

export interface ProfitLossReport {
  total_sales: number;
  total_purchases: number;
  total_expenses: number;
  gross_profit: number;
  net_profit: number;
}

export type TransactionType = 'sale' | 'purchase';

export interface Transaction {
  id: number;
  type: TransactionType;
  entity_type: string; // 'tractor' | 'part' | 'service'
  entity_id: number;
  amount: number;
  party_name: string;
  date: string;
  description?: string;
}
