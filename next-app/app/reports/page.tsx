'use client';

import { Reports } from '@/src/views/Reports';
import Layout from '@/src/components/Layout';
import ProtectedRoute from '@/src/components/ProtectedRoute';

export default function ReportsPage() {
    return (
        <ProtectedRoute>
            <Layout>
                <Reports />
            </Layout>
        </ProtectedRoute>
    );
}
