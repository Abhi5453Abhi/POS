import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Tractor,
    Wrench,
    Package,
    Receipt,
    LogOut,
    Menu,
    X,
    ChevronRight,
    User
} from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
}

const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/tractors', label: 'Tractors', icon: Tractor },
    { path: '/parts', label: 'Spare Parts', icon: Package },
    { path: '/services', label: 'Services', icon: Wrench },
    { path: '/reports', label: 'Financial Reports', icon: Receipt },
];

export function Layout({ children }: LayoutProps) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-background text-white selection:bg-primary/30">
            {/* Mobile header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-lg border-b border-white/5 px-4 py-3 flex items-center justify-between">
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 transition-colors"
                >
                    {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
                <span className="text-lg font-bold text-white tracking-tight">🚜 Tractor Agency</span>
                <div className="w-10" />
            </div>

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-40 h-screen w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="h-full flex flex-col bg-surface/90 backdrop-blur-2xl border-r border-white/5 shadow-2xl">
                    {/* Logo */}
                    <div className="p-6 border-b border-white/5">
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <span className="text-3xl filter drop-shadow-md">🚜</span>
                            <span className="tracking-tight">Tractor<span className="text-primary">Agency</span></span>
                        </h1>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${isActive
                                        ? 'bg-gradient-to-r from-primary/10 to-primary/5 text-primary border border-primary/20 shadow-lg shadow-primary/5'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                                        }`}
                                >
                                    {isActive && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                                    )}
                                    <Icon size={20} className={isActive ? 'text-primary' : 'group-hover:text-white transition-colors'} />
                                    <span className="font-medium">{item.label}</span>
                                    {isActive && <ChevronRight size={16} className="ml-auto text-primary" />}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User section */}
                    <div className="p-4 border-t border-white/5 bg-gradient-to-t from-black/20 to-transparent">
                        <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl mb-3 border border-white/5 backdrop-blur-sm">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-lg">
                                <User size={20} className="text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{user?.full_name}</p>
                                <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all border border-transparent hover:border-red-500/20"
                        >
                            <LogOut size={20} />
                            <span className="font-medium">Logout</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main content */}
            <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0 transition-all duration-300">
                <div className="p-6 max-w-7xl mx-auto">{children}</div>
            </main>
        </div>
    );
}
