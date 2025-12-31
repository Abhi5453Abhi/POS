import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';
import { SparePart } from '@/lib/types';

// GET /api/parts - List parts
export async function GET(request: NextRequest) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        const { searchParams } = new URL(request.url);
        const lowStock = searchParams.get('low_stock');

        let parts;
        if (lowStock === 'true') {
            parts = await sql`
        SELECT id, name, part_number, COALESCE(category, '') as category, 
               stock_quantity, unit_price, min_stock, created_at, updated_at
        FROM spare_parts WHERE stock_quantity <= min_stock ORDER BY stock_quantity
      `;
        } else {
            parts = await sql`
        SELECT id, name, part_number, COALESCE(category, '') as category, 
               stock_quantity, unit_price, min_stock, created_at, updated_at
        FROM spare_parts ORDER BY name
      `;
        }

        return jsonResponse(parts);
    } catch (error) {
        console.error('List parts error:', error);
        return errorResponse('internal server error', 500);
    }
}

// POST /api/parts - Create part
export async function POST(request: NextRequest) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        const body = await request.json();

        if (!body.name || !body.part_number) {
            return errorResponse('name and part_number are required', 400);
        }

        const result = await sql`
      INSERT INTO spare_parts (name, part_number, category, stock_quantity, unit_price, min_stock)
      VALUES (${body.name}, ${body.part_number}, ${body.category || ''}, 
              ${body.stock_quantity || 0}, ${body.unit_price || 0}, ${body.min_stock || 5})
      RETURNING id, name, part_number, category, stock_quantity, unit_price, min_stock, created_at, updated_at
    `;

        return jsonResponse(result[0], 201);
    } catch (error) {
        console.error('Create part error:', error);
        return errorResponse('internal server error', 500);
    }
}
