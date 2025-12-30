import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api';
import type { DashboardData } from '../types';
import { Tractor, Package, Receipt, TrendingUp, AlertTriangle } from 'lucide-react';

export function Dashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            const result = await dashboardApi.get();
            setData(result);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    const stats = [
        {
            label: 'Tractors in Stock',
            value: data?.tractors_in_stock || 0,
            icon: Tractor,
            color: 'emerald',
            bgGradient: 'from-primary/20 to-teal-500/20',
            iconBg: 'bg-primary/20',
            iconColor: 'text-primary',
            link: '/tractors',
        },
        {
            label: 'Low Stock Parts',
            value: data?.low_stock_parts || 0,
            icon: Package,
            color: 'amber',
            bgGradient: 'from-amber-500/20 to-orange-500/20',
            iconBg: 'bg-amber-500/20',
            iconColor: 'text-amber-400',
            link: '/parts',
        },
        {
            label: 'Total Sales',
            value: `₹${(data?.total_sales || 0).toLocaleString()}`,
            icon: TrendingUp,
            color: 'blue',
            bgGradient: 'from-blue-500/20 to-indigo-500/20',
            iconBg: 'bg-blue-500/20',
            iconColor: 'text-blue-400',
            link: '/reports',
        },
        {
            label: 'Total Expenses',
            value: `₹${(data?.total_expenses || 0).toLocaleString()}`,
            icon: Receipt,
            color: 'purple',
            bgGradient: 'from-purple-500/20 to-pink-500/20',
            iconBg: 'bg-purple-500/20',
            iconColor: 'text-purple-400',
            link: '/reports',
        },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
                <p className="text-slate-400 mt-1">Welcome back! Here's what's happening today.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Link
                            key={stat.label}
                            to={stat.link}
                            className={`glass-card relative overflow-hidden bg-gradient-to-br ${stat.bgGradient} p-6 transition-all hover:scale-[1.02] hover:shadow-2xl cursor-pointer block group border-white/5`}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-slate-400 text-sm font-medium group-hover:text-slate-300 transition-colors">{stat.label}</p>
                                    <p className="text-3xl font-bold text-white mt-2">{stat.value}</p>
                                </div>
                                <div className={`${stat.iconBg} p-3 rounded-xl transition-all group-hover:scale-110 shadow-lg`}>
                                    <Icon className={stat.iconColor} size={24} />
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Recent Expenses */}
            <div className="glass-card rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Receipt size={20} className="text-primary" />
                        Recent Expenses
                    </h2>
                </div>
                <div className="p-6">
                    {data?.recent_expenses && data.recent_expenses.length > 0 ? (
                        <div className="space-y-3">
                            {data.recent_expenses.map((expense) => (
                                <div
                                    key={expense.id}
                                    className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${expense.category === 'salary' ? 'bg-blue-500/20 text-blue-400' :
                                            expense.category === 'rent' ? 'bg-purple-500/20 text-purple-400' :
                                                expense.category === 'bill' ? 'bg-amber-500/20 text-amber-400' :
                                                    'bg-slate-500/20 text-slate-400'
                                            }`}>
                                            <Receipt size={18} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">{expense.description}</p>
                                            <p className="text-sm text-slate-400 capitalize">{expense.category}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-white">₹{expense.amount.toLocaleString()}</p>
                                        <p className="text-sm text-slate-400 font-mono">{expense.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <AlertTriangle className="mx-auto text-slate-500 mb-3" size={40} />
                            <p className="text-slate-400">No recent expenses</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
