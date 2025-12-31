import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';
import { PartUsage } from '@/lib/types';

// GET /api/services/[id] - Get single service
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
        const serviceId = parseInt(id);
        if (isNaN(serviceId)) {
            return errorResponse('invalid service id', 400);
        }

        const services = await sql`
      SELECT id, tractor_id, customer_name, description, labor_cost, parts_cost, total_cost, 
             COALESCE(parts_used, '') as parts_used, service_date, status
      FROM service_records WHERE id = ${serviceId}
    `;

        if (services.length === 0) {
            return errorResponse('service not found', 404);
        }

        return jsonResponse(services[0]);
    } catch (error) {
        console.error('Get service error:', error);
        return errorResponse('internal server error', 500);
    }
}

// PUT /api/services/[id] - Update service
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
        const serviceId = parseInt(id);
        if (isNaN(serviceId)) {
            return errorResponse('invalid service id', 400);
        }

        const body = await request.json();

        let partsCost = body.parts_cost || 0;

        // Parse parts_used and recalculate parts cost
        if (body.parts_used) {
            try {
                const partsUsed: PartUsage[] = typeof body.parts_used === 'string'
                    ? JSON.parse(body.parts_used)
                    : body.parts_used;

                let calculatedPartsCost = 0;
                for (const partUsage of partsUsed) {
                    calculatedPartsCost += partUsage.unit_price * partUsage.quantity;
                }

                if (partsCost === 0 || calculatedPartsCost > 0) {
                    partsCost = calculatedPartsCost;
                }
            } catch (e) {
                // Ignore parse errors
            }
        }

        const totalCost = (body.labor_cost || 0) + partsCost;
        const partsUsedJson = typeof body.parts_used === 'string'
            ? body.parts_used
            : JSON.stringify(body.parts_used || []);

        await sql`
      UPDATE service_records SET 
        tractor_id = ${body.tractor_id || null},
        customer_name = ${body.customer_name},
        description = ${body.description},
        labor_cost = ${body.labor_cost || 0},
        parts_cost = ${partsCost},
        total_cost = ${totalCost},
        parts_used = ${partsUsedJson},
        service_date = ${body.service_date},
        status = ${body.status || 'completed'}
      WHERE id = ${serviceId}
    `;

        const services = await sql`
      SELECT id, tractor_id, customer_name, description, labor_cost, parts_cost, total_cost, 
             COALESCE(parts_used, '') as parts_used, service_date, status
      FROM service_records WHERE id = ${serviceId}
    `;

        if (services.length === 0) {
            return errorResponse('service not found', 404);
        }

        return jsonResponse(services[0]);
    } catch (error) {
        console.error('Update service error:', error);
        return errorResponse('internal server error', 500);
    }
}

// DELETE /api/services/[id] - Delete service
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
        const serviceId = parseInt(id);
        if (isNaN(serviceId)) {
            return errorResponse('invalid service id', 400);
        }

        await sql`DELETE FROM service_records WHERE id = ${serviceId}`;

        return jsonResponse({ message: 'service deleted' });
    } catch (error) {
        console.error('Delete service error:', error);
        return errorResponse('internal server error', 500);
    }
}
