/**
 * Componente PeriodCard
 * Muestra una tarjeta con la información de un período de gastos
 * Actualizado en Fase 4.3 para mostrar totales por moneda
 * Actualizado en Fase 6.2 para agregar animaciones sutiles
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { ExpensePeriod, CURRENCIES, Currency, AVAILABLE_CURRENCIES, Expense } from '@/types/expenses';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { formatCurrency } from '@/utils/formatters';

interface PeriodCardProps {
  period: ExpensePeriod;
  onPress?: () => void;
}

// Interfaz para totales por moneda
interface CurrencyTotal {
  currency: Currency;
  total: number;
}

// Función helper para calcular totales por moneda
const calculateTotalsByCurrency = (expenses: Expense[]): CurrencyTotal[] => {
  const totalsMap: Record<Currency, number> = {
    SOL: 0,
    USD: 0,
    BRL: 0,
  };

  expenses.forEach((expense) => {
    totalsMap[expense.currency] += expense.amount;
  });

  // Filtrar solo las monedas que tienen gastos
  return AVAILABLE_CURRENCIES
    .filter((currency) => totalsMap[currency] > 0)
    .map((currency) => ({
      currency,
      total: totalsMap[currency],
    }));
};

export function PeriodCard({ period, onPress }: PeriodCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Animación de entrada (Fase 6.2)
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    translateY.value = withSpring(0, { damping: 15 });
    scale.value = withSpring(1, { damping: 15 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // Calcular totales por moneda
  const currencyTotals = calculateTotalsByCurrency(period.expenses);
  const expenseCount = period.expenses.length;

  // Formatear fecha con hora
  const formattedDate = period.createdAt.toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = period.createdAt.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#ffffff',
          borderColor: colorScheme === 'dark' ? '#38383a' : '#e5e5ea',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={styles.header}>
        <Text
          style={[
            styles.periodName,
            { color: colorScheme === 'dark' ? '#ffffff' : '#000000' },
          ]}>
          {period.name}
        </Text>
        <Text style={[styles.date, { color: colors.tabIconDefault }]}>
          {formattedDate} • {formattedTime}
        </Text>
      </View>

      {/* Totales por moneda */}
      {currencyTotals.length === 0 ? (
        <Text style={[styles.noExpenses, { color: colors.tabIconDefault }]}>
          Sin gastos
        </Text>
      ) : (
        <View style={styles.totalsContainer}>
          {currencyTotals.map(({ currency, total }) => {
            const currencyInfo = CURRENCIES[currency];
            return (
              <View key={currency} style={styles.totalItem}>
                <Text
                  style={[
                    styles.totalValue,
                    { color: colorScheme === 'dark' ? '#ffffff' : '#000000' },
                  ]}>
                  {formatCurrency(total, currency)}
                </Text>
                <Text style={[styles.totalLabel, { color: colors.tabIconDefault }]}>
                  {currencyInfo.name}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Contador de gastos */}
      <Text style={[styles.expenseCount, { color: colors.tabIconDefault }]}>
        {expenseCount} {expenseCount === 1 ? 'gasto' : 'gastos'}
      </Text>
    </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  header: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  periodName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
  },
  noExpenses: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  totalsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  totalItem: {
    flex: 1,
    minWidth: '30%',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  totalLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
  },
  expenseCount: {
    fontSize: 12,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e5ea',
  },
});
