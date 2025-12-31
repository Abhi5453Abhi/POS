import { NextRequest } from 'next/server';
import { sql, formatDate } from '@/lib/db';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';
import { Tractor } from '@/lib/types';

// GET /api/tractors - List tractors
export async function GET(request: NextRequest) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        let tractors;
        if (status === 'in_stock') {
            tractors = await sql`
        SELECT id, brand, model, year, type, chassis_number, engine_number,
               purchase_price, COALESCE(sale_price, 0) as sale_price, status, supplier_name, 
               purchase_date, COALESCE(sale_date::text, '') as sale_date, 
               COALESCE(customer_name, '') as customer_name, 
               COALESCE(notes, '') as notes, exchange_tractor_id
        FROM tractors WHERE status = 'in_stock' ORDER BY id DESC
      `;
        } else {
            tractors = await sql`
        SELECT id, brand, model, year, type, chassis_number, engine_number,
               purchase_price, COALESCE(sale_price, 0) as sale_price, status, supplier_name, 
               purchase_date, COALESCE(sale_date::text, '') as sale_date, 
               COALESCE(customer_name, '') as customer_name, 
               COALESCE(notes, '') as notes, exchange_tractor_id
        FROM tractors ORDER BY id DESC
      `;
        }

        // Enrich with exchange tractor details
        const enrichedTractors = await Promise.all(
            tractors.map(async (t) => {
                const tractor = t as Tractor;
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
                return tractor;
            })
        );

        return jsonResponse(enrichedTractors);
    } catch (error) {
        console.error('List tractors error:', error);
        return errorResponse('internal server error', 500);
    }
}

// POST /api/tractors - Create tractor
export async function POST(request: NextRequest) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        const body = await request.json();

        if (!body.brand || !body.model) {
            return errorResponse('brand and model are required', 400);
        }

        const purchaseDate = body.purchase_date || formatDate();

        // Insert tractor
        const result = await sql`
      INSERT INTO tractors (brand, model, year, type, chassis_number, engine_number, 
                           purchase_price, status, supplier_name, purchase_date, notes)
      VALUES (${body.brand}, ${body.model}, ${body.year || 2024}, ${body.type || 'new'}, 
              ${body.chassis_number || ''}, ${body.engine_number || ''}, 
              ${body.purchase_price || 0}, 'in_stock', ${body.supplier_name || ''}, 
              ${purchaseDate}, ${body.notes || ''})
      RETURNING id
    `;

        const tractorId = result[0].id;

        // Record purchase transaction
        await sql`
      INSERT INTO transactions (type, entity_type, entity_id, amount, party_name, date, description)
      VALUES ('purchase', 'tractor', ${tractorId}, ${body.purchase_price || 0}, 
              ${body.supplier_name || ''}, ${purchaseDate}, 
              ${body.brand + ' ' + body.model + ' purchase'})
    `;

        // Fetch the created tractor
        const tractors = await sql`
      SELECT id, brand, model, year, type, chassis_number, engine_number,
             purchase_price, COALESCE(sale_price, 0) as sale_price, status, supplier_name, 
             purchase_date, COALESCE(sale_date::text, '') as sale_date, 
             COALESCE(customer_name, '') as customer_name, 
             COALESCE(notes, '') as notes, exchange_tractor_id
      FROM tractors WHERE id = ${tractorId}
    `;

        return jsonResponse(tractors[0], 201);
    } catch (error) {
        console.error('Create tractor error:', error);
        return errorResponse('internal server error', 500);
    }
}
