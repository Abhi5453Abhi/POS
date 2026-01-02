import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';

interface RouteContext {
    params: Promise<{ id: string }>;
}

// PUT /api/tractors/models/[id] - Update model
export async function PUT(request: NextRequest, { params }: RouteContext) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) return authResult;

        const { id } = await params;
        const body = await request.json();
        if (!body.name) return errorResponse('model name is required', 400);

        const result = await sql`
            UPDATE tractor_models
            SET name = ${body.name}
            WHERE id = ${id}
            RETURNING id, brand_id, name
        `;

        if (result.length === 0) return errorResponse('model not found', 404);

        return jsonResponse(result[0]);
    } catch (error) {
        console.error('Update model error:', error);
        return errorResponse('internal server error', 500);
    }
}

// DELETE /api/tractors/models/[id] - Delete model
export async function DELETE(request: NextRequest, { params }: RouteContext) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) return authResult;

        const { id } = await params;

        await sql`DELETE FROM tractor_models WHERE id = ${id}`;

        return jsonResponse({ message: 'model deleted' });
    } catch (error) {
        console.error('Delete model error:', error);
        return errorResponse('internal server error', 500);
    }
}
