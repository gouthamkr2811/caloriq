import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore, WeightLog } from '../store';
import { 
  TrendingUp, 
  Droplet, 
  Scale, 
  Plus, 
  ChevronRight,
  ChevronLeft,
  Clock,
  Flame,
  Award,
  Sparkles,
  UtensilsCrossed,
  Check
} from 'lucide-react-native';

interface RecipeTemplate {
  title: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  prepTime: string;
  cookTime: string;
  tags: string[];
  ingredients: string[];
  directions: string[];
}

export default function ExploreScreen() {
  const { 
    dailyLogs, 
    weightHistory, 
    addWater, 
    logWeight, 
    addFood,
    profile 
  } = useStore();

  const [weightInput, setWeightInput] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeTemplate | null>(null);

  // Date formatting helpers
  const formatDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayKey = formatDateKey(new Date());
  
  // Water variables
  const todayLog = dailyLogs?.[todayKey] || {
    date: todayKey,
    foods: [],
    waterIntake: 0,
    stepCount: 0,
    activeCaloriesBurned: 0,
  };

  const waterIntake = todayLog.waterIntake || 0;
  const waterGoal = 2500; // standard water target in ml
  const waterPercent = Math.min(100, Math.round((waterIntake / waterGoal) * 100));

  // Quick weight logger
  const handleLogWeight = () => {
    const wtVal = parseFloat(weightInput);
    if (isNaN(wtVal) || wtVal <= 0 || wtVal > 300) {
      Alert.alert('Invalid Entry', 'Please enter a valid weight in kg (e.g. 78.5)');
      return;
    }
    logWeight(todayKey, wtVal);
    setWeightInput('');
    Alert.alert('Logged', `Logged weight of ${wtVal} kg for today.`);
  };

  // Recipe templates mapping the prompt requirements (Indian, Arabic, Kerala, Healthy recipes)
  const recipeTemplates: RecipeTemplate[] = [
    {
      title: 'Kerala Salmon Curry & Cauliflower Rice',
      kcal: 380,
      protein: 34,
      carbs: 11,
      fat: 16,
      prepTime: '15 mins',
      cookTime: '20 mins',
      tags: ['High Protein', 'Low Carb', 'Kerala Special'],
      ingredients: [
        '150g Atlantic Salmon fillet',
        '150g Cauliflower rice (grated)',
        '50g Fresh coconut milk (light)',
        '1 tsp Coconut oil',
        'Ginger, garlic, curry leaves, and spices',
      ],
      directions: [
        'Heat coconut oil in a pan and sauté ginger, garlic, shallots, curry leaves, and mustard seeds.',
        'Add salmon cubes, turmeric, chili powder, and lightly stir-fry.',
        'Pour in the light coconut milk and simmer for 10 minutes until cooked.',
        'Sauté caulifower rice in a separate pan for 4 minutes with a pinch of salt.',
        'Serve curry hot over the cauliflower rice bed.',
      ]
    },
    {
      title: 'Arabic Grilled Chicken Shawarma Bowl',
      kcal: 420,
      protein: 42,
      carbs: 14,
      fat: 12,
      prepTime: '10 mins',
      cookTime: '15 mins',
      tags: ['Muscle Gain', 'Arabic Style', 'Post Workout'],
      ingredients: [
        '180g Chicken breast (marinated in cumin, coriander, garlic)',
        '80g Cucumber & tomato chopped salad',
        '30g Hummus paste',
        '5g Olive oil',
      ],
      directions: [
        'Grill the marinated chicken breast in a skillet with olive oil until fully cooked (about 6 minutes each side).',
        'Slice chicken into thin shawarma-style strips.',
        'Assemble bowl with cucumber/tomato salad, sliced chicken, and a scoop of fresh hummus.',
        'Drizzle with lemon juice and serve.',
      ]
    },
    {
      title: 'High Protein Paneer Tikka Salad',
      kcal: 350,
      protein: 24,
      carbs: 8,
      fat: 22,
      prepTime: '10 mins',
      cookTime: '10 mins',
      tags: ['Vegetarian', 'Low Carb', 'Indian Favorite'],
      ingredients: [
        '120g Paneer (low-fat cottage cheese) cubes',
        '80g Bell peppers and onions (diced)',
        '1 cup Mixed salad greens',
        '1 tsp Lemon juice & chat masala',
      ],
      directions: [
        'Toss paneer cubes, bell peppers, and onions in yogurt and spices marinade.',
        'Pan-fry or grill on skewers until paneer edges are lightly charred.',
        'Serve over fresh salad greens and finish with lemon juice dressing.',
      ]
    }
  ];

  // Log recipe ingredients straight to the user's food log
  const handleAutoLogRecipe = (recipe: RecipeTemplate) => {
    addFood(todayKey, {
      name: recipe.title,
      calories: recipe.kcal,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
      quantity: 1,
      mealType: 'lunch',
    });
    setSelectedRecipe(null);
    Alert.alert('Recipe Logged!', `Successfully added "${recipe.title}" as Lunch to your Dashboard logs.`);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        className="flex-1 px-5 pt-3"
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-2xl font-black text-neutral-800 tracking-tight">Explore & Tools</Text>
            <Text className="text-neutral-400 text-xs font-semibold uppercase tracking-wider mt-0.5">Hydration, Weight & Recipes</Text>
          </View>
          <View className="w-10 h-10 bg-neutral-50 rounded-full items-center justify-center border border-neutral-100">
            <TrendingUp size={20} color="#4b5563" />
          </View>
        </View>

        {/* 1. Water Tracker Section */}
        <View className="bg-sky-50/20 border border-sky-100 rounded-3xl p-5 mb-5 shadow-sm shadow-sky-50/40">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <View className="w-8 h-8 bg-sky-500/10 rounded-lg items-center justify-center mr-2.5 border border-sky-200/30">
                <Droplet size={18} color="#0284c7" fill="#0284c7" />
              </View>
              <Text className="font-extrabold text-neutral-800 text-sm">Water Tracker</Text>
            </View>
            <Text className="text-xs font-bold text-sky-700">{waterPercent}% Done</Text>
          </View>

          {/* Progress metric */}
          <Text className="text-lg font-black text-neutral-800 mb-2">
            {waterIntake} <Text className="text-neutral-400 font-semibold text-sm">/ {waterGoal} ml</Text>
          </Text>

          {/* Custom progress tracker bar */}
          <View className="h-3 w-full bg-sky-100/50 rounded-full overflow-hidden mb-4 border border-sky-100">
            <View className="h-full bg-sky-500 rounded-full" style={{ width: `${waterPercent}%` }} />
          </View>

          {/* Quick Add Pills */}
          <View className="flex-row flex-wrap gap-2">
            {[150, 250, 500, 1000].map((amount) => (
              <Pressable
                key={amount}
                onPress={() => addWater(todayKey, amount)}
                className="bg-white border border-sky-200/60 rounded-full px-3.5 py-2 active:bg-sky-50 shadow-sm"
              >
                <Text className="text-sky-700 text-xs font-bold font-semibold">+ {amount}ml</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => addWater(todayKey, -waterIntake)}
              className="bg-neutral-50 border border-neutral-200 rounded-full px-3.5 py-2 active:bg-neutral-100 ml-auto"
            >
              <Text className="text-neutral-500 text-xs font-semibold">Reset</Text>
            </Pressable>
          </View>
        </View>

        {/* 2. Weight Progress Tracker Section */}
        <View className="bg-white border border-neutral-150 rounded-3xl p-5 mb-5 shadow-sm shadow-neutral-100">
          <View className="flex-row items-center mb-4">
            <View className="w-8 h-8 bg-amber-500/10 rounded-lg items-center justify-center mr-2.5 border border-amber-200/20">
              <Scale size={18} color="#d97706" />
            </View>
            <Text className="font-extrabold text-neutral-800 text-sm">Weight Tracker</Text>
          </View>

          {/* Current weight value */}
          <View className="mb-4">
            <Text className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider">Recorded weight today</Text>
            <Text className="text-xl font-black text-neutral-800 mt-1">
              {weightHistory && weightHistory.length > 0 ? `${weightHistory[weightHistory.length - 1].weight} kg` : 'Not recorded'}
            </Text>
          </View>

          {/* Log weight row */}
          <View className="flex-row items-center mb-5">
            <TextInput
              value={weightInput}
              onChangeText={setWeightInput}
              placeholder="e.g. 78.5"
              placeholderTextColor="#8e8e93"
              keyboardType="numeric"
              className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-800 mr-2.5"
            />
            <Pressable
              onPress={handleLogWeight}
              className="bg-black rounded-xl px-5 py-3 active:opacity-85 shadow-sm"
            >
              <Text className="text-white text-xs font-bold">Log Weight</Text>
            </Pressable>
          </View>

          {/* Historical Logs List */}
          {weightHistory && weightHistory.length > 0 && (
            <View className="border-t border-neutral-100 pt-4">
              <Text className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-3">Weight History Log</Text>
              
              <ScrollView style={{ maxHeight: 110 }} nestedScrollEnabled>
                {weightHistory.map((item: WeightLog, idx) => (
                  <View key={idx} className="flex-row justify-between py-2 border-b border-neutral-50">
                    <Text className="text-xs text-neutral-500 font-semibold">{item.date}</Text>
                    <Text className="text-xs font-extrabold text-neutral-800">{item.weight} kg</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* 3. AI Recipe Generator Section */}
        <View className="bg-emerald-50/20 border border-emerald-100 rounded-3xl p-5 mb-2 shadow-sm shadow-emerald-50/30">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <View className="w-8 h-8 bg-emerald-500/10 rounded-lg items-center justify-center mr-2.5 border border-emerald-200/20">
                <UtensilsCrossed size={18} color="#059669" />
              </View>
              <Text className="font-extrabold text-neutral-800 text-sm">AI Recipe Templates</Text>
            </View>
            <Sparkles size={16} color="#059669" />
          </View>

          <Text className="text-xs text-neutral-500 mb-4 leading-relaxed">
            Generate healthy recipes tailored to your fitness goals. Tap to view preparation instructions and auto-log to your diary.
          </Text>

          {/* Recipes lists */}
          <View className="space-y-3">
            {recipeTemplates.map((recipe, idx) => (
              <Pressable
                key={idx}
                onPress={() => setSelectedRecipe(recipe)}
                className="bg-white border border-emerald-100 rounded-2xl p-4 flex-row justify-between items-center active:bg-emerald-50/30 shadow-sm mt-2"
              >
                <View className="flex-1 pr-2">
                  <Text className="text-xs font-bold text-neutral-800 mb-1">{recipe.title}</Text>
                  <Text className="text-[10px] text-neutral-500 font-semibold">
                    {recipe.kcal} kcal • P: {recipe.protein}g • C: {recipe.carbs}g • F: {recipe.fat}g
                  </Text>
                </View>
                <ChevronRight size={16} color="#059669" />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Recipe details Slide Up modal */}
      <Modal
        visible={selectedRecipe !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedRecipe(null)}
      >
        {selectedRecipe && (
          <SafeAreaView className="flex-1 bg-white">
            {/* Header */}
            <View className="flex-row items-center px-4 py-3.5 border-b border-neutral-100 bg-white">
              <Pressable 
                onPress={() => setSelectedRecipe(null)}
                className="p-1 active:opacity-60"
              >
                <ChevronLeft size={24} color="#1f2937" />
              </Pressable>
              <Text className="text-base font-bold text-neutral-800 ml-4">Recipe Details</Text>
            </View>

            <ScrollView className="flex-1 px-5 pt-4">
              <Text className="text-xl font-black text-neutral-800 mb-2">{selectedRecipe.title}</Text>
              
              {/* Tags */}
              <View className="flex-row flex-wrap gap-1.5 mb-5">
                {selectedRecipe.tags.map((tag, i) => (
                  <View key={i} className="bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">
                    <Text className="text-emerald-700 text-[10px] font-bold">{tag}</Text>
                  </View>
                ))}
              </View>

              {/* Time stats */}
              <View className="flex-row bg-neutral-50 rounded-2xl p-4 mb-6 border border-neutral-100 justify-around">
                <View className="items-center">
                  <Clock size={16} color="#737373" />
                  <Text className="text-neutral-400 text-[9px] font-semibold mt-1 uppercase">Prep</Text>
                  <Text className="text-xs font-bold text-neutral-850 mt-0.5">{selectedRecipe.prepTime}</Text>
                </View>
                <View className="items-center">
                  <Flame size={16} color="#737373" />
                  <Text className="text-neutral-400 text-[9px] font-semibold mt-1 uppercase">Cook</Text>
                  <Text className="text-xs font-bold text-neutral-850 mt-0.5">{selectedRecipe.cookTime}</Text>
                </View>
                <View className="items-center">
                  <Award size={16} color="#737373" />
                  <Text className="text-neutral-400 text-[9px] font-semibold mt-1 uppercase">Calories</Text>
                  <Text className="text-xs font-bold text-neutral-850 mt-0.5">{selectedRecipe.kcal} kcal</Text>
                </View>
              </View>

              {/* Ingredients */}
              <Text className="font-extrabold text-neutral-800 text-sm mb-3">Ingredients</Text>
              <View className="bg-neutral-50/50 border border-neutral-100 rounded-2xl p-4 mb-6">
                {selectedRecipe.ingredients.map((ing, i) => (
                  <View key={i} className="flex-row items-center py-1.5">
                    <Check size={14} color="#059669" className="mr-2" />
                    <Text className="text-xs text-neutral-700">{ing}</Text>
                  </View>
                ))}
              </View>

              {/* Directions */}
              <Text className="font-extrabold text-neutral-800 text-sm mb-3">Directions</Text>
              <View className="space-y-4 mb-10 pl-1">
                {selectedRecipe.directions.map((dir, i) => (
                  <View key={i} className="flex-row items-start">
                    <Text className="text-emerald-700 font-extrabold text-xs mt-0.5 w-6">{i + 1}.</Text>
                    <Text className="flex-1 text-xs text-neutral-600 leading-relaxed">{dir}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Bottom Auto Log Button */}
            <View className="border-t border-neutral-100 p-4 bg-white">
              <Pressable
                onPress={() => handleAutoLogRecipe(selectedRecipe)}
                className="w-full bg-emerald-600 rounded-xl py-3.5 items-center active:opacity-85 shadow-sm"
              >
                <Text className="text-white text-sm font-bold">Auto Log to Today's Lunch</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}
