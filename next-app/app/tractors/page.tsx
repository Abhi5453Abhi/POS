'use client';

import { Tractors } from '@/src/views/Tractors';
import Layout from '@/src/components/Layout';
import ProtectedRoute from '@/src/components/ProtectedRoute';

export default function TractorsPage() {
    return (
        <ProtectedRoute>
            <Layout>
                <Tractors />
            </Layout>
        </ProtectedRoute>
    );
}
