import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { queryAiCoach, analyzeFoodImage, ParsedFood } from '../lib/openai';
import { 
  Send, 
  Sparkles, 
  Camera, 
  Mic, 
  Image as ImageIcon,
  Bot,
  User,
  Info,
  Clock,
  MicOff
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

interface Message {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  timestamp: Date;
  isDemo?: boolean;
}

export default function CoachScreen() {
  const { profile, dailyLogs, addFood } = useStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'coach',
      text: "Hi! I'm your Caloriq Coach. Tell me what you ate today (e.g. 'I had 2 scrambled eggs and a banana for breakfast'), upload a picture of your food, or ask me any fitness questions!",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachmentModal, setAttachmentModal] = useState(false);
  const [dictationModal, setDictationModal] = useState(false);

  // Helper to compile store metrics for OpenAI context
  const getMetricsSummary = () => {
    return `Gender: ${profile.gender}, Age: ${profile.age}, Weight: ${profile.weight}kg, Height: ${profile.height}cm, Activity Level: ${profile.activityLevel}, Goal: ${profile.weightGoal}, Daily Calorie Target: ${profile.calorieTarget} kcal.`;
  };

  // Helper to compile today's food logs for OpenAI context
  const getRecentLogsSummary = () => {
    const today = new Date().toISOString().split('T')[0];
    const log = dailyLogs[today];
    if (!log || log.foods.length === 0) return 'No foods logged today.';
    return log.foods
      .map(
        (f) =>
          `${f.quantity}x ${f.name} (${f.calories * f.quantity} kcal, P:${
            f.protein * f.quantity
          }g, C:${f.carbs * f.quantity}g, F:${f.fat * f.quantity}g) - ${
            f.mealType
          }`
      )
      .join('\n');
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    if (!textToSend) setInputText('');

    // Append user message
    const userMsg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      sender: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [userMsg, ...prev]);

    setLoading(true);

    const metricsSummary = getMetricsSummary();
    const logsSummary = getRecentLogsSummary();

    const response = await queryAiCoach(text, metricsSummary, logsSummary);

    // Append coach message
    const coachMsg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      sender: 'coach',
      text: response.reply,
      timestamp: new Date(),
      isDemo: response.isDemo,
    };
    setMessages((prev) => [coachMsg, ...prev]);

    // Handle auto-logging of foods if returned
    if (response.foods && response.foods.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      response.foods.forEach((food) => {
        addFood(today, {
          name: food.name,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          quantity: food.quantity,
          mealType: food.mealType || 'breakfast',
        });
      });
      
      const foodSummary = response.foods.map(f => `${f.quantity}x ${f.name}`).join(', ');
      Alert.alert('Auto-Logged to Journal', `I added: ${foodSummary} to your journal!`);
    }

    setLoading(false);
  };

  // Image upload and analysis
  const handleImagePicker = async (source: 'camera' | 'library') => {
    setAttachmentModal(false);
    
    // Request permissions
    const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
    const libraryPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (source === 'camera' && !cameraPerm.granted) {
      Alert.alert('Permission Required', 'Camera access is needed to capture food photos.');
      return;
    }
    if (source === 'library' && !libraryPerm.granted) {
      Alert.alert('Permission Required', 'Library access is needed to upload photos.');
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    };

    const result = source === 'camera' 
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

    if (result.canceled || !result.assets || !result.assets[0].base64) return;

    // Send placeholder message to indicate photo upload
    const userMsg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      sender: 'user',
      text: '📷 Uploaded a food photo for analysis.',
      timestamp: new Date(),
    };
    setMessages((prev) => [userMsg, ...prev]);

    setLoading(true);

    // Ask user which meal type
    Alert.alert(
      'Log Food Photo',
      'Which meal would you like to log this photo to?',
      [
        { text: 'Breakfast', onPress: () => processImageAnalysis(result.assets[0].base64!, 'breakfast') },
        { text: 'Lunch', onPress: () => processImageAnalysis(result.assets[0].base64!, 'lunch') },
        { text: 'Dinner', onPress: () => processImageAnalysis(result.assets[0].base64!, 'dinner') },
        { text: 'Snack', onPress: () => processImageAnalysis(result.assets[0].base64!, 'snacks') },
      ]
    );
  };

  const processImageAnalysis = async (base64: string, mealType: ParsedFood['mealType']) => {
    const response = await analyzeFoodImage(base64, mealType);
    
    const coachMsg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      sender: 'coach',
      text: response.reply,
      timestamp: new Date(),
      isDemo: response.isDemo,
    };
    setMessages((prev) => [coachMsg, ...prev]);

    if (response.foods && response.foods.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      response.foods.forEach((food) => {
        addFood(today, {
          name: food.name,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          quantity: food.quantity,
          mealType: food.mealType,
        });
      });
      
      const foodSummary = response.foods.map(f => `${f.quantity}x ${f.name}`).join(', ');
      Alert.alert('Auto-Logged to Journal', `I analyzed your photo and logged: ${foodSummary} to ${mealType}!`);
    }
    setLoading(false);
  };

  // Mock Voice Logging Selector
  const handleDictateMock = (command: string) => {
    setDictationModal(false);
    handleSendMessage(command);
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-950 px-4">
      {/* Header */}
      <View className="flex-row justify-between items-center py-4 mb-2 border-b border-neutral-900">
        <View className="flex-row items-center space-x-2.5">
          <View className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/25 justify-center items-center mr-1">
            <Bot size={18} color="#14B8A6" />
          </View>
          <View>
            <Text className="text-white font-bold text-base">Caloriq Coach</Text>
            <Text className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider mt-0.5">
              AI Coach & Food Parser
            </Text>
          </View>
        </View>
        <View className="bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-full flex-row items-center space-x-1">
          <Sparkles size={10} color="#14B8A6" />
          <Text className="text-teal-500 text-[9px] font-bold uppercase tracking-wider">AI Active</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages List - Inverted for modern message pin */}
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          inverted
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 16 }}
          renderItem={({ item }) => (
            <View className={`flex-row my-2 max-w-[85%] ${item.sender === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
              {/* Avatar Icon */}
              <View className={`w-8 h-8 rounded-full items-center justify-center border ${
                item.sender === 'user' 
                  ? 'bg-neutral-900 border-neutral-800 ml-2' 
                  : 'bg-amber-500/10 border-amber-500/20 mr-2'
              }`}>
                {item.sender === 'user' ? (
                  <User size={14} color="#f59e0b" />
                ) : (
                  <Bot size={14} color="#f59e0b" />
                )}
              </View>

              {/* Message Bubble */}
              <View className={`p-4 rounded-3xl ${
                item.sender === 'user'
                  ? 'bg-amber-500 rounded-tr-none'
                  : 'bg-neutral-900/80 border border-neutral-850 rounded-tl-none'
              }`}>
                <Text className={`text-sm leading-relaxed ${item.sender === 'user' ? 'text-neutral-950 font-medium' : 'text-neutral-200'}`}>
                  {item.text}
                </Text>
                
                {item.isDemo && item.sender === 'coach' && (
                  <View className="flex-row items-center mt-2.5 bg-neutral-950/40 py-1 px-2 rounded-md self-start border border-neutral-850">
                    <Info size={10} color="#737373" />
                    <Text className="text-[9px] text-neutral-500 font-semibold uppercase tracking-wider ml-1">Demo Fallback Mode</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        />

        {/* Loading Indicator */}
        {loading && (
          <View className="flex-row items-center space-x-2 my-2 py-2 px-4 bg-neutral-900/40 border border-neutral-900 rounded-2xl self-start">
            <ActivityIndicator size="small" color="#14B8A6" />
            <Text className="text-neutral-400 text-xs italic">Caloriq Coach is thinking...</Text>
          </View>
        )}

        {/* Input Bar */}
        <View className="flex-row space-x-2 items-center py-4 border-t border-neutral-900 bg-neutral-950">
          <Pressable
            onPress={() => setAttachmentModal(true)}
            className="w-11 h-11 rounded-full bg-neutral-900 border border-neutral-800 items-center justify-center active:bg-neutral-850"
          >
            <Camera size={18} color="#e5e5e5" />
          </Pressable>

          <Pressable
            onPress={() => setDictationModal(true)}
            className="w-11 h-11 rounded-full bg-neutral-900 border border-neutral-800 items-center justify-center active:bg-neutral-850"
          >
            <Mic size={18} color="#e5e5e5" />
          </Pressable>

          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Log food or ask fit coach..."
            placeholderTextColor="#737373"
            onSubmitEditing={() => handleSendMessage()}
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-full px-5 h-11 text-white text-sm focus:border-teal-500 focus:bg-neutral-900/60"
          />

          <Pressable
            onPress={() => handleSendMessage()}
            className="w-11 h-11 rounded-full bg-teal-500 items-center justify-center active:bg-teal-600"
          >
            <Send size={16} color="#000000" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Attachment Modal */}
      <Modal visible={attachmentModal} transparent animationType="slide" onRequestClose={() => setAttachmentModal(false)}>
        <Pressable onPress={() => setAttachmentModal(false)} className="flex-1 bg-black/60 justify-end">
          <View className="bg-neutral-900 border-t border-neutral-800 rounded-t-[32px] p-6 space-y-4">
            <Text className="text-white font-bold text-lg mb-2">Analyze Food Image</Text>
            
            <Pressable
              onPress={() => handleImagePicker('camera')}
              className="bg-neutral-950 border border-neutral-850 p-4 rounded-2xl flex-row items-center space-x-3 active:bg-neutral-900"
            >
              <Camera size={18} color="#f59e0b" />
              <Text className="text-white font-semibold text-sm ml-2">Take a Photo of Meal</Text>
            </Pressable>

            <Pressable
              onPress={() => handleImagePicker('library')}
              className="bg-neutral-950 border border-neutral-850 p-4 rounded-2xl flex-row items-center space-x-3 active:bg-neutral-900"
            >
              <ImageIcon size={18} color="#f59e0b" />
              <Text className="text-white font-semibold text-sm ml-2">Choose from Gallery</Text>
            </Pressable>

            <Pressable
              onPress={() => setAttachmentModal(false)}
              className="w-full bg-neutral-800 py-3.5 rounded-2xl items-center active:bg-neutral-750 mt-2"
            >
              <Text className="text-white font-bold text-xs">Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Dictation Modal */}
      <Modal visible={dictationModal} transparent animationType="slide" onRequestClose={() => setDictationModal(false)}>
        <Pressable onPress={() => setDictationModal(false)} className="flex-1 bg-black/60 justify-end">
          <View className="bg-neutral-900 border-t border-neutral-800 rounded-t-[32px] p-6 space-y-4">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-white font-bold text-lg">AI Voice Dictation (Demo)</Text>
              <View className="p-1 bg-neutral-950 rounded-lg">
                <MicOff size={14} color="#737373" />
              </View>
            </View>
            <Text className="text-neutral-400 text-xs mb-2">
              Speech-to-text requires a live micro-service configurations. Try one of our demo voice commands to see how the AI parses speech:
            </Text>

            <Pressable
              onPress={() => handleDictateMock('I had 2 eggs and a banana for breakfast')}
              className="bg-neutral-950 border border-neutral-850 p-4 rounded-2xl flex-row items-center justify-between active:bg-neutral-900"
            >
              <Text className="text-white font-medium text-xs">"I had 2 eggs and a banana for breakfast"</Text>
              <Clock size={12} color="#737373" />
            </Pressable>

            <Pressable
              onPress={() => handleDictateMock('For lunch I ate chicken breast and rice')}
              className="bg-neutral-950 border border-neutral-850 p-4 rounded-2xl flex-row items-center justify-between active:bg-neutral-900"
            >
              <Text className="text-white font-medium text-xs">"For lunch I ate chicken breast and rice"</Text>
              <Clock size={12} color="#737373" />
            </Pressable>

            <Pressable
              onPress={() => handleDictateMock('Log a snack of some almonds and oatmeal')}
              className="bg-neutral-950 border border-neutral-850 p-4 rounded-2xl flex-row items-center justify-between active:bg-neutral-900"
            >
              <Text className="text-white font-medium text-xs">"Log a snack of some almonds and oatmeal"</Text>
              <Clock size={12} color="#737373" />
            </Pressable>

            <Pressable
              onPress={() => setDictationModal(false)}
              className="w-full bg-neutral-800 py-3.5 rounded-2xl items-center active:bg-neutral-750 mt-2"
            >
              <Text className="text-white font-bold text-xs">Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
