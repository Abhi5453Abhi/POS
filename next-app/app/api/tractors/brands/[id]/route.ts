import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';

interface RouteContext {
    params: Promise<{ id: string }>;
}

// PUT /api/tractors/brands/[id] - Update brand
export async function PUT(request: NextRequest, { params }: RouteContext) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) return authResult;

        const { id } = await params;
        const body = await request.json();
        if (!body.name) return errorResponse('brand name is required', 400);

        const result = await sql`
            UPDATE tractor_brands
            SET name = ${body.name}
            WHERE id = ${id}
            RETURNING id, name
        `;

        if (result.length === 0) return errorResponse('brand not found', 404);

        return jsonResponse(result[0]);
    } catch (error) {
        console.error('Update brand error:', error);
        return errorResponse('internal server error', 500);
    }
}

// DELETE /api/tractors/brands/[id] - Delete brand
export async function DELETE(request: NextRequest, { params }: RouteContext) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) return authResult;

        const { id } = await params;

        // Models will be deleted automatically if ON DELETE CASCADE is set, 
        // but we should check if we need to manually handle it.
        // Based on GOPG repo, we just run the delete.
        await sql`DELETE FROM tractor_brands WHERE id = ${id}`;

        return jsonResponse({ message: 'brand deleted' });
    } catch (error) {
        console.error('Delete brand error:', error);
        return errorResponse('internal server error', 500);
    }
}
