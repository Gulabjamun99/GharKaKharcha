import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SECTIONS, MONTHS } from '@/data/sections';
import {
  loadAllData, getMonthData, getSectionTotal, getMonthTotal,
  getYearTotal, formatINRFull, formatINR, calcPctChange, AllData,
} from '@/utils/storage';
import { COLORS, FONT, RADIUS } from '@/utils/theme';

const W = Dimensions.get('window').width;

export default function SummaryScreen() {
  const today = new Date();
  const insets = useSafeAreaInsets();
  const [allData, setAllData] = useState<AllData>({});

  useEffect(() => {
    const load = () => loadAllData().then(setAllData);
    load();
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, []);

  const curYear = today.getFullYear();
  const curMonth = today.getMonth() + 1;
  const prevMonth = curMonth > 1 ? curMonth - 1 : 12;
  const prevMonthYear = curMonth > 1 ? curYear : curYear - 1;

  const curMonthData = getMonthData(allData, curYear, curMonth);
  const prevMonthData = getMonthData(allData, prevMonthYear, prevMonth);
  const curMonthTotal = getMonthTotal(curMonthData);
  const prevMonthTotal = getMonthTotal(prevMonthData);
  const monthChange = calcPctChange(curMonthTotal, prevMonthTotal);

  const curYearTotal = getYearTotal(allData, curYear);
  const prevYearTotal = getYearTotal(allData, curYear - 1);
  const yearChange = calcPctChange(curYearTotal, prevYearTotal);

  const pieData = SECTIONS
    .map(s => ({
      name: s.label.split('(')[0].trim(),
      total: getSectionTotal(curMonthData, s.id),
      color: s.color,
      legendFontColor: COLORS.textSub,
      legendFontSize: 11,
    }))
    .filter(x => x.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const topCats = SECTIONS
    .map(s => ({ ...s, total: getSectionTotal(curMonthData, s.id) }))
    .filter(x => x.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: insets.top + 16 }}
    >
      <View style={styles.hero}>
        <Text style={styles.heroGreeting}>Namaste!</Text>
        <Text style={styles.heroMonth}>{MONTHS[curMonth - 1]} {curYear}</Text>
        <Text style={styles.heroLabel}>Is Mahine ka Kharcha</Text>
        <Text style={styles.heroAmount}>{formatINRFull(curMonthTotal)}</Text>
        {monthChange !== null && (
          <View style={[styles.heroBadge, { backgroundColor: monthChange > 0 ? COLORS.danger + '22' : COLORS.success + '22' }]}>
            <Ionicons
              name={monthChange > 0 ? 'trending-up' : 'trending-down'}
              size={13}
              color={monthChange > 0 ? COLORS.danger : COLORS.success}
            />
            <Text style={[styles.heroBadgeText, { color: monthChange > 0 ? COLORS.danger : COLORS.success }]}>
              Pichle mahine se {monthChange > 0 ? '+' : ''}{monthChange.toFixed(1)}%
            </Text>
          </View>
        )}
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Pichla Mahina</Text>
          <Text style={styles.statVal}>{formatINR(prevMonthTotal)}</Text>
          <Text style={styles.statSub}>{MONTHS[prevMonth - 1]}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Ye Saal {curYear}</Text>
          <Text style={[styles.statVal, { color: COLORS.accentOrange }]}>{formatINR(curYearTotal)}</Text>
          {yearChange !== null && (
            <Text style={[styles.statSub, { color: yearChange > 0 ? COLORS.danger : COLORS.success }]}>
              {yearChange > 0 ? '↑' : '↓'} {Math.abs(yearChange).toFixed(1)}% vs {curYear - 1}
            </Text>
          )}
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Monthly Avg</Text>
          <Text style={[styles.statVal, { color: COLORS.accentBlue }]}>
            {formatINR(curYearTotal / (curMonth || 1))}
          </Text>
          <Text style={styles.statSub}>{curYear} avg</Text>
        </View>
      </View>

      {pieData.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Is Mahine ka Breakdown</Text>
          <PieChart
            data={pieData}
            width={W - 40}
            height={180}
            chartConfig={{
              color: (opacity = 1) => `rgba(255,255,255,${opacity})`,
            }}
            accessor="total"
            backgroundColor="transparent"
            paddingLeft="0"
            hasLegend={false}
            center={[W / 6, 0]}
          />
          <View style={styles.legendGrid}>
            {pieData.map(d => (
              <View key={d.name} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                <Text style={styles.legendLabel} numberOfLines={1}>{d.name}</Text>
                <Text style={styles.legendVal}>{formatINR(d.total)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {topCats.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top 5 Kharche — {MONTHS[curMonth - 1]}</Text>
          {topCats.map((cat, idx) => (
            <View key={cat.id} style={styles.topCatRow}>
              <Text style={styles.topCatRank}>#{idx + 1}</Text>
              <View style={[styles.topCatIcon, { backgroundColor: cat.color + '22' }]}>
                <Ionicons name={cat.icon as any} size={14} color={cat.color} />
              </View>
              <Text style={styles.topCatName}>{cat.label}</Text>
              <Text style={[styles.topCatAmt, { color: cat.color }]}>{formatINRFull(cat.total)}</Text>
            </View>
          ))}
        </View>
      )}

      {curMonthTotal === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={48} color={COLORS.textDisabled} />
          <Text style={styles.emptyTitle}>Abhi koi kharcha nahi</Text>
          <Text style={styles.emptySubtitle}>
            "Kharcha Daalo" tab mein jaake{'\n'}is mahine ke kharche add karo
          </Text>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  hero: {
    paddingHorizontal: 20, paddingBottom: 24,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 16,
  },
  heroGreeting: { fontSize: FONT.sm, color: COLORS.textSub },
  heroMonth: { fontSize: FONT.xs, color: COLORS.textMuted, marginTop: 2, marginBottom: 16 },
  heroLabel: { fontSize: FONT.sm, color: COLORS.textSub },
  heroAmount: { fontSize: 44, fontWeight: '900', color: COLORS.text, letterSpacing: -2, marginTop: 4 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RADIUS.full, marginTop: 10,
  },
  heroBadgeText: { fontSize: FONT.sm, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    padding: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  statLabel: { fontSize: FONT.xs, color: COLORS.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  statVal: { fontSize: FONT.md, fontWeight: '700', color: COLORS.text },
  statSub: { fontSize: FONT.xs, color: COLORS.textMuted, marginTop: 2 },
  card: {
    marginHorizontal: 20, marginBottom: 14, backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  cardTitle: { fontSize: FONT.sm, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  legendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5, width: '47%' },
  legendDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  legendLabel: { flex: 1, fontSize: FONT.xs, color: COLORS.textSub },
  legendVal: { fontSize: FONT.xs, color: COLORS.text, fontWeight: '600' },
  topCatRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  topCatRank: { fontSize: FONT.xs, color: COLORS.textMuted, width: 20, textAlign: 'center' },
  topCatIcon: { width: 28, height: 28, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  topCatName: { flex: 1, fontSize: FONT.sm, color: COLORS.text },
  topCatAmt: { fontSize: FONT.sm, fontWeight: '700' },
  emptyState: { alignItems: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: FONT.lg, fontWeight: '700', color: COLORS.textSub },
  emptySubtitle: { fontSize: FONT.sm, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
});
