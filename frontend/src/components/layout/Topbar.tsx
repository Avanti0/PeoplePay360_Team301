import React from 'react';
import { Menu } from 'lucide-react';
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

      {/* Right side: User Menu */}
      <div className="flex items-center gap-2 md:gap-3">

        {/* User Profile Menu */}
        <UserMenu />
      </div>
    </header>
  );
};
