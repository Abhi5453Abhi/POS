import { NextRequest } from 'next/server';
import { sql, formatDate } from '@/lib/db';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';
import { SellPartRequest, SparePart } from '@/lib/types';

// POST /api/parts/[id]/sell - Sell parts
export async function POST(
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

        const body: SellPartRequest = await request.json();

        // Get the part
        const parts = await sql`
      SELECT id, name, part_number, stock_quantity, unit_price
      FROM spare_parts WHERE id = ${partId}
    `;

        if (parts.length === 0) {
            return errorResponse('part not found', 404);
        }

        const part = parts[0] as SparePart;

        if (part.stock_quantity < body.quantity) {
            return errorResponse('insufficient stock', 400);
        }

        // Update stock
        const newQuantity = part.stock_quantity - body.quantity;
        await sql`
      UPDATE spare_parts SET stock_quantity = ${newQuantity}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${partId}
    `;

        // Record transaction
        const saleDate = formatDate();
        await sql`
      INSERT INTO transactions (type, entity_type, entity_id, amount, party_name, date, description)
      VALUES ('sale', 'part', ${partId}, ${part.unit_price * body.quantity}, 
              ${body.customer_name}, ${saleDate}, 
              ${part.name + ' x' + body.quantity})
    `;

        return jsonResponse({ message: 'part sold successfully' });
    } catch (error) {
        console.error('Sell part error:', error);
        return errorResponse('internal server error', 500);
    }
}
