'use client';

import React from 'react';

import {
    LayoutDashboard,
    Package,
    Layers,
    Truck,
    Settings,
    LogOut,
    ArrowRight,
    History // Added History
} from 'lucide-react';
import Link from 'next/link'; // Restored Link
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const tpaNavItems = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/direct', icon: ArrowRight, label: 'Direct Orders' },
    { href: '/groupage', icon: Truck, label: 'Groupage Lanes' },
    { href: '/admin/rules', icon: Settings, label: 'Admin' },
];

const cbaNavItems = [
    { href: '/cba', icon: LayoutDashboard, label: 'Dashboard', paramCheck: (p: any) => !p.get('view') },
    { href: '/cba?view=history', icon: History, label: 'History', paramCheck: (p: any) => p.get('view') === 'history' },
];

export function AppSidebar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isCBA = pathname.startsWith('/cba');
    const carrier = searchParams.get('carrier');

    const [isCollapsed, setIsCollapsed] = React.useState(true);

    // Hide Sidebar on CBA Login (No carrier selected)
    if (isCBA && !carrier) {
        return null;
    }

    let navItems = isCBA ? cbaNavItems : tpaNavItems;

    // Dynamically update hrefs to include carrier param for CBA
    if (isCBA && carrier) {
        navItems = cbaNavItems.map(item => ({
            ...item,
            href: item.href.includes('?')
                ? `${item.href}&carrier=${carrier}`
                : `${item.href}?carrier=${carrier}`
        }));
    }

    return (
        <div
            className={cn(
                "bg-white border-r border-gray-200 h-screen fixed flex flex-col z-20 transition-all duration-300 shadow-md",
                isCollapsed ? "w-20" : "w-64"
            )}
            onMouseEnter={() => setIsCollapsed(false)}
            onMouseLeave={() => setIsCollapsed(true)}
        >
            <div className="p-6 border-b border-gray-100 flex items-center overflow-hidden whitespace-nowrap h-[73px]">
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 transition-opacity duration-300">
                    {isCollapsed ? (isCBA ? 'CBA' : 'TPA') : (isCBA ? 'CBA Portal' : 'TPA')}
                </h2>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {navItems.map((item) => {
                    let isActive = pathname === item.href;

                    if (isCBA) {
                        // Robust check for CBA links including params
                        const itemPath = item.href.split('?')[0];
                        if (pathname === itemPath) {
                            // @ts-ignore
                            isActive = item.paramCheck ? item.paramCheck(searchParams) : true;
                        }
                    }

                    return (
                        <Link key={item.label} href={item.href}>
                            <span className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap overflow-hidden",
                                isActive
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                                isCollapsed ? "justify-center px-0" : ""
                            )}>
                                <item.icon className="w-5 h-5 flex-shrink-0" />
                                <span className={cn("transition-opacity duration-300", isCollapsed ? "opacity-0 w-0" : "opacity-100")}>
                                    {item.label}
                                </span>
                            </span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-100 overflow-hidden whitespace-nowrap">
                <div className={cn("flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-500", isCollapsed ? "justify-center px-0" : "")}>
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-gray-600">MJ</span>
                    </div>
                    {!isCollapsed && (
                        <div className="flex-1 animate-in fade-in duration-300">
                            <div className="text-gray-900">User</div>
                            <div className="text-xs">Planner</div>
                        </div>
                    )}
                    {!isCollapsed && (
                        <Button variant="ghost" size="icon">
                            <LogOut className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
