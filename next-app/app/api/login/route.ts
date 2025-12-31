import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { comparePassword, signToken, jsonResponse, errorResponse } from '@/lib/auth';
import { LoginRequest, User } from '@/lib/types';

export async function POST(request: NextRequest) {
    try {
        const body: LoginRequest = await request.json();

        if (!body.username || !body.password) {
            return errorResponse('username and password are required', 400);
        }

        // Get user from database
        const users = await sql`
      SELECT id, username, password_hash, full_name, role, created_at 
      FROM users 
      WHERE username = ${body.username}
    `;

        if (users.length === 0) {
            return errorResponse('invalid username or password', 401);
        }

        const user = users[0] as User & { password_hash: string };

        // Verify password
        const valid = await comparePassword(body.password, user.password_hash);
        if (!valid) {
            return errorResponse('invalid username or password', 401);
        }

        // Generate token
        const token = signToken({
            user_id: user.id,
            username: user.username,
            role: user.role,
        });

        const expireAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

        // Return response without password_hash
        const { password_hash: _, ...userWithoutPassword } = user;

        return jsonResponse({
            token,
            user: userWithoutPassword,
            expire_at: expireAt,
        });
    } catch (error) {
        console.error('Login error:', error);
        return errorResponse('internal server error', 500);
    }
}
