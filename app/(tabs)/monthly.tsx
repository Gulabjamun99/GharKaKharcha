import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SECTIONS, MONTHS, MONTHS_SHORT } from '@/data/sections';
import {
  loadAllData, getMonthData, getSectionTotal, getMonthTotal,
  formatINRFull, formatINR, calcPctChange, AllData,
} from '@/utils/storage';
import { COLORS, FONT, RADIUS } from '@/utils/theme';

const W = Dimensions.get('window').width;
const YEARS = [2022, 2023, 2024, 2025, 2026];

export default function MonthlyScreen() {
  const today = new Date();
  const insets = useSafeAreaInsets();
  const [year, setYear] = useState(today.getFullYear());
  const [allData, setAllData] = useState<AllData>({});
  const [selMonth, setSelMonth] = useState(today.getMonth() + 1);

  useEffect(() => {
    loadAllData().then(setAllData);
  }, []);

  const monthTotals = Array.from({ length: 12 }, (_, i) =>
    getMonthTotal(getMonthData(allData, year, i + 1))
  );

  const annualTotal = monthTotals.reduce((a, b) => a + b, 0);
  const monthsWithData = monthTotals.filter(x => x > 0);
  const avgMonthly = monthsWithData.length ? annualTotal / monthsWithData.length : 0;
  const maxMonth = Math.max(...monthTotals);
  const maxMonthIdx = monthTotals.indexOf(maxMonth);

  const selMonthData = getMonthData(allData, year, selMonth);
  const selMonthTotal = getMonthTotal(selMonthData);
  const prevMonthData = selMonth > 1
    ? getMonthData(allData, year, selMonth - 1)
    : getMonthData(allData, year - 1, 12);
  const prevMonthTotal = getMonthTotal(prevMonthData);
  const monthChange = calcPctChange(selMonthTotal, prevMonthTotal);

  const categoryData = SECTIONS.map(s => ({
    ...s,
    total: getSectionTotal(selMonthData, s.id),
  })).filter(x => x.total > 0).sort((a, b) => b.total - a.total);

  const chartData = {
    labels: MONTHS_SHORT,
    datasets: [{ data: monthTotals.map(v => v || 0) }],
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.pageTitle}>Mahine ka Hisaab</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearRow}>
          {YEARS.map(y => (
            <TouchableOpacity
              key={y}
              style={[styles.yearChip, year === y && styles.yearChipActive]}
              onPress={() => setYear(y)}
            >
              <Text style={[styles.yearChipText, year === y && styles.yearChipTextActive]}>{y}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Saal ka Kul</Text>
          <Text style={styles.statValue}>{formatINR(annualTotal)}</Text>
          <Text style={styles.statSub}>{year}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Monthly Avg</Text>
          <Text style={styles.statValue}>{formatINR(avgMonthly)}</Text>
          <Text style={styles.statSub}>Per month</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Sabse Zyada</Text>
          <Text style={[styles.statValue, { color: COLORS.warning }]}>{formatINR(maxMonth)}</Text>
          <Text style={styles.statSub}>{MONTHS_SHORT[maxMonthIdx]}</Text>
        </View>
      </View>

      {annualTotal > 0 ? (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>12 Mahine ka Bar Chart</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <BarChart
              data={chartData}
              width={Math.max(W - 40, 700)}
              height={200}
              yAxisLabel="₹"
              yAxisSuffix=""
              fromZero
              chartConfig={{
                backgroundColor: COLORS.bgCard,
                backgroundGradientFrom: COLORS.bgCard,
                backgroundGradientTo: COLORS.bgCard,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(192, 132, 252, ${opacity})`,
                labelColor: () => COLORS.textSub,
                style: { borderRadius: 12 },
                barPercentage: 0.6,
                propsForLabels: { fontSize: 10 },
              }}
              style={{ borderRadius: 8 }}
              showValuesOnTopOfBars={false}
              withInnerLines={false}
            />
          </ScrollView>
        </View>
      ) : (
        <View style={styles.emptyChart}>
          <Ionicons name="bar-chart-outline" size={40} color={COLORS.textDisabled} />
          <Text style={styles.emptyText}>Abhi koi data nahi hai</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Mahine ka Detail Dekhiye</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
        {MONTHS_SHORT.map((m, i) => {
          const t = monthTotals[i];
          return (
            <TouchableOpacity
              key={m}
              style={[styles.monthChip, selMonth === i + 1 && styles.monthChipActive]}
              onPress={() => setSelMonth(i + 1)}
            >
              <Text style={[styles.monthChipLabel, selMonth === i + 1 && styles.monthChipLabelActive]}>{m}</Text>
              {t > 0 && <Text style={[styles.monthChipVal, selMonth === i + 1 && { color: COLORS.bg }]}>{formatINR(t)}</Text>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.monthDetailCard}>
        <View style={styles.monthDetailHeader}>
          <View>
            <Text style={styles.monthDetailTitle}>{MONTHS[selMonth - 1]} {year}</Text>
            <Text style={styles.monthDetailTotal}>{formatINRFull(selMonthTotal)}</Text>
          </View>
          {monthChange !== null && (
            <View style={[styles.changeBadge, { backgroundColor: monthChange > 0 ? COLORS.danger + '22' : COLORS.success + '22' }]}>
              <Ionicons
                name={monthChange > 0 ? 'trending-up' : 'trending-down'}
                size={14}
                color={monthChange > 0 ? COLORS.danger : COLORS.success}
              />
              <Text style={[styles.changeText, { color: monthChange > 0 ? COLORS.danger : COLORS.success }]}>
                {Math.abs(monthChange).toFixed(1)}%
              </Text>
            </View>
          )}
        </View>

        {categoryData.length === 0 ? (
          <Text style={styles.emptyText}>Is mahine ka koi data nahi</Text>
        ) : categoryData.map(cat => {
          const pct = selMonthTotal > 0 ? (cat.total / selMonthTotal) * 100 : 0;
          return (
            <View key={cat.id} style={styles.catRow}>
              <View style={[styles.catDot, { backgroundColor: cat.color }]} />
              <View style={styles.catInfo}>
                <View style={styles.catTopRow}>
                  <Text style={styles.catName}>{cat.label}</Text>
                  <Text style={styles.catAmt}>{formatINRFull(cat.total)}</Text>
                </View>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: cat.color }]} />
                </View>
                <Text style={styles.catPct}>{pct.toFixed(1)}% of total</Text>
              </View>
            </View>
          );
        })}
      </View>
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  pageTitle: { fontSize: FONT.xxl, fontWeight: '800', color: COLORS.text, marginBottom: 16, letterSpacing: -0.5 },
  yearRow: { flexDirection: 'row' },
  yearChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard, marginRight: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  yearChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  yearChipText: { fontSize: FONT.sm, color: COLORS.textSub },
  yearChipTextActive: { color: COLORS.bg, fontWeight: '700' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    padding: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  statLabel: { fontSize: FONT.xs, color: COLORS.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: FONT.lg, fontWeight: '700', color: COLORS.text },
  statSub: { fontSize: FONT.xs, color: COLORS.textMuted, marginTop: 2 },
  chartCard: {
    marginHorizontal: 20, marginBottom: 20, backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  chartTitle: { fontSize: FONT.sm, fontWeight: '600', color: COLORS.textSub, marginBottom: 12 },
  emptyChart: {
    margin: 20, padding: 40, backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg, alignItems: 'center', gap: 12,
  },
  emptyText: { fontSize: FONT.sm, color: COLORS.textMuted, textAlign: 'center' },
  sectionTitle: { fontSize: FONT.md, fontWeight: '700', color: COLORS.text, marginLeft: 20, marginBottom: 12 },
  monthScroll: { paddingLeft: 20, marginBottom: 16 },
  monthChip: {
    marginRight: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, minWidth: 56,
  },
  monthChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  monthChipLabel: { fontSize: FONT.sm, color: COLORS.textSub, textAlign: 'center', fontWeight: '600' },
  monthChipLabelActive: { color: COLORS.bg },
  monthChipVal: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center', marginTop: 2 },
  monthDetailCard: {
    marginHorizontal: 20, backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  monthDetailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
  monthDetailTitle: { fontSize: FONT.sm, color: COLORS.textSub },
  monthDetailTotal: { fontSize: FONT.xxl, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  changeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full,
  },
  changeText: { fontSize: FONT.sm, fontWeight: '700' },
  catRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, gap: 10 },
  catDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  catInfo: { flex: 1 },
  catTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  catName: { fontSize: FONT.sm, color: COLORS.text, fontWeight: '500', flex: 1 },
  catAmt: { fontSize: FONT.sm, color: COLORS.textSub, fontWeight: '600' },
  progressBg: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, marginBottom: 3 },
  progressFill: { height: 4, borderRadius: 2 },
  catPct: { fontSize: FONT.xs, color: COLORS.textMuted },
});
