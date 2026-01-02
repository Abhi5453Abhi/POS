import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';

// GET /api/tractors/models - List models for a brand
export async function GET(request: NextRequest) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) return authResult;

        const { searchParams } = new URL(request.url);
        const brandId = searchParams.get('brand_id');

        if (!brandId) return errorResponse('brand_id is required', 400);

        const models = await sql`
            SELECT id, brand_id, name 
            FROM tractor_models 
            WHERE brand_id = ${brandId}
            ORDER BY name
        `;
        return jsonResponse(models);
    } catch (error) {
        console.error('List models error:', error);
        return errorResponse('internal server error', 500);
    }
}

// POST /api/tractors/models - Create a new model
export async function POST(request: NextRequest) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) return authResult;

        const body = await request.json();
        if (!body.brand_id || !body.name) {
            return errorResponse('brand_id and name are required', 400);
        }

        const result = await sql`
            INSERT INTO tractor_models (brand_id, name)
            VALUES (${body.brand_id}, ${body.name})
            RETURNING id, brand_id, name
        `;

        return jsonResponse(result[0], 201);
    } catch (error) {
        console.error('Create model error:', error);
        return errorResponse('internal server error', 500);
    }
}
