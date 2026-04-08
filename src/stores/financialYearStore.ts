import { create } from 'zustand';

export const getCurrentFY = () => {
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();
  return month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

interface FinancialYearState {
  selectedFY: string;
  setSelectedFY: (fy: string) => void;
}

export const useFinancialYearStore = create<FinancialYearState>((set) => ({
  selectedFY: getCurrentFY(),
  setSelectedFY: (fy: string) => set({ selectedFY: fy }),
}));
