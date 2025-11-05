/**
 * Modal para crear un nuevo período
 * Fase 3.2
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Currency, CURRENCIES, AVAILABLE_CURRENCIES, DEFAULT_CURRENCY } from '@/types/expenses';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface CreatePeriodModalProps {
  visible: boolean;
  onClose: () => void;
  onCreatePeriod: (name: string, currency: Currency) => Promise<void>;
}

export function CreatePeriodModal({ visible, onClose, onCreatePeriod }: CreatePeriodModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [periodName, setPeriodName] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [creating, setCreating] = useState(false);

  // Resetear form al cerrar
  const handleClose = () => {
    setPeriodName('');
    setSelectedCurrency(DEFAULT_CURRENCY);
    onClose();
  };

  // Validar y crear período
  const handleCreate = async () => {
    // Validación: nombre no vacío
    const trimmedName = periodName.trim();
    if (!trimmedName) {
      Alert.alert('Error', 'Por favor ingresa un nombre para el período');
      return;
    }

    try {
      setCreating(true);
      await onCreatePeriod(trimmedName, selectedCurrency);
      Alert.alert('Éxito', `Período "${trimmedName}" creado`);
      handleClose();
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear el período');
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
          disabled={creating}
        />

        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#ffffff' },
          ]}>
          {/* Header */}
          <View style={styles.header}>
            <Text
              style={[
                styles.title,
                { color: colorScheme === 'dark' ? '#ffffff' : '#000000' },
              ]}>
              Nuevo Período
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Input nombre */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Nombre del período</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#f5f5f5',
                    color: colorScheme === 'dark' ? '#ffffff' : '#000000',
                    borderColor: colorScheme === 'dark' ? '#38383a' : '#e5e5ea',
                  },
                ]}
                placeholder="Ej: Noviembre 2025"
                placeholderTextColor={colors.tabIconDefault}
                value={periodName}
                onChangeText={setPeriodName}
                editable={!creating}
                autoFocus
              />
            </View>

            {/* Selector de moneda */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Moneda por defecto</Text>
              <View style={styles.currencySelector}>
                {AVAILABLE_CURRENCIES.map((currency) => (
                  <TouchableOpacity
                    key={currency}
                    style={[
                      styles.currencyButton,
                      selectedCurrency === currency && styles.currencyButtonActive,
                      {
                        backgroundColor:
                          selectedCurrency === currency
                            ? colors.tint
                            : colorScheme === 'dark'
                              ? '#2c2c2e'
                              : '#f5f5f5',
                        borderColor:
                          selectedCurrency === currency
                            ? colors.tint
                            : colorScheme === 'dark'
                              ? '#38383a'
                              : '#e5e5ea',
                      },
                    ]}
                    onPress={() => setSelectedCurrency(currency)}
                    disabled={creating}
                    activeOpacity={0.7}>
                    <Text
                      style={[
                        styles.currencySymbol,
                        {
                          color:
                            selectedCurrency === currency
                              ? '#ffffff'
                              : colorScheme === 'dark'
                                ? '#ffffff'
                                : '#000000',
                        },
                      ]}>
                      {CURRENCIES[currency].symbol}
                    </Text>
                    <Text
                      style={[
                        styles.currencyName,
                        {
                          color:
                            selectedCurrency === currency
                              ? '#ffffff'
                              : colors.tabIconDefault,
                        },
                      ]}>
                      {CURRENCIES[currency].name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.buttonCancel]}
              onPress={handleClose}
              disabled={creating}
              activeOpacity={0.7}>
              <Text style={styles.buttonCancelText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonCreate, { backgroundColor: colors.tint }]}
              onPress={handleCreate}
              disabled={creating}
              activeOpacity={0.7}>
              {creating ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.buttonCreateText}>Crear</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  currencySelector: {
    gap: 10,
  },
  currencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
  },
  currencyButtonActive: {
    borderWidth: 2,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 12,
    width: 32,
  },
  currencyName: {
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  buttonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  buttonCreate: {
    minHeight: 50,
    justifyContent: 'center',
  },
  buttonCreateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
