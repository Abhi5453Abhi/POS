import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';

// GET /api/tractors/brands - List all brands
export async function GET(request: NextRequest) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) return authResult;

        const brands = await sql`SELECT id, name FROM tractor_brands ORDER BY name`;
        return jsonResponse(brands);
    } catch (error) {
        console.error('List brands error:', error);
        return errorResponse('internal server error', 500);
    }
}

// POST /api/tractors/brands - Create a new brand
export async function POST(request: NextRequest) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) return authResult;

        const body = await request.json();
        if (!body.name) return errorResponse('brand name is required', 400);

        // Check if brand already exists
        const existing = await sql`SELECT id, name FROM tractor_brands WHERE name ILIKE ${body.name}`;
        if (existing.length > 0) {
            return jsonResponse(existing[0], 200);
        }

        const result = await sql`
            INSERT INTO tractor_brands (name)
            VALUES (${body.name})
            RETURNING id, name
        `;

        return jsonResponse(result[0], 201);
    } catch (error) {
        console.error('Create brand error:', error);
        return errorResponse('internal server error', 500);
    }
}
