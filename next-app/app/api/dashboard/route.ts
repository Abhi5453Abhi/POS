import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';
import { Tractor, SparePart, Expense, DashboardData } from '@/lib/types';

export async function GET(request: NextRequest) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        // Get tractors in stock
        const tractors = await sql`
      SELECT COUNT(*) as count FROM tractors WHERE status = 'in_stock'
    `;
        const tractorsInStock = Number(tractors[0]?.count || 0);

        // Get low stock parts
        const lowStockParts = await sql`
      SELECT COUNT(*) as count FROM spare_parts WHERE stock_quantity <= min_stock
    `;
        const lowStockCount = Number(lowStockParts[0]?.count || 0);

        // Get recent expenses (last 5)
        const recentExpenses = await sql`
      SELECT id, category, amount, description, COALESCE(recipient, '') as recipient, 
             date, created_by, created_at
      FROM expenses 
      ORDER BY date DESC, id DESC 
      LIMIT 5
    ` as Expense[];

        // Get total sales
        const totalSales = await sql`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'sale'
    `;

        // Get total expenses
        const totalExpenses = await sql`
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses
    `;

        const dashboard: DashboardData = {
            tractors_in_stock: tractorsInStock,
            low_stock_parts: lowStockCount,
            recent_expenses: recentExpenses,
            total_sales: Number(totalSales[0]?.total || 0),
            total_expenses: Number(totalExpenses[0]?.total || 0),
        };

        return jsonResponse(dashboard);
    } catch (error) {
        console.error('Dashboard error:', error);
        return errorResponse('internal server error', 500);
    }
}
