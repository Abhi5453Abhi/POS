import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';

interface RouteContext {
    params: Promise<{ id: string }>;
}

// PUT /api/parts/names/[id] - Update part name
export async function PUT(request: NextRequest, { params }: RouteContext) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) return authResult;

        const { id } = await params;
        const body = await request.json();
        if (!body.name) return errorResponse('part name is required', 400);

        const result = await sql`
            UPDATE part_names
            SET name = ${body.name}
            WHERE id = ${id}
            RETURNING id, category_id, name
        `;

        if (result.length === 0) return errorResponse('part name not found', 404);

        return jsonResponse(result[0]);
    } catch (error) {
        console.error('Update part name error:', error);
        return errorResponse('internal server error', 500);
    }
}

// DELETE /api/parts/names/[id] - Delete part name
export async function DELETE(request: NextRequest, { params }: RouteContext) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) return authResult;

        const { id } = await params;

        await sql`DELETE FROM part_names WHERE id = ${id}`;

        return jsonResponse({ message: 'part name deleted' });
    } catch (error) {
        console.error('Delete part name error:', error);
        return errorResponse('internal server error', 500);
    }
}
