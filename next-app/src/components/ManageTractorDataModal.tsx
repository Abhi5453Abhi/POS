import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Check, ArrowLeft } from 'lucide-react';
import { tractorApi } from '../api';
import type { TractorBrand, TractorModel } from '../types';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

interface ManageTractorDataModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ManageTractorDataModal: React.FC<ManageTractorDataModalProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'brands' | 'models'>('brands');
    const [brands, setBrands] = useState<TractorBrand[]>([]);
    const [models, setModels] = useState<TractorModel[]>([]);
    const [loading, setLoading] = useState(false);
    const [newBrandName, setNewBrandName] = useState('');
    const [newModelName, setNewModelName] = useState('');
    const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);

    // Editing states
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');

    // Delete Modal State
    const [deleteConfirmation, setDeleteConfirmation] = useState<{
        isOpen: boolean;
        type: 'brand' | 'model';
        id: number | null;
        name: string;
    }>({
        isOpen: false,
        type: 'brand',
        id: null,
        name: '',
    });
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    useEffect(() => {
        if (activeTab === 'models' && brands.length > 0 && !selectedBrandId) {
            setSelectedBrandId(brands[0].id);
        }
    }, [activeTab, brands, selectedBrandId]);

    useEffect(() => {
        if (activeTab === 'models' && selectedBrandId) {
            loadModels(selectedBrandId);
        } else if (activeTab === 'models' && !selectedBrandId) {
            setModels([]);
        }
    }, [selectedBrandId, activeTab]);

    const loadData = async () => {
        try {
            setLoading(true);
            const brandsData = await tractorApi.listBrands();
            setBrands(brandsData || []);
        } catch (error) {
            console.error('Failed to load brands:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadModels = async (brandId: number) => {
        try {
            setLoading(true);
            const modelsData = await tractorApi.listModels(brandId);
            setModels(modelsData || []);
        } catch (error) {
            console.error('Failed to load models:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddBrand = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBrandName.trim()) return;

        try {
            await tractorApi.createBrand(newBrandName);
            setNewBrandName('');
            loadData();
        } catch (error) {
            console.error('Failed to add brand:', error);
            alert('Failed to create brand. It might already exist.');
        }
    };

    const handleAddModel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBrandId || !newModelName.trim()) return;

        try {
            await tractorApi.createModel(selectedBrandId, newModelName);
            setNewModelName('');
            loadModels(selectedBrandId);
        } catch (error) {
            console.error('Failed to add model:', error);
            alert('Failed to create model.');
        }
    };

    // Edit Handlers
    const startEditing = (id: number, currentName: string) => {
        setEditingId(id);
        setEditName(currentName);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditName('');
    };

    const saveEditBrand = async (id: number) => {
        if (!editName.trim()) return;
        try {
            await tractorApi.updateBrand(id, editName);
            setEditingId(null);
            loadData();
        } catch (error) {
            console.error('Failed to update brand:', error);
            alert('Failed to update brand. It might already exist.');
        }
    };

    const saveEditModel = async (id: number) => {
        if (!editName.trim()) return;
        try {
            await tractorApi.updateModel(id, editName);
            setEditingId(null);
            if (selectedBrandId) loadModels(selectedBrandId);
        } catch (error) {
            console.error('Failed to update model:', error);
            alert('Failed to update model. It might already exist.');
        }
    };

    // Delete Handlers
    const confirmDeleteBrand = (brand: TractorBrand) => {
        setDeleteConfirmation({
            isOpen: true,
            type: 'brand',
            id: brand.id,
            name: brand.name,
        });
    };

    const confirmDeleteModel = (model: TractorModel) => {
        setDeleteConfirmation({
            isOpen: true,
            type: 'model',
            id: model.id,
            name: model.name,
        });
    };

    const handleConfirmDelete = async () => {
        const { type, id } = deleteConfirmation;
        if (!id) return;

        setIsDeleting(true);
        try {
            if (type === 'brand') {
                await tractorApi.deleteBrand(id);
                loadData();
                if (selectedBrandId === id) setSelectedBrandId(null);
            } else {
                await tractorApi.deleteModel(id);
                if (selectedBrandId) loadModels(selectedBrandId);
            }
            setDeleteConfirmation({ ...deleteConfirmation, isOpen: false });
        } catch (error) {
            console.error(`Failed to delete ${type}:`, error);
            alert(`Failed to delete ${type}.`);
        } finally {
            setIsDeleting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-900 overflow-y-auto">
            <div className="min-h-screen flex flex-col">
                {/* Header */}
                <div className="bg-slate-800 border-b border-slate-700 p-4 sticky top-0 z-10 shadow-md">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"
                            >
                                <ArrowLeft size={24} />
                            </button>
                            <h2 className="text-2xl font-bold text-white">Manage Master Data</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 max-w-4xl mx-auto w-full p-6">
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl min-h-[600px]">
                        {/* Tabs */}
                        <div className="flex border-b border-slate-700">
                            <button
                                className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${activeTab === 'brands'
                                    ? 'text-emerald-400 border-b-2 border-emerald-400 bg-slate-700/30'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                    }`}
                                onClick={() => {
                                    setActiveTab('brands');
                                    cancelEditing();
                                }}
                            >
                                Brands
                            </button>
                            <button
                                className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${activeTab === 'models'
                                    ? 'text-emerald-400 border-b-2 border-emerald-400 bg-slate-700/30'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                    }`}
                                onClick={() => {
                                    setActiveTab('models');
                                    cancelEditing();
                                }}
                            >
                                Models
                            </button>
                        </div>

                        <div className="p-6">
                            {activeTab === 'brands' ? (
                                <div className="space-y-6">
                                    <form onSubmit={handleAddBrand} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newBrandName}
                                            onChange={(e) => setNewBrandName(e.target.value)}
                                            placeholder="Enter brand name"
                                            className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newBrandName.trim()}
                                            className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
                                        >
                                            <Plus size={20} />
                                            Add Brand
                                        </button>
                                    </form>

                                    <div className="space-y-2">
                                        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Existing Brands</h3>
                                        {loading ? (
                                            <div className="text-center py-8 text-slate-400">Loading...</div>
                                        ) : (brands || []).length === 0 ? (
                                            <div className="text-center py-8 text-slate-500 bg-slate-700/20 rounded-xl border border-dashed border-slate-700">
                                                No brands found
                                            </div>
                                        ) : (
                                            <div className="grid gap-2">
                                                {brands.map((brand) => (
                                                    <div
                                                        key={brand.id}
                                                        className="flex items-center justify-between p-4 bg-slate-700/30 border border-slate-700/50 rounded-xl hover:bg-slate-700/50 transition-colors group"
                                                    >
                                                        {editingId === brand.id ? (
                                                            <div className="flex-1 flex gap-2 mr-2">
                                                                <input
                                                                    type="text"
                                                                    value={editName}
                                                                    onChange={(e) => setEditName(e.target.value)}
                                                                    className="flex-1 px-3 py-1.5 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                                                                    autoFocus
                                                                />
                                                                <button
                                                                    onClick={() => saveEditBrand(brand.id)}
                                                                    className="p-1.5 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded-lg"
                                                                >
                                                                    <Check size={18} />
                                                                </button>
                                                                <button
                                                                    onClick={cancelEditing}
                                                                    className="p-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg"
                                                                >
                                                                    <X size={18} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="font-medium text-slate-200">{brand.name}</span>
                                                        )}

                                                        {editingId !== brand.id && (
                                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => startEditing(brand.id, brand.name)}
                                                                    className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-600/50 rounded-lg transition-colors"
                                                                    title="Edit"
                                                                >
                                                                    <Edit2 size={18} />
                                                                </button>
                                                                <button
                                                                    onClick={() => confirmDeleteBrand(brand)}
                                                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-600/50 rounded-lg transition-colors"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h3 className="text-sm font-medium text-slate-400 mb-2">Select Brand</h3>
                                            <div className="space-y-2 h-[400px] overflow-y-auto custom-scrollbar bg-slate-700/30 rounded-xl border border-slate-700/50 p-2">
                                                {(brands || []).map(brand => (
                                                    <button
                                                        key={brand.id}
                                                        onClick={() => {
                                                            setSelectedBrandId(brand.id);
                                                            cancelEditing();
                                                        }}
                                                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors font-medium flex items-center justify-between ${selectedBrandId === brand.id
                                                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                                                            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                                                            }`}
                                                    >
                                                        {brand.name}
                                                        {selectedBrandId === brand.id && (
                                                            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex flex-col h-full">
                                            <h3 className="text-sm font-medium text-slate-400 mb-2">
                                                {selectedBrandId
                                                    ? `Models for ${brands.find(b => b.id === selectedBrandId)?.name}`
                                                    : 'Models'}
                                            </h3>

                                            {selectedBrandId ? (
                                                <div className="flex-1 flex flex-col gap-4">
                                                    <form onSubmit={handleAddModel} className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={newModelName}
                                                            onChange={(e) => setNewModelName(e.target.value)}
                                                            placeholder="Enter model name"
                                                            className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                                                        />
                                                        <button
                                                            type="submit"
                                                            disabled={!newModelName.trim()}
                                                            className="px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            <Plus size={20} />
                                                        </button>
                                                    </form>

                                                    <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-2">
                                                        {loading ? (
                                                            <div className="text-center py-8 text-slate-400">Loading...</div>
                                                        ) : (models || []).length === 0 ? (
                                                            <div className="text-center py-8 text-slate-500 bg-slate-700/20 rounded-xl border border-dashed border-slate-700">
                                                                No models found
                                                            </div>
                                                        ) : (
                                                            models.map((model) => (
                                                                <div
                                                                    key={model.id}
                                                                    className="flex items-center justify-between p-3 bg-slate-700/30 border border-slate-700/50 rounded-xl hover:bg-slate-700/50 transition-colors group"
                                                                >
                                                                    {editingId === model.id ? (
                                                                        <div className="flex-1 flex gap-2 mr-2">
                                                                            <input
                                                                                type="text"
                                                                                value={editName}
                                                                                onChange={(e) => setEditName(e.target.value)}
                                                                                className="flex-1 px-3 py-1.5 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                                                                                autoFocus
                                                                            />
                                                                            <button
                                                                                onClick={() => saveEditModel(model.id)}
                                                                                className="p-1.5 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded-lg"
                                                                            >
                                                                                <Check size={16} />
                                                                            </button>
                                                                            <button
                                                                                onClick={cancelEditing}
                                                                                className="p-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg"
                                                                            >
                                                                                <X size={16} />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="font-medium text-slate-200">{model.name}</span>
                                                                    )}

                                                                    {editingId !== model.id && (
                                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button
                                                                                onClick={() => startEditing(model.id, model.name)}
                                                                                className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-600/50 rounded-lg transition-colors"
                                                                                title="Edit"
                                                                            >
                                                                                <Edit2 size={16} />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => confirmDeleteModel(model)}
                                                                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-600/50 rounded-lg transition-colors"
                                                                                title="Delete"
                                                                            >
                                                                                <Trash2 size={16} />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex-1 flex items-center justify-center text-slate-500 bg-slate-700/20 rounded-xl border border-dashed border-slate-700">
                                                    Select a brand to manage models
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <DeleteConfirmationModal
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}
                onConfirm={handleConfirmDelete}
                title={`Delete ${deleteConfirmation.type === 'brand' ? 'Brand' : 'Model'}`}
                message={
                    deleteConfirmation.type === 'brand'
                        ? 'Are you sure you want to delete this brand? This will permanently delete the brand and all associated models. This action cannot be undone.'
                        : 'Are you sure you want to delete this model? This action cannot be undone.'
                }
                itemName={deleteConfirmation.name}
                isDeleting={isDeleting}
            />
        </div>
    );
};

export default ManageTractorDataModal;
