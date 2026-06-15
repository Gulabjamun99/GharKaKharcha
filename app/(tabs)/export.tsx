import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  loadAllData, getYearTotal, getMonthTotal, getMonthData,
  formatINR, formatINRFull, AllData,
} from '@/utils/storage';
import { exportToExcel, exportToPDF } from '@/utils/exportUtils';
import { COLORS, FONT, RADIUS } from '@/utils/theme';
import { MONTHS, MONTHS_SHORT } from '@/data/sections';

const YEARS = [2022, 2023, 2024, 2025, 2026];

export default function ExportScreen() {
  const today = new Date();
  const insets = useSafeAreaInsets();
  const [allData, setAllData] = useState<AllData>({});
  const [selYear, setSelYear] = useState(today.getFullYear());
  const [selMonth, setSelMonth] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState('');
  const [showMonthModal, setShowMonthModal] = useState(false);

  useEffect(() => { loadAllData().then(setAllData); }, []);

  const yearTotal = getYearTotal(allData, selYear);
  const monthsWithData = Array.from({ length: 12 }, (_, i) => i + 1)
    .filter(m => getMonthTotal(getMonthData(allData, selYear, m)) > 0);

  const handleExport = async (type: string) => {
    if (yearTotal === 0) {
      Alert.alert('Koi Data Nahi', `${selYear} ke liye koi kharcha entry nahi mili.\nPehle kharcha daalo, phir export karo.`);
      return;
    }
    setLoading(true);
    setLoadingType(type);
    try {
      let result;
      if (type === 'excel') {
        result = await exportToExcel(allData, selYear);
      } else {
        result = await exportToPDF(allData, selYear, selMonth);
      }
      if (!result.success) {
        Alert.alert('Export Failed', result.error || 'Kuch gadbad ho gayi. Dobara try karo.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setLoading(false);
    setLoadingType('');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.pageTitle}>Export Karo</Text>
        <Text style={styles.pageSub}>Excel ya PDF mein nikalo apna kharcha</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>Kaun sa Saal?</Text>
        <View style={styles.yearRow}>
          {YEARS.map(y => {
            const yt = getYearTotal(allData, y);
            return (
              <TouchableOpacity
                key={y}
                style={[styles.yearChip, selYear === y && styles.yearChipActive]}
                onPress={() => { setSelYear(y); setSelMonth(null); }}
              >
                <Text style={[styles.yearChipText, selYear === y && styles.yearChipTextActive]}>{y}</Text>
                {yt > 0 && (
                  <Text style={[styles.yearChipSub, selYear === y && { color: COLORS.bg }]}>
                    {formatINR(yt)}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>PDF ke liye — Month filter (optional)</Text>
        <Text style={styles.sectionSub}>Excel mein hamesha poore saal ka data aata hai</Text>
        <View style={styles.monthFilterRow}>
          <TouchableOpacity
            style={[styles.monthFilterChip, selMonth === null && styles.monthFilterActive]}
            onPress={() => setSelMonth(null)}
          >
            <Ionicons name="calendar" size={14} color={selMonth === null ? COLORS.bg : COLORS.primary} />
            <Text style={[styles.monthFilterText, selMonth === null && { color: COLORS.bg }]}>Poora Saal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.monthFilterChip, selMonth !== null && styles.monthFilterActive]}
            onPress={() => setShowMonthModal(true)}
          >
            <Ionicons name="funnel" size={14} color={selMonth !== null ? COLORS.bg : COLORS.primary} />
            <Text style={[styles.monthFilterText, selMonth !== null && { color: COLORS.bg }]}>
              {selMonth !== null ? MONTHS[selMonth - 1] : 'Ek Mahina'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.previewCard}>
        <View style={styles.previewHeader}>
          <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
          <Text style={styles.previewTitle}>Export Preview</Text>
        </View>
        <View style={styles.previewStats}>
          <View style={styles.previewStat}>
            <Text style={styles.previewStatLabel}>Saal</Text>
            <Text style={styles.previewStatVal}>{selYear}</Text>
          </View>
          <View style={styles.previewStat}>
            <Text style={styles.previewStatLabel}>Total Data</Text>
            <Text style={[styles.previewStatVal, { color: COLORS.primary }]}>{formatINRFull(yearTotal)}</Text>
          </View>
          <View style={styles.previewStat}>
            <Text style={styles.previewStatLabel}>Mahine</Text>
            <Text style={styles.previewStatVal}>{monthsWithData.length} / 12</Text>
          </View>
          <View style={styles.previewStat}>
            <Text style={styles.previewStatLabel}>PDF Scope</Text>
            <Text style={styles.previewStatVal}>{selMonth !== null ? MONTHS_SHORT[selMonth - 1] : 'Annual'}</Text>
          </View>
        </View>
        {yearTotal === 0 && (
          <View style={styles.noDataBanner}>
            <Ionicons name="alert-circle-outline" size={16} color={COLORS.warning} />
            <Text style={styles.noDataText}>{selYear} mein abhi koi kharcha data nahi hai</Text>
          </View>
        )}
      </View>

      <View style={styles.exportSection}>
        <TouchableOpacity
          style={[styles.exportCard, styles.excelCard]}
          onPress={() => handleExport('excel')}
          disabled={loading}
          activeOpacity={0.8}
        >
          <View style={styles.exportIconWrap}>
            {loading && loadingType === 'excel'
              ? <ActivityIndicator color="#fff" size="large" />
              : <Ionicons name="grid" size={36} color="#fff" />}
          </View>
          <View style={styles.exportInfo}>
            <Text style={styles.exportTitle}>Excel (.xlsx)</Text>
            <Text style={styles.exportDesc}>3 sheets: Monthly Summary, Item-wise Detail, Year Comparison</Text>
            <View style={styles.exportFeatures}>
              {['12 mahine', 'Item-wise', 'Year compare'].map(f => (
                <View key={f} style={styles.featureTag}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
          <Ionicons name="arrow-forward-circle" size={24} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.exportCard, styles.pdfCard]}
          onPress={() => handleExport('pdf')}
          disabled={loading}
          activeOpacity={0.8}
        >
          <View style={styles.exportIconWrap}>
            {loading && loadingType === 'pdf'
              ? <ActivityIndicator color="#fff" size="large" />
              : <Ionicons name="document-text" size={36} color="#fff" />}
          </View>
          <View style={styles.exportInfo}>
            <Text style={styles.exportTitle}>PDF Report</Text>
            <Text style={styles.exportDesc}>Bar charts, category summary table, aur item-wise detail</Text>
            <View style={styles.exportFeatures}>
              {['Bar chart', 'Table', 'Share karo'].map(f => (
                <View key={f} style={styles.featureTag}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
          <Ionicons name="arrow-forward-circle" size={24} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>

      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>Tips</Text>
        <Text style={styles.tipItem}>• Excel export — computer pe spreadsheet open karo, filter/sort kar sakte ho</Text>
        <Text style={styles.tipItem}>• PDF report — WhatsApp, Email, ya print ke liye best hai</Text>
        <Text style={styles.tipItem}>• PDF mein ek mahina chunne se us mahine ka detail aata hai</Text>
        <Text style={styles.tipItem}>• Files automatically Downloads ya Files app mein save ho jaati hain</Text>
      </View>

      <Modal visible={showMonthModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowMonthModal(false)} activeOpacity={1}>
          <View style={styles.monthSheet}>
            <Text style={styles.sheetTitle}>Kaun sa Mahina?</Text>
            <View style={styles.monthGrid}>
              {MONTHS_SHORT.map((m, i) => {
                const hasData = monthsWithData.includes(i + 1);
                return (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.monthChip,
                      selMonth === i + 1 && styles.monthChipActive,
                      !hasData && styles.monthChipEmpty,
                    ]}
                    onPress={() => { setSelMonth(i + 1); setShowMonthModal(false); }}
                  >
                    <Text style={[styles.monthChipText, selMonth === i + 1 && styles.monthChipTextActive, !hasData && { color: COLORS.textDisabled }]}>
                      {m}
                    </Text>
                    {hasData && (
                      <Text style={[styles.monthChipSub, selMonth === i + 1 && { color: COLORS.bg + 'BB' }]}>
                        {formatINR(getMonthTotal(getMonthData(allData, selYear, i + 1)))}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  pageTitle: { fontSize: FONT.xxl, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  pageSub: { fontSize: FONT.sm, color: COLORS.textSub, marginTop: 4 },
  sectionCard: { marginHorizontal: 20, marginBottom: 14, padding: 16, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  sectionLabel: { fontSize: FONT.sm, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  sectionSub: { fontSize: FONT.xs, color: COLORS.textMuted, marginBottom: 12 },
  yearRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  yearChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.md, backgroundColor: COLORS.bgCardAlt, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  yearChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  yearChipText: { fontSize: FONT.sm, color: COLORS.textSub, fontWeight: '600' },
  yearChipTextActive: { color: COLORS.bg },
  yearChipSub: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  monthFilterRow: { flexDirection: 'row', gap: 10 },
  monthFilterChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.primary + '66', backgroundColor: COLORS.bgCardAlt },
  monthFilterActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  monthFilterText: { fontSize: FONT.sm, color: COLORS.primary, fontWeight: '600' },
  previewCard: { marginHorizontal: 20, marginBottom: 14, padding: 16, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.primary + '33' },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  previewTitle: { fontSize: FONT.md, fontWeight: '700', color: COLORS.text },
  previewStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  previewStat: { flex: 1, minWidth: '40%', backgroundColor: COLORS.bgCardAlt, borderRadius: RADIUS.md, padding: 10, borderWidth: 1, borderColor: COLORS.border },
  previewStatLabel: { fontSize: FONT.xs, color: COLORS.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  previewStatVal: { fontSize: FONT.md, fontWeight: '700', color: COLORS.text },
  noDataBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 10, backgroundColor: COLORS.warning + '22', borderRadius: RADIUS.md },
  noDataText: { fontSize: FONT.sm, color: COLORS.warning, flex: 1 },
  exportSection: { paddingHorizontal: 20, gap: 12, marginBottom: 14 },
  exportCard: { borderRadius: RADIUS.lg, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  excelCard: { backgroundColor: '#1D6B3B' },
  pdfCard: { backgroundColor: '#7C3AED' },
  exportIconWrap: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  exportInfo: { flex: 1 },
  exportTitle: { fontSize: FONT.lg, fontWeight: '800', color: '#fff', marginBottom: 4 },
  exportDesc: { fontSize: FONT.xs, color: 'rgba(255,255,255,0.75)', lineHeight: 16, marginBottom: 8 },
  exportFeatures: { flexDirection: 'row', gap: 6 },
  featureTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: RADIUS.full },
  featureText: { fontSize: 10, color: '#fff' },
  tipsCard: { marginHorizontal: 20, padding: 14, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  tipsTitle: { fontSize: FONT.sm, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  tipItem: { fontSize: FONT.xs, color: COLORS.textSub, lineHeight: 18, marginBottom: 4 },
  modalOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  monthSheet: { backgroundColor: COLORS.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: FONT.lg, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthChip: { width: '22%', paddingVertical: 10, borderRadius: RADIUS.md, backgroundColor: COLORS.bgCardAlt, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  monthChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  monthChipEmpty: { opacity: 0.4 },
  monthChipText: { fontSize: FONT.sm, color: COLORS.textSub, fontWeight: '600' },
  monthChipTextActive: { color: COLORS.bg },
  monthChipSub: { fontSize: 9, color: COLORS.textMuted, marginTop: 2 },
});
