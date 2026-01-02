import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';

// GET /api/parts/names - List part names for a category
export async function GET(request: NextRequest) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) return authResult;

        const { searchParams } = new URL(request.url);
        const categoryId = searchParams.get('category_id');

        if (!categoryId) return errorResponse('category_id is required', 400);

        const names = await sql`
            SELECT id, category_id, name 
            FROM part_names 
            WHERE category_id = ${categoryId}
            ORDER BY name
        `;
        return jsonResponse(names);
    } catch (error) {
        console.error('List part names error:', error);
        return errorResponse('internal server error', 500);
    }
}

// POST /api/parts/names - Create part name
export async function POST(request: NextRequest) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) return authResult;

        const body = await request.json();
        if (!body.category_id || !body.name) {
            return errorResponse('category_id and name are required', 400);
        }

        const result = await sql`
            INSERT INTO part_names (category_id, name)
            VALUES (${body.category_id}, ${body.name})
            RETURNING id, category_id, name
        `;

        return jsonResponse(result[0], 201);
    } catch (error) {
        console.error('Create part name error:', error);
        return errorResponse('internal server error', 500);
    }
}
