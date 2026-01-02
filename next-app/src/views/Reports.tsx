'use client';

import { useEffect, useState } from 'react';
import { expenseApi, tractorApi, serviceApi, partsApi } from '@/src/api';
import type { Expense, Tractor, ServiceRecord, SparePart } from '@/src/types';
import {
    Package,
    Wrench,
    Activity,
    TrendingUp,
    DollarSign,
    Tractor as TractorIcon,
    ArrowDownRight,
    Search,
    X
} from 'lucide-react';

interface TractorJourney {
    tractor: Tractor;
    repairCost: number;
    totalCost: number; // Purchase + Repair
    profit: number | null; // Null if not sold
}

type ReportTab = 'overview' | 'tractors' | 'services' | 'parts' | 'expenses';

export function Reports() {
    const [activeTab, setActiveTab] = useState<ReportTab>('overview');
    const [isLoading, setIsLoading] = useState(true);

    // Data States
    const [tractors, setTractors] = useState<Tractor[]>([]);
    const [services, setServices] = useState<ServiceRecord[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [parts, setParts] = useState<SparePart[]>([]);

    // Breakdown State
    const [breakdownType, setBreakdownType] = useState<'net-profit' | 'tractor-profit' | 'service-revenue' | null>(null);

    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [tractorsData, servicesData, expensesData, partsData] = await Promise.all([
                tractorApi.list(),
                serviceApi.list(),
                expenseApi.list(),
                partsApi.list()
            ]);
            setTractors(tractorsData || []);
            setServices(servicesData || []);
            setExpenses(expensesData || []);
            setParts(partsData || []);
        } catch (error) {
            console.error('Failed to load reports:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Calculations ---

    // 1. Tractor Journey Data
    const journeyData: TractorJourney[] = tractors.map(tractor => {
        // Services linked to this tractor
        const tractorServices = services.filter(s => {
            if (s.tractor_id !== tractor.id) return false;
            // Internal Cost Logic:
            // If tractor is sold, services BEFORE sale are costs.
            // If tractor is in stock, all services are costs.
            if (tractor.status === 'sold' && tractor.sale_date) {
                return s.service_date <= tractor.sale_date;
            }
            return true;
        });

        const repairCost = tractorServices.reduce((sum, s) => sum + s.total_cost, 0);
        const totalCost = tractor.purchase_price + repairCost;

        let profit = null;
        if (tractor.status === 'sold' && tractor.sale_price) {
            profit = tractor.sale_price - totalCost;
        }

        return { tractor, repairCost, totalCost, profit };
    });

    // 2. Service Financials (External Services)
    // Services that are NOT internal tractor costs (i.e., Customer Services or Post-Sale Services)
    const externalServices = services.filter(s => {
        if (!s.tractor_id) return true; // No tractor linked = Customer Service

        const tractor = tractors.find(t => t.id === s.tractor_id);
        if (!tractor) return true; // Unknown tractor = Customer Service

        // If tractor is sold, services AFTER sale are External (Customer) -> Revenue
        if (tractor.status === 'sold' && tractor.sale_date) {
            return s.service_date > tractor.sale_date;
        }

        // If tractor is In Stock, services are Internal -> Investment (Not Revenue)
        if (tractor.status === 'in_stock') return false;

        return true;
    });

    const totalServiceRevenue = externalServices.reduce((sum, s) => sum + s.total_cost, 0);
    const totalServicePartsCost = externalServices.reduce((sum, s) => sum + s.parts_cost, 0);
    const totalServiceLaborRevenue = externalServices.reduce((sum, s) => sum + s.labor_cost, 0);
    // Assuming Labor is pure profit and Parts are reimbursed at cost (or margin included in price)
    // For net profit overview, we take the full service Revenue contribution

    // 3. Parts Financials
    const totalInventoryValue = parts.reduce((sum, p) => sum + (p.stock_quantity * p.unit_price), 0);
    const lowStockCount = parts.filter(p => p.stock_quantity <= p.min_stock).length;

    // 4. General Expenses
    const totalGeneralExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const expensesByCategory = expenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
    }, {} as Record<string, number>);

    // 5. Consolidated Overview
    const totalTractorProfit = journeyData
        .filter(j => j.tractor.status === 'sold')
        .reduce((sum, j) => sum + (j.profit || 0), 0);

    // Business Net Profit = (Tractor Profits + Service Revenue) - (General Expenses)
    // Note: 'Service Revenue' includes parts cost reimbursement. 
    // Ideally: Net Profit = Tractor Profit + Service Labor + (Service Parts Margin) - Expenses.
    // If we assume parts are sold at cost, then Service Profit = Labor.
    // Let's define Net Business Profit = Tractor Profit + Service Labor Revenue - General Expenses.
    // (Assuming Parts Cost is passthrough).
    const netBusinessProfit = totalTractorProfit + totalServiceLaborRevenue - totalGeneralExpenses;

    // --- Render Helpers ---

    const formatCurrency = (amount: number) =>
        `\u20B9${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    const getBreakdownData = (): BreakdownData | null => {
        if (!breakdownType) return null;

        if (breakdownType === 'net-profit') {
            const soldTractors = journeyData.filter(j => j.tractor.status === 'sold');
            const tractorItems = soldTractors.map(j => ({
                label: `${j.tractor.brand} ${j.tractor.model}`,
                subLabel: `VIN: ${j.tractor.chassis_number}`,
                amount: j.profit || 0,
                type: (j.profit || 0) >= 0 ? 'positive' as const : 'negative' as const
            }));

            const serviceItems = externalServices.map(s => ({
                label: `${s.description}`,
                subLabel: `${s.customer_name || 'Unknown'} • ${s.service_date}`,
                amount: s.labor_cost,
                type: 'positive' as const
            }));

            const expenseItems = expenses.map(e => ({
                label: `${e.description}`,
                subLabel: `${e.category} • ${e.date}`,
                amount: e.amount,
                type: 'negative' as const
            }));

            return {
                title: 'Net Profit Statement',
                sections: [
                    {
                        title: 'Revenue from Tractor Sales',
                        items: tractorItems,
                        subtotal: totalTractorProfit,
                        type: 'income'
                    },
                    {
                        title: 'Revenue from Services (Labor)',
                        items: serviceItems,
                        subtotal: totalServiceLaborRevenue,
                        type: 'income'
                    },
                    {
                        title: 'Less: Operating Expenses',
                        items: expenseItems,
                        subtotal: totalGeneralExpenses,
                        type: 'expense'
                    }
                ],
                total: netBusinessProfit
            };
        }

        if (breakdownType === 'tractor-profit') {
            const soldTractors = journeyData.filter(j => j.tractor.status === 'sold');
            return {
                title: 'Tractor Profit Breakdown',
                sections: [{
                    title: 'Sold Stock',
                    items: soldTractors.map(j => ({
                        label: `${j.tractor.brand} ${j.tractor.model}`,
                        subLabel: `VIN: ${j.tractor.chassis_number}`,
                        amount: j.profit || 0,
                        type: (j.profit || 0) >= 0 ? 'positive' : 'negative'
                    })),
                    subtotal: totalTractorProfit,
                    type: 'income'
                }],
                total: totalTractorProfit
            };
        }

        if (breakdownType === 'service-revenue') {
            return {
                title: 'Service Revenue Breakdown',
                sections: [{
                    title: 'Service Records',
                    items: externalServices.map(s => ({
                        label: s.description,
                        subLabel: `${s.customer_name || 'Unknown'} • ${s.service_date}`,
                        amount: s.total_cost,
                        type: 'positive'
                    })),
                    subtotal: totalServiceRevenue,
                    type: 'income'
                }],
                total: totalServiceRevenue
            };
        }
        return null;
    };

    const TabButton = ({ id, label, icon: Icon }: { id: ReportTab, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === id
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
        >
            <Icon size={18} />
            <span className="hidden sm:inline">{label}</span>
        </button>
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header & Tabs */}
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-white">Financial Reports</h1>
                    <p className="text-slate-400 mt-1">Comprehensive overview of agency performance</p>
                </div>

                <div className="flex flex-wrap gap-2 bg-slate-800/50 p-1.5 rounded-2xl border border-slate-700/50 backdrop-blur-sm overflow-x-auto">
                    <TabButton id="overview" label="Overview" icon={Activity} />
                    <TabButton id="tractors" label="Tractors" icon={TractorIcon} />
                    <TabButton id="services" label="Services" icon={Wrench} />
                    <TabButton id="parts" label="Parts" icon={Package} />
                    <TabButton id="expenses" label="Expenses" icon={DollarSign} />
                </div>
            </div>

            {/* TAB: OVERVIEW */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div
                            onClick={() => setBreakdownType('net-profit')}
                            className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 cursor-pointer hover:bg-slate-800 transition-colors group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Search size={16} className="text-slate-500" />
                            </div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                                    <TrendingUp size={20} />
                                </div>
                                <span className="text-slate-400 text-sm font-medium">Net Profit</span>
                            </div>
                            <div className={`text-2xl font-bold ${netBusinessProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {formatCurrency(netBusinessProfit)}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">Tractor Sales + Service Labor - Expenses</div>
                        </div>

                        <div
                            onClick={() => setBreakdownType('tractor-profit')}
                            className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 cursor-pointer hover:bg-slate-800 transition-colors group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Search size={16} className="text-slate-500" />
                            </div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                                    <TractorIcon size={20} />
                                </div>
                                <span className="text-slate-400 text-sm font-medium">Tractor Profit</span>
                            </div>
                            <div className="text-2xl font-bold text-white">
                                {formatCurrency(totalTractorProfit)}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">{journeyData.filter(j => j.tractor.status === 'sold').length} Tractors Sold</div>
                        </div>

                        <div
                            onClick={() => setBreakdownType('service-revenue')}
                            className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 cursor-pointer hover:bg-slate-800 transition-colors group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Search size={16} className="text-slate-500" />
                            </div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400">
                                    <Wrench size={20} />
                                </div>
                                <span className="text-slate-400 text-sm font-medium">Service Revenue</span>
                            </div>
                            <div className="text-2xl font-bold text-white">
                                {formatCurrency(totalServiceRevenue)}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">Include Parts + Labor</div>
                        </div>

                        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
                                    <ArrowDownRight size={20} />
                                </div>
                                <span className="text-slate-400 text-sm font-medium">Total Expenses</span>
                            </div>
                            <div className="text-2xl font-bold text-white">
                                {formatCurrency(totalGeneralExpenses)}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">Rent, Salaries, Bills, Misc</div>
                        </div>
                    </div>

                    {/* Breakdown Modal */}
                    {breakdownType && (
                        <BreakdownModal
                            data={getBreakdownData()}
                            onClose={() => setBreakdownType(null)}
                            formatCurrency={formatCurrency}
                        />
                    )}

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Package size={18} className="text-purple-400" />
                                Inventory Status
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl">
                                    <span className="text-slate-400">Parts Value</span>
                                    <span className="text-white font-mono font-medium">{formatCurrency(totalInventoryValue)}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl">
                                    <span className="text-slate-400">Tractors In Stock</span>
                                    <span className="text-white font-mono font-medium">
                                        {tractors.filter(t => t.status === 'in_stock').length}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl">
                                    <span className="text-slate-400">Low Stock Parts</span>
                                    <span className={`font-mono font-medium ${lowStockCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        {lowStockCount} Items
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <DollarSign size={18} className="text-red-400" />
                                Expense Breakdown
                            </h3>
                            <div className="space-y-3">
                                {Object.entries(expensesByCategory).map(([cat, amount]) => (
                                    <div key={cat} className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-1">
                                                <span className="text-sm text-slate-400 capitalize">{cat}</span>
                                                <span className="text-sm text-white">{formatCurrency(amount)}</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-red-500/60 rounded-full"
                                                    style={{ width: `${(amount / totalGeneralExpenses) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: TRACTORS */}
            {activeTab === 'tractors' && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-slate-700 flex flex-col sm:flex-row justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search tractors..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            Showing {journeyData.length} records
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-700 bg-slate-800/80">
                                    <th className="p-4 font-medium text-slate-400">Tractor</th>
                                    <th className="p-4 font-medium text-slate-400 text-right">Purchase + Repair</th>
                                    <th className="p-4 font-medium text-slate-400 text-right">Sale Price</th>
                                    <th className="p-4 font-medium text-slate-400 text-right">Profit</th>
                                    <th className="p-4 font-medium text-slate-400 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {journeyData
                                    .filter(j =>
                                        j.tractor.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        j.tractor.model.toLowerCase().includes(searchTerm.toLowerCase())
                                    )
                                    .map((journey) => (
                                        <tr key={journey.tractor.id} className="hover:bg-slate-700/20 transition-colors">
                                            <td className="p-4">
                                                <div className="font-medium text-white">
                                                    {journey.tractor.brand} {journey.tractor.model}
                                                </div>
                                                <div className="text-xs text-slate-500 font-mono mt-0.5">
                                                    {journey.tractor.chassis_number}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="text-slate-300">{formatCurrency(journey.totalCost)}</div>
                                                <div className="text-xs text-slate-500" title="Repair Cost">
                                                    (Repairs: {formatCurrency(journey.repairCost)})
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                {journey.tractor.status === 'sold' && journey.tractor.sale_price ? (
                                                    <span className="text-slate-300">{formatCurrency(journey.tractor.sale_price)}</span>
                                                ) : (
                                                    <span className="text-slate-600">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                {journey.profit !== null ? (
                                                    <span className={`font-bold ${journey.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {formatCurrency(journey.profit)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-600">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${journey.tractor.status === 'in_stock'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    }`}>
                                                    {journey.tractor.status === 'in_stock' ? 'In Stock' : 'Sold'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: SERVICES */}
            {activeTab === 'services' && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-slate-700 bg-slate-800/80">
                        <h3 className="font-semibold text-white">External Service Performance</h3>
                        <p className="text-xs text-slate-400 mt-1">Excludes internal repairs on stock tractors</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-700 bg-slate-800/80">
                                    <th className="p-4 font-medium text-slate-400">Description</th>
                                    <th className="p-4 font-medium text-slate-400">Date</th>
                                    <th className="p-4 font-medium text-slate-400 text-right">Labor (Revenue)</th>
                                    <th className="p-4 font-medium text-slate-400 text-right">Parts (Cost)</th>
                                    <th className="p-4 font-medium text-slate-400 text-right">Total Billed</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {externalServices.map((service) => (
                                    <tr key={service.id} className="hover:bg-slate-700/20 transition-colors">
                                        <td className="p-4">
                                            <div className="font-medium text-white">{service.description}</div>
                                            <div className="text-xs text-slate-500">{service.customer_name}</div>
                                        </td>
                                        <td className="p-4 text-slate-400 text-sm">
                                            {service.service_date}
                                        </td>
                                        <td className="p-4 text-right text-emerald-400 font-medium">
                                            {formatCurrency(service.labor_cost)}
                                        </td>
                                        <td className="p-4 text-right text-orange-400">
                                            {formatCurrency(service.parts_cost)}
                                        </td>
                                        <td className="p-4 text-right font-bold text-white">
                                            {formatCurrency(service.total_cost)}
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-slate-800 font-bold border-t-2 border-slate-700">
                                    <td className="p-4 text-white">TOTALS</td>
                                    <td></td>
                                    <td className="p-4 text-right text-emerald-400">{formatCurrency(totalServiceLaborRevenue)}</td>
                                    <td className="p-4 text-right text-orange-400">{formatCurrency(totalServicePartsCost)}</td>
                                    <td className="p-4 text-right text-white">{formatCurrency(totalServiceRevenue)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: PARTS */}
            {activeTab === 'parts' && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-slate-700 bg-gradient-to-r from-purple-500/10 to-emerald-500/10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400">
                                <Package size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Current Inventory Value</h3>
                                <p className="text-purple-300 text-lg font-mono mt-1">{formatCurrency(totalInventoryValue)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-700 bg-slate-800/80">
                                    <th className="p-4 font-medium text-slate-400">Part Name</th>
                                    <th className="p-4 font-medium text-slate-400">Category</th>
                                    <th className="p-4 font-medium text-slate-400 text-right">In Stock</th>
                                    <th className="p-4 font-medium text-slate-400 text-right">Unit Price</th>
                                    <th className="p-4 font-medium text-slate-400 text-right">Total Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {parts.map((part) => (
                                    <tr key={part.id} className="hover:bg-slate-700/20 transition-colors">
                                        <td className="p-4">
                                            <div className="font-medium text-white">{part.name}</div>
                                            <div className="text-xs text-slate-500 font-mono">{part.part_number}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded-md text-xs bg-slate-700 text-slate-300">
                                                {part.category}
                                            </span>
                                        </td>
                                        <td className={`p-4 text-right font-medium ${part.stock_quantity <= part.min_stock ? 'text-red-400' : 'text-slate-300'}`}>
                                            {part.stock_quantity}
                                        </td>
                                        <td className="p-4 text-right text-slate-400">
                                            {formatCurrency(part.unit_price)}
                                        </td>
                                        <td className="p-4 text-right text-white font-medium">
                                            {formatCurrency(part.stock_quantity * part.unit_price)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: EXPENSES */}
            {activeTab === 'expenses' && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-700 bg-slate-800/80">
                                    <th className="p-4 font-medium text-slate-400">Date</th>
                                    <th className="p-4 font-medium text-slate-400">Description</th>
                                    <th className="p-4 font-medium text-slate-400">Category</th>
                                    <th className="p-4 font-medium text-slate-400 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {expenses.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-slate-700/20 transition-colors">
                                        <td className="p-4 text-slate-400 text-sm">{expense.date}</td>
                                        <td className="p-4 text-white">{expense.description}</td>
                                        <td className="p-4">
                                            <span className="capitalize px-2 py-1 rounded-md text-xs bg-slate-700 text-slate-300">
                                                {expense.category}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right text-white font-medium">
                                            {formatCurrency(expense.amount)}
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-slate-800 font-bold border-t-2 border-slate-700">
                                    <td className="p-4 text-white" colSpan={3}>TOTAL EXPENSES</td>
                                    <td className="p-4 text-right text-red-400">{formatCurrency(totalGeneralExpenses)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

interface BreakdownItem {
    label: string;
    subLabel?: string;
    amount: number;
    type: 'positive' | 'negative' | 'neutral';
}

interface BreakdownSection {
    title: string;
    items: BreakdownItem[];
    subtotal: number;
    type: 'income' | 'expense';
}

interface BreakdownData {
    title: string;
    sections: BreakdownSection[];
    total: number;
}

function BreakdownModal({
    data,
    onClose,
    formatCurrency
}: {
    data: BreakdownData | null;
    onClose: () => void;
    formatCurrency: (n: number) => string;
}) {
    if (!data) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-800/30">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Activity size={20} className="text-emerald-400" />
                        {data.title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto p-6 flex-1 custom-scrollbar space-y-8">
                    {data.sections.map((section, sIdx) => (
                        <div key={sIdx} className="bg-slate-800/20 rounded-xl border border-slate-700/50 overflow-hidden">
                            <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-700/50 flex justify-between items-center">
                                <h3 className="font-semibold text-slate-200 uppercase tracking-wider text-xs">{section.title}</h3>
                                <span className={`text-sm font-bold font-mono ${section.type === 'income' ? 'text-emerald-400' : 'text-slate-400'}`}>
                                    {section.items.length} Records
                                </span>
                            </div>

                            <div className="divide-y divide-slate-700/30">
                                {section.items.length === 0 ? (
                                    <p className="px-4 py-3 text-slate-500 text-sm italic">No records in this category.</p>
                                ) : (
                                    section.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center px-4 py-3 hover:bg-slate-800/30 transition-colors">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="font-medium text-slate-300 truncate">{item.label}</div>
                                                {item.subLabel && <div className="text-xs text-slate-500 truncate">{item.subLabel}</div>}
                                            </div>
                                            <div className="font-mono text-sm whitespace-nowrap">
                                                {formatCurrency(item.amount)}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="px-4 py-3 bg-slate-800/30 border-t border-slate-700/50 flex justify-between items-center">
                                <span className="text-sm font-medium text-slate-400">Subtotal</span>
                                <span className={`font-mono font-bold ${section.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {section.type === 'expense' && '-'}{formatCurrency(section.subtotal)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-6 bg-slate-900 border-t border-slate-800 rounded-b-2xl">
                    <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-medium text-lg">Net Total Amount</span>
                        <span className={`text-3xl font-bold ${data.total >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(data.total)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
