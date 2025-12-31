'use client';

import { Expenses } from '@/src/views/Expenses';
import Layout from '@/src/components/Layout';
import ProtectedRoute from '@/src/components/ProtectedRoute';

export default function ExpensesPage() {
    return (
        <ProtectedRoute>
            <Layout>
                <Expenses />
            </Layout>
        </ProtectedRoute>
    );
}
