import {
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  PlusCircle,
  Search,
  Trash2,
  UtensilsCrossed
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FoodLogItem, useStore } from '../store';
// Native JS date helper utilities
const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const subDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};

const formatDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDateHeader = (date: Date) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
};

// Local Mock Database of common foods for search functionality
const COMMON_FOODS = [
  { name: 'Boiled Egg (Large)', calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3 },
  { name: 'Chicken Breast (cooked, 100g)', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: 'Oatmeal (cooked, 1 cup)', calories: 150, protein: 6, carbs: 27, fat: 2.5 },
  { name: 'Banana (Medium)', calories: 105, protein: 1.3, carbs: 27, fat: 0.3 },
  { name: 'Apple (Medium)', calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  { name: 'Greek Yogurt (plain, 150g)', calories: 100, protein: 15, carbs: 6, fat: 0.5 },
  { name: 'White Rice (cooked, 1 cup)', calories: 200, protein: 4.3, carbs: 45, fat: 0.4 },
  { name: 'Brown Rice (cooked, 1 cup)', calories: 215, protein: 5, carbs: 45, fat: 1.8 },
  { name: 'Avocado (Medium)', calories: 240, protein: 3, carbs: 12, fat: 22 },
  { name: 'Peanut Butter (2 tbsp)', calories: 188, protein: 8, carbs: 6, fat: 16 },
  { name: 'Atlantic Salmon (cooked, 100g)', calories: 206, protein: 22, carbs: 0, fat: 12 },
  { name: 'Almonds (1 oz / 28g)', calories: 164, protein: 6, carbs: 6, fat: 14 },
  { name: 'Whole Milk (1 cup / 240ml)', calories: 149, protein: 8, carbs: 12, fat: 8 },
  { name: 'Protein Shake (1 scoop)', calories: 120, protein: 24, carbs: 3, fat: 1.5 },
  { name: 'Mixed Salad Greens (2 cups)', calories: 15, protein: 1, carbs: 3, fat: 0 },
  { name: 'Olive Oil (1 tbsp)', calories: 119, protein: 0, carbs: 0, fat: 13.5 },
  { name: 'Whey Protein (1 scoop)', calories: 120, protein: 24, carbs: 3, fat: 1 },
  { name: 'Sweet Potato (Medium)', calories: 112, protein: 2, carbs: 26, fat: 0.1 },
];

export default function LogScreen() {
  const { dailyLogs, addFood, deleteFood } = useStore();

  // Date state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const dateKey = formatDateKey(selectedDate);

  // Logs for current date
  const todayLog = dailyLogs[dateKey] || {
    date: dateKey,
    foods: [],
    waterIntake: 0,
    stepCount: 0,
    activeCaloriesBurned: 0,
  };

  // Add Food Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<FoodLogItem['mealType']>('breakfast');
  const [tabType, setTabType] = useState<'search' | 'custom'>('search');

  // Custom Entry Fields
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [quantity, setQuantity] = useState('1');

  // Search Fields
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFoods, setFilteredFoods] = useState(COMMON_FOODS);

  const changeDate = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedDate(subDays(selectedDate, 1));
    } else {
      setSelectedDate(addDays(selectedDate, 1));
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setFilteredFoods(COMMON_FOODS);
    } else {
      setFilteredFoods(
        COMMON_FOODS.filter((food) =>
          food.name.toLowerCase().includes(text.toLowerCase())
        )
      );
    }
  };

  const handleLogCustomFood = () => {
    if (!foodName.trim()) {
      Alert.alert('Required Field', 'Please enter a name for the food.');
      return;
    }
    const kcal = parseFloat(calories) || 0;
    const prot = parseFloat(protein) || 0;
    const carb = parseFloat(carbs) || 0;
    const f = parseFloat(fat) || 0;
    const qty = parseFloat(quantity) || 1;

    addFood(dateKey, {
      name: foodName,
      calories: kcal,
      protein: prot,
      carbs: carb,
      fat: f,
      quantity: qty,
      mealType: selectedMealType,
    });

    // Reset fields & close
    setFoodName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setQuantity('1');
    setModalVisible(false);
    Alert.alert('Success', `${foodName} logged to ${selectedMealType}!`);
  };

  const handleLogDatabaseFood = (food: typeof COMMON_FOODS[0]) => {
    const qty = parseFloat(quantity) || 1;
    addFood(dateKey, {
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      quantity: qty,
      mealType: selectedMealType,
    });

    setQuantity('1');
    setSearchQuery('');
    setFilteredFoods(COMMON_FOODS);
    setModalVisible(false);
    Alert.alert('Success', `${food.name} logged to ${selectedMealType}!`);
  };

  // Helper to filter logged foods by meal type
  const getFoodsByMeal = (type: FoodLogItem['mealType']) => {
    return todayLog.foods.filter((f) => f.mealType === type);
  };

  // Helper to sum calories for a meal type
  const getMealCalories = (type: FoodLogItem['mealType']) => {
    return Math.round(
      getFoodsByMeal(type).reduce((sum, item) => sum + item.calories * item.quantity, 0)
    );
  };

  const openAddFoodModal = (mealType: FoodLogItem['mealType']) => {
    setSelectedMealType(mealType);
    setTabType('search');
    setModalVisible(true);
  };

  const renderMealSection = (type: FoodLogItem['mealType'], label: string, emoji: string) => {
    const foods = getFoodsByMeal(type);
    const mealCals = getMealCalories(type);

    return (
      <View className="bg-neutral-900/40 border border-neutral-900 rounded-3xl p-5 mb-5 shadow-sm">
        <View className="flex-row justify-between items-center mb-4 pb-2 border-b border-neutral-950/40">
          <View className="flex-row items-center">
            <Text className="text-xl mr-2">{emoji}</Text>
            <View>
              <Text className="text-white font-bold text-base capitalize">{label}</Text>
              <Text className="text-neutral-500 text-xs">{foods.length} items logged</Text>
            </View>
          </View>
          <View className="flex-row items-center space-x-3">
            <Text className="text-amber-500 font-bold text-sm mr-2">{mealCals} kcal</Text>
            <Pressable
              onPress={() => openAddFoodModal(type)}
              className="w-8 h-8 rounded-full bg-neutral-950 border border-neutral-800 items-center justify-center active:bg-neutral-900"
            >
              <Plus size={14} color="#f59e0b" />
            </Pressable>
          </View>
        </View>

        {foods.length === 0 ? (
          <Text className="text-neutral-600 text-xs italic py-2">No food logged for this meal.</Text>
        ) : (
          <View className="space-y-3">
            {foods.map((item) => (
              <View key={item.id} className="flex-row justify-between items-center bg-neutral-950/45 p-3 rounded-2xl border border-neutral-900">
                <View className="flex-1 pr-3">
                  <Text className="text-white font-semibold text-sm leading-relaxed">{item.name}</Text>
                  <Text className="text-neutral-500 text-[10px] mt-0.5">
                    Qty: {item.quantity} • P: {(item.protein * item.quantity).toFixed(0)}g • C: {(item.carbs * item.quantity).toFixed(0)}g • F: {(item.fat * item.quantity).toFixed(0)}g
                  </Text>
                </View>
                <View className="flex-row items-center space-x-3">
                  <Text className="text-white font-semibold text-xs mr-2">{Math.round(item.calories * item.quantity)} kcal</Text>
                  <Pressable
                    onPress={() => {
                      deleteFood(dateKey, item.id);
                    }}
                    className="p-1 active:opacity-75"
                  >
                    <Trash2 size={14} color="#ef4444" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-950 px-4">
      {/* Header & Date Switcher */}
      <View className="flex-row justify-between items-center py-4 mb-4 border-b border-neutral-900">
        <Pressable
          onPress={() => changeDate('prev')}
          className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 items-center justify-center active:bg-neutral-850"
        >
          <ChevronLeft size={20} color="#e5e5e5" />
        </Pressable>
        <View className="items-center">
          <Text className="text-white font-bold text-base">
            {formatDateHeader(selectedDate)}
          </Text>
          <Text className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider mt-0.5">
            {dateKey === formatDateKey(new Date()) ? 'Today' : 'Food Journal'}
          </Text>
        </View>
        <Pressable
          onPress={() => changeDate('next')}
          className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 items-center justify-center active:bg-neutral-850"
        >
          <ChevronRight size={20} color="#e5e5e5" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Meal sections */}
        {renderMealSection('breakfast', 'Breakfast', '🍳')}
        {renderMealSection('lunch', 'Lunch', '🥩')}
        {renderMealSection('dinner', 'Dinner', '🍲')}
        {renderMealSection('snacks', 'Snacks', '🍏')}
      </ScrollView>

      {/* Add Food Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={false} onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView className="flex-1 bg-neutral-950 px-4">
          <View className="flex-row justify-between items-center py-4 mb-4 border-b border-neutral-900">
            <View>
              <Text className="text-white font-bold text-lg">Add to {selectedMealType}</Text>
              <Text className="text-neutral-500 text-xs">Search database or enter custom values</Text>
            </View>
            <Pressable
              onPress={() => setModalVisible(false)}
              className="bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-xl active:bg-neutral-850"
            >
              <Text className="text-white text-xs font-bold">Close</Text>
            </Pressable>
          </View>

          {/* Tab Switcher */}
          <View className="flex-row bg-neutral-900/60 p-1.5 rounded-2xl border border-neutral-900 mb-6">
            <Pressable
              onPress={() => setTabType('search')}
              className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center space-x-1.5 ${tabType === 'search' ? 'bg-amber-500' : 'bg-transparent'
                }`}
            >
              <Search size={14} color={tabType === 'search' ? '#000000' : '#a3a3a3'} />
              <Text className={`font-semibold text-xs ${tabType === 'search' ? 'text-neutral-950' : 'text-neutral-400'}`}>
                Database Search
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setTabType('custom')}
              className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center space-x-1.5 ${tabType === 'custom' ? 'bg-amber-500' : 'bg-transparent'
                }`}
            >
              <PlusCircle size={14} color={tabType === 'custom' ? '#000000' : '#a3a3a3'} />
              <Text className={`font-semibold text-xs ${tabType === 'custom' ? 'text-neutral-950' : 'text-neutral-400'}`}>
                Custom Entry
              </Text>
            </Pressable>
          </View>

          {/* Servings input common for both */}
          <View className="flex-row items-center justify-between bg-neutral-900/30 border border-neutral-900 p-3 rounded-2xl mb-4">
            <Text className="text-neutral-400 text-xs font-semibold">Logged Servings / Quantity</Text>
            <TextInput
              keyboardType="numeric"
              value={quantity}
              onChangeText={setQuantity}
              placeholder="1"
              placeholderTextColor="#525252"
              className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-white w-16 text-center text-xs font-bold"
            />
          </View>

          {tabType === 'search' ? (
            /* Search Flow */
            <View className="flex-1">
              <View className="flex-row bg-neutral-900 border border-neutral-800 rounded-2xl items-center px-4 py-2 mb-4">
                <Search size={16} color="#737373" className="mr-2" />
                <TextInput
                  value={searchQuery}
                  onChangeText={handleSearch}
                  placeholder="Search common foods..."
                  placeholderTextColor="#737373"
                  className="flex-1 text-white text-xs py-1.5 ml-2"
                />
              </View>

              <FlatList
                data={filteredFoods}
                keyExtractor={(item) => item.name}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => handleLogDatabaseFood(item)}
                    className="flex-row justify-between items-center p-4 border-b border-neutral-900 bg-neutral-950/20 active:bg-neutral-900/40 rounded-xl mb-1.5"
                  >
                    <View className="flex-1 pr-2">
                      <Text className="text-white font-semibold text-sm">{item.name}</Text>
                      <Text className="text-neutral-500 text-[10px] mt-0.5">
                        P: {item.protein}g • C: {item.carbs}g • F: {item.fat}g
                      </Text>
                    </View>
                    <View className="flex-row items-center space-x-2">
                      <Text className="text-amber-500 font-bold text-xs">{item.calories} kcal</Text>
                      <ChevronRight size={14} color="#525252" />
                    </View>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <View className="items-center py-8">
                    <UtensilsCrossed size={32} color="#404040" />
                    <Text className="text-neutral-500 text-xs mt-3">No foods match your search.</Text>
                    <Pressable
                      onPress={() => setTabType('custom')}
                      className="mt-4 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl"
                    >
                      <Text className="text-amber-500 text-xs font-semibold">Create Custom Entry</Text>
                    </Pressable>
                  </View>
                }
              />
            </View>
          ) : (
            /* Custom Flow */
            <ScrollView showsVerticalScrollIndicator={false} className="space-y-4">
              <View className="space-y-4 bg-neutral-900/30 border border-neutral-900 rounded-3xl p-5">
                <View>
                  <Text className="text-neutral-400 text-xs font-semibold mb-2">Food Name</Text>
                  <TextInput
                    value={foodName}
                    onChangeText={setFoodName}
                    placeholder="e.g. Avocado Toast"
                    placeholderTextColor="#525252"
                    className="bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3 text-white focus:border-amber-500 text-xs"
                  />
                </View>

                <View>
                  <Text className="text-neutral-400 text-xs font-semibold mb-2">Calories (kcal)</Text>
                  <TextInput
                    keyboardType="numeric"
                    value={calories}
                    onChangeText={setCalories}
                    placeholder="350"
                    placeholderTextColor="#525252"
                    className="bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3 text-white focus:border-amber-500 text-xs"
                  />
                </View>

                <View className="flex-row space-x-2">
                  <View className="flex-1">
                    <Text className="text-neutral-400 text-xs font-semibold mb-2">Protein (g)</Text>
                    <TextInput
                      keyboardType="numeric"
                      value={protein}
                      onChangeText={setProtein}
                      placeholder="12"
                      placeholderTextColor="#525252"
                      className="bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3 text-white focus:border-amber-500 text-xs"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-neutral-400 text-xs font-semibold mb-2">Carbs (g)</Text>
                    <TextInput
                      keyboardType="numeric"
                      value={carbs}
                      onChangeText={setCarbs}
                      placeholder="25"
                      placeholderTextColor="#525252"
                      className="bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3 text-white focus:border-amber-500 text-xs"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-neutral-400 text-xs font-semibold mb-2">Fat (g)</Text>
                    <TextInput
                      keyboardType="numeric"
                      value={fat}
                      onChangeText={setFat}
                      placeholder="8"
                      placeholderTextColor="#525252"
                      className="bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3 text-white focus:border-amber-500 text-xs"
                    />
                  </View>
                </View>
              </View>

              <Pressable
                onPress={handleLogCustomFood}
                className="bg-amber-500 py-4 rounded-2xl items-center justify-center active:bg-amber-600 flex-row space-x-2 mt-4"
              >
                <Check size={16} color="#000000" />
                <Text className="text-neutral-950 font-bold text-sm">Log Food to {selectedMealType}</Text>
              </Pressable>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
