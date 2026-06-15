import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Modal, FlatList, Alert, KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SECTIONS, MONTHS } from '@/data/sections';
import {
  loadAllData, saveAllData, getMonthData, getSectionTotal,
  getMonthTotal, getCustomItems, formatINRFull, AllData, MonthData,
} from '@/utils/storage';
import { COLORS, FONT, RADIUS } from '@/utils/theme';

const YEARS = [2022, 2023, 2024, 2025, 2026];

export default function EntryScreen() {
  const today = new Date();
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [allData, setAllData] = useState<AllData>({});
  const [monthData, setMonthData] = useState<MonthData>({});
  const [expandedSec, setExpandedSec] = useState<string | null>(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [addModalSec, setAddModalSec] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemVal, setNewItemVal] = useState('');

  useEffect(() => {
    loadAllData().then(d => {
      setAllData(d);
      setMonthData(getMonthData(d, year, month));
    });
  }, []);

  useEffect(() => {
    setMonthData(getMonthData(allData, year, month));
  }, [year, month, allData]);

  const monthTotal = getMonthTotal(monthData);

  const updateItem = useCallback(async (secId: string, item: string, value: string) => {
    const updated = JSON.parse(JSON.stringify(allData)) as AllData;
    const key = `${year}_${String(month).padStart(2, '0')}`;
    if (!updated[key]) updated[key] = {};
    if (!updated[key][secId] || Array.isArray(updated[key][secId])) updated[key][secId] = {};
    (updated[key][secId] as Record<string, number>)[item] = parseFloat(value) || 0;
    setAllData(updated);
    await saveAllData(updated);
  }, [allData, year, month]);

  const addCustomItem = useCallback(async () => {
    const name = newItemName.trim();
    if (!name || !addModalSec) return;
    const updated = JSON.parse(JSON.stringify(allData)) as AllData;
    const key = `${year}_${String(month).padStart(2, '0')}`;
    if (!updated[key]) updated[key] = {};
    const customKey = `_custom_${addModalSec}`;
    if (!updated[key][customKey]) updated[key][customKey] = [];
    const customArr = updated[key][customKey] as string[];
    if (!customArr.includes(name)) customArr.push(name);
    if (newItemVal) {
      if (!updated[key][addModalSec] || Array.isArray(updated[key][addModalSec])) updated[key][addModalSec] = {};
      (updated[key][addModalSec] as Record<string, number>)[name] = parseFloat(newItemVal) || 0;
    }
    setAllData(updated);
    await saveAllData(updated);
    setNewItemName('');
    setNewItemVal('');
    setAddModalSec(null);
  }, [allData, year, month, addModalSec, newItemName, newItemVal]);

  const deleteCustomItem = useCallback(async (secId: string, item: string) => {
    Alert.alert('Delete karo?', `"${item}" hatana chahte ho?`, [
      { text: 'Nahi', style: 'cancel' },
      {
        text: 'Haan', style: 'destructive', onPress: async () => {
          const updated = JSON.parse(JSON.stringify(allData)) as AllData;
          const key = `${year}_${String(month).padStart(2, '0')}`;
          const customKey = `_custom_${secId}`;
          if (updated[key]) {
            if (updated[key][customKey]) {
              (updated[key][customKey] as string[]).filter(i => i !== item);
              updated[key][customKey] = (updated[key][customKey] as string[]).filter(i => i !== item);
            }
            if (updated[key][secId] && !Array.isArray(updated[key][secId])) {
              delete (updated[key][secId] as Record<string, number>)[item];
            }
          }
          setAllData(updated);
          await saveAllData(updated);
        }
      }
    ]);
  }, [allData, year, month]);

  const renderItem = (secId: string, item: string, isCustom = false) => {
    const secData = monthData[secId] as Record<string, number> | undefined;
    const val = (secData && secData[item]) ? secData[item] : 0;
    return (
      <View key={item} style={styles.itemRow}>
        <Text style={styles.itemLabel} numberOfLines={1}>{item}</Text>
        <View style={styles.itemRight}>
          <View style={styles.inputWrap}>
            <Text style={styles.rupeeSign}>₹</Text>
            <TextInput
              style={styles.itemInput}
              value={val > 0 ? String(val) : ''}
              onChangeText={t => updateItem(secId, item, t)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={COLORS.textDisabled}
            />
          </View>
          {isCustom && (
            <TouchableOpacity onPress={() => deleteCustomItem(secId, item)} style={styles.delBtn}>
              <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderSection = ({ item: sec }: { item: typeof SECTIONS[0] }) => {
    const isOpen = expandedSec === sec.id;
    const secTotal = getSectionTotal(monthData, sec.id);
    const customItems = getCustomItems(monthData, sec.id);

    return (
      <View style={styles.sectionCard}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setExpandedSec(isOpen ? null : sec.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.secIconWrap, { backgroundColor: sec.color + '22' }]}>
            <Ionicons name={sec.icon as any} size={18} color={sec.color} />
          </View>
          <View style={styles.secTitleWrap}>
            <Text style={styles.secLabel}>{sec.label}</Text>
            {secTotal > 0 && (
              <Text style={[styles.secTotal, { color: sec.color }]}>{formatINRFull(secTotal)}</Text>
            )}
          </View>
          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textMuted} />
        </TouchableOpacity>

        {isOpen && (
          <View style={styles.sectionBody}>
            {sec.items.map(item => renderItem(sec.id, item))}
            {customItems.map(item => renderItem(sec.id, item, true))}
            <TouchableOpacity
              style={styles.addItemBtn}
              onPress={() => { setAddModalSec(sec.id); setNewItemName(''); setNewItemVal(''); }}
            >
              <Ionicons name="add-circle-outline" size={15} color={sec.color} />
              <Text style={[styles.addItemText, { color: sec.color }]}>Naya item add karo</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View>
          <Text style={styles.appTitle}>Ghar ka Kharcha</Text>
          <Text style={styles.appSubtitle}>Ghar ka poora hisaab</Text>
        </View>
        <TouchableOpacity style={styles.monthBtn} onPress={() => setShowMonthPicker(true)}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
          <Text style={styles.monthBtnText}>{MONTHS[month - 1].slice(0, 3)} {year}</Text>
          <Ionicons name="chevron-down" size={12} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Is Mahine ka Kul Kharcha</Text>
        <Text style={styles.totalAmount}>{formatINRFull(monthTotal)}</Text>
        <Text style={styles.totalSub}>{MONTHS[month - 1]} {year}</Text>
      </View>

      <FlatList
        data={SECTIONS}
        renderItem={renderSection}
        keyExtractor={s => s.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={showMonthPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowMonthPicker(false)} activeOpacity={1}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Month & Year Chuniye</Text>
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
            <View style={styles.monthGrid}>
              {MONTHS.map((m, i) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.monthChip, month === i + 1 && styles.monthChipActive]}
                  onPress={() => { setMonth(i + 1); setShowMonthPicker(false); }}
                >
                  <Text style={[styles.monthChipText, month === i + 1 && styles.monthChipTextActive]}>
                    {m.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!addModalSec} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setAddModalSec(null)} activeOpacity={1}>
            <View style={styles.addSheet}>
              <Text style={styles.pickerTitle}>Naya Item Add Karo</Text>
              <Text style={styles.addSheetSub}>
                {addModalSec ? SECTIONS.find(s => s.id === addModalSec)?.label : ''}
              </Text>
              <TextInput
                style={styles.addInput}
                placeholder="Item ka naam (e.g. Mutton, Petrol)"
                placeholderTextColor={COLORS.textMuted}
                value={newItemName}
                onChangeText={setNewItemName}
                autoFocus
              />
              <TextInput
                style={styles.addInput}
                placeholder="Amount (optional)"
                placeholderTextColor={COLORS.textMuted}
                value={newItemVal}
                onChangeText={setNewItemVal}
                keyboardType="numeric"
              />
              <TouchableOpacity style={styles.addConfirmBtn} onPress={addCustomItem}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.bg} />
                <Text style={styles.addConfirmText}>Add Karo</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  appTitle: { fontSize: FONT.xl, fontWeight: '700', color: COLORS.text, letterSpacing: -0.5 },
  appSubtitle: { fontSize: FONT.sm, color: COLORS.textSub, marginTop: 2 },
  monthBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.bgCard, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.primary + '44',
  },
  monthBtnText: { fontSize: FONT.sm, color: COLORS.primary, fontWeight: '600' },
  totalCard: {
    marginHorizontal: 20, marginBottom: 16, padding: 20,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.primary + '33', alignItems: 'center',
  },
  totalLabel: { fontSize: FONT.sm, color: COLORS.textSub, marginBottom: 6 },
  totalAmount: { fontSize: FONT.xxxl, fontWeight: '800', color: COLORS.primary, letterSpacing: -1 },
  totalSub: { fontSize: FONT.xs, color: COLORS.textMuted, marginTop: 4 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  secIconWrap: { width: 36, height: 36, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  secTitleWrap: { flex: 1 },
  secLabel: { fontSize: FONT.md, fontWeight: '600', color: COLORS.text },
  secTotal: { fontSize: FONT.sm, fontWeight: '700', marginTop: 2 },
  sectionBody: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingBottom: 8 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, gap: 10,
  },
  itemLabel: { flex: 1, fontSize: FONT.sm, color: COLORS.textSub },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCardAlt, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 8, height: 36, minWidth: 100,
  },
  rupeeSign: { fontSize: FONT.sm, color: COLORS.textMuted, marginRight: 2 },
  itemInput: { flex: 1, fontSize: FONT.sm, color: COLORS.text, textAlign: 'right' },
  delBtn: { padding: 4 },
  addItemBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    margin: 10, padding: 10, borderRadius: RADIUS.md,
    borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.borderLight,
  },
  addItemText: { fontSize: FONT.sm, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: COLORS.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  pickerTitle: { fontSize: FONT.lg, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  yearRow: { marginBottom: 16 },
  yearChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCardAlt, marginRight: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  yearChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  yearChipText: { fontSize: FONT.sm, color: COLORS.textSub },
  yearChipTextActive: { color: COLORS.bg, fontWeight: '700' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthChip: {
    width: '22%', paddingVertical: 10, borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgCardAlt, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  monthChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  monthChipText: { fontSize: FONT.sm, color: COLORS.textSub },
  monthChipTextActive: { color: COLORS.bg, fontWeight: '700' },
  addSheet: {
    backgroundColor: COLORS.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  addSheetSub: { fontSize: FONT.sm, color: COLORS.textSub, marginBottom: 16, marginTop: -8 },
  addInput: {
    backgroundColor: COLORS.bgCardAlt, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: FONT.md,
    color: COLORS.text, marginBottom: 12,
  },
  addConfirmBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: 14, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, marginTop: 4,
  },
  addConfirmText: { fontSize: FONT.md, color: COLORS.bg, fontWeight: '700' },
});
