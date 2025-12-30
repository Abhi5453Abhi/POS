import { useEffect, useState } from 'react';
import { tractorApi } from '../api';
import type { Tractor, TractorType } from '../types';
import { Plus, Tractor as TractorIcon, X, Search, Pencil, Trash2 } from 'lucide-react';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';

export function Tractors() {
    const [tractors, setTractors] = useState<Tractor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showSellModal, setShowSellModal] = useState(false);
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

    const handleEdit = async (tractor: Tractor) => {
        // If tractor has exchange_tractor_id but no exchange_tractor data, fetch full details
        if (tractor.exchange_tractor_id && !tractor.exchange_tractor) {
            try {
                const fullTractor = await tractorApi.get(tractor.id);
                setEditingTractor(fullTractor);
            } catch (error) {
                console.error('Failed to fetch full tractor details:', error);
                setEditingTractor(tractor);
            }
        } else {
            setEditingTractor(tractor);
        }
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

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by brand, model, or chassis number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl border border-slate-700 backdrop-blur-sm">
                    {(['all', 'in_stock', 'sold'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === f
                                ? 'bg-blue-600 text-white shadow-lg'
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
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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
                                    <th className="text-right p-4 text-slate-400 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTractors.map((tractor) => (
                                    <tr
                                        key={tractor.id}
                                        onClick={() => setViewTractor(tractor)}
                                        className="border-b border-slate-700/50 hover:bg-slate-700/40 cursor-pointer transition-colors"
                                    >
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                                    <TractorIcon className="text-blue-500" size={20} />
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
                                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                : 'bg-slate-700 text-slate-300 border-slate-600'
                                                }`}>
                                                {tractor.status === 'in_stock' ? 'In Stock' : 'Sold'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="text-white">₹{tractor.purchase_price.toLocaleString()}</div>
                                        </td>
                                        <td className="p-4 text-right">
                                            {tractor.status === 'sold' && tractor.sale_price ? (
                                                <div className="flex flex-col items-end">
                                                    <div className="text-emerald-400 font-medium">₹{tractor.sale_price.toLocaleString()}</div>
                                                    {tractor.exchange_tractor ? (
                                                        <div className="text-xs text-amber-500 flex items-center gap-1 justify-end" title={`Exchanged for ${tractor.exchange_tractor.brand} ${tractor.exchange_tractor.model} (Valued at ₹${tractor.exchange_tractor.purchase_price.toLocaleString()})`}>
                                                            <span>+ Exch.</span>
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-slate-500">Sold</div>
                                                    )}
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
                                                        className="px-4 py-2 bg-blue-500/20 text-blue-400 font-medium rounded-lg hover:bg-blue-500/30 text-sm transition-colors"
                                                    >
                                                        Sell
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEdit(tractor);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-white hover:bg-blue-600/20 hover:border-blue-500/50 border border-transparent rounded-lg transition-all"
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
    const [formData, setFormData] = useState({
        brand: initialData?.brand || '',
        model: initialData?.model || '',
        year: initialData?.year || new Date().getFullYear(),
        type: initialData?.type || 'new' as TractorType,
        chassis_number: initialData?.chassis_number || '',
        engine_number: initialData?.engine_number || '',
        purchase_price: initialData?.purchase_price || 0,
        supplier_name: initialData?.supplier_name || '',
        notes: initialData?.notes || '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (initialData) {
                await tractorApi.update(initialData.id, formData);
            } else {
                await tractorApi.create(formData);
            }
            onSuccess();
        } catch (error) {
            console.error('Failed to save tractor:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-2xl shadow-xl">
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white">{initialData ? 'Edit Tractor' : 'Add New Tractor'}</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Brand</label>
                            <input
                                type="text"
                                value={formData.brand}
                                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="e.g., Mahindra"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Model</label>
                            <input
                                type="text"
                                value={formData.model}
                                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="e.g., 575 DI"
                                required
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Year</label>
                            <input
                                type="number"
                                value={formData.year}
                                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Type</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as TractorType })}
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                                value={formData.chassis_number}
                                onChange={(e) => setFormData({ ...formData, chassis_number: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Engine Number</label>
                            <input
                                type="text"
                                value={formData.engine_number}
                                onChange={(e) => setFormData({ ...formData, engine_number: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                required
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Purchase Price (₹)</label>
                            <input
                                type="number"
                                value={formData.purchase_price}
                                onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) })}
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Supplier Name</label>
                            <input
                                type="text"
                                value={formData.supplier_name}
                                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white min-h-[80px] focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            rows={3}
                        />
                    </div>
                    {(initialData?.exchange_tractor || initialData?.exchange_tractor_id) && (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-semibold text-amber-500 uppercase">🔄 Exchange Tractor</span>
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
                                                className="px-3 py-1.5 text-xs bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 rounded-lg transition-colors flex items-center gap-1"
                                            >
                                                <Pencil size={12} />
                                                Edit
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
                                                className="px-3 py-1.5 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors flex items-center gap-1"
                                            >
                                                <Trash2 size={12} />
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            {initialData.exchange_tractor ? (
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Brand & Model:</span>
                                        <span className="text-white font-medium">{initialData.exchange_tractor.brand} {initialData.exchange_tractor.model}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Year:</span>
                                        <span className="text-white">{initialData.exchange_tractor.year}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Chassis Number:</span>
                                        <span className="text-white font-mono">{initialData.exchange_tractor.chassis_number}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Engine Number:</span>
                                        <span className="text-white font-mono">{initialData.exchange_tractor.engine_number}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Exchange Value:</span>
                                        <span className="text-amber-500 font-semibold">₹{initialData.exchange_tractor.purchase_price.toLocaleString()}</span>
                                    </div>
                                    {initialData.exchange_tractor.notes && (
                                        <div className="mt-2 pt-2 border-t border-amber-500/20">
                                            <span className="text-slate-400">Notes: </span>
                                            <span className="text-white">{initialData.exchange_tractor.notes}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-sm text-slate-400 italic">
                                    Exchange tractor ID: {initialData.exchange_tractor_id} (Details not loaded)
                                </div>
                            )}
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {isSubmitting ? 'Saving...' : initialData ? 'Update Tractor' : 'Add Tractor'}
                    </button>
                </form>
            </div>
        </div>
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
    const [isExchange, setIsExchange] = useState(false);
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

    // Calculate profit/loss
    const calculateProfitLoss = () => {
        if (!salePrice) return 0;
        const baseProfit = salePrice - tractor.purchase_price;
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
            await tractorApi.sell(tractor.id, salePrice, customerName, isExchange, exchangeData);
            onSuccess();
        } catch (error) {
            console.error('Failed to sell tractor:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-slate-800 border border-slate-700 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between p-6 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
                    <h2 className="text-xl font-bold text-white">Sell Tractor</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Tractor Info */}
                    <div className="p-4 bg-slate-700/50 rounded-xl border border-slate-600">
                        <p className="text-white font-medium text-lg">{tractor.brand} {tractor.model}</p>
                        <p className="text-sm text-slate-400">Chassis: {tractor.chassis_number}</p>
                        <p className="text-sm text-slate-400">Purchase Price: ₹{tractor.purchase_price.toLocaleString()}</p>
                    </div>

                    {/* Sale Details */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Sale Price (₹)</label>
                            <input
                                type="number"
                                step="1"
                                value={salePrice || ''}
                                onChange={(e) => setSalePrice(parseInt(e.target.value) || 0)}
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Customer Name</label>
                            <input
                                type="text"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                required
                            />
                        </div>
                    </div>

                    {/* Exchange Option */}
                    <div className="flex items-center gap-3 p-4 bg-slate-700/30 rounded-xl border border-slate-600">
                        <input
                            type="checkbox"
                            id="isExchange"
                            checked={isExchange}
                            onChange={(e) => setIsExchange(e.target.checked)}
                            className="w-5 h-5 rounded border-slate-500 bg-slate-700 text-blue-500 focus:ring-blue-500"
                        />
                        <label htmlFor="isExchange" className="text-white font-medium cursor-pointer">
                            This is an exchange
                        </label>
                    </div>

                    {/* Exchange Tractor Form */}
                    {isExchange && (
                        <div className="space-y-4 p-4 bg-slate-700/20 rounded-xl border border-slate-600">
                            <h3 className="text-lg font-bold text-white mb-4">Exchange Tractor Details</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Brand</label>
                                    <input
                                        type="text"
                                        value={exchangeTractor.brand}
                                        onChange={(e) => setExchangeTractor({ ...exchangeTractor, brand: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        required={isExchange}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Type</label>
                                    <select
                                        value={exchangeTractor.type}
                                        onChange={(e) => setExchangeTractor({ ...exchangeTractor, type: e.target.value as TractorType })}
                                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        required={isExchange}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Engine Number</label>
                                    <input
                                        type="text"
                                        value={exchangeTractor.engine_number}
                                        onChange={(e) => setExchangeTractor({ ...exchangeTractor, engine_number: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        required={isExchange}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Exchange Value (₹)</label>
                                    <input
                                        type="number"
                                        step="1"
                                        value={exchangeTractor.purchase_price || ''}
                                        onChange={(e) => setExchangeTractor({ ...exchangeTractor, purchase_price: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder="Value of exchanged tractor"
                                        required={isExchange}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Supplier Name</label>
                                    <input
                                        type="text"
                                        value={exchangeTractor.supplier_name}
                                        onChange={(e) => setExchangeTractor({ ...exchangeTractor, supplier_name: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder="Will use customer name if empty"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Notes</label>
                                <textarea
                                    value={exchangeTractor.notes}
                                    onChange={(e) => setExchangeTractor({ ...exchangeTractor, notes: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white min-h-[80px] focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}

                    {/* Profit/Loss Display */}
                    {salePrice > 0 && (
                        <div className={`p-4 rounded-xl border ${profitLoss >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-300">Profit / Loss:</span>
                                <span className={`text-lg font-bold ${profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {profitLoss >= 0 ? '+' : ''}₹{Math.abs(profitLoss).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4 border-t border-slate-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 bg-slate-700 text-white font-medium rounded-xl hover:bg-slate-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || (isExchange && (!exchangeTractor.brand || !exchangeTractor.model || !exchangeTractor.chassis_number || !exchangeTractor.engine_number))}
                            className="flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20"
                        >
                            {isSubmitting ? 'Processing...' : 'Confirm Sale'}
                        </button>
                    </div>
                </form>
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
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
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
                        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
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
