import { NextRequest } from 'next/server';
import { sql, formatDate } from '@/lib/db';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';

// GET /api/expenses/[id] - Get single expense
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        const { id } = await params;
        const expenseId = parseInt(id);
        if (isNaN(expenseId)) {
            return errorResponse('invalid expense id', 400);
        }

        const expenses = await sql`
      SELECT id, category, amount, description, COALESCE(recipient, '') as recipient, 
             date, created_by, created_at
      FROM expenses WHERE id = ${expenseId}
    `;

        if (expenses.length === 0) {
            return errorResponse('expense not found', 404);
        }

        return jsonResponse(expenses[0]);
    } catch (error) {
        console.error('Get expense error:', error);
        return errorResponse('internal server error', 500);
    }
}

// PUT /api/expenses/[id] - Update expense
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        const { id } = await params;
        const expenseId = parseInt(id);
        if (isNaN(expenseId)) {
            return errorResponse('invalid expense id', 400);
        }

        const body = await request.json();

        await sql`
      UPDATE expenses SET 
        category = ${body.category},
        amount = ${body.amount},
        description = ${body.description || ''},
        recipient = ${body.recipient || null},
        date = ${body.date || formatDate()}
      WHERE id = ${expenseId}
    `;

        const expenses = await sql`
      SELECT id, category, amount, description, COALESCE(recipient, '') as recipient, 
             date, created_by, created_at
      FROM expenses WHERE id = ${expenseId}
    `;

        if (expenses.length === 0) {
            return errorResponse('expense not found', 404);
        }

        return jsonResponse(expenses[0]);
    } catch (error) {
        console.error('Update expense error:', error);
        return errorResponse('internal server error', 500);
    }
}

// DELETE /api/expenses/[id] - Delete expense
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        const { id } = await params;
        const expenseId = parseInt(id);
        if (isNaN(expenseId)) {
            return errorResponse('invalid expense id', 400);
        }

        await sql`DELETE FROM expenses WHERE id = ${expenseId}`;

        return jsonResponse({ message: 'expense deleted' });
    } catch (error) {
        console.error('Delete expense error:', error);
        return errorResponse('internal server error', 500);
    }
}
