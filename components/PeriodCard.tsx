/**
 * Componente PeriodCard
 * Muestra una tarjeta con la información de un período de gastos
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ExpensePeriod, CURRENCIES } from '@/types/expenses';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface PeriodCardProps {
  period: ExpensePeriod;
  onPress?: () => void;
}

export function PeriodCard({ period, onPress }: PeriodCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Calcular total de gastos
  const totalAmount = period.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const expenseCount = period.expenses.length;
  const currencyInfo = CURRENCIES[period.defaultCurrency];

  // Formatear fecha
  const formattedDate = period.createdAt.toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
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
          {formattedDate}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>
            Total
          </Text>
          <Text
            style={[
              styles.statValue,
              { color: colorScheme === 'dark' ? '#ffffff' : '#000000' },
            ]}>
            {currencyInfo.symbol} {totalAmount.toFixed(2)}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>
            Gastos
          </Text>
          <Text
            style={[
              styles.statCount,
              { color: colorScheme === 'dark' ? '#ffffff' : '#000000' },
            ]}>
            {expenseCount}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>
            Moneda
          </Text>
          <Text
            style={[
              styles.statCurrency,
              { color: colorScheme === 'dark' ? '#ffffff' : '#000000' },
            ]}>
            {period.defaultCurrency}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
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
  },
  periodName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  statCount: {
    fontSize: 16,
    fontWeight: '600',
  },
  statCurrency: {
    fontSize: 16,
    fontWeight: '600',
  },
});
