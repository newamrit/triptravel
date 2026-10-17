import React from 'react';
import { Fuel, Utensils, Bed, Ticket, Wrench, Package } from 'lucide-react';
import { ExpenseCategory } from '../types';

export function getCategoryIcon(category: ExpenseCategory, className: string = 'w-4 h-4') {
  switch (category) {
    case 'Fuel':
      return <Fuel className={className} />;
    case 'Food & Snacks':
      return <Utensils className={className} />;
    case 'Hotel/Homestay':
      return <Bed className={className} />;
    case 'Permits/Entry':
      return <Ticket className={className} />;
    case 'Vehicle Maintenance/Spares':
      return <Wrench className={className} />;
    case 'Miscellaneous':
    default:
      return <Package className={className} />;
  }
}

export function getCategoryBadgeClass(category: ExpenseCategory): string {
  switch (category) {
    case 'Fuel':
      return 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800';
    case 'Food & Snacks':
      return 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800';
    case 'Hotel/Homestay':
      return 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:text-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-800';
    case 'Permits/Entry':
      return 'text-violet-700 bg-violet-50 border-violet-200 dark:text-violet-300 dark:bg-violet-950/40 dark:border-violet-800';
    case 'Vehicle Maintenance/Spares':
      return 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-800';
    case 'Miscellaneous':
    default:
      return 'text-slate-700 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700';
  }
}
