import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Check, ArrowLeft } from 'lucide-react';
import { partsApi } from '../api';
import type { PartCategory, PartName } from '../types';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

interface ManagePartDataModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ManagePartDataModal: React.FC<ManagePartDataModalProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'categories' | 'names'>('categories');
    const [categories, setCategories] = useState<PartCategory[]>([]);
    const [partNames, setPartNames] = useState<PartName[]>([]);
    const [loading, setLoading] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newPartName, setNewPartName] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

    // Editing states
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');

    // Delete Modal State
    const [deleteConfirmation, setDeleteConfirmation] = useState<{
        isOpen: boolean;
        type: 'category' | 'name';
        id: number | null;
        name: string;
    }>({
        isOpen: false,
        type: 'category',
        id: null,
        name: '',
    });
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadCategories();
        }
    }, [isOpen]);

    useEffect(() => {
        if (activeTab === 'names' && categories.length > 0 && !selectedCategoryId) {
            setSelectedCategoryId(categories[0].id);
        }
    }, [activeTab, categories, selectedCategoryId]);

    useEffect(() => {
        if (activeTab === 'names' && selectedCategoryId) {
            loadPartNames(selectedCategoryId);
        } else if (activeTab === 'names' && !selectedCategoryId) {
            setPartNames([]);
        }
    }, [selectedCategoryId, activeTab]);

    const loadCategories = async () => {
        try {
            setLoading(true);
            const data = await partsApi.listCategories();
            setCategories(data || []);
        } catch (error) {
            console.error('Failed to load categories:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadPartNames = async (categoryId: number) => {
        try {
            setLoading(true);
            const data = await partsApi.listPartNames(categoryId);
            setPartNames(data || []);
        } catch (error) {
            console.error('Failed to load part names:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;

        try {
            await partsApi.createCategory(newCategoryName);
            setNewCategoryName('');
            loadCategories();
        } catch (error) {
            console.error('Failed to add category:', error);
            alert('Failed to create category. It might already exist.');
        }
    };

    const handleAddPartName = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCategoryId || !newPartName.trim()) return;

        try {
            await partsApi.createPartName(selectedCategoryId, newPartName);
            setNewPartName('');
            loadPartNames(selectedCategoryId);
        } catch (error) {
            console.error('Failed to add part name:', error);
            alert('Failed to create part name.');
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

    const saveEditCategory = async (id: number) => {
        if (!editName.trim()) return;
        try {
            await partsApi.updateCategory(id, editName);
            setEditingId(null);
            loadCategories();
        } catch (error) {
            console.error('Failed to update category:', error);
            alert('Failed to update category. It might already exist.');
        }
    };

    const saveEditPartName = async (id: number) => {
        if (!editName.trim()) return;
        try {
            await partsApi.updatePartName(id, editName);
            setEditingId(null);
            if (selectedCategoryId) loadPartNames(selectedCategoryId);
        } catch (error) {
            console.error('Failed to update part name:', error);
            alert('Failed to update part name.');
        }
    };

    // Delete Handlers
    const confirmDeleteCategory = (category: PartCategory) => {
        setDeleteConfirmation({
            isOpen: true,
            type: 'category',
            id: category.id,
            name: category.name,
        });
    };

    const confirmDeletePartName = (name: PartName) => {
        setDeleteConfirmation({
            isOpen: true,
            type: 'name',
            id: name.id,
            name: name.name,
        });
    };

    const handleConfirmDelete = async () => {
        const { type, id } = deleteConfirmation;
        if (!id) return;

        setIsDeleting(true);
        try {
            if (type === 'category') {
                await partsApi.deleteCategory(id);
                loadCategories();
                if (selectedCategoryId === id) setSelectedCategoryId(null);
            } else {
                await partsApi.deletePartName(id);
                if (selectedCategoryId) loadPartNames(selectedCategoryId);
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
                            <h2 className="text-2xl font-bold text-white">Manage Parts Master Data</h2>
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
                                className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${activeTab === 'categories'
                                    ? 'text-emerald-400 border-b-2 border-emerald-400 bg-slate-700/30'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                    }`}
                                onClick={() => {
                                    setActiveTab('categories');
                                    cancelEditing();
                                }}
                            >
                                Categories
                            </button>
                            <button
                                className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${activeTab === 'names'
                                    ? 'text-emerald-400 border-b-2 border-emerald-400 bg-slate-700/30'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                    }`}
                                onClick={() => {
                                    setActiveTab('names');
                                    cancelEditing();
                                }}
                            >
                                Part Names
                            </button>
                        </div>

                        <div className="p-6">
                            {activeTab === 'categories' ? (
                                <div className="space-y-6">
                                    <form onSubmit={handleAddCategory} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            placeholder="Enter category name"
                                            className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newCategoryName.trim()}
                                            className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
                                        >
                                            <Plus size={20} />
                                            Add Category
                                        </button>
                                    </form>

                                    <div className="space-y-2">
                                        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Existing Categories</h3>
                                        {loading && categories.length === 0 ? (
                                            <div className="text-center py-8 text-slate-400">Loading...</div>
                                        ) : (categories || []).length === 0 ? (
                                            <div className="text-center py-8 text-slate-500 bg-slate-700/20 rounded-xl border border-dashed border-slate-700">
                                                No categories found
                                            </div>
                                        ) : (
                                            <div className="grid gap-2">
                                                {categories.map((category) => (
                                                    <div
                                                        key={category.id}
                                                        className="flex items-center justify-between p-4 bg-slate-700/30 border border-slate-700/50 rounded-xl hover:bg-slate-700/50 transition-colors group"
                                                    >
                                                        {editingId === category.id ? (
                                                            <div className="flex-1 flex gap-2 mr-2">
                                                                <input
                                                                    type="text"
                                                                    value={editName}
                                                                    onChange={(e) => setEditName(e.target.value)}
                                                                    className="flex-1 px-3 py-1.5 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                                                                    autoFocus
                                                                />
                                                                <button
                                                                    onClick={() => saveEditCategory(category.id)}
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
                                                            <span className="font-medium text-slate-200">{category.name}</span>
                                                        )}

                                                        {editingId !== category.id && (
                                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => startEditing(category.id, category.name)}
                                                                    className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-600/50 rounded-lg transition-colors"
                                                                    title="Edit"
                                                                >
                                                                    <Edit2 size={18} />
                                                                </button>
                                                                <button
                                                                    onClick={() => confirmDeleteCategory(category)}
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
                                            <h3 className="text-sm font-medium text-slate-400 mb-2">Select Category</h3>
                                            <div className="space-y-2 h-[400px] overflow-y-auto custom-scrollbar bg-slate-700/30 rounded-xl border border-slate-700/50 p-2">
                                                {(categories || []).map(category => (
                                                    <button
                                                        key={category.id}
                                                        onClick={() => {
                                                            setSelectedCategoryId(category.id);
                                                            cancelEditing();
                                                        }}
                                                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors font-medium flex items-center justify-between ${selectedCategoryId === category.id
                                                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                                                            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                                                            }`}
                                                    >
                                                        {category.name}
                                                        {selectedCategoryId === category.id && (
                                                            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex flex-col h-full">
                                            <h3 className="text-sm font-medium text-slate-400 mb-2">
                                                {selectedCategoryId
                                                    ? `Names for ${categories.find(c => c.id === selectedCategoryId)?.name}`
                                                    : 'Part Names'}
                                            </h3>

                                            {selectedCategoryId ? (
                                                <div className="flex-1 flex flex-col gap-4">
                                                    <form onSubmit={handleAddPartName} className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={newPartName}
                                                            onChange={(e) => setNewPartName(e.target.value)}
                                                            placeholder="Enter part name"
                                                            className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                                                        />
                                                        <button
                                                            type="submit"
                                                            disabled={!newPartName.trim()}
                                                            className="px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            <Plus size={20} />
                                                        </button>
                                                    </form>

                                                    <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-2">
                                                        {loading && partNames.length === 0 ? (
                                                            <div className="text-center py-8 text-slate-400">Loading...</div>
                                                        ) : (partNames || []).length === 0 ? (
                                                            <div className="text-center py-8 text-slate-500 bg-slate-700/20 rounded-xl border border-dashed border-slate-700">
                                                                No names found
                                                            </div>
                                                        ) : (
                                                            partNames.map((name) => (
                                                                <div
                                                                    key={name.id}
                                                                    className="flex items-center justify-between p-3 bg-slate-700/30 border border-slate-700/50 rounded-xl hover:bg-slate-700/50 transition-colors group"
                                                                >
                                                                    {editingId === name.id ? (
                                                                        <div className="flex-1 flex gap-2 mr-2">
                                                                            <input
                                                                                type="text"
                                                                                value={editName}
                                                                                onChange={(e) => setEditName(e.target.value)}
                                                                                className="flex-1 px-3 py-1.5 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                                                                                autoFocus
                                                                            />
                                                                            <button
                                                                                onClick={() => saveEditPartName(name.id)}
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
                                                                        <span className="font-medium text-slate-200">{name.name}</span>
                                                                    )}

                                                                    {editingId !== name.id && (
                                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button
                                                                                onClick={() => startEditing(name.id, name.name)}
                                                                                className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-600/50 rounded-lg transition-colors"
                                                                                title="Edit"
                                                                            >
                                                                                <Edit2 size={16} />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => confirmDeletePartName(name)}
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
                                                    Select a category to manage names
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
                title={`Delete ${deleteConfirmation.type === 'category' ? 'Category' : 'Name'}`}
                message={
                    deleteConfirmation.type === 'category'
                        ? 'Are you sure you want to delete this category? This will permanently delete the category and all associated part names. This action cannot be undone.'
                        : 'Are you sure you want to delete this part name? This action cannot be undone.'
                }
                itemName={deleteConfirmation.name}
                isDeleting={isDeleting}
            />
        </div>
    );
};

export default ManagePartDataModal;
