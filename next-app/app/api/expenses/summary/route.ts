import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';
import { ExpenseCategory } from '@/lib/types';

// GET /api/expenses/summary - Get expense summary by category
export async function GET(request: NextRequest) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');

        const categories: ExpenseCategory[] = ['salary', 'rent', 'bill', 'misc'];
        const summary: Record<string, number> = {};

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
          SELECT COALESCE(SUM(amount), 0) as total FROM expenses 
          WHERE category = ${category}
        `;
            }
            summary[category] = Number(result[0]?.total || 0);
        }

        return jsonResponse(summary);
    } catch (error) {
        console.error('Expense summary error:', error);
        return errorResponse('internal server error', 500);
    }
}
