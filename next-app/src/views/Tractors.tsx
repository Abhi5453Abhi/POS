'use client';

import { useEffect, useState } from 'react';
import { tractorApi } from '@/src/api';
import type { Tractor, TractorType, TractorBrand, TractorModel, TransactionItem } from '@/src/types';
import { Plus, Tractor as TractorIcon, X, Search, Pencil, Trash2, Settings } from 'lucide-react';
import { DeleteConfirmationModal } from '@/src/components/DeleteConfirmationModal';
import ManageTractorDataModal from '@/src/components/ManageTractorDataModal';

export function Tractors() {
    const [tractors, setTractors] = useState<Tractor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showSellModal, setShowSellModal] = useState(false);
    const [showManageModal, setShowManageModal] = useState(false);
    const [selectedTractor, setSelectedTractor] = useState<Tractor | null>(null);
    const [viewTractor, setViewTractor] = useState<Tractor | null>(null);
    const [editingTractor, setEditingTractor] = useState<Tractor | null>(null);
    const [filter, setFilter] = useState<'all' | 'in_stock' | 'sold'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Delete modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [tractorToDelete, setTractorToDelete] = useState<Tractor | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        loadTractors();
    }, [filter]);

    const loadTractors = async () => {
        try {
            const status = filter === 'all' ? undefined : filter;
            const result = await tractorApi.list(status);
            setTractors(result || []);
        } catch (error) {
            console.error('Failed to load tractors:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSell = (tractor: Tractor) => {
        setSelectedTractor(tractor);
        setShowSellModal(true);
    };

    const handleEdit = (tractor: Tractor) => {
        // Since we now pre-fetch transactions and exchange details in the list API,
        // we can set the editing tractor directly without an extra network call.
        setEditingTractor(tractor);
        setShowAddModal(true);
    };

    const handleDeleteClick = (tractor: Tractor) => {
        setTractorToDelete(tractor);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!tractorToDelete) return;

        setIsDeleting(true);
        try {
            await tractorApi.delete(tractorToDelete.id);
            await loadTractors();
            setShowDeleteModal(false);
            setTractorToDelete(null);
        } catch (error) {
            console.error('Failed to delete tractor:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEditExchangeTractor = (exchangeTractor: Tractor) => {
        // Set the exchange tractor for editing
        setEditingTractor(exchangeTractor);
        setShowAddModal(true);
    };

    const handleDeleteExchangeTractor = async (parentTractor: Tractor, exchangeTractor: Tractor) => {
        // Delete the exchange tractor and clear the reference from parent
        try {
            await tractorApi.delete(exchangeTractor.id);
            // Update parent tractor to remove exchange_tractor_id
            await tractorApi.update(parentTractor.id, { exchange_tractor_id: undefined });
            await loadTractors();
        } catch (error) {
            console.error('Failed to delete exchange tractor:', error);
        }
    };

    const filteredTractors = tractors.filter(t =>
        t.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.chassis_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Tractors</h1>
                    <p className="text-slate-400 mt-1">Manage your tractor inventory</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowManageModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors border border-slate-600"
                    >
                        <Settings size={20} />
                        Manage Brands/Models
                    </button>
                    <button
                        onClick={() => {
                            setEditingTractor(null);
                            setShowAddModal(true);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors shadow-lg shadow-emerald-500/20"
                    >
                        <Plus size={20} />
                        Add Tractor
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by brand, model, or chassis number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
                <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl border border-slate-700 backdrop-blur-sm">
                    {(['all', 'in_stock', 'sold'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === f
                                ? 'bg-emerald-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                }`}
                        >
                            {f === 'all' ? 'All' : f === 'in_stock' ? 'In Stock' : 'Sold'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tractors Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
                </div>
            ) : filteredTractors.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/50 border border-slate-700 rounded-2xl">
                    <TractorIcon className="mx-auto text-slate-500 mb-4" size={48} />
                    <h3 className="text-xl font-semibold text-white mb-2">No tractors found</h3>
                    <p className="text-slate-400">Add your first tractor to get started</p>
                </div>
            ) : (
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left p-4 text-slate-400 font-medium">Tractor</th>
                                    <th className="text-left p-4 text-slate-400 font-medium">Details</th>
                                    <th className="text-left p-4 text-slate-400 font-medium">Status</th>
                                    <th className="text-right p-4 text-slate-400 font-medium">Purchase Price</th>
                                    <th className="text-right p-4 text-slate-400 font-medium">Sale Info</th>
                                    <th className="text-right p-4 text-slate-400 font-medium">Profit/Loss</th>
                                    <th className="text-right p-4 text-slate-400 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTractors.map((tractor) => (
                                    <tr
                                        key={tractor.id}
                                        onClick={() => handleEdit(tractor)}
                                        className="border-b border-slate-700/50 hover:bg-slate-700/40 cursor-pointer transition-colors"
                                    >
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                                    <TractorIcon className="text-emerald-500" size={20} />
                                                </div>
                                                <div>
                                                    <div className="text-white font-medium">{tractor.brand} {tractor.model}</div>
                                                    {tractor.exchange_tractor && (
                                                        <div className="flex items-center gap-1 text-xs text-amber-500 mt-0.5">
                                                            <span className="uppercase font-bold text-[10px] border border-amber-500/30 px-1 rounded">Exchange</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm text-slate-300">{tractor.year} • {tractor.type === 'new' ? 'New' : 'Used'}</div>
                                            <div className="text-xs text-slate-500 font-mono mt-0.5">{tractor.chassis_number}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${tractor.status === 'in_stock'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                : 'bg-slate-700 text-slate-300 border-slate-600'
                                                }`}>
                                                {tractor.status === 'in_stock' ? 'In Stock' : 'Sold'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="text-white">₹{tractor.purchase_price.toLocaleString()}</div>
                                        </td>
                                        <td className="p-4 text-right">
                                            {tractor.sale_price && tractor.sale_price > 0 ? (
                                                <div className="flex flex-col items-end">
                                                    <div className="text-emerald-400 font-medium">₹{tractor.sale_price.toLocaleString()}</div>
                                                    {tractor.exchange_tractor ? (
                                                        <div className="text-xs text-amber-500 flex items-center gap-1 justify-end" title={`Exchanged for ${tractor.exchange_tractor.brand} ${tractor.exchange_tractor.model} (Valued at ₹${tractor.exchange_tractor.purchase_price.toLocaleString()})`}>
                                                            <span>+ Exch.</span>
                                                        </div>
                                                    ) : (
                                                        tractor.status === 'sold' && <div className="text-xs text-slate-500">Sold</div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-slate-600">-</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            {tractor.sale_price && tractor.sale_price > 0 ? (
                                                <div className={`font-medium ${(tractor.sale_price - tractor.purchase_price) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {(tractor.sale_price - tractor.purchase_price) >= 0 ? '+' : '-'}₹{Math.abs(tractor.sale_price - tractor.purchase_price).toLocaleString()}
                                                </div>
                                            ) : (
                                                <span className="text-slate-600">-</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {tractor.status === 'in_stock' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSell(tractor);
                                                        }}
                                                        className="px-4 py-2 bg-emerald-500/20 text-emerald-400 font-medium rounded-lg hover:bg-emerald-500/30 text-sm transition-colors"
                                                    >
                                                        Sell
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEdit(tractor);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-white hover:bg-emerald-600/20 hover:border-emerald-500/50 border border-transparent rounded-lg transition-all"
                                                    title="Edit"
                                                >
                                                    <Pencil size={20} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteClick(tractor);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/50 border border-transparent rounded-lg transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                                {tractor.exchange_tractor && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditExchangeTractor(tractor.exchange_tractor!);
                                                        }}
                                                        className="p-2 text-amber-500/70 hover:text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/50 border border-transparent rounded-lg transition-all"
                                                        title={`Edit Exchange Tractor: ${tractor.exchange_tractor.brand} ${tractor.exchange_tractor.model}`}
                                                    >
                                                        <TractorIcon size={20} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add/Edit Tractor Modal */}
            {showAddModal && (
                <AddTractorModal
                    initialData={editingTractor}
                    parentTractor={editingTractor && editingTractor.exchange_tractor ? editingTractor : null}
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingTractor(null);
                    }}
                    onSuccess={() => {
                        setShowAddModal(false);
                        setEditingTractor(null);
                        loadTractors();
                    }}
                    onEditExchangeTractor={(exchangeTractor) => {
                        setEditingTractor(exchangeTractor);
                    }}
                    onDeleteExchangeTractor={handleDeleteExchangeTractor}
                />
            )}

            {/* Sell Tractor Modal */}
            {showSellModal && selectedTractor && (
                <SellTractorModal
                    tractor={selectedTractor}
                    onClose={() => {
                        setShowSellModal(false);
                        setSelectedTractor(null);
                    }}
                    onSuccess={() => {
                        setShowSellModal(false);
                        setSelectedTractor(null);
                        loadTractors();
                    }}
                />
            )}

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setTractorToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                title="Delete Tractor"
                message="Are you sure you want to delete this tractor? This will permanently remove it from your inventory."
                itemName={tractorToDelete ? `${tractorToDelete.brand} ${tractorToDelete.model} (${tractorToDelete.chassis_number})` : undefined}
                isDeleting={isDeleting}
            />

            {/* View Tractor Details Modal */}
            {viewTractor && (
                <TractorDetailsModal
                    tractor={viewTractor}
                    onClose={() => setViewTractor(null)}
                />
            )}

            {/* Manage Data Modal */}
            {showManageModal && (
                <ManageTractorDataModal
                    isOpen={showManageModal}
                    onClose={() => setShowManageModal(false)}
                />
            )}
        </div>
    );
}

// Transaction Types
type TransactionType = 'credit' | 'debit';
type TransactionCategory =
    | 'Purchase Price'
    | 'Sale Price'
    | 'Insurance'
    | 'RC'
    | 'Transport'
    | 'Commission'
    | 'Other';

// Local TransactionItem interface removed to use the one from types.ts

// TransactionBuilder Component
interface TransactionBuilderProps {
    transactions: TransactionItem[];
    onChange: (transactions: TransactionItem[]) => void;
    mode: 'add' | 'sell'; // 'add' for new tractor (purchase), 'sell' for selling
}

function TransactionBuilder({ transactions, onChange, mode }: TransactionBuilderProps) {
    const [type, setType] = useState<TransactionType>(mode === 'add' ? 'debit' : 'credit');
    const [category, setCategory] = useState<TransactionCategory>(mode === 'add' ? 'Purchase Price' : 'Sale Price');
    const [customCategory, setCustomCategory] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [editId, setEditId] = useState<string | null>(null);

    const handleAdd = () => {
        if (!amount || amount <= 0) return;
        if (category === 'Other' && !customCategory.trim()) return;

        if (editId) {
            // Update existing item
            const updatedTransactions = transactions.map(t =>
                t.id === editId
                    ? {
                        ...t,
                        type,
                        category,
                        customCategory: category === 'Other' ? customCategory : undefined,
                        amount: Number(amount)
                    }
                    : t
            );
            onChange(updatedTransactions);
            setEditId(null);
        } else {
            // Add new item
            const newItem: TransactionItem = {
                id: Math.random().toString(36).substr(2, 9),
                type,
                category,
                customCategory: category === 'Other' ? customCategory : undefined,
                amount: Number(amount)
            };
            onChange([...transactions, newItem]);
        }

        // Reset inputs
        setAmount('');
        if (category === 'Other') setCustomCategory('');

        // Reset defaults for next add
        if (!editId) {
            // Only reset defaults if we finished adding, not cancelling edit (though logic above handles confirm)
            // We can keep previous type/category or reset. 
            // Resetting might be cleaner.
            // setType(mode === 'add' ? 'debit' : 'credit');
            // setCategory(mode === 'add' ? 'Purchase Price' : 'Sale Price');
        } else {
            // If we finished editing, reset the edit ID and maybe inputs
            setType(mode === 'add' ? 'debit' : 'credit');
            setCategory(mode === 'add' ? 'Purchase Price' : 'Sale Price');
        }
    };

    const handleEdit = (item: TransactionItem) => {
        setEditId(item.id);
        setType(item.type);
        setCategory(item.category as TransactionCategory);
        setCustomCategory(item.customCategory || item.category); // Fallback if customCategory is missing but category is 'Other'? No, category is enum.
        if (item.category === 'Other' && item.customCategory) {
            setCustomCategory(item.customCategory);
        } else {
            setCustomCategory('');
        }
        setAmount(item.amount);
    };

    const handleCancelEdit = () => {
        setEditId(null);
        setAmount('');
        setCustomCategory('');
        setType(mode === 'add' ? 'debit' : 'credit');
        setCategory(mode === 'add' ? 'Purchase Price' : 'Sale Price');
    };

    const handleRemove = (id: string) => {
        if (editId === id) handleCancelEdit();
        onChange(transactions.filter(t => t.id !== id));
    };

    const totalDebit = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
    const totalCredit = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
    const netTotal = totalCredit - totalDebit;

    return (
        <div className="space-y-4 p-4 bg-slate-700/30 rounded-xl border border-slate-600">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="p-1 rounded bg-emerald-500/10 text-emerald-500">
                    ₹
                </span>
                Transactions / Expenses
            </h3>

            {/* Input Row */}
            <div className={`p-3 rounded-xl border transition-all ${editId ? 'bg-emerald-500/10 border-emerald-500/30' : 'border-transparent'}`}>
                {editId && (
                    <div className="text-xs font-bold text-emerald-400 mb-2 uppercase tracking-wider flex justify-between items-center">
                        <span>Editing Transaction</span>
                        <button onClick={handleCancelEdit} className="text-slate-400 hover:text-white"><X size={14} /></button>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    {/* Type Selection */}
                    <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-slate-400 mb-1">Type</label>
                        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-600">
                            <button
                                type="button"
                                onClick={() => setType('credit')}
                                className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${type === 'credit'
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                Credit (+)
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('debit')}
                                className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${type === 'debit'
                                    ? 'bg-red-600 text-white'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                Debit (-)
                            </button>
                        </div>
                    </div>

                    {/* Category Selection */}
                    <div className="md:col-span-4">
                        <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value as TransactionCategory)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        >
                            <option value="Purchase Price">Purchase Price</option>
                            <option value="Sale Price">Sale Price</option>
                            <option value="Insurance">Insurance</option>
                            <option value="RC">RC</option>
                            <option value="Transport">Transport</option>
                            <option value="Commission">Commission</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    {/* Amount Input */}
                    <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-slate-400 mb-1">Amount (₹)</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(parseFloat(e.target.value))}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
                            placeholder="0"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    {/* Add/Update Button */}
                    <div className="md:col-span-2">
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleAdd}
                                disabled={!amount || amount <= 0}
                                className={`w-full py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 ${editId ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-600 hover:bg-slate-500'
                                    }`}
                            >
                                {editId ? <div className="flex items-center gap-1"><Pencil size={14} /> Save</div> : <div className="flex items-center gap-1"><Plus size={16} /> Add</div>}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Custom Category Input */}
                {category === 'Other' && (
                    <div className="mt-2">
                        <input
                            type="text"
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                            placeholder="Enter description..."
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>
                )}
            </div>

            {/* Transactions List */}
            {transactions.length > 0 && (
                <div className="mt-4 space-y-2">
                    <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                        {transactions.map((t) => (
                            <div key={t.id} className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${editId === t.id ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-slate-800/50 border-slate-700'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-1.5 rounded ${t.type === 'credit' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                        {t.type === 'credit' ? <Plus size={14} /> : <X size={14} className="rotate-45" />}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white">
                                            {t.category === 'Other' ? (t.customCategory || t.category) : t.category}
                                        </div>
                                        <div className="text-xs text-slate-400 capitalize">{t.type}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`font-mono font-medium ${t.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {t.type === 'credit' ? '+' : '-'}₹{t.amount.toLocaleString()}
                                    </span>
                                    <div className="flex items-center">
                                        <button
                                            type="button"
                                            onClick={() => handleEdit(t)}
                                            className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                                            title="Edit"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRemove(t.id)}
                                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Summary */}
                    <div className="pt-3 border-t border-slate-600 flex justify-between items-center text-sm">
                        <span className="text-slate-400">Net Total</span>
                        <span className={`font-bold text-lg ${netTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {netTotal >= 0 ? '+' : ''}₹{netTotal.toLocaleString()}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

// Add/Edit Tractor Modal Component
interface AddTractorModalProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData: Tractor | null;
    onEditExchangeTractor?: (exchangeTractor: Tractor) => void;
    onDeleteExchangeTractor?: (parentTractor: Tractor, exchangeTractor: Tractor) => void;
    parentTractor?: Tractor | null;
}

function AddTractorModal({ onClose, onSuccess, initialData, onEditExchangeTractor, onDeleteExchangeTractor, parentTractor }: AddTractorModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [brands, setBrands] = useState<TractorBrand[]>([]);
    const [models, setModels] = useState<TractorModel[]>([]);
    const [selectedBrandId, setSelectedBrandId] = useState<number>(0);

    const [formData, setFormData] = useState({
        brand: initialData?.brand || '',
        model: initialData?.model || '',
        year: initialData?.year || new Date().getFullYear(),
        type: initialData?.type || 'new' as TractorType,
        chassis_number: initialData?.chassis_number || '',
        engine_number: initialData?.engine_number || '',
        purchase_price: initialData?.purchase_price || 0,
        supplier_name: initialData?.supplier_name || '',
        supplier_father_name: initialData?.supplier_father_name || '',
        supplier_address: initialData?.supplier_address || '',
        supplier_phone: initialData?.supplier_phone || '',
        notes: initialData?.notes || '',
    });

    // Transactions state
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);

    const [newBrandName, setNewBrandName] = useState('');
    const [newModelName, setNewModelName] = useState('');
    const [isAddingNewModel, setIsAddingNewModel] = useState(false);

    useEffect(() => {
        loadBrands();
        if (initialData) {
            if (initialData.transactions && initialData.transactions.length > 0) {
                // Map API transactions to UI model if needed, though they should be compatible now
                // We might need to handle 'Other' category mapping if description splitting wasn't perfect, 
                // but for now we trust the GET handler's mapping.
                // Ensure IDs are strings for the UI
                const uiTransactions = initialData.transactions.map((t: any) => ({
                    ...t,
                    id: t.id.toString(),
                    // Re-derive customCategory if category is 'Other' or not in standard list?
                    // For simplicity, we just pass what we got. 
                }));
                setTransactions(uiTransactions);
            } else {
                // Determine if we should show a default 'Purchase Price' debit
                // Only if purchase_price > 0 and no transactions exist
                if (initialData.purchase_price > 0) {
                    setTransactions([{
                        id: 'init-1',
                        type: 'debit',
                        category: 'Purchase Price',
                        amount: initialData.purchase_price
                    }]);
                } else {
                    setTransactions([]);
                }
            }
        }
    }, [initialData]);

    useEffect(() => {
        if (selectedBrandId && selectedBrandId !== -1) {
            loadModels(selectedBrandId);
        } else if (brands.length > 0 && initialData) {
            // Try to find brand ID from name to load models
            const brand = brands.find(b => b.name === initialData.brand);
            if (brand) {
                setSelectedBrandId(brand.id);
            }
        }
    }, [selectedBrandId, initialData, brands]);

    // Update purchase price when transactions change
    useEffect(() => {
        if (transactions.length > 0) {
            const totalDebit = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
            const totalCredit = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
            setFormData(prev => ({ ...prev, purchase_price: totalDebit }));
        }
    }, [transactions]);

    const loadBrands = async () => {
        try {
            const data = await tractorApi.listBrands();
            setBrands(data || []);
        } catch (error) {
            console.error('Failed to load brands:', error);
        }
    };

    const loadModels = async (brandId: number) => {
        try {
            const data = await tractorApi.listModels(brandId);
            setModels(data || []);
        } catch (error) {
            console.error('Failed to load models:', error);
        }
    };

    const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const brandId = parseInt(e.target.value);
        setSelectedBrandId(brandId);

        if (brandId === -1) {
            // Other selected
            setFormData({ ...formData, brand: '', model: '' });
        } else {
            const brand = brands.find(b => b.id === brandId);
            setFormData({ ...formData, brand: brand?.name || '', model: '' });
            setIsAddingNewModel(false);
            setNewModelName('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Handle "Other" brand creation
            if (selectedBrandId === -1) {
                if (!newBrandName.trim() || !newModelName.trim()) {
                    alert('Please enter both Brand Name and Model Name');
                    setIsSubmitting(false);
                    return;
                }

                // Create Brand
                const createdBrand = await tractorApi.createBrand(newBrandName);

                // Create Model
                await tractorApi.createModel(createdBrand.id, newModelName);

                // Update formData with the new names
                formData.brand = newBrandName;
                formData.model = newModelName;
                formData.brand = newBrandName;
                formData.model = newModelName;
            } else if (isAddingNewModel && selectedBrandId !== -1) {
                // Creates model for existing brand
                if (!newModelName.trim()) {
                    alert('Please enter a Model Name');
                    setIsSubmitting(false);
                    return;
                }
                const createdModel = await tractorApi.createModel(selectedBrandId, newModelName);
                formData.model = createdModel.name;
            }

            const dataToSubmit = { ...formData, transactions };

            if (initialData) {
                await tractorApi.update(initialData.id, dataToSubmit);
            } else {
                await tractorApi.create(dataToSubmit);
            }
            onSuccess();
        } catch (error) {
            console.error('Failed to save tractor:', error);
            alert('Failed to save tractor. Please check the details and try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col animate-in fade-in duration-200">
            {/* Full Screen Loading Overlay */}
            {isSubmitting && (
                <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl flex flex-col items-center gap-4">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-slate-600 rounded-full"></div>
                            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-white mb-1">Saving Tractor...</h3>
                            <p className="text-slate-400">Please wait while we process your request.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-900 sticky top-0 z-10">
                <div>
                    <h2 className="text-2xl font-bold text-white">{initialData ? 'Edit Tractor' : 'Add New Tractor'}</h2>
                    <p className="text-slate-400 text-sm mt-1">Enter the details of the tractor below.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
                    >
                        Esc
                    </button>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors bg-slate-800/50">
                        <X size={24} />
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="w-full h-full p-4 lg:p-6">
                    <form onSubmit={handleSubmit} className="space-y-8 h-full">
                        {/* Section 1: Basic Information */}
                        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
                            <h3 className="text-lg font-semibold text-emerald-400 mb-6 flex items-center gap-2">
                                <TractorIcon size={20} />
                                Basic Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Brand</label>
                                    {selectedBrandId === -1 ? (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newBrandName}
                                                onChange={(e) => {
                                                    setNewBrandName(e.target.value);
                                                    setFormData({ ...formData, brand: e.target.value });
                                                }}
                                                placeholder="Enter New Brand Name"
                                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                                required
                                                autoFocus
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedBrandId(0);
                                                    setNewBrandName('');
                                                    setFormData({ ...formData, brand: '' });
                                                }}
                                                className="px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                                                title="Cancel custom brand"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    ) : (
                                        <select
                                            value={selectedBrandId}
                                            onChange={handleBrandChange}
                                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                            required
                                        >
                                            <option value={0} disabled>Select Brand</option>
                                            {(brands || []).map(brand => (
                                                <option key={brand.id} value={brand.id}>{brand.name}</option>
                                            ))}
                                            <option value={-1} className="font-semibold text-emerald-400">+ Add Other Brand</option>
                                        </select>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Model</label>
                                    {selectedBrandId === -1 ? (
                                        <input
                                            type="text"
                                            value={newModelName}
                                            onChange={(e) => {
                                                setNewModelName(e.target.value);
                                                setFormData({ ...formData, model: e.target.value });
                                            }}
                                            placeholder="Enter New Model Name"
                                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                            required
                                        />
                                    ) : (
                                        <div className="space-y-2">
                                            <select
                                                value={isAddingNewModel ? 'NEW_MODEL_OPTION' : formData.model}
                                                onChange={(e) => {
                                                    if (e.target.value === 'NEW_MODEL_OPTION') {
                                                        setIsAddingNewModel(true);
                                                        setFormData({ ...formData, model: '' });
                                                        setNewModelName('');
                                                    } else {
                                                        setIsAddingNewModel(false);
                                                        setFormData({ ...formData, model: e.target.value });
                                                    }
                                                }}
                                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                                required={!isAddingNewModel}
                                                disabled={!selectedBrandId}
                                            >
                                                <option value="" disabled>Select Model</option>
                                                {(models || []).map(model => (
                                                    <option key={model.id} value={model.name}>{model.name}</option>
                                                ))}
                                                <option value="NEW_MODEL_OPTION" className="font-semibold text-emerald-400">+ Add New Model</option>
                                            </select>

                                            {isAddingNewModel && (
                                                <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
                                                    <input
                                                        type="text"
                                                        value={newModelName}
                                                        onChange={(e) => {
                                                            setNewModelName(e.target.value);
                                                            setFormData({ ...formData, model: e.target.value });
                                                        }}
                                                        placeholder="Enter New Model Name"
                                                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                                        required
                                                        autoFocus
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setIsAddingNewModel(false);
                                                            setNewModelName('');
                                                            setFormData({ ...formData, model: '' });
                                                        }}
                                                        className="px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                                                        title="Cancel new model"
                                                    >
                                                        <X size={20} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Year</label>
                                    <input
                                        type="number"
                                        value={formData.year}
                                        onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value as TractorType })}
                                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                    >
                                        <option value="new">New</option>
                                        <option value="used">Used</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Chassis Number</label>
                                    <input
                                        type="text"
                                        value={formData.chassis_number}
                                        onChange={(e) => setFormData({ ...formData, chassis_number: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Engine Number</label>
                                    <input
                                        type="text"
                                        value={formData.engine_number}
                                        onChange={(e) => setFormData({ ...formData, engine_number: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Financial Details */}
                        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
                            <h3 className="text-lg font-semibold text-emerald-400 mb-6 flex items-center gap-2">
                                <Search size={20} />
                                Financial Details
                            </h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Transaction Builder replaces simple Purchase Price Input */}
                                <div className="space-y-4">
                                    <label className="block text-sm font-medium text-slate-300">Purchase Cost Breakdown</label>
                                    <TransactionBuilder
                                        transactions={transactions}
                                        onChange={setTransactions}
                                        mode="add"
                                    />
                                    <div className="flex justify-between items-center p-4 bg-slate-700/30 rounded-xl border border-slate-600/50">
                                        <span className="text-sm font-medium text-slate-400">Total Purchase Price</span>
                                        <span className="text-2xl font-bold text-white">₹{formData.purchase_price.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Supplier Name</label>
                                        <input
                                            type="text"
                                            value={formData.supplier_name}
                                            onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                            required
                                            placeholder="Enter supplier or dealer name"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Father Name</label>
                                            <input
                                                type="text"
                                                value={formData.supplier_father_name}
                                                onChange={(e) => setFormData({ ...formData, supplier_father_name: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                                placeholder="Supplier's father name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number</label>
                                            <input
                                                type="tel"
                                                value={formData.supplier_phone}
                                                onChange={(e) => setFormData({ ...formData, supplier_phone: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                                placeholder="Contact number"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Address</label>
                                        <textarea
                                            value={formData.supplier_address}
                                            onChange={(e) => setFormData({ ...formData, supplier_address: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white min-h-[80px] focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                                            rows={2}
                                            placeholder="Supplier's address"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Additional Notes</label>
                                        <textarea
                                            value={formData.notes}
                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white min-h-[120px] focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                                            rows={3}
                                            placeholder="Any other details about the tractor..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Exchange Data */}
                        {(initialData?.exchange_tractor || initialData?.exchange_tractor_id) && (
                            <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold text-amber-500">🔄 Exchange Tractor</span>
                                        <span className="bg-amber-500/20 text-amber-500 text-xs px-2 py-1 rounded">Linked</span>
                                    </div>

                                    {initialData.exchange_tractor && (
                                        <div className="flex gap-2">
                                            {onEditExchangeTractor && (
                                                <button
                                                    onClick={() => {
                                                        onClose();
                                                        setTimeout(() => {
                                                            onEditExchangeTractor(initialData.exchange_tractor!);
                                                        }, 100);
                                                    }}
                                                    className="px-4 py-2 text-sm bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 rounded-lg transition-colors flex items-center gap-2 font-medium"
                                                >
                                                    <Pencil size={14} />
                                                    Edit Details
                                                </button>
                                            )}
                                            {onDeleteExchangeTractor && parentTractor && (
                                                <button
                                                    onClick={async () => {
                                                        if (confirm(`Are you sure you want to delete the exchange tractor "${initialData.exchange_tractor?.brand} ${initialData.exchange_tractor?.model}"?`)) {
                                                            await onDeleteExchangeTractor(parentTractor, initialData.exchange_tractor!);
                                                            onSuccess();
                                                        }
                                                    }}
                                                    className="px-4 py-2 text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors flex items-center gap-2 font-medium"
                                                >
                                                    <Trash2 size={14} />
                                                    Unlink & Delete
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {initialData.exchange_tractor ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                                            <span className="block text-slate-400 mb-1">Brand & Model</span>
                                            <span className="block text-white font-medium text-lg">{initialData.exchange_tractor.brand} {initialData.exchange_tractor.model}</span>
                                        </div>
                                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                                            <span className="block text-slate-400 mb-1">Vehicle Details</span>
                                            <span className="block text-white">{initialData.exchange_tractor.year} • {initialData.exchange_tractor.chassis_number}</span>
                                        </div>
                                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                                            <span className="block text-slate-400 mb-1">Exchange Value</span>
                                            <span className="block text-amber-500 font-bold text-lg">₹{initialData.exchange_tractor.purchase_price.toLocaleString()}</span>
                                        </div>
                                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                                            <span className="block text-slate-400 mb-1">Notes</span>
                                            <span className="block text-white truncate">{initialData.exchange_tractor.notes || '-'}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-sm text-slate-400 italic">
                                        Exchange tractor ID: {initialData.exchange_tractor_id} (Details not loaded)
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="h-20"></div> {/* Spacer for fixed footer */}
                    </form>
                </div >
            </div >

            {/* Footer */}
            < div className="border-t border-slate-700 bg-slate-900 p-6 flex justify-end gap-4 sticky bottom-0 z-20" >
                <button
                    type="button"
                    onClick={onClose}
                    className="px-8 py-3 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-700 transition-colors border border-slate-700"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20"
                >
                    {isSubmitting ? (
                        <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Saving...
                        </span>
                    ) : (
                        initialData ? 'Update Tractor' : 'Add Tractor'
                    )}
                </button>
            </div >
        </div >
    );
}

// Sell Tractor Modal Component
function SellTractorModal({
    tractor,
    onClose,
    onSuccess
}: {
    tractor: Tractor;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [salePrice, setSalePrice] = useState(0);
    const [customerName, setCustomerName] = useState('');
    const [customerFatherName, setCustomerFatherName] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [isExchange, setIsExchange] = useState(false);
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);
    const [exchangeTransactions, setExchangeTransactions] = useState<TransactionItem[]>([]);

    const [exchangeTractor, setExchangeTractor] = useState({
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        type: 'used' as TractorType,
        chassis_number: '',
        engine_number: '',
        purchase_price: 0,
        supplier_name: '',
        notes: '',
    });

    // Initialize transactions with a default "Sale Price" entry if empty?
    // User can add it themselves.

    // Calculate sale price from transactions
    useEffect(() => {
        if (transactions.length > 0) {
            const totalCredit = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
            const totalDebit = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
            setSalePrice(Math.max(0, totalCredit - totalDebit));
        } else {
            setSalePrice(0);
        }
    }, [transactions]);

    // Calculate exchange tractor purchase price from exchange transactions
    useEffect(() => {
        if (exchangeTransactions.length > 0) {
            const totalDebit = exchangeTransactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
            const totalCredit = exchangeTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
            setExchangeTractor(prev => ({ ...prev, purchase_price: Math.max(0, totalDebit - totalCredit) }));
        } else {
            setExchangeTractor(prev => ({ ...prev, purchase_price: 0 }));
        }
    }, [exchangeTransactions]);

    // Calculate profit/loss
    const calculateProfitLoss = () => {
        // Profit = Sale Price - Cost
        // If there are specific "Debit" transactions for the sale (like transport/commission), they are already subtracted from salePrice (Net Sale Price).
        // So we just subtract the original Purchase Price.

        // However, if isExchange is true, the backend logic subtracts exchangeTractor.purchase_price from profit? 
        // Let's assume salePrice (Net) includes the value of the exchange tractor if the user added it as a Credit?
        // OR does salePrice represent the *Cash* component? 
        // Given the ambiguity, let's treat salePrice as the 'Net Value Realized'.

        const baseProfit = salePrice - tractor.purchase_price;

        // If we are acquiring an exchange tractor, that value is an ASSET we gaining, not an EXPENSE.
        // It shouldn't reduce profit. But the current backend logic subtracts it.
        // I will keep the display logic consistent with the backend logic for now.
        if (isExchange && exchangeTractor.purchase_price) {
            return baseProfit - exchangeTractor.purchase_price;
        }
        return baseProfit;
    };

    const profitLoss = calculateProfitLoss();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            let exchangeData: Partial<Tractor> | undefined;
            if (isExchange) {
                exchangeData = {
                    ...exchangeTractor,
                    supplier_name: exchangeTractor.supplier_name || customerName,
                };
            }

            // Pass transactions to the API
            const payload = {
                sale_price: salePrice,
                customer_name: customerName,
                customer_father_name: customerFatherName,
                customer_address: customerAddress,
                customer_phone: customerPhone,
                is_exchange: isExchange,
                exchange_tractor: exchangeData,
                transactions,
                exchange_transactions: exchangeTransactions
            };

            await tractorApi.sell(tractor.id, payload);

            onSuccess();
        } catch (error) {
            console.error('Failed to sell tractor:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col animate-in fade-in duration-200">
            {/* Full Screen Loading Overlay */}
            {isSubmitting && (
                <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl flex flex-col items-center gap-4">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-slate-600 rounded-full"></div>
                            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-white mb-1">Processing Sale...</h3>
                            <p className="text-slate-400">Please wait while we record this transaction.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-900 sticky top-0 z-10">
                <div>
                    <h2 className="text-2xl font-bold text-white">Sell Tractor</h2>
                    <p className="text-slate-400 text-sm mt-1">Finalize the sale details below.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
                    >
                        Esc
                    </button>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors bg-slate-800/50">
                        <X size={24} />
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="w-full h-full p-4 lg:p-6">
                    <form onSubmit={handleSubmit} className="space-y-8 h-full">
                        {/* Section 1: Tractor Summary */}
                        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-1">{tractor.brand} {tractor.model}</h3>
                                <div className="flex gap-4 text-sm text-slate-400">
                                    <span>Chassis: <span className="text-white font-mono">{tractor.chassis_number}</span></span>
                                    <span>•</span>
                                    <span>Purchased: <span className="text-white">₹{tractor.purchase_price.toLocaleString()}</span></span>
                                </div>
                            </div>
                            <div className="bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/20 text-emerald-400 text-sm font-medium">
                                Ready for Sale
                            </div>
                        </div>

                        {/* Section 2: Sale Details */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 h-full">
                                    <h3 className="text-lg font-semibold text-emerald-400 mb-6 flex items-center gap-2">
                                        <Search size={20} />
                                        Sale Transactions
                                    </h3>

                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-300">Transaction Breakdown</label>
                                            <TransactionBuilder
                                                transactions={transactions}
                                                onChange={setTransactions}
                                                mode="sell"
                                            />
                                        </div>
                                        <div className="flex justify-between items-center p-4 bg-slate-700/30 rounded-xl border border-slate-600/50">
                                            <span className="text-sm font-medium text-slate-400">Net Sale Price</span>
                                            <span className="text-2xl font-bold text-emerald-400">₹{salePrice.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
                                    <h3 className="text-lg font-semibold text-emerald-400 mb-6">Customer Details</h3>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Customer Name</label>
                                        <input
                                            type="text"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                            required
                                            placeholder="Enter buyer's full name"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Father Name</label>
                                            <input
                                                type="text"
                                                value={customerFatherName}
                                                onChange={(e) => setCustomerFatherName(e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                                placeholder="Buyer's father name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number</label>
                                            <input
                                                type="tel"
                                                value={customerPhone}
                                                onChange={(e) => setCustomerPhone(e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                                placeholder="Contact number"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Address</label>
                                        <textarea
                                            value={customerAddress}
                                            onChange={(e) => setCustomerAddress(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white min-h-[80px] focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                                            rows={2}
                                            placeholder="Buyer's address"
                                        />
                                    </div>
                                </div>

                                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-emerald-400">Exchange (Optional)</h3>
                                        <div className="flex items-center gap-3">
                                            <label htmlFor="isExchange" className="text-sm text-slate-300 cursor-pointer select-none">
                                                Enable Exchange
                                            </label>
                                            <input
                                                type="checkbox"
                                                id="isExchange"
                                                checked={isExchange}
                                                onChange={(e) => setIsExchange(e.target.checked)}
                                                className="w-5 h-5 rounded border-slate-500 bg-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                                            />
                                        </div>
                                    </div>

                                    {/* Exchange Tractor Form */}
                                    {isExchange && (
                                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-2">Brand</label>
                                                    <input
                                                        type="text"
                                                        value={exchangeTractor.brand}
                                                        onChange={(e) => setExchangeTractor({ ...exchangeTractor, brand: e.target.value })}
                                                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                                        placeholder="e.g., Mahindra"
                                                        required={isExchange}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-2">Model</label>
                                                    <input
                                                        type="text"
                                                        value={exchangeTractor.model}
                                                        onChange={(e) => setExchangeTractor({ ...exchangeTractor, model: e.target.value })}
                                                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                                        placeholder="e.g., 575 DI"
                                                        required={isExchange}
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-2">Year</label>
                                                    <input
                                                        type="number"
                                                        value={exchangeTractor.year}
                                                        onChange={(e) => setExchangeTractor({ ...exchangeTractor, year: parseInt(e.target.value) || new Date().getFullYear() })}
                                                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                                        required={isExchange}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-2">Type</label>
                                                    <select
                                                        value={exchangeTractor.type}
                                                        onChange={(e) => setExchangeTractor({ ...exchangeTractor, type: e.target.value as TractorType })}
                                                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                                        required={isExchange}
                                                    >
                                                        <option value="new">New</option>
                                                        <option value="used">Used</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-2">Chassis Number</label>
                                                    <input
                                                        type="text"
                                                        value={exchangeTractor.chassis_number}
                                                        onChange={(e) => setExchangeTractor({ ...exchangeTractor, chassis_number: e.target.value })}
                                                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                                        required={isExchange}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-2">Engine Number</label>
                                                    <input
                                                        type="text"
                                                        value={exchangeTractor.engine_number}
                                                        onChange={(e) => setExchangeTractor({ ...exchangeTractor, engine_number: e.target.value })}
                                                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                                        required={isExchange}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <label className="block text-sm font-medium text-slate-300">Exchange Cost Breakdown</label>
                                                <TransactionBuilder
                                                    transactions={exchangeTransactions}
                                                    onChange={setExchangeTransactions}
                                                    mode="add"
                                                />
                                                <div className="flex justify-between items-center p-4 bg-amber-500/10 rounded-xl border border-amber-500/30">
                                                    <span className="text-sm font-medium text-amber-500">Total Exchange Value</span>
                                                    <span className="text-2xl font-bold text-white">₹{exchangeTractor.purchase_price.toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-2">Notes</label>
                                                <textarea
                                                    value={exchangeTractor.notes}
                                                    onChange={(e) => setExchangeTractor({ ...exchangeTractor, notes: e.target.value })}
                                                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white min-h-[80px] focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                                    rows={3}
                                                    placeholder="Details about exchange vehicle condition..."
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Profit/Loss Display */}
                        {salePrice > 0 && (
                            <div className={`p-6 rounded-xl border ${profitLoss >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'} flex items-center justify-between`}>
                                <div>
                                    <h4 className="text-sm font-medium text-slate-400">Projected Profit / Loss</h4>
                                    <p className="text-xs text-slate-500 mt-1">Based on purchase price and net sale price</p>
                                </div>
                                <span className={`text-3xl font-bold ${profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {profitLoss >= 0 ? '+' : ''}₹{Math.abs(profitLoss).toLocaleString()}
                                </span>
                            </div>
                        )}

                        <div className="h-20"></div> {/* Spacer for fixed footer */}
                    </form>
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-700 bg-slate-900 p-6 flex justify-end gap-4 sticky bottom-0 z-20">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-8 py-3 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-700 transition-colors border border-slate-700"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || (isExchange && (!exchangeTractor.brand || !exchangeTractor.model || !exchangeTractor.chassis_number || !exchangeTractor.engine_number))}
                    className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20"
                >
                    {isSubmitting ? (
                        <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Processing...
                        </span>
                    ) : (
                        'Confirm Sale'
                    )}
                </button>
            </div>
        </div>
    );
}

function TractorDetailsModal({ tractor, onClose }: { tractor: Tractor; onClose: () => void }) {
    if (!tractor) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar relative" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-white">{tractor.brand} {tractor.model}</h2>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${tractor.status === 'in_stock'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                }`}>
                                {tractor.status === 'in_stock' ? 'In Stock' : 'Sold'}
                            </span>
                        </div>
                        <p className="text-slate-400 font-mono text-sm mt-1">VIN: {tractor.chassis_number}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    {/* Basic Information */}
                    <div>
                        <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <TractorIcon size={14} />
                            Vehicle Specifications
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                <span className="block text-xs text-slate-500 mb-1">Make & Model</span>
                                <span className="block text-lg font-medium text-white">{tractor.brand} {tractor.model}</span>
                            </div>
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                <span className="block text-xs text-slate-500 mb-1">Year</span>
                                <span className="block text-lg font-medium text-white">{tractor.year}</span>
                            </div>
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                <span className="block text-xs text-slate-500 mb-1">Type</span>
                                <span className="block text-lg font-medium text-white capitalize">{tractor.type}</span>
                            </div>
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                <span className="block text-xs text-slate-500 mb-1">Engine Number</span>
                                <span className="block text-lg font-medium text-white font-mono">{tractor.engine_number}</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-800" />

                    {/* Financial Information */}
                    <div>
                        <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Search size={14} />
                            Financial Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                <span className="block text-xs text-slate-500 mb-1">Purchase Price</span>
                                <span className="block text-2xl font-bold text-white">₹{tractor.purchase_price.toLocaleString()}</span>
                            </div>
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                <span className="block text-xs text-slate-500 mb-1">Supplier</span>
                                <span className="block text-lg font-medium text-white">{tractor.supplier_name}</span>
                            </div>
                            {tractor.status === 'sold' && tractor.sale_price && (
                                <div className="bg-emerald-900/10 p-4 rounded-xl border border-emerald-500/20">
                                    <span className="block text-xs text-emerald-500/70 mb-1">Sale Price</span>
                                    <span className="block text-2xl font-bold text-emerald-400">₹{tractor.sale_price.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {tractor.notes && (
                        <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                            <span className="block text-xs text-slate-500 mb-2 font-bold uppercase">Notes</span>
                            <p className="text-slate-300 leading-relaxed">{tractor.notes}</p>
                        </div>
                    )}

                    {/* Exchange Information */}
                    {(tractor.exchange_tractor) && (
                        <>
                            <div className="h-px bg-slate-800" />
                            <div className="bg-amber-900/10 border border-amber-500/20 rounded-2xl overflow-hidden">
                                <div className="bg-amber-500/10 px-6 py-3 border-b border-amber-500/10 flex items-center gap-2">
                                    <TractorIcon size={16} className="text-amber-500" />
                                    <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider">Exchange Vehicle</h3>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <span className="block text-xs text-amber-500/60 mb-1">Vehicle</span>
                                            <span className="block text-xl font-bold text-white">
                                                {tractor.exchange_tractor.brand} {tractor.exchange_tractor.brand}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-xs text-amber-500/60 mb-1">Exchange Value</span>
                                            <span className="block text-xl font-bold text-amber-400">
                                                ₹{tractor.exchange_tractor.purchase_price.toLocaleString()}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-xs text-amber-500/60 mb-1">Chassis No.</span>
                                            <span className="block text-base font-mono text-white/80">
                                                {tractor.exchange_tractor.chassis_number}
                                            </span>
                                        </div>
                                    </div>
                                    {tractor.exchange_tractor.notes && (
                                        <div className="mt-4 pt-4 border-t border-amber-500/10">
                                            <span className="block text-xs text-amber-500/60 mb-1">Notes</span>
                                            <p className="text-slate-300 text-sm">{tractor.exchange_tractor.notes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
