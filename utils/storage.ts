import AsyncStorage from '@react-native-async-storage/async-storage';

const DATA_KEY = 'gharkakharcha_v1';

export type MonthData = Record<string, Record<string, number> | string[]>;
export type AllData = Record<string, MonthData>;

export async function loadAllData(): Promise<AllData> {
  try {
    const json = await AsyncStorage.getItem(DATA_KEY);
    return json ? JSON.parse(json) : {};
  } catch {
    return {};
  }
}

export async function saveAllData(data: AllData): Promise<void> {
  try {
    await AsyncStorage.setItem(DATA_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Save error', e);
  }
}

export function getMonthKey(year: number, month: number): string {
  return `${year}_${String(month).padStart(2, '0')}`;
}

export function getMonthData(allData: AllData, year: number, month: number): MonthData {
  return allData[getMonthKey(year, month)] || {};
}

export function getSectionTotal(monthData: MonthData, sectionId: string): number {
  const sec = monthData[sectionId] as Record<string, number> | undefined;
  if (!sec || typeof sec !== 'object' || Array.isArray(sec)) return 0;
  return Object.values(sec).reduce((sum: number, v) => sum + (parseFloat(String(v)) || 0), 0);
}

export function getMonthTotal(monthData: MonthData): number {
  let total = 0;
  Object.keys(monthData).forEach(k => {
    if (!k.startsWith('_')) {
      const sec = monthData[k];
      if (sec && typeof sec === 'object' && !Array.isArray(sec)) {
        Object.values(sec as Record<string, number>).forEach(v => { total += parseFloat(String(v)) || 0; });
      }
    }
  });
  return total;
}

export function getYearData(allData: AllData, year: number): number[] {
  const months: number[] = [];
  for (let m = 1; m <= 12; m++) {
    const md = getMonthData(allData, year, m);
    months.push(getMonthTotal(md));
  }
  return months;
}

export function getYearTotal(allData: AllData, year: number): number {
  return getYearData(allData, year).reduce((a, b) => a + b, 0);
}

export function getCategoryYearData(allData: AllData, year: number, sectionId: string): number {
  let total = 0;
  for (let m = 1; m <= 12; m++) {
    const md = getMonthData(allData, year, m);
    total += getSectionTotal(md, sectionId);
  }
  return total;
}

export function getCustomItems(monthData: MonthData, sectionId: string): string[] {
  return (monthData[`_custom_${sectionId}`] as string[]) || [];
}

export function formatINR(amount: number): string {
  const n = Math.round(amount);
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
  return '₹' + n.toLocaleString('en-IN');
}

export function formatINRFull(amount: number): string {
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}

export function calcPctChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}
