import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TextInput, Modal,
  SafeAreaView, StatusBar, TouchableOpacity, Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  ChevronLeft, ChevronRight, X, Trash2, TrendingUp, 
  Wallet, CalendarDays, PieChart, Utensils, Car, House, 
  Gamepad2, Gift, ShoppingBag, Plus, Repeat, AlertTriangle
} from 'lucide-react-native';
import Svg, { G, Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

const CATEGORIES = {
  gasto: [
    { id: 'food', label: 'Alimentação', icon: Utensils, color: '#F87171' },
    { id: 'transport', label: 'Transporte', icon: Car, color: '#FBBF24' },
    { id: 'home', label: 'Casa', icon: House, color: '#60A5FA' },
    { id: 'leisure', label: 'Lazer', icon: Gamepad2, color: '#A78BFA' },
    { id: 'shopping', label: 'Compras', icon: ShoppingBag, color: '#F472B6' },
    { id: 'others', label: 'Outros', icon: Trash2, color: '#94A3B8' },
  ],
  renda: [
    { id: 'salary', label: 'Diária', icon: Wallet, color: '#4ADE80' },
    { id: 'extra', label: 'Extra', icon: TrendingUp, color: '#2DD4BF' },
    { id: 'gift', label: 'Presente', icon: Gift, color: '#F472B6' },
  ]
};

const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

// COMPONENTE DO GRÁFICO BASEADO NA RENDA
const DonutChart = ({ catTotals, totalIncome }) => {
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  let currentOffset = 0;

  if (totalIncome <= 0) {
    return (
      <View style={styles.emptyChart}>
        <Text style={{color: '#475569', fontSize: 10, textAlign: 'center'}}>SEM{"\n"}RENDA</Text>
      </View>
    );
  }

  return (
    <Svg width="100" height="100" viewBox="0 0 100 100">
      <G rotation="-90" origin="50, 50">
        {/* Fundo escuro que representa os 100% da renda disponível */}
        <Circle cx="50" cy="50" r={radius} stroke="#1E293B" strokeWidth="12" fill="none" />
        
        {CATEGORIES.gasto.map(cat => {
          const val = catTotals[cat.id] || 0;
          if (val <= 0) return null;

          // A fatia é calculada sobre a RENDA e não sobre o total gasto
          const strokeVal = (val / totalIncome) * circumference;
          const offset = currentOffset;
          currentOffset += strokeVal;

          return (
            <Circle 
              key={cat.id} 
              cx="50" cy="50" r={radius} 
              stroke={cat.color} 
              strokeWidth="12" 
              fill="none" 
              strokeDasharray={`${strokeVal} ${circumference}`} 
              strokeDashoffset={-offset} 
            />
          );
        })}
      </G>
    </Svg>
  );
};

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [allData, setAllData] = useState({}); 
  const [exceptions, setExceptions] = useState([]); 
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [selectedDayStr, setSelectedDayStr] = useState(`${new Date().getDate()}-${new Date().getMonth() + 1}-${new Date().getFullYear()}`);
  
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [type, setType] = useState('gasto');
  const [period, setPeriod] = useState('unico'); 
  const [category, setCategory] = useState('others');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    AsyncStorage.getItem('@finance_v12_pro').then(s => {
      if (s) {
        const parsed = JSON.parse(s);
        setAllData(parsed.allData || {});
        setExceptions(parsed.exceptions || []);
      }
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('@finance_v12_pro', JSON.stringify({ allData, exceptions }));
  }, [allData, exceptions]);

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const changeMonth = (offset) => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  const handleDayPress = (day) => setSelectedDayStr(`${day}-${currentDate.getMonth() + 1}-${currentDate.getFullYear()}`);

  const addItem = () => {
    if (!name || !value) return;
    const [d, m, y] = selectedDayStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const newItem = {
      id: Date.now().toString(),
      name, value: parseFloat(value), type, period, category, 
      day: d, timestamp: dateObj.getTime(), dayOfWeek: dateObj.getDay(), 
      originDayStr: selectedDayStr, endDate: null 
    };
    setAllData(prev => ({ ...prev, [selectedDayStr]: [...(prev[selectedDayStr] || []), newItem] }));
    setModalVisible(false);
  };

  const confirmDelete = (mode) => {
    const id = itemToDelete.id;
    if (mode === 'only_today') {
      setExceptions(prev => [...prev, `${id}_${selectedDayStr}`]);
    } else if (mode === 'stop_future') {
      const [d, m, y] = selectedDayStr.split('-').map(Number);
      const endTs = new Date(y, m - 1, d).getTime();
      setAllData(prev => {
        const copy = { ...prev };
        Object.keys(copy).forEach(day => {
          copy[day] = copy[day].map(it => it.id === id ? { ...it, endDate: endTs } : it);
        });
        return copy;
      });
    } else if (mode === 'all') {
      setAllData(prev => {
        const copy = { ...prev };
        Object.keys(copy).forEach(day => {
          copy[day] = copy[day].filter(it => it.id !== id);
        });
        return copy;
      });
    }
    setDeleteModalVisible(false);
    setItemToDelete(null);
  };

  const financeData = useMemo(() => {
    let currentIncome = 0, currentExpenses = 0, totalMonthIncome = 0, totalMonthExpenses = 0;
    const monthDisplay = {}, catTotals = {};

    Object.keys(allData).forEach(originDayKey => {
      allData[originDayKey].forEach(item => {
        for (let d = 1; d <= daysInMonth; d++) {
          const evalDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
          const evalDayStr = `${d}-${currentDate.getMonth() + 1}-${currentDate.getFullYear()}`;
          const evalTs = evalDate.getTime();
          let showHere = false;
          
          if (exceptions.includes(`${item.id}_${evalDayStr}`)) continue;
          if (item.endDate && evalTs > item.endDate) continue;
          
          if (item.period === 'unico' && evalDayStr === originDayKey) showHere = true;
          else if (item.period === 'mensal' && d === item.day && evalTs >= item.timestamp) showHere = true;
          else if (item.period === 'semanal' && evalDate.getDay() === item.dayOfWeek && evalTs >= item.timestamp) showHere = true;
          
          if (showHere) {
            if (!monthDisplay[evalDayStr]) monthDisplay[evalDayStr] = [];
            monthDisplay[evalDayStr].push(item);
            if (item.type === 'renda') totalMonthIncome += item.value;
            else {
              totalMonthExpenses += item.value;
              catTotals[item.category] = (catTotals[item.category] || 0) + item.value;
            }
            if (evalTs <= today.getTime()) {
              if (item.type === 'renda') currentIncome += item.value; else currentExpenses += item.value;
            }
          }
        }
      });
    });
    return { currentBalance: currentIncome - currentExpenses, estimatedBalance: totalMonthIncome - totalMonthExpenses, totalMonthIncome, totalMonthExpenses, monthDisplay, catTotals };
  }, [allData, currentDate, daysInMonth, exceptions]);

  return (
    <View style={styles.outerContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.innerContainer}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity onPress={() => changeMonth(-1)}><ChevronLeft color="#94A3B8" /></TouchableOpacity>
              <View style={{alignItems: 'center'}}>
                <Text style={styles.headerLabel}>{monthNames[currentDate.getMonth()].toUpperCase()} {currentDate.getFullYear()}</Text>
                <TouchableOpacity onPress={() => {setCurrentDate(new Date()); handleDayPress(new Date().getDate());}} style={styles.todayBtn}><Text style={styles.todayBtnText}>HOJE</Text></TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => changeMonth(1)}><ChevronRight color="#94A3B8" /></TouchableOpacity>
            </View>
            <Text style={styles.infoLabel}>SALDO ATUAL</Text>
            <Text style={[styles.headerValue, { color: financeData.currentBalance < 0 ? '#F87171' : '#4ADE80' }]}>R$ {financeData.currentBalance.toFixed(2)}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
              <View style={[styles.miniCard, {borderLeftWidth: 3, borderLeftColor: '#4ADE80'}]}><Text style={styles.miniCardLabel}>RENDA</Text><Text style={[styles.miniCardValue, { color: '#4ADE80' }]}>R$ {financeData.totalMonthIncome.toFixed(2)}</Text></View>
              <View style={[styles.miniCard, {borderLeftWidth: 3, borderLeftColor: '#F87171'}]}><Text style={styles.miniCardLabel}>GASTOS</Text><Text style={[styles.miniCardValue, { color: '#F87171' }]}>R$ {financeData.totalMonthExpenses.toFixed(2)}</Text></View>
              <View style={[styles.miniCard, {borderLeftWidth: 3, borderLeftColor: '#6366F1'}]}><Text style={styles.miniCardLabel}>PREVISÃO</Text><Text style={[styles.miniCardValue, { color: financeData.estimatedBalance < 0 ? '#F87171' : '#6366F1' }]}>R$ {financeData.estimatedBalance.toFixed(2)}</Text></View>
            </ScrollView>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>
            <View style={styles.sectionCard}>
              <View style={styles.weekDaysHeader}>
                {WEEKDAYS.map(wd => <Text key={wd} style={styles.weekDayText}>{wd}</Text>)}
              </View>
              <View style={styles.calendarGrid}>
                {Array.from({ length: firstDayOfMonth }).map((_, i) => <View key={i} style={styles.dayBoxEmpty} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const d = i + 1, dStr = `${d}-${currentDate.getMonth()+1}-${currentDate.getFullYear()}`;
                  const isToday = today.getDate() === d && today.getMonth() === currentDate.getMonth();
                  const isSelected = selectedDayStr === dStr, items = financeData.monthDisplay[dStr] || [];
                  return (
                    <TouchableOpacity key={d} style={[styles.dayBox, isToday && styles.dayBoxToday, isSelected && styles.dayBoxSelected]} onPress={() => handleDayPress(d)}>
                      <Text style={[styles.dayText, isToday && styles.dayTextToday, isSelected && {color: '#FFF'}]}>{d}</Text>
                      <View style={styles.indicatorRow}>
                        {items.some(it => it.type === 'renda') && <View style={[styles.dot, { backgroundColor: '#4ADE80' }]} />}
                        {items.some(it => it.type === 'gasto') && <View style={[styles.dot, { backgroundColor: '#F87171' }]} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity style={styles.addBtnInline} onPress={() => {setName(''); setValue(''); setModalVisible(true);}}><Plus size={18} color="#FFF" /><Text style={styles.addBtnText}>Novo Lançamento</Text></TouchableOpacity>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.logHeader}><PieChart size={18} color="#6366F1" /><Text style={styles.logTitle}>IMPACTO NA RENDA</Text></View>
              <View style={styles.chartRow}>
                <DonutChart catTotals={financeData.catTotals} totalIncome={financeData.totalMonthIncome} />
                <View style={{flex: 1, marginLeft: 15}}>
                  {CATEGORIES.gasto.map(cat => {
                    const value = financeData.catTotals[cat.id] || 0;
                    const impact = financeData.totalMonthIncome > 0 ? ((value / financeData.totalMonthIncome) * 100).toFixed(1) : 0;
                    return value > 0 && (
                      <View key={cat.id} style={styles.catRow}>
                        <View style={[styles.catDot, {backgroundColor: cat.color}]} />
                        <Text style={styles.catText} numberOfLines={1}>{cat.label} ({impact}%)</Text>
                        <Text style={styles.catVal}>R$ {value.toFixed(0)}</Text>
                      </View>
                    );
                  })}
                  {financeData.totalMonthExpenses === 0 && <Text style={styles.emptyText}>Sem gastos no mês.</Text>}
                </View>
              </View>
            </View>

            <View style={styles.sectionCard}>
                <View style={styles.logHeader}><CalendarDays size={18} color="#6366F1" /><Text style={styles.logTitle}>LANÇAMENTOS DO DIA</Text></View>
                {(!financeData.monthDisplay[selectedDayStr] || financeData.monthDisplay[selectedDayStr].length === 0) ? 
                  <Text style={styles.emptyText}>Nada registrado hoje.</Text> : 
                  financeData.monthDisplay[selectedDayStr].map((item, idx) => {
                    const catInfo = [...CATEGORIES.gasto, ...CATEGORIES.renda].find(c => c.id === item.category);
                    const Icon = catInfo?.icon || Trash2;
                    return (
                      <View key={idx} style={styles.logItem}>
                        <View style={[styles.logIconBox, {backgroundColor: item.type === 'renda' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)'}]}>
                          <Icon size={16} color={catInfo?.color || '#94A3B8'} />
                        </View>
                        <View style={{flex: 1, marginLeft: 12}}>
                          <View style={{flexDirection: 'row', alignItems: 'center'}}><Text style={styles.logName}>{item.name}</Text>{item.period !== 'unico' && <Repeat size={10} color="#6366F1" style={{marginLeft: 5}} />}</View>
                          <Text style={styles.logCat}>{catInfo?.label || 'Outros'}</Text>
                        </View>
                        <View style={{alignItems: 'flex-end'}}>
                          <Text style={[styles.logValue, {color: item.type === 'renda' ? '#4ADE80' : '#F87171'}]}>R$ {item.value.toFixed(2)}</Text>
                          <TouchableOpacity onPress={() => { setItemToDelete(item); setDeleteModalVisible(true); }} style={{marginTop: 5, padding: 5}}><Trash2 size={16} color="#475569" /></TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                }
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* MODAL EXCLUIR */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteContent}>
            <AlertTriangle color="#F87171" size={40} style={{alignSelf: 'center', marginBottom: 15}} />
            <Text style={styles.deleteTitle}>Excluir Lançamento?</Text>
            <Text style={styles.deleteSub}>Como remover "{itemToDelete?.name}"?</Text>
            {itemToDelete?.period === 'unico' ? (
              <TouchableOpacity style={[styles.delBtn, {backgroundColor: '#EF4444'}]} onPress={() => confirmDelete('all')}><Text style={styles.delBtnText}>EXCLUIR AGORA</Text></TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={styles.delBtn} onPress={() => confirmDelete('only_today')}><Text style={styles.delBtnText}>EXCLUIR APENAS HOJE</Text></TouchableOpacity>
                <TouchableOpacity style={styles.delBtn} onPress={() => confirmDelete('stop_future')}><Text style={styles.delBtnText}>PARAR DAQUI EM DIANTE</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.delBtn, {backgroundColor: '#EF4444'}]} onPress={() => confirmDelete('all')}><Text style={styles.delBtnText}>EXCLUIR LOOP INTEIRO</Text></TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.cancelDelBtn} onPress={() => setDeleteModalVisible(false)}><Text style={{color: '#94A3B8', fontWeight: 'bold'}}>CANCELAR</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL ADICIONAR */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentFull}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Novo Item</Text><TouchableOpacity onPress={() => setModalVisible(false)}><X color="#FFF" /></TouchableOpacity></View>
            <TextInput style={styles.input} placeholder="Nome" placeholderTextColor="#64748B" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Valor R$" placeholderTextColor="#64748B" keyboardType="numeric" value={value} onChangeText={setValue} />
            
            <Text style={styles.infoLabel}>TIPO</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity style={[styles.typeBtn, type === 'gasto' && {backgroundColor: '#F87171'}]} onPress={() => { setType('gasto'); setCategory('others'); }}><Text style={styles.btnText}>GASTO</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.typeBtn, type === 'renda' && {backgroundColor: '#4ADE80'}]} onPress={() => { setType('renda'); setCategory('salary'); }}><Text style={styles.btnText}>RENDA</Text></TouchableOpacity>
            </View>

            <Text style={styles.infoLabel}>RECORRÊNCIA</Text>
            <View style={styles.typeRow}>
              {['unico', 'semanal', 'mensal'].map(p => <TouchableOpacity key={p} style={[styles.typeBtn, period === p && {backgroundColor: '#6366F1'}]} onPress={() => setPeriod(p)}><Text style={styles.btnText}>{p.toUpperCase()}</Text></TouchableOpacity>)}
            </View>

            <Text style={styles.infoLabel}>CATEGORIA</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 20}}>
              {CATEGORIES[type].map(cat => (
                <TouchableOpacity key={cat.id} style={[styles.catIconBtn, category === cat.id && {borderColor: cat.color, borderWidth: 2}]} onPress={() => setCategory(cat.id)}>
                  <cat.icon size={18} color={category === cat.id ? cat.color : '#64748B'} />
                  <Text style={[styles.catIconLabel, category === cat.id && {color: '#FFF'}]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.saveBtn} onPress={addItem}><Text style={styles.saveBtnText}>LANÇAR AGORA</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#020617' },
  safeArea: { flex: 1 },
  innerContainer: { flex: 1 },
  header: { backgroundColor: '#0F172A', padding: 20, paddingTop: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, alignItems: 'center' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: 15 },
  headerLabel: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold' },
  todayBtn: { backgroundColor: '#1E293B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15 },
  todayBtnText: { color: '#6366F1', fontSize: 10, fontWeight: 'bold' },
  headerValue: { fontSize: 34, fontWeight: 'bold', marginVertical: 8 },
  infoLabel: { color: '#64748B', fontSize: 10, fontWeight: 'bold', marginBottom: 8, marginTop: 10 },
  statsScroll: { width: '100%', marginTop: 10 },
  miniCard: { backgroundColor: '#1E293B', padding: 12, borderRadius: 15, width: width * 0.38, marginRight: 10 },
  miniCardLabel: { color: '#64748B', fontSize: 9, fontWeight: 'bold', marginBottom: 4 },
  miniCardValue: { fontSize: 13, fontWeight: 'bold' },
  sectionCard: { backgroundColor: '#0F172A', margin: 16, marginBottom: 0, borderRadius: 24, padding: 18 },
  weekDaysHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 5 },
  weekDayText: { color: '#475569', fontSize: 10, fontWeight: 'bold', width: '12.2%', textAlign: 'center' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', width: '100%' },
  dayBox: { width: '12.2%', aspectRatio: 1, backgroundColor: '#1E293B', borderRadius: 10, margin: '1%', justifyContent: 'center', alignItems: 'center' },
  dayBoxEmpty: { width: '12.2%', aspectRatio: 1, margin: '1%' },
  dayBoxToday: { borderWidth: 1, borderColor: '#6366F1' },
  dayBoxSelected: { backgroundColor: '#6366F1' },
  dayText: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold' },
  dayTextToday: { color: '#6366F1' },
  indicatorRow: { flexDirection: 'row', marginTop: 2 },
  dot: { width: 3, height: 3, borderRadius: 1.5, marginHorizontal: 1 },
  addBtnInline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E293B', marginTop: 15, padding: 12, borderRadius: 12 },
  addBtnText: { color: '#FFF', marginLeft: 10, fontWeight: 'bold', fontSize: 12 },
  logHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  logTitle: { color: '#F1F5F9', fontSize: 13, fontWeight: 'bold', marginLeft: 10, flex: 1 },
  chartRow: { flexDirection: 'row', alignItems: 'center' },
  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  catDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  catText: { color: '#94A3B8', fontSize: 11, flex: 1 },
  catVal: { color: '#F1F5F9', fontSize: 11, fontWeight: 'bold' },
  logItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1E293B', paddingBottom: 12 },
  logIconBox: { padding: 10, borderRadius: 12, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  logName: { color: '#F1F5F9', fontSize: 13, fontWeight: '600' },
  logCat: { color: '#64748B', fontSize: 9, textTransform: 'uppercase' },
  logValue: { fontWeight: 'bold', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContentFull: { backgroundColor: '#0F172A', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  input: { backgroundColor: '#1E293B', borderRadius: 12, color: '#FFF', padding: 12, marginBottom: 10 },
  typeRow: { flexDirection: 'row', marginBottom: 15 },
  typeBtn: { flex: 1, padding: 10, borderRadius: 12, alignItems: 'center', backgroundColor: '#1E293B', marginHorizontal: 5 },
  catIconBtn: { alignItems: 'center', padding: 10, backgroundColor: '#1E293B', borderRadius: 12, marginRight: 10, minWidth: 75 },
  catIconLabel: { color: '#64748B', fontSize: 9, marginTop: 4 },
  saveBtn: { backgroundColor: '#6366F1', padding: 16, borderRadius: 15, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: 'bold' },
  btnText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  emptyText: { color: '#475569', fontSize: 11, textAlign: 'center' },
  emptyChart: { width: 100, height: 100, borderRadius: 50, borderStyle: 'dashed', borderWidth: 1, borderColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  deleteOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  deleteContent: { width: width * 0.85, backgroundColor: '#0F172A', borderRadius: 24, padding: 25 },
  deleteTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },
  deleteSub: { color: '#94A3B8', fontSize: 12, textAlign: 'center', marginBottom: 20 },
  delBtn: { backgroundColor: '#1E293B', padding: 15, borderRadius: 12, marginBottom: 10, alignItems: 'center' },
  delBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 11 },
  cancelDelBtn: { marginTop: 10, padding: 10, alignItems: 'center' }
});