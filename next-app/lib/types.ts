// TypeScript types for Tractor Agency

// User types
export type Role = 'admin' | 'manager';

export interface User {
    id: number;
    username: string;
    password_hash?: string;
    role: Role;
    full_name: string;
    created_at: string;
}

// Tractor types
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
    exchange_tractor?: Tractor;
}

// Spare Part types
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

// Service Record types
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

export interface PartUsage {
    part_id: number;
    name: string;
    quantity: number;
    unit_price: number;
}

// Expense types
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

// Transaction types
export type TransactionType = 'sale' | 'purchase';

export interface Transaction {
    id: number;
    type: TransactionType;
    entity_type: string;
    entity_id: number;
    amount: number;
    party_name: string;
    date: string;
    description?: string;
}

// API Request/Response types
export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    user: User;
    expire_at: number;
}

export interface DashboardData {
    tractors_in_stock: number;
    low_stock_parts: number;
    recent_expenses: Expense[];
    total_sales: number;
    total_expenses: number;
}

export interface SellTractorRequest {
    sale_price: number;
    customer_name: string;
    is_exchange?: boolean;
    exchange_tractor?: Partial<Tractor>;
}

export interface SellTractorResult {
    message: string;
    profit_loss: number;
    exchange_id?: number;
}

export interface SellPartRequest {
    quantity: number;
    customer_name: string;
}

export interface ProfitLossReport {
    total_sales: number;
    total_purchases: number;
    total_expenses: number;
    gross_profit: number;
    net_profit: number;
}

// JWT Claims
export interface JWTClaims {
    user_id: number;
    username: string;
    role: Role;
    iat: number;
    exp: number;
}
