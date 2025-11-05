/**
 * Modal para crear un nuevo período
 * Fase 3.2
 * Actualizado en Fase 4.3: Eliminado selector de moneda (se elige al crear gastos)
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
import { Currency, DEFAULT_CURRENCY } from '@/types/expenses';
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
  const [creating, setCreating] = useState(false);

  // Resetear form al cerrar
  const handleClose = () => {
    setPeriodName('');
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
      // Usar DEFAULT_CURRENCY (SOL) - la moneda real se elige al crear gastos
      await onCreatePeriod(trimmedName, DEFAULT_CURRENCY);
      Alert.alert('Éxito', `Período "${trimmedName}" creado`);
      handleClose();
    } catch (error) {
      // Capturar error específico de nombre duplicado
      const errorMessage = error instanceof Error ? error.message : 'No se pudo crear el período';
      Alert.alert('Error', errorMessage);
      // No usar console.error aquí para evitar la barra roja de React Native
      // El error ya se muestra al usuario mediante Alert
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

            {/* Nota informativa */}
            <View style={styles.infoBox}>
              <Text style={[styles.infoText, { color: colors.tabIconDefault }]}>
                La moneda se seleccionará al crear cada gasto
              </Text>
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
              style={[styles.button, styles.buttonCreate]}
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
  infoBox: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 12,
    textAlign: 'center',
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
    backgroundColor: '#007AFF',
  },
  buttonCreateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
