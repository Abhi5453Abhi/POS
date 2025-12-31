import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { JWTClaims, Role } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const TOKEN_EXPIRY = '24h';

// Generate JWT token
export const signToken = (payload: { user_id: number; username: string; role: Role }): string => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
};

// Verify JWT token
export const verifyToken = (token: string): JWTClaims | null => {
    try {
        return jwt.verify(token, JWT_SECRET) as JWTClaims;
    } catch {
        return null;
    }
};

// Hash password using bcrypt
export const hashPassword = async (password: string): Promise<string> => {
    return bcrypt.hash(password, 10);
};

// Compare password with hash
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(password, hash);
};

// Extract user from Authorization header
export const getAuthUser = (request: NextRequest): JWTClaims | null => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
        return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }

    return verifyToken(parts[1]);
};

// JSON response helper
export const jsonResponse = (data: unknown, status = 200) => {
    return Response.json(data, { status });
};

// Error response helper
export const errorResponse = (message: string, status = 400) => {
    return Response.json({ error: message }, { status });
};

// Require authentication middleware helper
export const requireAuth = (request: NextRequest): JWTClaims | Response => {
    const user = getAuthUser(request);
    if (!user) {
        return errorResponse('unauthorized', 401);
    }
    return user;
};

// Require specific role
export const requireRole = (request: NextRequest, allowedRoles: Role[]): JWTClaims | Response => {
    const result = requireAuth(request);
    if (result instanceof Response) {
        return result;
    }

    if (!allowedRoles.includes(result.role)) {
        return errorResponse('insufficient permissions', 403);
    }

    return result;
};
