'use client';

import { Dashboard } from '@/src/views/Dashboard';
import Layout from '@/src/components/Layout';
import ProtectedRoute from '@/src/components/ProtectedRoute';

export default function DashboardPage() {
    return (
        <ProtectedRoute>
            <Layout>
                <Dashboard />
            </Layout>
        </ProtectedRoute>
    );
}
