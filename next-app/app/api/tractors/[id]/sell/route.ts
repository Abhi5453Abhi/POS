import { NextRequest } from 'next/server';
import { sql, formatDate } from '@/lib/db';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';
import { SellTractorRequest, SellTractorResult, Tractor } from '@/lib/types';

// POST /api/tractors/[id]/sell - Sell tractor
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
        const tractorId = parseInt(id);
        if (isNaN(tractorId)) {
            return errorResponse('invalid tractor id', 400);
        }

        const body: SellTractorRequest = await request.json();

        // Get the tractor
        const tractors = await sql`
      SELECT id, brand, model, year, type, chassis_number, engine_number,
             purchase_price, status, supplier_name, purchase_date
      FROM tractors WHERE id = ${tractorId}
    `;

        if (tractors.length === 0) {
            return errorResponse('tractor not found', 404);
        }

        const tractor = tractors[0] as Tractor;

        if (tractor.status === 'sold') {
            return errorResponse('tractor already sold', 400);
        }

        const saleDate = formatDate();

        // Update tractor as sold
        await sql`
      UPDATE tractors SET 
        status = 'sold',
        sale_price = ${body.sale_price},
        customer_name = ${body.customer_name},
        sale_date = ${saleDate}
      WHERE id = ${tractorId}
    `;

        // Record sale transaction
        await sql`
      INSERT INTO transactions (type, entity_type, entity_id, amount, party_name, date, description)
      VALUES ('sale', 'tractor', ${tractorId}, ${body.sale_price}, 
              ${body.customer_name}, ${saleDate}, 
              ${tractor.brand + ' ' + tractor.model + ' sale'})
    `;

        const result: SellTractorResult = {
            message: 'tractor sold successfully',
            profit_loss: body.sale_price - tractor.purchase_price,
        };

        // Handle exchange if applicable
        if (body.is_exchange && body.exchange_tractor) {
            const exchangeTractor = body.exchange_tractor;
            const supplierName = exchangeTractor.supplier_name || body.customer_name;

            // Insert exchange tractor
            const exchangeResult = await sql`
        INSERT INTO tractors (brand, model, year, type, chassis_number, engine_number, 
                             purchase_price, status, supplier_name, purchase_date, notes)
        VALUES (${exchangeTractor.brand}, ${exchangeTractor.model}, 
                ${exchangeTractor.year || 2024}, ${exchangeTractor.type || 'used'}, 
                ${exchangeTractor.chassis_number || ''}, ${exchangeTractor.engine_number || ''}, 
                ${exchangeTractor.purchase_price || 0}, 'in_stock', ${supplierName}, 
                ${saleDate}, ${exchangeTractor.notes || ''})
        RETURNING id
      `;

            const exchangeId = exchangeResult[0].id;

            // Update sold tractor to reference exchange tractor
            await sql`
        UPDATE tractors SET exchange_tractor_id = ${exchangeId} WHERE id = ${tractorId}
      `;

            // Record purchase transaction for exchange
            await sql`
        INSERT INTO transactions (type, entity_type, entity_id, amount, party_name, date, description)
        VALUES ('purchase', 'tractor', ${exchangeId}, ${exchangeTractor.purchase_price || 0}, 
                ${body.customer_name}, ${saleDate}, 
                ${exchangeTractor.brand + ' ' + exchangeTractor.model + ' exchange purchase'})
      `;

            // Recalculate profit/loss including exchange value
            result.profit_loss = body.sale_price - tractor.purchase_price - (exchangeTractor.purchase_price || 0);
            result.exchange_id = exchangeId;
            result.message = 'tractor sold with exchange successfully';
        }

        return jsonResponse(result);
    } catch (error) {
        console.error('Sell tractor error:', error);
        return errorResponse('internal server error', 500);
    }
}
