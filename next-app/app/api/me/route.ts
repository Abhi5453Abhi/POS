import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth, jsonResponse, errorResponse } from '@/lib/auth';
import { User } from '@/lib/types';

export async function GET(request: NextRequest) {
    try {
        const authResult = requireAuth(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        // Get user from database
        const users = await sql`
      SELECT id, username, full_name, role, created_at 
      FROM users 
      WHERE id = ${authResult.user_id}
    `;

        if (users.length === 0) {
            return errorResponse('user not found', 404);
        }

        return jsonResponse(users[0] as User);
    } catch (error) {
        console.error('Get current user error:', error);
        return errorResponse('internal server error', 500);
    }
}
