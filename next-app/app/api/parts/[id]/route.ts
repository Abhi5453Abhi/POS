import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';

// GET /api/parts/[id] - Get single part
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
        const partId = parseInt(id);
        if (isNaN(partId)) {
            return errorResponse('invalid part id', 400);
        }

        const parts = await sql`
      SELECT id, name, part_number, COALESCE(category, '') as category, 
             stock_quantity, unit_price, min_stock, created_at, updated_at
      FROM spare_parts WHERE id = ${partId}
    `;

        if (parts.length === 0) {
            return errorResponse('part not found', 404);
        }

        return jsonResponse(parts[0]);
    } catch (error) {
        console.error('Get part error:', error);
        return errorResponse('internal server error', 500);
    }
}

// PUT /api/parts/[id] - Update part
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
        const partId = parseInt(id);
        if (isNaN(partId)) {
            return errorResponse('invalid part id', 400);
        }

        const body = await request.json();

        await sql`
      UPDATE spare_parts SET 
        name = ${body.name},
        part_number = ${body.part_number},
        category = ${body.category || ''},
        stock_quantity = ${body.stock_quantity},
        unit_price = ${body.unit_price},
        min_stock = ${body.min_stock || 5},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${partId}
    `;

        const parts = await sql`
      SELECT id, name, part_number, COALESCE(category, '') as category, 
             stock_quantity, unit_price, min_stock, created_at, updated_at
      FROM spare_parts WHERE id = ${partId}
    `;

        if (parts.length === 0) {
            return errorResponse('part not found', 404);
        }

        return jsonResponse(parts[0]);
    } catch (error) {
        console.error('Update part error:', error);
        return errorResponse('internal server error', 500);
    }
}

// DELETE /api/parts/[id] - Delete part
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
        const partId = parseInt(id);
        if (isNaN(partId)) {
            return errorResponse('invalid part id', 400);
        }

        await sql`DELETE FROM spare_parts WHERE id = ${partId}`;

        return jsonResponse({ message: 'part deleted' });
    } catch (error) {
        console.error('Delete part error:', error);
        return errorResponse('internal server error', 500);
    }
}
