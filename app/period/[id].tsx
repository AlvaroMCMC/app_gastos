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
import { CURRENCIES, Currency, AVAILABLE_CURRENCIES, Expense } from '@/types/expenses';
import { Fonts } from '@/constants/theme';
import { CreateExpenseModal } from '@/components/CreateExpenseModal';
import { formatCurrency } from '@/utils/formatters';

// Interfaz para totales por moneda
interface CurrencyTotal {
  currency: Currency;
  total: number;
  count: number;
}

// Función helper para calcular totales por moneda
const calculateTotalsByCurrency = (expenses: Expense[]): CurrencyTotal[] => {
  const totalsMap: Record<Currency, { total: number; count: number }> = {
    SOL: { total: 0, count: 0 },
    USD: { total: 0, count: 0 },
    BRL: { total: 0, count: 0 },
  };

  expenses.forEach((expense) => {
    totalsMap[expense.currency].total += expense.amount;
    totalsMap[expense.currency].count += 1;
  });

  // Filtrar solo las monedas que tienen gastos
  return AVAILABLE_CURRENCIES
    .filter((currency) => totalsMap[currency].count > 0)
    .map((currency) => ({
      currency,
      total: totalsMap[currency].total,
      count: totalsMap[currency].count,
    }));
};

export default function PeriodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { periods, deleteExpense, deletePeriod, addExpense } = useExpenses();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [modalVisible, setModalVisible] = useState(false);

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

  // Calcular totales por moneda
  const currencyTotals = calculateTotalsByCurrency(period.expenses);
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

  // Handler para crear gasto desde el modal
  const handleCreateExpense = async (description: string, amount: number, currency: Currency) => {
    await addExpense(period.id, description, amount, currency);
  };

  // Formatear fecha simple (para header)
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-PE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Formatear fecha con hora (para gastos)
  const formatDateTime = (date: Date) => {
    const dateStr = date.toLocaleDateString('es-PE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const timeStr = date.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    return `${dateStr} • ${timeStr}`;
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
        <View style={styles.summaryHeader}>
          <Text
            style={[
              styles.summaryTitle,
              { color: colorScheme === 'dark' ? '#ffffff' : '#000000' },
            ]}>
            Resumen
          </Text>
          <Text style={[styles.expenseCount, { color: colors.tabIconDefault }]}>
            {period.expenses.length} {period.expenses.length === 1 ? 'gasto' : 'gastos'}
          </Text>
        </View>

        {/* Totales por moneda */}
        {currencyTotals.length === 0 ? (
          <Text style={[styles.noExpensesText, { color: colors.tabIconDefault }]}>
            Sin gastos
          </Text>
        ) : (
          <View style={styles.totalsContainer}>
            {currencyTotals.map(({ currency, total, count }) => {
              const currInfo = CURRENCIES[currency];
              return (
                <View
                  key={currency}
                  style={[
                    styles.totalRow,
                    {
                      backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#f5f5f5',
                    },
                  ]}>
                  <View style={styles.totalCurrency}>
                    <Text
                      style={[
                        styles.totalCurrencySymbol,
                        { color: colorScheme === 'dark' ? '#ffffff' : '#000000' },
                      ]}>
                      {currInfo.symbol}
                    </Text>
                    <Text style={[styles.totalCurrencyName, { color: colors.tabIconDefault }]}>
                      {currInfo.name}
                    </Text>
                  </View>
                  <View style={styles.totalAmount}>
                    <Text
                      style={[
                        styles.totalValue,
                        { color: colorScheme === 'dark' ? '#ffffff' : '#000000' },
                      ]}>
                      {formatCurrency(total, currency)}
                    </Text>
                    <Text style={[styles.totalCount, { color: colors.tabIconDefault }]}>
                      {count} {count === 1 ? 'gasto' : 'gastos'}
                    </Text>
                  </View>
                </View>
              );
            })}
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
                    {formatDateTime(item.date)}
                  </Text>
                </View>

                <View style={styles.expenseRight}>
                  <Text
                    style={[
                      styles.expenseAmount,
                      { color: colorScheme === 'dark' ? '#ffffff' : '#000000' },
                    ]}>
                    {formatCurrency(item.amount, item.currency)}
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
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}>
        <IconSymbol name="plus" size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* Modal crear gasto */}
      <CreateExpenseModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreateExpense={handleCreateExpense}
      />
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
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  expenseCount: {
    fontSize: 14,
  },
  noExpensesText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  totalsContainer: {
    gap: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  totalCurrency: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalCurrencySymbol: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  totalCurrencyName: {
    fontSize: 14,
  },
  totalAmount: {
    alignItems: 'flex-end',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  totalCount: {
    fontSize: 12,
    marginTop: 2,
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
    backgroundColor: '#007AFF',
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
