import { useEffect, useState } from 'react';
import { partsApi } from '../api';
import type { SparePart } from '../types';
import { Plus, Package, X, Search, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';

export function Parts() {
    const [parts, setParts] = useState<SparePart[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showSellModal, setShowSellModal] = useState(false);
    const [selectedPart, setSelectedPart] = useState<SparePart | null>(null);
    const [editingPart, setEditingPart] = useState<SparePart | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showLowStock, setShowLowStock] = useState(false);

    // Delete modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [partToDelete, setPartToDelete] = useState<SparePart | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        loadParts();
    }, [showLowStock]);

    const loadParts = async () => {
        try {
            const result = await partsApi.list(showLowStock);
            setParts(result || []);
        } catch (error) {
            console.error('Failed to load parts:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSell = (part: SparePart) => {
        setSelectedPart(part);
        setShowSellModal(true);
    };

    const handleEdit = (part: SparePart) => {
        setEditingPart(part);
        setShowAddModal(true);
    };

    const handleDeleteClick = (part: SparePart) => {
        setPartToDelete(part);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!partToDelete) return;

        setIsDeleting(true);
        try {
            await partsApi.delete(partToDelete.id);
            await loadParts();
            setShowDeleteModal(false);
            setPartToDelete(null);
        } catch (error) {
            console.error('Failed to delete part:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredParts = parts.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.part_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Spare Parts</h1>
                    <p className="text-slate-400 mt-1">Manage spare parts inventory</p>
                </div>
                <button
                    onClick={() => {
                        setEditingPart(null);
                        setShowAddModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all"
                >
                    <Plus size={20} />
                    Add Part
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name, part number, or category..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
                <button
                    onClick={() => setShowLowStock(!showLowStock)}
                    className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${showLowStock
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-700/50'
                        }`}
                >
                    <AlertTriangle size={18} />
                    Low Stock
                </button>
            </div>

            {/* Parts Table */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
                </div>
            ) : filteredParts.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/50 border border-slate-700 rounded-2xl">
                    <Package className="mx-auto text-slate-500 mb-4" size={48} />
                    <h3 className="text-xl font-semibold text-white mb-2">No parts found</h3>
                    <p className="text-slate-400">Add your first spare part to get started</p>
                </div>
            ) : (
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left p-4 text-slate-400 font-medium">Part Name</th>
                                    <th className="text-left p-4 text-slate-400 font-medium">Part Number</th>
                                    <th className="text-left p-4 text-slate-400 font-medium">Category</th>
                                    <th className="text-right p-4 text-slate-400 font-medium">Stock</th>
                                    <th className="text-right p-4 text-slate-400 font-medium">Unit Price</th>
                                    <th className="text-right p-4 text-slate-400 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredParts.map((part) => (
                                    <tr key={part.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                                    <Package className="text-purple-400" size={18} />
                                                </div>
                                                <span className="text-white font-medium">{part.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-300 font-mono">{part.part_number}</td>
                                        <td className="p-4">
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-700 text-slate-300">
                                                {part.category}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className={`font-semibold ${part.stock_quantity <= part.min_stock ? 'text-red-400' : 'text-white'
                                                }`}>
                                                {part.stock_quantity}
                                            </span>
                                            {part.stock_quantity <= part.min_stock && (
                                                <AlertTriangle className="inline ml-2 text-amber-400" size={16} />
                                            )}
                                        </td>
                                        <td className="p-4 text-right text-white">₹{part.unit_price.toLocaleString()}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleSell(part)}
                                                    disabled={part.stock_quantity === 0}
                                                    className="px-3 py-1 bg-blue-500/20 text-blue-400 font-medium rounded-lg hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                                >
                                                    Sell
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(part)}
                                                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(part)}
                                                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add/Edit Part Modal */}
            {showAddModal && (
                <AddPartModal
                    initialData={editingPart}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        loadParts();
                    }}
                />
            )}

            {/* Sell Part Modal */}
            {showSellModal && selectedPart && (
                <SellPartModal
                    part={selectedPart}
                    onClose={() => {
                        setShowSellModal(false);
                        setSelectedPart(null);
                    }}
                    onSuccess={() => {
                        setShowSellModal(false);
                        setSelectedPart(null);
                        loadParts();
                    }}
                />
            )}

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setPartToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                title="Delete Part"
                message="Are you sure you want to delete this spare part? This will permanently remove it from your inventory."
                itemName={partToDelete ? `${partToDelete.name} (${partToDelete.part_number})` : undefined}
                isDeleting={isDeleting}
            />
        </div>
    );
}

// Add/Edit Part Modal Component
interface AddPartModalProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData: SparePart | null;
}

function AddPartModal({ onClose, onSuccess, initialData }: AddPartModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        part_number: initialData?.part_number || '',
        category: initialData?.category || '',
        stock_quantity: initialData?.stock_quantity || 0,
        unit_price: initialData?.unit_price || 0,
        min_stock: initialData?.min_stock || 5,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (initialData) {
                await partsApi.update(initialData.id, formData);
            } else {
                await partsApi.create(formData);
            }
            onSuccess();
        } catch (error) {
            console.error('Failed to save part:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-2xl shadow-xl">
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white">{initialData ? 'Edit Part' : 'Add New Spare Part'}</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Part Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white"
                            placeholder="e.g., Oil Filter"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Part Number</label>
                            <input
                                type="text"
                                value={formData.part_number}
                                onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                            <input
                                type="text"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white"
                                placeholder="e.g., Filters"
                                required
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Stock Qty</label>
                            <input
                                type="number"
                                value={formData.stock_quantity}
                                onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) })}
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Unit Price (₹)</label>
                            <input
                                type="number"
                                value={formData.unit_price}
                                onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) })}
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Min Stock</label>
                            <input
                                type="number"
                                value={formData.min_stock}
                                onChange={(e) => setFormData({ ...formData, min_stock: parseInt(e.target.value) })}
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Saving...' : initialData ? 'Update Part' : 'Add Part'}
                    </button>
                </form>
            </div>
        </div>
    );
}

// Sell Part Modal
function SellPartModal({
    part,
    onClose,
    onSuccess
}: {
    part: SparePart;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [customerName, setCustomerName] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            await partsApi.sell(part.id, quantity, customerName);
            onSuccess();
        } catch (err: any) {
            console.error('Failed to sell part:', err);
            // Extract error message from API response if available
            const errorMessage = err.response?.data?.error || 'Failed to sell part. Please try again.';
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const total = quantity * part.unit_price;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-xl">
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white">Sell Part</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                    <div className="p-4 bg-slate-700/30 rounded-xl">
                        <p className="text-white font-medium">{part.name}</p>
                        <p className="text-sm text-slate-400">Part #: {part.part_number}</p>
                        <p className="text-sm text-slate-400">Available: {part.stock_quantity} | Price: ₹{part.unit_price}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Quantity</label>
                        <input
                            type="number"
                            min={1}
                            max={part.stock_quantity}
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value))}
                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Customer Name</label>
                        <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white"
                            required
                        />
                    </div>
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <div className="flex justify-between text-lg">
                            <span className="text-slate-300">Total:</span>
                            <span className="text-emerald-400 font-bold">₹{total.toLocaleString()}</span>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Processing...' : 'Confirm Sale'}
                    </button>
                </form>
            </div>
        </div>
    );
}
