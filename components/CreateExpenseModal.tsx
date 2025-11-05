/**
 * Modal para crear un nuevo gasto
 * Fase 4.2
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
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface CreateExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateExpense: (description: string, amount: number) => Promise<void>;
  currencySymbol: string;
}

export function CreateExpenseModal({
  visible,
  onClose,
  onCreateExpense,
  currencySymbol,
}: CreateExpenseModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [creating, setCreating] = useState(false);

  // Resetear form al cerrar
  const handleClose = () => {
    setDescription('');
    setAmount('');
    onClose();
  };

  // Validar y crear gasto
  const handleCreate = async () => {
    // Validación: descripción no vacía
    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      Alert.alert('Error', 'Por favor ingresa una descripción');
      return;
    }

    // Validación: monto válido
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Error', 'Por favor ingresa un monto válido mayor a 0');
      return;
    }

    try {
      setCreating(true);
      await onCreateExpense(trimmedDescription, parsedAmount);
      Alert.alert('Éxito', `Gasto "${trimmedDescription}" añadido`);
      handleClose();
    } catch (error) {
      Alert.alert('Error', 'No se pudo añadir el gasto');
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
              Nuevo Gasto
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Input descripción */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Descripción</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#f5f5f5',
                    color: colorScheme === 'dark' ? '#ffffff' : '#000000',
                    borderColor: colorScheme === 'dark' ? '#38383a' : '#e5e5ea',
                  },
                ]}
                placeholder="Ej: Supermercado, Taxi, Restaurante..."
                placeholderTextColor={colors.tabIconDefault}
                value={description}
                onChangeText={setDescription}
                editable={!creating}
                autoFocus
              />
            </View>

            {/* Input monto */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Monto ({currencySymbol})</Text>
              <View style={styles.amountInputContainer}>
                <Text
                  style={[
                    styles.currencyPrefix,
                    {
                      color: colorScheme === 'dark' ? '#ffffff' : '#000000',
                      backgroundColor: colorScheme === 'dark' ? '#38383a' : '#e5e5ea',
                    },
                  ]}>
                  {currencySymbol}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.amountInput,
                    {
                      backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#f5f5f5',
                      color: colorScheme === 'dark' ? '#ffffff' : '#000000',
                      borderColor: colorScheme === 'dark' ? '#38383a' : '#e5e5ea',
                    },
                  ]}
                  placeholder="0.00"
                  placeholderTextColor={colors.tabIconDefault}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  editable={!creating}
                />
              </View>
            </View>

            {/* Info fecha */}
            <View style={styles.infoBox}>
              <Text style={[styles.infoText, { color: colors.tabIconDefault }]}>
                La fecha se registrará automáticamente al crear el gasto
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
                <Text style={styles.buttonCreateText}>Añadir</Text>
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
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currencyPrefix: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
  amountInput: {
    flex: 1,
  },
  infoBox: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
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
