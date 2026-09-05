import React, { useState } from 'react';
import { Menu, Bell, Search } from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs';
import { UserMenu } from './UserMenu';

export interface TopbarProps {
  onOpenMobileSidebar?: () => void;
  title?: string;
}

export const Topbar: React.FC<TopbarProps> = ({
  onOpenMobileSidebar,
  title,
}) => {
  const [hasNotifications, setHasNotifications] = useState(true);

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 md:px-6 flex items-center justify-between z-20 sticky top-0">
      {/* Left side: Mobile Hamburger + Breadcrumbs / Title */}
      <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          {title && (
            <h1 className="text-base font-extrabold text-slate-800 tracking-tight truncate hidden sm:block">
              {title}
            </h1>
          )}
          <Breadcrumbs className="hidden md:flex" />
        </div>
      </div>

      {/* Right side: Search, Notifications, User Menu */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Quick Search Bar */}
        <div className="hidden xl:flex items-center relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Quick search (Ctrl + K)..."
            className="w-56 pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>

        {/* Notifications Icon */}
        <button
          onClick={() => setHasNotifications(false)}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors relative"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {hasNotifications && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
          )}
        </button>

        <div className="h-6 w-px bg-slate-200 mx-1" />

        {/* User Profile Menu */}
        <UserMenu />
      </div>
    </header>
  );
};
