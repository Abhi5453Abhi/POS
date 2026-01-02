import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus, Loader2 } from 'lucide-react';
import { partsApi } from '../api';
import type { PartCategory, PartName } from '../types';

interface ManagePartDataModalProps {
    onClose: () => void;
}

export default function ManagePartDataModal({ onClose }: ManagePartDataModalProps) {
    const [activeTab, setActiveTab] = useState<'categories' | 'names'>('categories');
    const [categories, setCategories] = useState<PartCategory[]>([]);
    const [partNames, setPartNames] = useState<PartName[]>([]);
    const [loading, setLoading] = useState(true);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newPartName, setNewPartName] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (activeTab === 'names' && categories.length > 0 && !selectedCategory) {
            setSelectedCategory(categories[0].id.toString());
        }
    }, [activeTab, categories]);

    useEffect(() => {
        if (activeTab === 'names' && selectedCategory) {
            loadNames(parseInt(selectedCategory));
        }
    }, [selectedCategory, activeTab]);

    const loadData = async () => {
        try {
            setLoading(true);
            const categoriesData = await partsApi.listCategories();
            setCategories(categoriesData);
        } catch (error) {
            console.error('Failed to load categories:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadNames = async (categoryId: number) => {
        try {
            setLoading(true);
            const namesData = await partsApi.listPartNames(categoryId);
            setPartNames(namesData);
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
            setSubmitting(true);
            const newCategory = await partsApi.createCategory(newCategoryName);
            setCategories([...categories, newCategory]);
            setNewCategoryName('');
        } catch (error) {
            console.error('Failed to create category:', error);
            alert('Failed to create category. It might already exist.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteCategory = async (id: number) => {
        if (!confirm('Are you sure? This will delete all associated part names as well.')) return;
        try {
            await partsApi.deleteCategory(id);
            setCategories(categories.filter(c => c.id !== id));
            if (selectedCategory === id.toString()) {
                setSelectedCategory('');
                setPartNames([]);
            }
        } catch (error) {
            console.error('Failed to delete category:', error);
            alert('Failed to delete category.');
        }
    };

    const handleAddPartName = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPartName.trim() || !selectedCategory) return;

        try {
            setSubmitting(true);
            const newName = await partsApi.createPartName(parseInt(selectedCategory), newPartName);
            setPartNames([...partNames, newName]);
            setNewPartName('');
        } catch (error) {
            console.error('Failed to create part name:', error);
            alert('Failed to create part name.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeletePartName = async (id: number) => {
        if (!confirm('Are you sure?')) return;
        try {
            await partsApi.deletePartName(id);
            setPartNames(partNames.filter(n => n.id !== id));
        } catch (error) {
            console.error('Failed to delete part name:', error);
            alert('Failed to delete part name.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="glass-panel w-full max-w-lg animate-scale-in">
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-xl font-semibold text-white">Manage Spare Part Data</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex border-b border-white/10">
                    <button
                        className={`flex-1 p-3 text-sm font-medium transition-colors ${activeTab === 'categories' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-400 hover:text-white'}`}
                        onClick={() => setActiveTab('categories')}
                    >
                        Categories
                    </button>
                    <button
                        className={`flex-1 p-3 text-sm font-medium transition-colors ${activeTab === 'names' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-400 hover:text-white'}`}
                        onClick={() => setActiveTab('names')}
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
                                    placeholder="New Category Name"
                                    className="input-field flex-1"
                                />
                                <button type="submit" disabled={submitting || !newCategoryName.trim()} className="btn-primary p-2">
                                    {submitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                                </button>
                            </form>

                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {loading && categories.length === 0 ? (
                                    <div className="text-center py-4 text-gray-400">Loading...</div>
                                ) : categories.length === 0 ? (
                                    <div className="text-center py-4 text-gray-400">No categories found. Add one above.</div>
                                ) : (
                                    categories.map(category => (
                                        <div key={category.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                                            <span className="text-white">{category.name}</span>
                                            <button onClick={() => handleDeleteCategory(category.id)} className="text-red-400 hover:text-red-300 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Select Category</label>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="input-field w-full"
                                >
                                    <option value="" disabled>Select Category</option>
                                    {categories.map(category => (
                                        <option key={category.id} value={category.id}>{category.name}</option>
                                    ))}
                                </select>
                            </div>

                            <form onSubmit={handleAddPartName} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newPartName}
                                    onChange={(e) => setNewPartName(e.target.value)}
                                    placeholder="New Part Name"
                                    className="input-field flex-1"
                                    disabled={!selectedCategory}
                                />
                                <button type="submit" disabled={submitting || !newPartName.trim() || !selectedCategory} className="btn-primary p-2">
                                    {submitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                                </button>
                            </form>

                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {loading ? (
                                    <div className="text-center py-4 text-gray-400">Loading...</div>
                                ) : !selectedCategory ? (
                                    <div className="text-center py-4 text-gray-400">Select a category to view part names.</div>
                                ) : partNames.length === 0 ? (
                                    <div className="text-center py-4 text-gray-400">No part names found for this category.</div>
                                ) : (
                                    partNames.map(name => (
                                        <div key={name.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                                            <span className="text-white">{name.name}</span>
                                            <button onClick={() => handleDeletePartName(name.id)} className="text-red-400 hover:text-red-300 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
