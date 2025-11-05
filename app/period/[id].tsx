/**
 * Pantalla de Detalles del Período
 * Fase 4.1 - Muestra gastos de un período específico
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useExpenses } from '@/contexts/ExpenseContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CURRENCIES, Currency, AVAILABLE_CURRENCIES } from '@/types/expenses';
import { Fonts } from '@/constants/theme';

export default function PeriodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { periods, deleteExpense, deletePeriod, updatePeriodCurrency } = useExpenses();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  // Encontrar el período actual
  const period = periods.find((p) => p.id === id);

  // Si no existe el período, mostrar error
  if (!period) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <IconSymbol name="exclamationmark.triangle" size={64} color={colors.tabIconDefault} />
        <Text style={[styles.errorText, { color: colors.text }]}>Período no encontrado</Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.tint }]}
          onPress={() => router.back()}>
          <Text style={styles.buttonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Calcular total
  const totalAmount = period.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const currencyInfo = CURRENCIES[period.defaultCurrency];

  // Handler para eliminar gasto
  const handleDeleteExpense = (expenseId: string, description: string) => {
    Alert.alert(
      'Eliminar gasto',
      `¿Eliminar "${description}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense(period.id, expenseId);
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el gasto');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Handler para eliminar período
  const handleDeletePeriod = () => {
    Alert.alert(
      'Eliminar período',
      `¿Eliminar "${period.name}" y todos sus gastos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePeriod(period.id);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el período');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Handler para cambiar moneda
  const handleChangeCurrency = async (currency: Currency) => {
    try {
      await updatePeriodCurrency(period.id, currency);
      setShowCurrencyPicker(false);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cambiar la moneda');
    }
  };

  // Handler para añadir gasto (temporal - modal en Fase 4.2)
  const handleAddExpense = () => {
    Alert.alert('Añadir gasto', 'Modal en Fase 4.2');
  };

  // Formatear fecha
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-PE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        {/* Botón atrás */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </TouchableOpacity>

        {/* Título y fecha */}
        <View style={styles.headerInfo}>
          <Text
            style={[
              styles.periodName,
              { color: colorScheme === 'dark' ? '#ffffff' : '#000000', fontFamily: Fonts.rounded },
            ]}>
            {period.name}
          </Text>
          <Text style={[styles.periodDate, { color: colors.tabIconDefault }]}>
            Creado: {formatDate(period.createdAt)}
          </Text>
        </View>

        {/* Botón eliminar período */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeletePeriod}>
          <IconSymbol name="trash" size={22} color="#ff3b30" />
        </TouchableOpacity>
      </View>

      {/* Resumen */}
      <View
        style={[
          styles.summary,
          {
            backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#ffffff',
            borderColor: colorScheme === 'dark' ? '#38383a' : '#e5e5ea',
          },
        ]}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.tabIconDefault }]}>Total</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: colorScheme === 'dark' ? '#ffffff' : '#000000' },
              ]}>
              {currencyInfo.symbol} {totalAmount.toFixed(2)}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.tabIconDefault }]}>Gastos</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: colorScheme === 'dark' ? '#ffffff' : '#000000' },
              ]}>
              {period.expenses.length}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.summaryItem}
            onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}>
            <Text style={[styles.summaryLabel, { color: colors.tabIconDefault }]}>Moneda</Text>
            <View style={styles.currencyButton}>
              <Text
                style={[
                  styles.summaryValue,
                  { color: colorScheme === 'dark' ? '#ffffff' : '#000000' },
                ]}>
                {period.defaultCurrency}
              </Text>
              <IconSymbol
                name="chevron.down"
                size={16}
                color={colorScheme === 'dark' ? '#ffffff' : '#000000'}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Selector de moneda */}
        {showCurrencyPicker && (
          <View style={styles.currencyPicker}>
            {AVAILABLE_CURRENCIES.map((currency) => (
              <TouchableOpacity
                key={currency}
                style={[
                  styles.currencyOption,
                  period.defaultCurrency === currency && styles.currencyOptionActive,
                  {
                    backgroundColor:
                      period.defaultCurrency === currency
                        ? colors.tint
                        : colorScheme === 'dark'
                          ? '#2c2c2e'
                          : '#f5f5f5',
                  },
                ]}
                onPress={() => handleChangeCurrency(currency)}>
                <Text
                  style={[
                    styles.currencyOptionText,
                    {
                      color:
                        period.defaultCurrency === currency
                          ? '#ffffff'
                          : colorScheme === 'dark'
                            ? '#ffffff'
                            : '#000000',
                    },
                  ]}>
                  {CURRENCIES[currency].symbol} {CURRENCIES[currency].name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Lista de gastos */}
      {period.expenses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol
            name="cart"
            size={64}
            color={colors.tabIconDefault}
            style={styles.emptyIcon}
          />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No hay gastos</Text>
          <Text style={[styles.emptySubtitle, { color: colors.tabIconDefault }]}>
            Toca el botón + para añadir un gasto
          </Text>
        </View>
      ) : (
        <FlatList
          data={period.expenses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              style={[
                styles.expenseCard,
                {
                  backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#ffffff',
                  borderColor: colorScheme === 'dark' ? '#38383a' : '#e5e5ea',
                },
              ]}>
              <View style={styles.expenseMain}>
                <View style={styles.expenseInfo}>
                  <Text
                    style={[
                      styles.expenseDescription,
                      { color: colorScheme === 'dark' ? '#ffffff' : '#000000' },
                    ]}>
                    {item.description}
                  </Text>
                  <Text style={[styles.expenseDate, { color: colors.tabIconDefault }]}>
                    {formatDate(item.date)}
                  </Text>
                </View>

                <View style={styles.expenseRight}>
                  <Text
                    style={[
                      styles.expenseAmount,
                      { color: colorScheme === 'dark' ? '#ffffff' : '#000000' },
                    ]}>
                    {CURRENCIES[item.currency].symbol} {item.amount.toFixed(2)}
                  </Text>

                  <TouchableOpacity
                    style={styles.deleteExpenseButton}
                    onPress={() => handleDeleteExpense(item.id, item.description)}>
                    <IconSymbol name="trash" size={18} color="#ff3b30" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Botón flotante */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.tint }]}
        onPress={handleAddExpense}
        activeOpacity={0.8}>
        <IconSymbol name="plus" size={28} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  periodName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  periodDate: {
    fontSize: 12,
  },
  deleteButton: {
    padding: 8,
  },
  summary: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  currencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  currencyPicker: {
    marginTop: 12,
    gap: 8,
  },
  currencyOption: {
    padding: 12,
    borderRadius: 8,
  },
  currencyOptionActive: {},
  currencyOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  expenseCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  expenseMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  expenseDate: {
    fontSize: 12,
  },
  expenseRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  deleteExpenseButton: {
    padding: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});
