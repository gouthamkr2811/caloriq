import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  XCircle,
  Sparkles,
  Flame,
} from 'lucide-react-native';

export type AlertType = 'success' | 'error' | 'info' | 'warning';

export interface NiceAlertConfig {
  visible: boolean;
  title: string;
  message: string;
  type?: AlertType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface NiceAlertModalProps {
  config: NiceAlertConfig;
  onClose: () => void;
  isDarkMode?: boolean;
}

export default function NiceAlertModal({ config, onClose, isDarkMode = false }: NiceAlertModalProps) {
  const {
    visible,
    title,
    message,
    type = 'success',
    confirmText = 'Got It',
    cancelText,
    onConfirm,
    onCancel,
  } = config;

  if (!visible) return null;

  const handleConfirm = () => {
    onClose();
    if (onConfirm) onConfirm();
  };

  const handleCancel = () => {
    onClose();
    if (onCancel) onCancel();
  };

  // Color & Icon mapping based on alert type
  const getTypeDetails = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 size={36} color="#10B981" />,
          bgColor: isDarkMode ? 'bg-emerald-950/40' : 'bg-emerald-50',
          borderColor: isDarkMode ? 'border-emerald-800/60' : 'border-emerald-200',
          btnBg: 'bg-emerald-500 active:bg-emerald-600',
          btnTextColor: 'text-white',
          titleColor: isDarkMode ? 'text-emerald-400' : 'text-emerald-900',
          badgeText: 'SUCCESS',
        };
      case 'error':
        return {
          icon: <XCircle size={36} color="#EF4444" />,
          bgColor: isDarkMode ? 'bg-rose-950/40' : 'bg-rose-50',
          borderColor: isDarkMode ? 'border-rose-800/60' : 'border-rose-200',
          btnBg: 'bg-rose-500 active:bg-rose-600',
          btnTextColor: 'text-white',
          titleColor: isDarkMode ? 'text-rose-400' : 'text-rose-900',
          badgeText: 'NOTICE',
        };
      case 'warning':
        return {
          icon: <AlertCircle size={36} color="#F59E0B" />,
          bgColor: isDarkMode ? 'bg-amber-950/40' : 'bg-amber-50',
          borderColor: isDarkMode ? 'border-amber-800/60' : 'border-amber-200',
          btnBg: 'bg-amber-500 active:bg-amber-600',
          btnTextColor: 'text-white',
          titleColor: isDarkMode ? 'text-amber-400' : 'text-amber-900',
          badgeText: 'ATTENTION',
        };
      case 'info':
      default:
        return {
          icon: <Info size={36} color="#3B82F6" />,
          bgColor: isDarkMode ? 'bg-blue-950/40' : 'bg-blue-50',
          borderColor: isDarkMode ? 'border-blue-800/60' : 'border-blue-200',
          btnBg: 'bg-blue-500 active:bg-blue-600',
          btnTextColor: 'text-white',
          titleColor: isDarkMode ? 'text-blue-400' : 'text-blue-900',
          badgeText: 'CALORIQ',
        };
    }
  };

  const details = getTypeDetails();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center px-6 bg-black/60">
        {/* Card Container */}
        <View
          className={`w-full max-w-sm rounded-3xl border p-6 shadow-2xl items-center ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-neutral-100'
          }`}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {/* Top Icon Badge */}
          <View
            className={`w-16 h-16 rounded-full items-center justify-center mb-4 border ${details.bgColor} ${details.borderColor}`}
          >
            {details.icon}
          </View>

          {/* Badge Label */}
          <View className="flex-row items-center mb-1">
            <Sparkles size={12} color="#14B8A6" />
            <Text className="text-[10px] font-black text-teal-500 uppercase tracking-widest ml-1">
              {details.badgeText}
            </Text>
          </View>

          {/* Title */}
          <Text
            className={`text-xl font-black text-center mb-2 tracking-tight ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}
          >
            {title}
          </Text>

          {/* Message */}
          <Text
            className={`text-xs font-medium text-center mb-6 leading-relaxed px-2 ${
              isDarkMode ? 'text-slate-300' : 'text-neutral-600'
            }`}
          >
            {message}
          </Text>

          {/* Action Buttons */}
          <View className="w-full flex-row space-x-3 gap-2">
            {cancelText ? (
              <Pressable
                onPress={handleCancel}
                className={`flex-1 h-12 rounded-2xl items-center justify-center border ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 active:bg-slate-700'
                    : 'bg-neutral-100 border-neutral-200 active:bg-neutral-200'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isDarkMode ? 'text-slate-300' : 'text-neutral-700'
                  }`}
                >
                  {cancelText}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={handleConfirm}
              className={`flex-1 h-12 rounded-2xl items-center justify-center shadow-md ${details.btnBg}`}
            >
              <Text className={`text-xs font-black uppercase tracking-wider ${details.btnTextColor}`}>
                {confirmText}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
