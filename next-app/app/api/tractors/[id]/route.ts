import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';
import { Tractor } from '@/lib/types';

// GET /api/tractors/[id] - Get single tractor
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
        const tractorId = parseInt(id);
        if (isNaN(tractorId)) {
            return errorResponse('invalid tractor id', 400);
        }

        const tractors = await sql`
      SELECT id, brand, model, year, type, chassis_number, engine_number,
             purchase_price, COALESCE(sale_price, 0) as sale_price, status, supplier_name, 
             purchase_date, COALESCE(sale_date::text, '') as sale_date, 
             COALESCE(customer_name, '') as customer_name, 
             COALESCE(notes, '') as notes, exchange_tractor_id
      FROM tractors WHERE id = ${tractorId}
    `;

        if (tractors.length === 0) {
            return errorResponse('tractor not found', 404);
        }

        const tractor = tractors[0] as Tractor;

        // Enrich with exchange tractor details
        if (tractor.exchange_tractor_id) {
            const exchangeTractors = await sql`
        SELECT id, brand, model, year, type, chassis_number, engine_number,
               purchase_price, COALESCE(sale_price, 0) as sale_price, status, supplier_name, 
               purchase_date, COALESCE(sale_date::text, '') as sale_date, 
               COALESCE(customer_name, '') as customer_name, 
               COALESCE(notes, '') as notes
        FROM tractors WHERE id = ${tractor.exchange_tractor_id}
      `;
            if (exchangeTractors.length > 0) {
                tractor.exchange_tractor = exchangeTractors[0] as Tractor;
            }
        }

        return jsonResponse(tractor);
    } catch (error) {
        console.error('Get tractor error:', error);
        return errorResponse('internal server error', 500);
    }
}

// PUT /api/tractors/[id] - Update tractor
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
        const tractorId = parseInt(id);
        if (isNaN(tractorId)) {
            return errorResponse('invalid tractor id', 400);
        }

        const body = await request.json();

        await sql`
      UPDATE tractors SET 
        brand = ${body.brand},
        model = ${body.model},
        year = ${body.year},
        type = ${body.type},
        chassis_number = ${body.chassis_number},
        engine_number = ${body.engine_number},
        purchase_price = ${body.purchase_price},
        sale_price = ${body.sale_price || null},
        status = ${body.status},
        supplier_name = ${body.supplier_name},
        purchase_date = ${body.purchase_date},
        sale_date = ${body.sale_date || null},
        customer_name = ${body.customer_name || null},
        notes = ${body.notes || null},
        exchange_tractor_id = ${body.exchange_tractor_id || null}
      WHERE id = ${tractorId}
    `;

        // Fetch updated tractor
        const tractors = await sql`
      SELECT id, brand, model, year, type, chassis_number, engine_number,
             purchase_price, COALESCE(sale_price, 0) as sale_price, status, supplier_name, 
             purchase_date, COALESCE(sale_date::text, '') as sale_date, 
             COALESCE(customer_name, '') as customer_name, 
             COALESCE(notes, '') as notes, exchange_tractor_id
      FROM tractors WHERE id = ${tractorId}
    `;

        if (tractors.length === 0) {
            return errorResponse('tractor not found', 404);
        }

        const tractor = tractors[0] as Tractor;

        // Enrich with exchange tractor details
        if (tractor.exchange_tractor_id) {
            const exchangeTractors = await sql`
        SELECT id, brand, model, year, type, chassis_number, engine_number,
               purchase_price, COALESCE(sale_price, 0) as sale_price, status
        FROM tractors WHERE id = ${tractor.exchange_tractor_id}
      `;
            if (exchangeTractors.length > 0) {
                tractor.exchange_tractor = exchangeTractors[0] as Tractor;
            }
        }

        return jsonResponse(tractor);
    } catch (error) {
        console.error('Update tractor error:', error);
        return errorResponse('internal server error', 500);
    }
}

// DELETE /api/tractors/[id] - Delete tractor
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
        const tractorId = parseInt(id);
        if (isNaN(tractorId)) {
            return errorResponse('invalid tractor id', 400);
        }

        // Remove references from other tractors
        await sql`UPDATE tractors SET exchange_tractor_id = NULL WHERE exchange_tractor_id = ${tractorId}`;

        // Remove references from service_records
        await sql`UPDATE service_records SET tractor_id = NULL WHERE tractor_id = ${tractorId}`;

        // Delete the tractor
        await sql`DELETE FROM tractors WHERE id = ${tractorId}`;

        return jsonResponse({ message: 'tractor deleted' });
    } catch (error) {
        console.error('Delete tractor error:', error);
        return errorResponse('internal server error', 500);
    }
}
