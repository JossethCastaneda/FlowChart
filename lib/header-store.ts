import { create } from 'zustand';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface HeaderState {
  breadcrumbs: BreadcrumbItem[];
  setBreadcrumbs: (items: BreadcrumbItem[]) => void;
}

export const useHeaderStore = create<HeaderState>((set) => ({
  breadcrumbs: [],
  setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),
}));
