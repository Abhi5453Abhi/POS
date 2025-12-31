import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { requireRole, jsonResponse, errorResponse } from '@/lib/auth';
import { ExpenseCategory } from '@/lib/types';

// GET /api/reports/profit-loss - Get profit/loss report (admin only)
export async function GET(request: NextRequest) {
    try {
        const authResult = requireRole(request, ['admin']);
        if (authResult instanceof Response) {
            return authResult;
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');

        // Get total sales
        let totalSalesResult;
        if (startDate && endDate) {
            totalSalesResult = await sql`
        SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
        WHERE type = 'sale' AND date >= ${startDate} AND date <= ${endDate}
      `;
        } else if (startDate) {
            totalSalesResult = await sql`
        SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
        WHERE type = 'sale' AND date >= ${startDate}
      `;
        } else if (endDate) {
            totalSalesResult = await sql`
        SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
        WHERE type = 'sale' AND date <= ${endDate}
      `;
        } else {
            totalSalesResult = await sql`
        SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'sale'
      `;
        }
        const totalSales = Number(totalSalesResult[0]?.total || 0);

        // Get total purchases
        let totalPurchasesResult;
        if (startDate && endDate) {
            totalPurchasesResult = await sql`
        SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
        WHERE type = 'purchase' AND date >= ${startDate} AND date <= ${endDate}
      `;
        } else if (startDate) {
            totalPurchasesResult = await sql`
        SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
        WHERE type = 'purchase' AND date >= ${startDate}
      `;
        } else if (endDate) {
            totalPurchasesResult = await sql`
        SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
        WHERE type = 'purchase' AND date <= ${endDate}
      `;
        } else {
            totalPurchasesResult = await sql`
        SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'purchase'
      `;
        }
        const totalPurchases = Number(totalPurchasesResult[0]?.total || 0);

        // Get total expenses by category
        const categories: ExpenseCategory[] = ['salary', 'rent', 'bill', 'misc'];
        let totalExpenses = 0;

        for (const category of categories) {
            let result;
            if (startDate && endDate) {
                result = await sql`
          SELECT COALESCE(SUM(amount), 0) as total FROM expenses 
          WHERE category = ${category} AND date >= ${startDate} AND date <= ${endDate}
        `;
            } else if (startDate) {
                result = await sql`
          SELECT COALESCE(SUM(amount), 0) as total FROM expenses 
          WHERE category = ${category} AND date >= ${startDate}
        `;
            } else if (endDate) {
                result = await sql`
          SELECT COALESCE(SUM(amount), 0) as total FROM expenses 
          WHERE category = ${category} AND date <= ${endDate}
        `;
            } else {
                result = await sql`
          SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE category = ${category}
        `;
            }
            totalExpenses += Number(result[0]?.total || 0);
        }

        const report = {
            total_sales: totalSales,
            total_purchases: totalPurchases,
            total_expenses: totalExpenses,
            gross_profit: totalSales - totalPurchases,
            net_profit: totalSales - totalPurchases - totalExpenses,
        };

        return jsonResponse(report);
    } catch (error) {
        console.error('Profit loss report error:', error);
        return errorResponse('internal server error', 500);
    }
}
