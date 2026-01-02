import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';

interface RouteContext {
    params: Promise<{ id: string }>;
}

// PUT /api/parts/categories/[id] - Update category
export async function PUT(request: NextRequest, { params }: RouteContext) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) return authResult;

        const { id } = await params;
        const body = await request.json();
        if (!body.name) return errorResponse('category name is required', 400);

        const result = await sql`
            UPDATE part_categories
            SET name = ${body.name}
            WHERE id = ${id}
            RETURNING id, name
        `;

        if (result.length === 0) return errorResponse('category not found', 404);

        return jsonResponse(result[0]);
    } catch (error) {
        console.error('Update category error:', error);
        return errorResponse('internal server error', 500);
    }
}

// DELETE /api/parts/categories/[id] - Delete category
export async function DELETE(request: NextRequest, { params }: RouteContext) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) return authResult;

        const { id } = await params;

        await sql`DELETE FROM part_categories WHERE id = ${id}`;

        return jsonResponse({ message: 'category deleted' });
    } catch (error) {
        console.error('Delete category error:', error);
        return errorResponse('internal server error', 500);
    }
}
