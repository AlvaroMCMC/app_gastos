/**
 * Pantalla Home - Lista de Períodos de Gastos
 * Fase 3.1 - Interfaz principal de la app
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
import { useExpenses } from '@/contexts/ExpenseContext';
import { PeriodCard } from '@/components/PeriodCard';
import { CreatePeriodModal } from '@/components/CreatePeriodModal';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { Currency } from '@/types/expenses';

export default function HomeScreen() {
  const { periods, loading, createPeriod } = useExpenses();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [modalVisible, setModalVisible] = useState(false);

  // Handler para crear período desde el modal
  const handleCreatePeriod = async (name: string, currency: Currency) => {
    await createPeriod(name, currency);
  };

  // Handler para tocar un período (navegación pendiente)
  const handlePeriodPress = (periodId: string, periodName: string) => {
    Alert.alert('Período seleccionado', `${periodName}\n(Navegación en Fase 4)`);
  };

  // Renderizar estado de carga
  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Cargando períodos...
        </Text>
      </View>
    );
  }

  // Renderizar estado vacío
  if (periods.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              { color: colorScheme === 'dark' ? '#ffffff' : '#000000', fontFamily: Fonts.rounded },
            ]}>
            Mis Períodos
          </Text>
        </View>

        <View style={styles.emptyContainer}>
          <IconSymbol
            name="calendar"
            size={64}
            color={colors.tabIconDefault}
            style={styles.emptyIcon}
          />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No hay períodos
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.tabIconDefault }]}>
            Toca el botón + para crear tu primer período
          </Text>
        </View>

        {/* Botón flotante */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.tint }]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}>
          <IconSymbol name="plus" size={28} color="#ffffff" />
        </TouchableOpacity>

        {/* Modal crear período */}
        <CreatePeriodModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onCreatePeriod={handleCreatePeriod}
        />
      </View>
    );
  }

  // Renderizar lista de períodos
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            { color: colorScheme === 'dark' ? '#ffffff' : '#000000', fontFamily: Fonts.rounded },
          ]}>
          Mis Períodos
        </Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          {periods.length} {periods.length === 1 ? 'período' : 'períodos'}
        </Text>
      </View>

      <FlatList
        data={periods}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PeriodCard
            period={item}
            onPress={() => handlePeriodPress(item.id, item.name)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Botón flotante */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.tint }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}>
        <IconSymbol name="plus" size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* Modal crear período */}
      <CreatePeriodModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreatePeriod={handleCreatePeriod}
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
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
