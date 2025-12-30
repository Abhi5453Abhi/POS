import axios from 'axios';
import type {
    LoginRequest,
    LoginResponse,
    User,
    Tractor,
    SparePart,
    ServiceRecord,
    Expense,
    DashboardData,
    ProfitLossReport,
    Transaction
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 responses
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authApi = {
    login: async (data: LoginRequest): Promise<LoginResponse> => {
        const response = await api.post<LoginResponse>('/login', data);
        return response.data;
    },

    getCurrentUser: async (): Promise<User> => {
        const response = await api.get<User>('/me');
        return response.data;
    },
};

// Tractor API
export const tractorApi = {
    list: async (status?: string): Promise<Tractor[]> => {
        const params = status ? { status } : {};
        const response = await api.get<Tractor[]>('/tractors', { params });
        return response.data;
    },

    get: async (id: number): Promise<Tractor> => {
        const response = await api.get<Tractor>(`/tractors/${id}`);
        return response.data;
    },

    create: async (data: Partial<Tractor>): Promise<Tractor> => {
        const response = await api.post<Tractor>('/tractors', data);
        return response.data;
    },

    sell: async (id: number, salePrice: number, customerName: string, isExchange?: boolean, exchangeTractor?: Partial<Tractor>): Promise<{ message: string; profit_loss: number; exchange_id?: number }> => {
        const response = await api.post<{ message: string; profit_loss: number; exchange_id?: number }>(`/tractors/${id}/sell`, { 
            sale_price: salePrice, 
            customer_name: customerName,
            is_exchange: isExchange || false,
            exchange_tractor: exchangeTractor
        });
        return response.data;
    },

    update: async (id: number, data: Partial<Tractor>): Promise<Tractor> => {
        const response = await api.put<Tractor>(`/tractors/${id}`, data);
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/tractors/${id}`);
    },
};

// Spare Parts API
export const partsApi = {
    list: async (lowStock?: boolean): Promise<SparePart[]> => {
        const params = lowStock ? { low_stock: 'true' } : {};
        const response = await api.get<SparePart[]>('/parts', { params });
        return response.data;
    },

    create: async (data: Partial<SparePart>): Promise<SparePart> => {
        const response = await api.post<SparePart>('/parts', data);
        return response.data;
    },

    sell: async (id: number, quantity: number, customerName: string): Promise<void> => {
        await api.post(`/parts/${id}/sell`, { quantity, customer_name: customerName });
    },

    update: async (id: number, data: Partial<SparePart>): Promise<SparePart> => {
        const response = await api.put<SparePart>(`/parts/${id}`, data);
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/parts/${id}`);
    },
};

// Service API
export const serviceApi = {
    list: async (startDate?: string, endDate?: string): Promise<ServiceRecord[]> => {
        const params: Record<string, string> = {};
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        const response = await api.get<ServiceRecord[]>('/services', { params });
        return response.data;
    },

    create: async (data: Partial<ServiceRecord>): Promise<ServiceRecord> => {
        const response = await api.post<ServiceRecord>('/services', data);
        return response.data;
    },

    update: async (id: number, data: Partial<ServiceRecord>): Promise<ServiceRecord> => {
        const response = await api.put<ServiceRecord>(`/services/${id}`, data);
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/services/${id}`);
    },
};

// Expense API
export const expenseApi = {
    list: async (category?: string, startDate?: string, endDate?: string): Promise<Expense[]> => {
        const params: Record<string, string> = {};
        if (category) params.category = category;
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        const response = await api.get<Expense[]>('/expenses', { params });
        return response.data;
    },

    create: async (data: Partial<Expense>): Promise<Expense> => {
        const response = await api.post<Expense>('/expenses', data);
        return response.data;
    },

    getSummary: async (startDate?: string, endDate?: string): Promise<Record<string, number>> => {
        const params: Record<string, string> = {};
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        const response = await api.get<Record<string, number>>('/expenses/summary', { params });
        return response.data;
    },

    update: async (id: number, data: Partial<Expense>): Promise<Expense> => {
        const response = await api.put<Expense>(`/expenses/${id}`, data);
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/expenses/${id}`);
    },
};

// Dashboard API
export const dashboardApi = {
    get: async (): Promise<DashboardData> => {
        const response = await api.get<DashboardData>('/dashboard');
        return response.data;
    },
};

// Reports API (Admin only)
export const reportsApi = {
    getProfitLoss: async (startDate?: string, endDate?: string): Promise<ProfitLossReport> => {
        const params: Record<string, string> = {};
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        const response = await api.get<ProfitLossReport>('/reports/profit-loss', { params });
        return response.data;
    },

    getTransactions: async (type?: string, entityType?: string, startDate?: string, endDate?: string): Promise<Transaction[]> => {
        const params: Record<string, string> = {};
        if (type) params.type = type;
        if (entityType) params.entity_type = entityType;
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        const response = await api.get<Transaction[]>('/reports/transactions', { params });
        return response.data;
    },
};

export default api;
