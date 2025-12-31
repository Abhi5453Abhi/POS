import { neon } from '@neondatabase/serverless';

// Get the database URL from environment
const getDatabaseUrl = () => {
    const url = process.env.DATABASE_URL;
    if (!url) {
        throw new Error('DATABASE_URL environment variable is required');
    }
    return url;
};

// Create a SQL query function
export const sql = neon(getDatabaseUrl());

// Helper to format date for PostgreSQL
export const formatDate = (date?: Date): string => {
    const d = date || new Date();
    return d.toISOString().split('T')[0];
};

// Helper to format datetime for PostgreSQL
export const formatDateTime = (date?: Date): string => {
    const d = date || new Date();
    return d.toISOString().replace('T', ' ').split('.')[0];
};
