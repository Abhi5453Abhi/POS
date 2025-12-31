'use client';

import { Parts } from '@/src/views/Parts';
import Layout from '@/src/components/Layout';
import ProtectedRoute from '@/src/components/ProtectedRoute';

export default function PartsPage() {
    return (
        <ProtectedRoute>
            <Layout>
                <Parts />
            </Layout>
        </ProtectedRoute>
    );
}
