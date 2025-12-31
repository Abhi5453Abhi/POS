import { NextRequest } from 'next/server';
import { sql, formatDate } from '@/lib/db';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';
import { ServiceRecord, PartUsage } from '@/lib/types';

// GET /api/services - List services
export async function GET(request: NextRequest) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');

        let services;
        if (startDate && endDate) {
            services = await sql`
        SELECT id, tractor_id, customer_name, description, labor_cost, parts_cost, total_cost, 
               COALESCE(parts_used, '') as parts_used, service_date, status
        FROM service_records 
        WHERE service_date >= ${startDate} AND service_date <= ${endDate}
        ORDER BY service_date DESC
      `;
        } else if (startDate) {
            services = await sql`
        SELECT id, tractor_id, customer_name, description, labor_cost, parts_cost, total_cost, 
               COALESCE(parts_used, '') as parts_used, service_date, status
        FROM service_records 
        WHERE service_date >= ${startDate}
        ORDER BY service_date DESC
      `;
        } else if (endDate) {
            services = await sql`
        SELECT id, tractor_id, customer_name, description, labor_cost, parts_cost, total_cost, 
               COALESCE(parts_used, '') as parts_used, service_date, status
        FROM service_records 
        WHERE service_date <= ${endDate}
        ORDER BY service_date DESC
      `;
        } else {
            services = await sql`
        SELECT id, tractor_id, customer_name, description, labor_cost, parts_cost, total_cost, 
               COALESCE(parts_used, '') as parts_used, service_date, status
        FROM service_records 
        ORDER BY service_date DESC
      `;
        }

        return jsonResponse(services);
    } catch (error) {
        console.error('List services error:', error);
        return errorResponse('internal server error', 500);
    }
}

// POST /api/services - Create service
export async function POST(request: NextRequest) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        const body = await request.json();

        if (!body.customer_name || !body.description) {
            return errorResponse('customer_name and description are required', 400);
        }

        let partsCost = body.parts_cost || 0;

        // Parse parts_used and update stock
        if (body.parts_used) {
            try {
                const partsUsed: PartUsage[] = typeof body.parts_used === 'string'
                    ? JSON.parse(body.parts_used)
                    : body.parts_used;

                let calculatedPartsCost = 0;
                for (const partUsage of partsUsed) {
                    calculatedPartsCost += partUsage.unit_price * partUsage.quantity;

                    // Get part and update stock
                    const parts = await sql`
            SELECT id, name, stock_quantity FROM spare_parts WHERE id = ${partUsage.part_id}
          `;

                    if (parts.length === 0) {
                        return errorResponse(`part not found: ${partUsage.name}`, 400);
                    }

                    const part = parts[0];
                    if (Number(part.stock_quantity) < partUsage.quantity) {
                        return errorResponse(`insufficient stock for part: ${partUsage.name}`, 400);
                    }

                    const newQuantity = Number(part.stock_quantity) - partUsage.quantity;
                    await sql`
            UPDATE spare_parts SET stock_quantity = ${newQuantity}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ${partUsage.part_id}
          `;
                }

                if (partsCost === 0 || calculatedPartsCost > 0) {
                    partsCost = calculatedPartsCost;
                }
            } catch (e) {
                // Ignore parse errors
            }
        }

        const totalCost = (body.labor_cost || 0) + partsCost;
        const serviceDate = body.service_date || formatDate();
        const partsUsedJson = typeof body.parts_used === 'string'
            ? body.parts_used
            : JSON.stringify(body.parts_used || []);

        const result = await sql`
      INSERT INTO service_records (tractor_id, customer_name, description, labor_cost, parts_cost, 
                                   total_cost, parts_used, service_date, status)
      VALUES (${body.tractor_id || null}, ${body.customer_name}, ${body.description}, 
              ${body.labor_cost || 0}, ${partsCost}, ${totalCost}, ${partsUsedJson}, 
              ${serviceDate}, 'completed')
      RETURNING id
    `;

        const serviceId = result[0].id;

        // Record service transaction
        await sql`
      INSERT INTO transactions (type, entity_type, entity_id, amount, party_name, date, description)
      VALUES ('sale', 'service', ${serviceId}, ${totalCost}, ${body.customer_name}, 
              ${serviceDate}, ${'Service: ' + body.description})
    `;

        // Fetch the created service
        const services = await sql`
      SELECT id, tractor_id, customer_name, description, labor_cost, parts_cost, total_cost, 
             COALESCE(parts_used, '') as parts_used, service_date, status
      FROM service_records WHERE id = ${serviceId}
    `;

        return jsonResponse(services[0], 201);
    } catch (error) {
        console.error('Create service error:', error);
        return errorResponse('internal server error', 500);
    }
}
