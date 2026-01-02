'use client';

import { useEffect, useState } from 'react';
import { serviceApi, partsApi, tractorApi } from '@/src/api';
import type { ServiceRecord, SparePart, Tractor } from '@/src/types';
import { Plus, Wrench, X, Calendar, Pencil, Trash2, Tractor as TractorIcon } from 'lucide-react';
import { DeleteConfirmationModal } from '@/src/components/DeleteConfirmationModal';

export function Services() {
    const [services, setServices] = useState<ServiceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingService, setEditingService] = useState<ServiceRecord | null>(null);
    const [tractors, setTractors] = useState<Tractor[]>([]);

    // Delete modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [serviceToDelete, setServiceToDelete] = useState<ServiceRecord | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [servicesList, tractorsList] = await Promise.all([
                serviceApi.list(),
                tractorApi.list() // Get all tractors to map names if needed
            ]);
            setServices(servicesList || []);
            setTractors(tractorsList || []);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (service: ServiceRecord) => {
        setEditingService(service);
        setShowAddModal(true);
    };

    const handleDeleteClick = (service: ServiceRecord) => {
        setServiceToDelete(service);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!serviceToDelete) return;

        setIsDeleting(true);
        try {
            await serviceApi.delete(serviceToDelete.id);
            await loadData();
            setShowDeleteModal(false);
            setServiceToDelete(null);
        } catch (error) {
            console.error('Failed to delete service:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const getTractorName = (id?: number) => {
        if (!id) return null;
        const tractor = tractors.find(t => t.id === id);
        return tractor ? `${tractor.brand} ${tractor.model} (${tractor.chassis_number})` : 'Unknown Tractor';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Services</h1>
                    <p className="text-slate-400 mt-1">Track repair and maintenance services</p>
                </div>
                <button
                    onClick={() => {
                        setEditingService(null);
                        setShowAddModal(true);
                    }}
                    className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl"
                >
                    <Plus size={20} />
                    Log Service
                </button>
            </div>

            {/* Services List */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
            ) : services.length === 0 ? (
                <div className="text-center py-12 glass-panel rounded-2xl">
                    <Wrench className="mx-auto text-slate-500 mb-4" size={48} />
                    <h3 className="text-xl font-semibold text-white mb-2">No services logged</h3>
                    <p className="text-slate-400">Log your first service to get started</p>
                </div>
            ) : (
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left p-4 text-slate-400 font-medium">Service Description</th>
                                    <th className="text-left p-4 text-slate-400 font-medium">Customer / Tractor</th>
                                    <th className="text-left p-4 text-slate-400 font-medium">Date</th>
                                    <th className="text-right p-4 text-slate-400 font-medium">Labor Cost</th>
                                    <th className="text-right p-4 text-slate-400 font-medium">Parts Cost</th>
                                    <th className="text-right p-4 text-slate-400 font-medium">Total</th>
                                    <th className="text-right p-4 text-slate-400 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {services.map((service) => (
                                    <tr key={service.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                                    <Wrench className="text-orange-400" size={18} />
                                                </div>
                                                <div className="text-white font-medium">{service.description}</div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm text-white">{service.customer_name}</div>
                                            {service.tractor_id && (
                                                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-emerald-400">
                                                    <TractorIcon size={12} />
                                                    {getTractorName(service.tractor_id)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-300">
                                                <Calendar size={14} className="text-slate-500" />
                                                {service.service_date}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="text-slate-300">₹{service.labor_cost.toLocaleString()}</span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="text-slate-300">₹{service.parts_cost.toLocaleString()}</span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="font-bold text-emerald-400">₹{service.total_cost.toLocaleString()}</span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(service)}
                                                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(service)}
                                                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
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

            {/* Add/Edit Service Modal */}
            {showAddModal && (
                <AddServiceModal
                    initialData={editingService}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        loadData(); // Reload both services and tractors to be safe
                    }}
                />
            )}

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setServiceToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                title="Delete Service Record"
                message="Are you sure you want to delete this service record? This will permanently remove it from the database."
                itemName={serviceToDelete ? `${serviceToDelete.description} (${serviceToDelete.customer_name})` : undefined}
                isDeleting={isDeleting}
            />
        </div>
    );
}

// Add/Edit Service Modal
interface AddServiceModalProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData: ServiceRecord | null;
}

interface SelectedPart {
    part_id: number;
    name: string;
    quantity: number;
    unit_price: number;
}

function AddServiceModal({ onClose, onSuccess, initialData }: AddServiceModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [parts, setParts] = useState<SparePart[]>([]);
    const [tractors, setTractors] = useState<Tractor[]>([]);
    const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);
    const [formData, setFormData] = useState({
        customer_name: initialData?.customer_name || '',
        description: initialData?.description || '',
        labor_cost: initialData?.labor_cost || 0,
        parts_cost: initialData?.parts_cost || 0,
        parts_used: initialData?.parts_used || '',
        service_date: initialData?.service_date || new Date().toISOString().split('T')[0],
        tractor_id: initialData?.tractor_id || undefined as number | undefined,
    });

    // Load parts and tractors on mount
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [partsList, tractorsList] = await Promise.all([
                    partsApi.list(),
                    tractorApi.list() // Get all tractors (stock + sold) because we might service sold tractors
                ]);
                setParts(partsList);
                setTractors(tractorsList);

                // If editing and parts_used exists, parse it
                if (initialData?.parts_used) {
                    try {
                        const parsed = JSON.parse(initialData.parts_used);
                        if (Array.isArray(parsed)) {
                            setSelectedParts(parsed);
                        }
                    } catch (e) {
                        // If not JSON, try to parse old format
                        console.warn('Could not parse parts_used:', e);
                    }
                }
            } catch (error) {
                console.error('Failed to load form data:', error);
            }
        };
        loadInitialData();
    }, [initialData]);

    // Calculate parts cost from selected parts
    useEffect(() => {
        const calculatedCost = selectedParts.reduce((sum, part) => sum + (part.unit_price * part.quantity), 0);
        setFormData(prev => ({ ...prev, parts_cost: calculatedCost }));

        // Update parts_used JSON
        const partsUsedJson = JSON.stringify(selectedParts);
        setFormData(prev => ({ ...prev, parts_used: partsUsedJson }));
    }, [selectedParts]);

    const handleAddPart = () => {
        if (parts.length > 0) {
            const firstPart = parts[0];
            setSelectedParts([...selectedParts, {
                part_id: firstPart.id,
                name: firstPart.name,
                quantity: 1,
                unit_price: firstPart.unit_price,
            }]);
        }
    };

    const handleRemovePart = (index: number) => {
        setSelectedParts(selectedParts.filter((_, i) => i !== index));
    };

    const handlePartChange = (index: number, field: keyof SelectedPart, value: any) => {
        const updated = [...selectedParts];
        if (field === 'part_id') {
            const part = parts.find(p => p.id === value);
            if (part) {
                updated[index] = {
                    ...updated[index],
                    part_id: part.id,
                    name: part.name,
                    unit_price: part.unit_price,
                };
            }
        } else {
            updated[index] = { ...updated[index], [field]: value };
        }
        setSelectedParts(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const submitData = {
                ...formData,
                parts_used: JSON.stringify(selectedParts),
            };
            if (initialData) {
                await serviceApi.update(initialData.id, submitData);
            } else {
                await serviceApi.create(submitData);
            }
            onSuccess();
        } catch (error) {
            console.error('Failed to log service:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalCost = formData.labor_cost + formData.parts_cost;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-surface border border-white/10 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-white/5 flex-shrink-0">
                    <h2 className="text-xl font-bold text-white">{initialData ? 'Edit Service' : 'Log New Service'}</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Tractor (Optional)</label>
                        <div className="relative">
                            <select
                                value={formData.tractor_id || ''}
                                onChange={(e) => setFormData({ ...formData, tractor_id: e.target.value ? parseInt(e.target.value) : undefined })}
                                className="input-field w-full px-4 py-3 appearance-none"
                            >
                                <option value="" className="bg-surface text-slate-400">-- Select Tractor --</option>
                                {tractors.map((tractor) => (
                                    <option key={tractor.id} value={tractor.id} className="bg-surface text-white">
                                        {tractor.brand} {tractor.model} ({tractor.chassis_number}) - {tractor.status === 'in_stock' ? 'In Stock' : 'Sold'}
                                    </option>
                                ))}
                            </select>
                            <TractorIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Select if this service is for a specific tractor</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Customer Name</label>
                        <input
                            type="text"
                            value={formData.customer_name}
                            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                            className="input-field w-full px-4 py-3"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Service Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="input-field w-full px-4 py-3"
                            rows={3}
                            placeholder="e.g., Engine overhaul, oil change, brake repair..."
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Labor Cost (₹)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                                <input
                                    type="number"
                                    value={formData.labor_cost}
                                    onChange={(e) => setFormData({ ...formData, labor_cost: parseFloat(e.target.value) || 0 })}
                                    className="input-field w-full pl-8 pr-4 py-3"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Parts Cost (₹)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                                <input
                                    type="number"
                                    value={formData.parts_cost}
                                    onChange={(e) => setFormData({ ...formData, parts_cost: parseFloat(e.target.value) || 0 })}
                                    className="input-field w-full pl-8 pr-4 py-3"
                                />
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-slate-300">Parts Used</label>
                            <button
                                type="button"
                                onClick={handleAddPart}
                                className="text-sm text-primary hover:text-emerald-300 font-medium transition-colors"
                            >
                                + Add Part
                            </button>
                        </div>
                        {selectedParts.length === 0 ? (
                            <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-center text-slate-400 text-sm">
                                No parts selected. Click "+ Add Part" to add parts.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {selectedParts.map((selectedPart, index) => (
                                    <div key={index} className="p-3 bg-white/5 border border-white/10 rounded-xl">
                                        <div className="grid grid-cols-12 gap-2 items-end">
                                            <div className="col-span-5">
                                                <label className="block text-xs text-slate-400 mb-1">Part</label>
                                                <select
                                                    value={selectedPart.part_id}
                                                    onChange={(e) => handlePartChange(index, 'part_id', parseInt(e.target.value))}
                                                    className="input-field w-full px-3 py-2 text-sm bg-surface"
                                                >
                                                    {parts.map(part => (
                                                        <option key={part.id} value={part.id} className="bg-surface">
                                                            {part.name} (Stock: {part.stock_quantity})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-span-3">
                                                <label className="block text-xs text-slate-400 mb-1">Qty</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max={parts.find(p => p.id === selectedPart.part_id)?.stock_quantity || 1}
                                                    value={selectedPart.quantity}
                                                    onChange={(e) => handlePartChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                                    className="input-field w-full px-3 py-2 text-sm"
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <label className="block text-xs text-slate-400 mb-1">Price</label>
                                                <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm">
                                                    ₹{(selectedPart.unit_price * selectedPart.quantity).toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="col-span-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemovePart(index)}
                                                    className="w-full p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="mt-2 text-right">
                            <span className="text-sm text-slate-400">Total Parts Cost: </span>
                            <span className="text-sm font-semibold text-primary">₹{formData.parts_cost.toLocaleString()}</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Service Date</label>
                        <div className="relative">
                            <input
                                type="date"
                                value={formData.service_date}
                                onChange={(e) => setFormData({ ...formData, service_date: e.target.value })}
                                className="input-field w-full px-4 py-3"
                                required
                            />
                            <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>
                    </div>
                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl flex-shrink-0">
                        <div className="flex justify-between text-lg">
                            <span className="text-slate-300">Total Cost:</span>
                            <span className="text-primary font-bold">₹{totalCost.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="flex-shrink-0 pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-primary w-full py-3 rounded-xl disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : initialData ? 'Update Service' : 'Log Service'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
