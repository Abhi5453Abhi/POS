import { useEffect, useState } from 'react';
import { expenseApi } from '../api';
import type { Expense, ExpenseCategory } from '../types';
import { Plus, Receipt, X, Calendar, DollarSign, Users, Home, FileText, HelpCircle, Pencil, Trash2 } from 'lucide-react';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';

const categoryIcons: Record<ExpenseCategory, React.ReactNode> = {
    salary: <Users size={18} />,
    rent: <Home size={18} />,
    bill: <FileText size={18} />,
    misc: <HelpCircle size={18} />,
};

const categoryColors: Record<ExpenseCategory, string> = {
    salary: 'bg-blue-500/20 text-blue-400',
    rent: 'bg-purple-500/20 text-purple-400',
    bill: 'bg-amber-500/20 text-amber-400',
    misc: 'bg-slate-500/20 text-slate-400',
};

export function Expenses() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [summary, setSummary] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [filterCategory, setFilterCategory] = useState<ExpenseCategory | ''>('');
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

    // Delete modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        loadExpenses();
        loadSummary();
    }, [filterCategory]);

    const loadExpenses = async () => {
        try {
            const result = await expenseApi.list(filterCategory || undefined);
            setExpenses(result || []);
        } catch (error) {
            console.error('Failed to load expenses:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadSummary = async () => {
        try {
            const result = await expenseApi.getSummary();
            setSummary(result);
        } catch (error) {
            console.error('Failed to load summary:', error);
        }
    };

    const handleEdit = (expense: Expense) => {
        setEditingExpense(expense);
        setShowAddModal(true);
    };

    const handleDeleteClick = (expense: Expense) => {
        setExpenseToDelete(expense);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!expenseToDelete) return;

        setIsDeleting(true);
        try {
            await expenseApi.delete(expenseToDelete.id);
            await loadExpenses();
            await loadSummary();
            setShowDeleteModal(false);
            setExpenseToDelete(null);
        } catch (error) {
            console.error('Failed to delete expense:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const totalExpenses = Object.values(summary).reduce((a, b) => a + b, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Expenses</h1>
                    <p className="text-slate-400 mt-1">Track agency expenses and salaries</p>
                </div>
                <button
                    onClick={() => {
                        setEditingExpense(null);
                        setShowAddModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all"
                >
                    <Plus size={20} />
                    Add Expense
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {(['salary', 'rent', 'bill', 'misc'] as ExpenseCategory[]).map((cat) => (
                    <div
                        key={cat}
                        className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${categoryColors[cat]}`}>
                                {categoryIcons[cat]}
                            </div>
                            <span className="text-slate-400 text-sm capitalize">{cat}</span>
                        </div>
                        <p className="text-xl font-bold text-white">₹{(summary[cat] || 0).toLocaleString()}</p>
                    </div>
                ))}
                <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400">
                            <DollarSign size={18} />
                        </div>
                        <span className="text-red-300 text-sm">Total</span>
                    </div>
                    <p className="text-xl font-bold text-red-400">₹{totalExpenses.toLocaleString()}</p>
                </div>
            </div>

            {/* Filter */}
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => setFilterCategory('')}
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${filterCategory === ''
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-700/50'
                        }`}
                >
                    All
                </button>
                {(['salary', 'rent', 'bill', 'misc'] as ExpenseCategory[]).map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setFilterCategory(cat)}
                        className={`px-4 py-2 rounded-xl font-medium transition-all capitalize ${filterCategory === cat
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-700/50'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Expenses List */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
                </div>
            ) : expenses.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/50 border border-slate-700 rounded-2xl">
                    <Receipt className="mx-auto text-slate-500 mb-4" size={48} />
                    <h3 className="text-xl font-semibold text-white mb-2">No expenses found</h3>
                    <p className="text-slate-400">Add your first expense to get started</p>
                </div>
            ) : (
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left p-4 text-slate-400 font-medium">Description</th>
                                    <th className="text-left p-4 text-slate-400 font-medium">Category</th>
                                    <th className="text-left p-4 text-slate-400 font-medium">Recipient</th>
                                    <th className="text-left p-4 text-slate-400 font-medium">Date</th>
                                    <th className="text-right p-4 text-slate-400 font-medium">Amount</th>
                                    <th className="text-right p-4 text-slate-400 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.map((expense) => (
                                    <tr key={expense.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${categoryColors[expense.category]}`}>
                                                    {categoryIcons[expense.category]}
                                                </div>
                                                <span className="text-white font-medium">{expense.description}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${categoryColors[expense.category]}`}>
                                                {expense.category}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-300">{expense.recipient || '-'}</td>
                                        <td className="p-4 text-slate-300">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-slate-400" />
                                                {expense.date}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="text-white font-semibold">₹{expense.amount.toLocaleString()}</span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(expense)}
                                                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(expense)}
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

            {/* Add/Edit Expense Modal */}
            {showAddModal && (
                <AddExpenseModal
                    initialData={editingExpense}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        loadExpenses();
                        loadSummary();
                    }}
                />
            )}

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setExpenseToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                title="Delete Expense"
                message="Are you sure you want to delete this expense record? This will permanently remove it from your records."
                itemName={expenseToDelete ? `${expenseToDelete.description} (₹${expenseToDelete.amount})` : undefined}
                isDeleting={isDeleting}
            />
        </div>
    );
}

// Add/Edit Expense Modal
interface AddExpenseModalProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData: Expense | null;
}

function AddExpenseModal({ onClose, onSuccess, initialData }: AddExpenseModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        category: initialData?.category || 'misc',
        amount: initialData?.amount || 0,
        description: initialData?.description || '',
        recipient: initialData?.recipient || '',
        date: initialData?.date || new Date().toISOString().split('T')[0],
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (initialData) {
                await expenseApi.update(initialData.id, formData);
            } else {
                await expenseApi.create(formData);
            }
            onSuccess();
        } catch (error) {
            console.error('Failed to add expense:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-2xl shadow-xl">
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white">{initialData ? 'Edit Expense' : 'Add Expense'}</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white"
                        >
                            <option value="salary">Salary</option>
                            <option value="rent">Rent</option>
                            <option value="bill">Bill</option>
                            <option value="misc">Miscellaneous</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                        <input
                            type="text"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white"
                            placeholder="e.g., Monthly rent payment"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Amount (₹)</label>
                            <input
                                type="number"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Date</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white"
                                required
                            />
                        </div>
                    </div>
                    {formData.category === 'salary' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Recipient (Employee Name)</label>
                            <input
                                type="text"
                                value={formData.recipient}
                                onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white"
                                placeholder="e.g., Ram Kumar"
                            />
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Saving...' : initialData ? 'Update Expense' : 'Add Expense'}
                    </button>
                </form>
            </div>
        </div>
    );
}
