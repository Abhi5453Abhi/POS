import { NextRequest } from 'next/server';
import { sql, formatDate, formatDateTime } from '@/lib/db';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';
import { Expense, ExpenseCategory } from '@/lib/types';

// GET /api/expenses - List expenses
export async function GET(request: NextRequest) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category') as ExpenseCategory | null;
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');

        // Build query dynamically
        let query = `
      SELECT id, category, amount, description, COALESCE(recipient, '') as recipient, 
             date, created_by, created_at
      FROM expenses WHERE 1=1
    `;
        const params: unknown[] = [];
        let paramIndex = 1;

        if (category) {
            query += ` AND category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }
        if (startDate) {
            query += ` AND date >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }
        if (endDate) {
            query += ` AND date <= $${paramIndex}`;
            params.push(endDate);
            paramIndex++;
        }
        query += ' ORDER BY date DESC, id DESC';

        // Use tagged template with raw query
        let expenses;
        if (category && startDate && endDate) {
            expenses = await sql`
        SELECT id, category, amount, description, COALESCE(recipient, '') as recipient, 
               date, created_by, created_at
        FROM expenses 
        WHERE category = ${category} AND date >= ${startDate} AND date <= ${endDate}
        ORDER BY date DESC, id DESC
      `;
        } else if (category && startDate) {
            expenses = await sql`
        SELECT id, category, amount, description, COALESCE(recipient, '') as recipient, 
               date, created_by, created_at
        FROM expenses 
        WHERE category = ${category} AND date >= ${startDate}
        ORDER BY date DESC, id DESC
      `;
        } else if (category && endDate) {
            expenses = await sql`
        SELECT id, category, amount, description, COALESCE(recipient, '') as recipient, 
               date, created_by, created_at
        FROM expenses 
        WHERE category = ${category} AND date <= ${endDate}
        ORDER BY date DESC, id DESC
      `;
        } else if (startDate && endDate) {
            expenses = await sql`
        SELECT id, category, amount, description, COALESCE(recipient, '') as recipient, 
               date, created_by, created_at
        FROM expenses 
        WHERE date >= ${startDate} AND date <= ${endDate}
        ORDER BY date DESC, id DESC
      `;
        } else if (category) {
            expenses = await sql`
        SELECT id, category, amount, description, COALESCE(recipient, '') as recipient, 
               date, created_by, created_at
        FROM expenses WHERE category = ${category}
        ORDER BY date DESC, id DESC
      `;
        } else if (startDate) {
            expenses = await sql`
        SELECT id, category, amount, description, COALESCE(recipient, '') as recipient, 
               date, created_by, created_at
        FROM expenses WHERE date >= ${startDate}
        ORDER BY date DESC, id DESC
      `;
        } else if (endDate) {
            expenses = await sql`
        SELECT id, category, amount, description, COALESCE(recipient, '') as recipient, 
               date, created_by, created_at
        FROM expenses WHERE date <= ${endDate}
        ORDER BY date DESC, id DESC
      `;
        } else {
            expenses = await sql`
        SELECT id, category, amount, description, COALESCE(recipient, '') as recipient, 
               date, created_by, created_at
        FROM expenses ORDER BY date DESC, id DESC
      `;
        }

        return jsonResponse(expenses);
    } catch (error) {
        console.error('List expenses error:', error);
        return errorResponse('internal server error', 500);
    }
}

// POST /api/expenses - Create expense
export async function POST(request: NextRequest) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        const body = await request.json();

        if (!body.amount || body.amount <= 0) {
            return errorResponse('valid amount is required', 400);
        }

        const expenseDate = body.date || formatDate();

        const result = await sql`
      INSERT INTO expenses (category, amount, description, recipient, date, created_by)
      VALUES (${body.category || 'misc'}, ${body.amount}, ${body.description || ''}, 
              ${body.recipient || null}, ${expenseDate}, ${authResult.user_id})
      RETURNING id, category, amount, description, recipient, date, created_by, created_at
    `;

        return jsonResponse(result[0], 201);
    } catch (error) {
        console.error('Create expense error:', error);
        return errorResponse('internal server error', 500);
    }
}
