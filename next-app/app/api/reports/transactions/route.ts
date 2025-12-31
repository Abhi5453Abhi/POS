import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';
import { TransactionType, Transaction } from '@/lib/types';

// GET /api/reports/transactions - Get transactions
export async function GET(request: NextRequest) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') as TransactionType | null;
        const entityType = searchParams.get('entity_type');
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');

        // Build query based on filters
        let transactions;
        if (type && startDate && endDate) {
            transactions = await sql`
        SELECT id, type, entity_type, entity_id, amount, COALESCE(party_name, '') as party_name, 
               date, COALESCE(description, '') as description
        FROM transactions 
        WHERE type = ${type} AND date >= ${startDate} AND date <= ${endDate}
        ORDER BY date DESC, id DESC
      `;
        } else if (type && startDate) {
            transactions = await sql`
        SELECT id, type, entity_type, entity_id, amount, COALESCE(party_name, '') as party_name, 
               date, COALESCE(description, '') as description
        FROM transactions 
        WHERE type = ${type} AND date >= ${startDate}
        ORDER BY date DESC, id DESC
      `;
        } else if (type && endDate) {
            transactions = await sql`
        SELECT id, type, entity_type, entity_id, amount, COALESCE(party_name, '') as party_name, 
               date, COALESCE(description, '') as description
        FROM transactions 
        WHERE type = ${type} AND date <= ${endDate}
        ORDER BY date DESC, id DESC
      `;
        } else if (startDate && endDate) {
            transactions = await sql`
        SELECT id, type, entity_type, entity_id, amount, COALESCE(party_name, '') as party_name, 
               date, COALESCE(description, '') as description
        FROM transactions 
        WHERE date >= ${startDate} AND date <= ${endDate}
        ORDER BY date DESC, id DESC
      `;
        } else if (type) {
            transactions = await sql`
        SELECT id, type, entity_type, entity_id, amount, COALESCE(party_name, '') as party_name, 
               date, COALESCE(description, '') as description
        FROM transactions WHERE type = ${type}
        ORDER BY date DESC, id DESC
      `;
        } else if (startDate) {
            transactions = await sql`
        SELECT id, type, entity_type, entity_id, amount, COALESCE(party_name, '') as party_name, 
               date, COALESCE(description, '') as description
        FROM transactions WHERE date >= ${startDate}
        ORDER BY date DESC, id DESC
      `;
        } else if (endDate) {
            transactions = await sql`
        SELECT id, type, entity_type, entity_id, amount, COALESCE(party_name, '') as party_name, 
               date, COALESCE(description, '') as description
        FROM transactions WHERE date <= ${endDate}
        ORDER BY date DESC, id DESC
      `;
        } else {
            transactions = await sql`
        SELECT id, type, entity_type, entity_id, amount, COALESCE(party_name, '') as party_name, 
               date, COALESCE(description, '') as description
        FROM transactions ORDER BY date DESC, id DESC
      `;
        }

        // Filter by entity type if provided
        if (entityType) {
            transactions = (transactions as Transaction[]).filter(tx => tx.entity_type === entityType);
        }

        return jsonResponse(transactions);
    } catch (error) {
        console.error('Transactions report error:', error);
        return errorResponse('internal server error', 500);
    }
}
