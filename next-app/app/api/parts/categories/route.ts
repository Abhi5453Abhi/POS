import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';

// GET /api/parts/categories - List categories
export async function GET(request: NextRequest) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) return authResult;

        const categories = await sql`SELECT id, name FROM part_categories ORDER BY name`;
        return jsonResponse(categories);
    } catch (error) {
        console.error('List categories error:', error);
        return errorResponse('internal server error', 500);
    }
}

// POST /api/parts/categories - Create category
export async function POST(request: NextRequest) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) return authResult;

        const body = await request.json();
        if (!body.name) return errorResponse('category name is required', 400);

        // Check if category already exists
        const existing = await sql`SELECT id, name FROM part_categories WHERE name ILIKE ${body.name}`;
        if (existing.length > 0) {
            return jsonResponse(existing[0], 200);
        }

        const result = await sql`
            INSERT INTO part_categories (name)
            VALUES (${body.name})
            RETURNING id, name
        `;

        return jsonResponse(result[0], 201);
    } catch (error) {
        console.error('Create category error:', error);
        return errorResponse('internal server error', 500);
    }
}
