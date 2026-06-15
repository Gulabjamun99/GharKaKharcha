import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SECTIONS, MONTHS_SHORT } from '@/data/sections';
import {
  loadAllData, getMonthData, getSectionTotal, getMonthTotal,
  getYearData, getYearTotal, getCategoryYearData,
  formatINRFull, formatINR, calcPctChange, AllData,
} from '@/utils/storage';
import { COLORS, FONT, RADIUS } from '@/utils/theme';

const W = Dimensions.get('window').width;
const YEARS = [2022, 2023, 2024, 2025, 2026];

export default function YearlyScreen() {
  const today = new Date();
  const insets = useSafeAreaInsets();
  const [allData, setAllData] = useState<AllData>({});
  const [year1, setYear1] = useState(today.getFullYear() - 1);
  const [year2, setYear2] = useState(today.getFullYear());
  const [activeTab, setActiveTab] = useState<'overview' | 'monthly' | 'category'>('overview');

  useEffect(() => {
    loadAllData().then(setAllData);
  }, []);

  const y1Total = getYearTotal(allData, year1);
  const y2Total = getYearTotal(allData, year2);
  const yChange = calcPctChange(y2Total, y1Total);

  const y1Monthly = getYearData(allData, year1);
  const y2Monthly = getYearData(allData, year2);

  const catComparison = SECTIONS.map(s => ({
    ...s,
    v1: getCategoryYearData(allData, year1, s.id),
    v2: getCategoryYearData(allData, year2, s.id),
  })).filter(c => c.v1 > 0 || c.v2 > 0).sort((a, b) => b.v2 - a.v2);

  const lineData = {
    labels: MONTHS_SHORT,
    datasets: [
      { data: y1Monthly, color: () => COLORS.accentBlue, strokeWidth: 2 },
      { data: y2Monthly, color: () => COLORS.primary, strokeWidth: 2 },
    ],
    legend: [`${year1}`, `${year2}`],
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.pageTitle}>Yearly Analysis</Text>
        <Text style={styles.pageSub}>Saal dar saal kharche ka hisaab</Text>
      </View>

      <View style={styles.yearSelector}>
        <View style={styles.yearCol}>
          <Text style={styles.yearColLabel}>Pehla Saal</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {YEARS.filter(y => y < year2).map(y => (
              <TouchableOpacity key={y} style={[styles.yearChip, year1 === y && styles.yearChipActive1]} onPress={() => setYear1(y)}>
                <Text style={[styles.yearChipText, year1 === y && { color: COLORS.bg, fontWeight: '700' }]}>{y}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={styles.vsCircle}><Text style={styles.vsText}>VS</Text></View>
        <View style={styles.yearCol}>
          <Text style={styles.yearColLabel}>Doosra Saal</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {YEARS.filter(y => y > year1).map(y => (
              <TouchableOpacity key={y} style={[styles.yearChip, year2 === y && styles.yearChipActive2]} onPress={() => setYear2(y)}>
                <Text style={[styles.yearChipText, year2 === y && { color: COLORS.bg, fontWeight: '700' }]}>{y}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      <View style={styles.compareRow}>
        <View style={[styles.compareCard, { borderColor: COLORS.accentBlue + '44' }]}>
          <Text style={styles.compareYear}>{year1}</Text>
          <Text style={[styles.compareTotal, { color: COLORS.accentBlue }]}>{formatINR(y1Total)}</Text>
          {y1Total === 0 && <Text style={styles.noData}>No data</Text>}
        </View>
        <View style={styles.arrowWrap}>
          {yChange !== null ? (
            <>
              <Ionicons
                name={yChange > 0 ? 'arrow-up-circle' : 'arrow-down-circle'}
                size={28}
                color={yChange > 0 ? COLORS.danger : COLORS.success}
              />
              <Text style={[styles.pctChange, { color: yChange > 0 ? COLORS.danger : COLORS.success }]}>
                {yChange > 0 ? '+' : ''}{yChange.toFixed(1)}%
              </Text>
            </>
          ) : <Text style={styles.noDataSmall}>—</Text>}
        </View>
        <View style={[styles.compareCard, { borderColor: COLORS.primary + '44' }]}>
          <Text style={styles.compareYear}>{year2}</Text>
          <Text style={[styles.compareTotal, { color: COLORS.primary }]}>{formatINR(y2Total)}</Text>
          {y2Total === 0 && <Text style={styles.noData}>No data</Text>}
        </View>
      </View>

      <View style={styles.tabs}>
        {(['overview', 'monthly', 'category'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]} onPress={() => setActiveTab(t)}>
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {t === 'overview' ? 'Overview' : t === 'monthly' ? 'Month-wise' : 'Category'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'overview' && (
        <View style={styles.section}>
          <View style={styles.miniStatsRow}>
            {[{year: year1, total: y1Total, color: COLORS.accentBlue}, {year: year2, total: y2Total, color: COLORS.primary}].map(item => {
              const months = getYearData(allData, item.year).filter(x => x > 0);
              const avg = months.length ? item.total / months.length : 0;
              return (
                <View key={item.year} style={styles.miniStat}>
                  <Text style={styles.miniStatYear}>{item.year}</Text>
                  <Text style={styles.miniStatLabel}>Monthly Avg</Text>
                  <Text style={[styles.miniStatVal, { color: item.color }]}>{formatINR(avg)}</Text>
                  <Text style={styles.miniStatLabel}>Active Months</Text>
                  <Text style={[styles.miniStatVal, { color: item.color }]}>{months.length}</Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.subTitle}>Sabse Zyada Badhe Kharche</Text>
          {catComparison
            .map(c => ({ ...c, change: calcPctChange(c.v2, c.v1) }))
            .filter(c => c.change !== null && (c.change ?? 0) > 0)
            .sort((a, b) => (b.change ?? 0) - (a.change ?? 0))
            .slice(0, 5)
            .map(cat => (
              <View key={cat.id} style={styles.growthRow}>
                <View style={[styles.catIcon, { backgroundColor: cat.color + '22' }]}>
                  <Ionicons name={cat.icon as any} size={14} color={cat.color} />
                </View>
                <Text style={styles.growthLabel}>{cat.label}</Text>
                <Text style={[styles.growthPct, { color: COLORS.danger }]}>+{cat.change?.toFixed(1)}%</Text>
              </View>
            ))}

          <Text style={styles.subTitle}>Kharche Kam Hue</Text>
          {catComparison
            .map(c => ({ ...c, change: calcPctChange(c.v2, c.v1) }))
            .filter(c => c.change !== null && (c.change ?? 0) < 0)
            .sort((a, b) => (a.change ?? 0) - (b.change ?? 0))
            .slice(0, 5)
            .map(cat => (
              <View key={cat.id} style={styles.growthRow}>
                <View style={[styles.catIcon, { backgroundColor: cat.color + '22' }]}>
                  <Ionicons name={cat.icon as any} size={14} color={cat.color} />
                </View>
                <Text style={styles.growthLabel}>{cat.label}</Text>
                <Text style={[styles.growthPct, { color: COLORS.success }]}>{cat.change?.toFixed(1)}%</Text>
              </View>
            ))}
        </View>
      )}

      {activeTab === 'monthly' && (
        <View style={styles.section}>
          {(y1Total > 0 || y2Total > 0) && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Monthly Trend Comparison</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <LineChart
                  data={lineData}
                  width={Math.max(W - 40, 700)}
                  height={220}
                  yAxisLabel="₹"
                  fromZero
                  chartConfig={{
                    backgroundColor: COLORS.bgCard,
                    backgroundGradientFrom: COLORS.bgCard,
                    backgroundGradientTo: COLORS.bgCard,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(192, 132, 252, ${opacity})`,
                    labelColor: () => COLORS.textSub,
                    propsForLabels: { fontSize: 10 },
                  }}
                  style={{ borderRadius: 8 }}
                  withDots={true}
                  withShadow={false}
                  withInnerLines={false}
                  bezier
                />
              </ScrollView>
              <View style={styles.legend}>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLORS.accentBlue }]} /><Text style={styles.legendText}>{year1}</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} /><Text style={styles.legendText}>{year2}</Text></View>
              </View>
            </View>
          )}
          {MONTHS_SHORT.map((m, i) => {
            const v1 = y1Monthly[i], v2 = y2Monthly[i];
            const ch = calcPctChange(v2, v1);
            if (v1 === 0 && v2 === 0) return null;
            return (
              <View key={m} style={styles.monthCompRow}>
                <Text style={styles.monthCompLabel}>{m}</Text>
                <Text style={[styles.monthCompVal, { color: COLORS.accentBlue }]}>{v1 > 0 ? formatINR(v1) : '—'}</Text>
                <Text style={[styles.monthCompVal, { color: COLORS.primary }]}>{v2 > 0 ? formatINR(v2) : '—'}</Text>
                {ch !== null
                  ? <Text style={[styles.monthCompPct, { color: ch > 0 ? COLORS.danger : COLORS.success }]}>{ch > 0 ? '+' : ''}{ch.toFixed(1)}%</Text>
                  : <Text style={styles.monthCompPct}>—</Text>}
              </View>
            );
          })}
        </View>
      )}

      {activeTab === 'category' && (
        <View style={styles.section}>
          {catComparison.length === 0 ? (
            <Text style={styles.emptyText}>Koi data nahi</Text>
          ) : catComparison.map(cat => {
            const ch = calcPctChange(cat.v2, cat.v1);
            const maxVal = Math.max(cat.v1, cat.v2, 1);
            return (
              <View key={cat.id} style={styles.catCard}>
                <View style={styles.catCardHeader}>
                  <View style={[styles.catIcon, { backgroundColor: cat.color + '22' }]}>
                    <Ionicons name={cat.icon as any} size={14} color={cat.color} />
                  </View>
                  <Text style={styles.catCardTitle}>{cat.label}</Text>
                  {ch !== null && (
                    <View style={[styles.chBadge, { backgroundColor: ch > 0 ? COLORS.danger + '22' : COLORS.success + '22' }]}>
                      <Text style={[styles.chBadgeText, { color: ch > 0 ? COLORS.danger : COLORS.success }]}>
                        {ch > 0 ? '↑' : '↓'} {Math.abs(ch).toFixed(1)}%
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.catBars}>
                  <View style={styles.catBarRow}>
                    <Text style={[styles.catBarYear, { color: COLORS.accentBlue }]}>{year1}</Text>
                    <View style={styles.catBarBg}>
                      <View style={[styles.catBarFill, { width: `${(cat.v1 / maxVal) * 100}%` as any, backgroundColor: COLORS.accentBlue }]} />
                    </View>
                    <Text style={styles.catBarVal}>{formatINR(cat.v1)}</Text>
                  </View>
                  <View style={styles.catBarRow}>
                    <Text style={[styles.catBarYear, { color: COLORS.primary }]}>{year2}</Text>
                    <View style={styles.catBarBg}>
                      <View style={[styles.catBarFill, { width: `${(cat.v2 / maxVal) * 100}%` as any, backgroundColor: COLORS.primary }]} />
                    </View>
                    <Text style={styles.catBarVal}>{formatINR(cat.v2)}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  pageTitle: { fontSize: FONT.xxl, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  pageSub: { fontSize: FONT.sm, color: COLORS.textSub, marginTop: 4 },
  yearSelector: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20, gap: 10 },
  yearCol: { flex: 1 },
  yearColLabel: { fontSize: FONT.xs, color: COLORS.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  yearChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard, marginRight: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  yearChipActive1: { backgroundColor: COLORS.accentBlue, borderColor: COLORS.accentBlue },
  yearChipActive2: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  yearChipText: { fontSize: FONT.sm, color: COLORS.textSub },
  vsCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.bgCard, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.borderLight },
  vsText: { fontSize: FONT.xs, fontWeight: '800', color: COLORS.textMuted },
  compareRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, alignItems: 'center', gap: 10 },
  compareCard: { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, alignItems: 'center' },
  compareYear: { fontSize: FONT.sm, color: COLORS.textSub, marginBottom: 6 },
  compareTotal: { fontSize: FONT.xl, fontWeight: '800', letterSpacing: -0.5 },
  noData: { fontSize: FONT.xs, color: COLORS.textMuted },
  arrowWrap: { alignItems: 'center', gap: 4 },
  pctChange: { fontSize: FONT.sm, fontWeight: '700' },
  noDataSmall: { fontSize: FONT.lg, color: COLORS.textMuted },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: RADIUS.md, backgroundColor: COLORS.bgCard, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  tabBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: FONT.sm, color: COLORS.textSub, fontWeight: '600' },
  tabTextActive: { color: COLORS.bg },
  section: { paddingHorizontal: 20 },
  subTitle: { fontSize: FONT.sm, fontWeight: '700', color: COLORS.textSub, marginBottom: 10, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  miniStatsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  miniStat: { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  miniStatYear: { fontSize: FONT.md, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  miniStatLabel: { fontSize: FONT.xs, color: COLORS.textMuted, marginTop: 4 },
  miniStatVal: { fontSize: FONT.lg, fontWeight: '700' },
  growthRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  catIcon: { width: 28, height: 28, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  growthLabel: { flex: 1, fontSize: FONT.sm, color: COLORS.text },
  growthPct: { fontSize: FONT.sm, fontWeight: '700' },
  chartCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  chartTitle: { fontSize: FONT.sm, fontWeight: '600', color: COLORS.textSub, marginBottom: 12 },
  legend: { flexDirection: 'row', gap: 16, marginTop: 8, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: FONT.sm, color: COLORS.textSub },
  monthCompRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 6 },
  monthCompLabel: { width: 36, fontSize: FONT.sm, color: COLORS.textSub, fontWeight: '600' },
  monthCompVal: { flex: 1, fontSize: FONT.sm, textAlign: 'center', fontWeight: '600' },
  monthCompPct: { width: 60, fontSize: FONT.sm, textAlign: 'right', fontWeight: '700', color: COLORS.textMuted },
  catCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  catCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  catCardTitle: { flex: 1, fontSize: FONT.sm, fontWeight: '600', color: COLORS.text },
  chBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  chBadgeText: { fontSize: FONT.xs, fontWeight: '700' },
  catBars: { gap: 6 },
  catBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBarYear: { width: 34, fontSize: FONT.xs, fontWeight: '700' },
  catBarBg: { flex: 1, height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  catBarFill: { height: 8, borderRadius: 4, minWidth: 4 },
  catBarVal: { width: 50, fontSize: FONT.xs, color: COLORS.textSub, textAlign: 'right' },
  emptyText: { fontSize: FONT.sm, color: COLORS.textMuted, textAlign: 'center', padding: 40 },
});
