'use client';

import { Services } from '@/src/views/Services';
import Layout from '@/src/components/Layout';
import ProtectedRoute from '@/src/components/ProtectedRoute';

export default function ServicesPage() {
    return (
        <ProtectedRoute>
            <Layout>
                <Services />
            </Layout>
        </ProtectedRoute>
    );
}
