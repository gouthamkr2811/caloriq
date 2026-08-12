import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore, FoodLogItem } from '../store';
import NiceAlertModal, { NiceAlertConfig } from '../components/ui/NiceAlertModal';
import NiceLoaderOverlay from '../components/ui/NiceLoaderOverlay';
import GoalFocusEditorModal from '../components/GoalFocusEditorModal';
import { 
  Menu, 
  Trash2, 
  Clock, 
  Image as ImageIcon, 
  Camera, 
  Edit2, 
  Sparkles,
  ChevronDown,
  ChevronLeft,
  Users,
  Zap,
  Share2,
  Send,
  MoreVertical,
  AlertTriangle,
  X,
  Flame,
  BookOpen,
  Bot,
  Settings,
  Plus,
  Search,
  User,
  Utensils,
  Activity,
  Droplet,
  Scale,
  Sliders,
  Sun,
  Moon,
  TrendingDown,
  TrendingUp,
  MinusCircle,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { queryAiCoach, analyzeFoodImage, getRandomFoodImage } from '../lib/openai';
import { keralaFoodsData } from '../constants/kerala_foods';
import Svg, { Circle, G, Path } from 'react-native-svg';
import OnboardingFlow from '../components/OnboardingFlow';


// Typo normalizer to support common misspelling variations
function normalizeTypos(text: string) {
  return text
    .replace(/\bchiken\b/g, 'chicken')
    .replace(/\bporota\b/g, 'porotta')
    .replace(/\bparota\b/g, 'porotta')
    .replace(/\bparotta\b/g, 'porotta')
    .replace(/\bbiryani\b/g, 'biriyani')
    .replace(/\bsteam\b/g, 'steamed')
    .replace(/\bboil\b/g, 'boiled')
    .replace(/\bfry\b/g, 'fried')
    .replace(/\bchappathi\b/g, 'chapati')
    .replace(/\bchappati\b/g, 'chapati')
    .replace(/\bchapathi\b/g, 'chapati');
}

// Offline parser to extract weight quantities (g vs kg) and query term
function parseOfflineNlpInput(input: string) {
  // Add space between digits and letters, e.g. "2chappathi" -> "2 chappathi", "1.5kg" -> "1.5 kg"
  const cleanInput = input.toLowerCase().replace(/(\d+(?:\.\d+)?)([a-zA-Z\u0d00-\u0d7f]+)/g, '$1 $2');
  const text = normalizeTypos(cleanInput.trim());
  
  // Regex to match numbers followed by units
  const quantityRegex = /(\d+(?:\.\d+)?)\s*(grams?|g|gms?|kg|kgs?|kilograms?|kilos?)/gi;
  
  // Find the first match to determine logged quantity
  const match = quantityRegex.exec(text);
  
  let quantity = 100; // default 100g
  let unit = 'g';
  let isRawNumber = true;
  
  if (match) {
    quantity = parseFloat(match[1]);
    const matchedUnit = match[2].toLowerCase();
    if (matchedUnit.startsWith('k')) {
      unit = 'kg';
    } else {
      unit = 'g';
    }
    isRawNumber = false;
  } else {
    // Check for raw standalone numbers
    const numberRegex = /(?:^|\s)(\d+(?:\.\d+)?)(?:\s|$)/;
    const numMatch = text.match(numberRegex);
    if (numMatch) {
      quantity = parseFloat(numMatch[1]);
      isRawNumber = true;
    }
  }
  
  // Reset regex index for safety
  quantityRegex.lastIndex = 0;

  // Strip ALL quantities, units, and standalone numbers from the query string
  let foodQuery = text
    .replace(quantityRegex, '')
    .replace(/\b\d+(?:\.\d+)?\b/g, '')
    .trim();
  
  // Clean up filler words (eated, eating, eat, eaten, had, having, ate)
  foodQuery = foodQuery
    .replace(/\b(eated|eating|eat|eaten|had|having|ate|for|breakfast|lunch|dinner|snacks|and|with|of|some|a|an)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
    
  return { quantity, unit, isRawNumber, foodQuery };
}

// Scored matcher to find the best local food in the 500+ database
function findBestFoodMatch(query: string) {
  if (!query) return null;
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  if (terms.length === 0) return null;
  
  let bestMatch: any = null;
  let highestScore = 0;
  
  keralaFoodsData.foods.forEach((food: any) => {
    let score = 0;
    const nameLower = food.name.toLowerCase();
    const nameMlLower = food.name_ml.toLowerCase();
    
    if (nameLower === query || nameMlLower === query) {
      score += 150;
    }
    
    if (nameLower.includes(query) || nameMlLower.includes(query)) {
      score += 80;
    }
    
    let matchCount = 0;
    terms.forEach(term => {
      let termMatched = false;
      if (nameLower.includes(term)) {
        score += 20;
        termMatched = true;
      }
      if (nameMlLower.includes(term)) {
        score += 20;
        termMatched = true;
      }
      
      if (food.search_keywords) {
        food.search_keywords.forEach((kw: string) => {
          const kwLower = kw.toLowerCase();
          if (kwLower === term) {
            score += 15;
            termMatched = true;
          } else if (kwLower.includes(term)) {
            score += 5;
            termMatched = true;
          }
        });
      }
      
      if (termMatched) {
        matchCount++;
      }
    });
    
    // Give a massive boost if ALL terms of the user search match
    if (matchCount === terms.length) {
      score += 100;
    } else {
      // Penalty for unmatched query terms to prevent generic matches
      score -= (terms.length - matchCount) * 15;
    }
    
    if (score > highestScore) {
      highestScore = score;
      bestMatch = food;
    }
  });
  
  return highestScore >= 20 ? bestMatch : null;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { profile, dailyLogs, addFood, deleteFood, updateSteps, updateActiveCalories, user, clearAllData, addWater, isDarkMode, toggleDarkMode } = useStore();
 
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());
  const [nlpInput, setNlpInput] = useState('');
  const [nlpLoading, setNlpLoading] = useState(false);
  
  // Modals / Overlays states
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isDayViewOpen, setIsDayViewOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isManualLogOpen, setIsManualLogOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isGoalEditorOpen, setIsGoalEditorOpen] = useState(false);

  // Custom Nice Alert State
  const [alertConfig, setAlertConfig] = useState<NiceAlertConfig>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
    });
  };

  // Auto launch onboarding only for guest users who haven't onboarded yet
  // Authenticated users (user != null) should NEVER see onboarding auto-triggered
  useEffect(() => {
    if (!user && profile && !profile.onboardingComplete) {
      setIsOnboardingOpen(true);
    }
  }, [profile?.onboardingComplete, user]);

  const dayOfWeekName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
  const dayOfMonthNumber = selectedDate.getDate();

  // Manual Log Food states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [specifiedGrams, setSpecifiedGrams] = useState(100);
  const [quantityInput, setQuantityInput] = useState('100');
  const [selectedUnit, setSelectedUnit] = useState<'g' | 'kg'>('g');
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snacks'>('breakfast');
  const [isCustomMode, setIsCustomMode] = useState(false);

  const updateGrams = (val: string, unit: 'g' | 'kg') => {
    setQuantityInput(val);
    const parsed = parseFloat(val) || 0;
    const finalGrams = unit === 'kg' ? Math.round(parsed * 1000) : Math.round(parsed);
    setSpecifiedGrams(finalGrams);
  };

  const handleUnitChange = (unit: 'g' | 'kg') => {
    setSelectedUnit(unit);
    const parsed = parseFloat(quantityInput) || 0;
    const finalGrams = unit === 'kg' ? Math.round(parsed * 1000) : Math.round(parsed);
    setSpecifiedGrams(finalGrams);
  };

  const handleQuickGrams = (g: number) => {
    if (selectedUnit === 'kg') {
      const kgVal = g / 1000;
      setQuantityInput(String(kgVal));
      setSpecifiedGrams(g);
    } else {
      setQuantityInput(String(g));
      setSpecifiedGrams(g);
    }
  };
  
  // Custom food manual inputs
  const [customName, setCustomName] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');

  // Date formatting helpers
  const formatDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getFormattedTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'pm' : 'am';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${hours}:${minutes} ${ampm}`;
    } catch {
      return '4:47 pm';
    }
  };

  const dateKey = formatDateKey(selectedDate);
  const todayLog = dailyLogs?.[dateKey] || {
    date: dateKey,
    foods: [],
    waterIntake: 0,
    stepCount: 0,
    activeCaloriesBurned: 0,
  };
  const todayFoods = todayLog.foods || [];

  // Calorie calculations
  const calorieBudget = profile?.calorieTarget || 2000;
  const caloriesConsumed = Math.round(
    todayFoods.reduce((sum, item) => sum + (item.calories || 0) * (item.quantity || 1), 0)
  );
  const caloriesBurned = todayLog.activeCaloriesBurned || 0;
  const remainingCalories = calorieBudget - caloriesConsumed + caloriesBurned;

  // Macro calculations
  const carbsConsumed = Math.round(
    todayFoods.reduce((sum, item) => sum + (item.carbs || 0) * (item.quantity || 1), 0)
  );
  const proteinConsumed = Math.round(
    todayFoods.reduce((sum, item) => sum + (item.protein || 0) * (item.quantity || 1), 0)
  );
  const fatConsumed = Math.round(
    todayFoods.reduce((sum, item) => sum + (item.fat || 0) * (item.quantity || 1), 0)
  );

  // Progress Percentages
  const carbsTarget = profile?.carbsTarget || 225;
  const proteinTarget = profile?.proteinTarget || 125;
  const fatTarget = profile?.fatTarget || 66;

  const calRemaining = Math.max(0, calorieBudget - caloriesConsumed);
  const calRemainingPercent = Math.max(0, Math.min(100, (calRemaining / calorieBudget) * 100));

  const calPercent = Math.min(100, Math.round((caloriesConsumed / calorieBudget) * 100)) || 0;
  const carbsPercent = Math.min(100, Math.round((carbsConsumed / carbsTarget) * 100)) || 0;
  const proteinPercent = Math.min(100, Math.round((proteinConsumed / proteinTarget) * 100)) || 0;
  const fatPercent = Math.min(100, Math.round((fatConsumed / fatTarget) * 100)) || 0;

  // Helper to group food logs by their original prompt or mealType
  const getGroupedMeals = () => {
    const groups: Record<string, typeof todayFoods> = {};
    
    todayFoods.forEach(food => {
      const key = food.originalPrompt || food.mealType || 'Manual Log';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(food);
    });

    return Object.keys(groups).map((key) => {
      const foodsInGroup = groups[key];
      const totalCalories = Math.round(foodsInGroup.reduce((sum, f) => sum + (f.calories || 0) * (f.quantity || 1), 0));
      const totalCarbs = Math.round(foodsInGroup.reduce((sum, f) => sum + (f.carbs || 0) * (f.quantity || 1), 0));
      const totalProtein = Math.round(foodsInGroup.reduce((sum, f) => sum + (f.protein || 0) * (f.quantity || 1), 0));
      const totalFat = Math.round(foodsInGroup.reduce((sum, f) => sum + (f.fat || 0) * (f.quantity || 1), 0));
      
      return {
        originalPrompt: key,
        foods: foodsInGroup,
        totalCalories,
        totalCarbs,
        totalProtein,
        totalFat
      };
    });
  };

  // Generate 7-day horizontal strip: today and the 6 days before it (no future dates)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const generateWeekDays = () => {
    const list = [];
    for (let i = -6; i <= 0; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      list.push(d);
    }
    return list;
  };
  const weekDays = generateWeekDays();

  const getDayName = (date: Date) => {
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return names[date.getDay()];
  };

  const getFullMonthYear = (date: Date) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatDateLong = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`;
  };

  // Helper to generate monthly grid
  const getDaysInMonthGrid = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const grid = [];
    // Pad empty slots at the start
    for (let i = 0; i < firstDayIndex; i++) {
      grid.push(null);
    }
    // Real calendar days
    for (let i = 1; i <= totalDays; i++) {
      grid.push(new Date(year, month, i));
    }
    return grid;
  };

  const monthGridDays = getDaysInMonthGrid(calendarViewDate);

  // Group food items logged around the same meal prompt
  const groupFoodsByPrompt = (foods: FoodLogItem[]) => {
    const list = [...(foods || [])].sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime());
    const groups: Array<{ prompt: string; items: FoodLogItem[]; time: string; firstLoggedAt: number }> = [];
    
    list.forEach((food) => {
      const foodPrompt = food.originalPrompt || food.name;
      const foodTime = new Date(food.loggedAt).getTime();
      
      // Find a group with the same prompt logged within 10 seconds (10000ms)
      const matchingGroup = groups.find(g => 
        g.prompt === foodPrompt && 
        Math.abs(g.firstLoggedAt - foodTime) < 10000
      );
      
      if (matchingGroup) {
        matchingGroup.items.push(food);
      } else {
        groups.push({
          prompt: foodPrompt,
          items: [food],
          time: getFormattedTime(food.loggedAt),
          firstLoggedAt: foodTime
        });
      }
    });
    
    // Sort groups back to reverse chronological order (newest first) for UI display
    return groups.sort((a, b) => b.firstLoggedAt - a.firstLoggedAt);
  };

  const groupedLogs = groupFoodsByPrompt(todayFoods);

  // NLP Voice/Text logger
  const handleNlpLog = async () => {
    if (!nlpInput.trim()) return;

    setNlpLoading(true);
    try {
      const userMetrics = `Age: ${profile?.age || 28}, Gender: ${profile?.gender || 'male'}, Weight: ${profile?.weight || 70}kg, Height: ${profile?.height || 175}cm`;
      const recentLogs = todayFoods.map(f => `${f.quantity || 1}x ${f.name} (${f.calories || 0} kcal)`).join('\n');
      
      const aiResponse = await queryAiCoach(nlpInput, userMetrics, recentLogs);

      if (aiResponse.foods && aiResponse.foods.length > 0) {
        aiResponse.foods.forEach((food) => {
          const imgUrl = getRandomFoodImage(food.name);
          addFood(dateKey, {
            name: food.name,
            calories: food.calories,
            protein: food.protein,
            carbs: food.carbs,
            fat: food.fat,
            quantity: food.quantity,
            mealType: food.mealType,
            imageUrl: imgUrl,
            originalPrompt: nlpInput,
            aiAnalysis: aiResponse.reply,
          });
        });
        showAlert('Caloriq AI', aiResponse.reply, 'success');
      } else if (aiResponse.exercise) {
        const todayLog = dailyLogs[dateKey] || { stepCount: 0, activeCaloriesBurned: 0 };
        if (aiResponse.exercise.steps) {
          updateSteps(dateKey, (todayLog.stepCount || 0) + aiResponse.exercise.steps);
        }
        if (aiResponse.exercise.caloriesBurned) {
          updateActiveCalories(dateKey, (todayLog.activeCaloriesBurned || 0) + aiResponse.exercise.caloriesBurned);
        }
        showAlert('Logged Workout', aiResponse.reply, 'success');
      } else {
        showAlert('Caloriq AI', aiResponse.reply, 'info');
      }
      setNlpInput('');
    } catch (err) {
      console.error('NLP log error:', err);
      showAlert('Error', 'Failed to log. Please try again.', 'error');
    } finally {
      setNlpLoading(false);
    }
  };

  // Log manual entry from searchable database
  const handleLogManualFood = () => {
    if (!selectedFood) return;
    
    const ratio = specifiedGrams / 100;
    const foodItem = {
      name: `${selectedFood.name} (${specifiedGrams}g)`,
      calories: Math.round(selectedFood.nutrition_per_100g.calories_kcal * ratio),
      protein: Math.round(selectedFood.nutrition_per_100g.protein_g * ratio * 10) / 10,
      carbs: Math.round(selectedFood.nutrition_per_100g.carbs_g * ratio * 10) / 10,
      fat: Math.round(selectedFood.nutrition_per_100g.fat_g * ratio * 10) / 10,
      quantity: 1,
      mealType: selectedMealType,
      imageUrl: getRandomFoodImage(selectedFood.name),
      originalPrompt: `Manually added ${selectedFood.name}`,
      aiAnalysis: `Calculated manually for ${specifiedGrams}g serving.`,
    };

    addFood(dateKey, foodItem);
    
    // Reset states
    setIsManualLogOpen(false);
    setSelectedFood(null);
    setSearchQuery('');
    setSpecifiedGrams(100);
    showAlert('Logged Food', `${selectedFood.name} (${specifiedGrams}g) logged to ${selectedMealType}!`, 'success');
  };

  // Log completely custom manual food
  const handleLogCustomFood = () => {
    if (!customName.trim()) {
      showAlert('Missing Field', 'Please enter a food name.', 'warning');
      return;
    }
    const cals = parseInt(customCalories, 10) || 0;
    const prot = parseFloat(customProtein) || 0;
    const carb = parseFloat(customCarbs) || 0;
    const fats = parseFloat(customFat) || 0;

    const foodItem = {
      name: customName,
      calories: cals,
      protein: prot,
      carbs: carb,
      fat: fats,
      quantity: 1,
      mealType: selectedMealType,
      imageUrl: getRandomFoodImage(customName),
      originalPrompt: `Custom logged: ${customName}`,
      aiAnalysis: 'Manually logged custom entry.',
    };

    addFood(dateKey, foodItem);

    // Reset states
    setIsManualLogOpen(false);
    setCustomName('');
    setCustomCalories('');
    setCustomProtein('');
    setCustomCarbs('');
    setCustomFat('');
    showAlert('Logged Custom Food', `${customName} logged to ${selectedMealType}!`, 'success');
  };

  // Search filter
  const filteredFoods = keralaFoodsData.foods.filter((food: any) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true; // show all when empty
    return (
      food.name.toLowerCase().includes(query) ||
      food.name_ml.includes(query) ||
      (food.search_keywords && food.search_keywords.some((k: string) => k.toLowerCase().includes(query)))
    );
  });

  // Image upload food recognition logger
  const handleImagePick = async (useCamera = false) => {
    let result;
    try {
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          showAlert('Permission Denied', 'Camera permission is required to analyze meals.', 'warning');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          base64: true,
          quality: 0.8,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          showAlert('Permission Denied', 'Gallery access is required to choose photos.', 'warning');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          base64: true,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0].base64) {
        setNlpLoading(true);
        const visionResponse = await analyzeFoodImage(result.assets[0].base64, 'lunch');

        if (visionResponse.foods && visionResponse.foods.length > 0) {
          visionResponse.foods.forEach((food) => {
            const imgUrl = getRandomFoodImage(food.name);
            addFood(dateKey, {
              name: food.name,
              calories: food.calories,
              protein: food.protein,
              carbs: food.carbs,
              fat: food.fat,
              quantity: food.quantity,
              mealType: food.mealType,
              imageUrl: imgUrl,
              originalPrompt: 'Photo Uploaded Meal',
              aiAnalysis: visionResponse.reply,
            });
          });
          showAlert('Logged Meal', `Identified and logged: ${visionResponse.foods.map(f => f.name).join(', ')}`, 'success');
        } else {
          showAlert('Analysis Result', visionResponse.reply, 'info');
        }
      }
    } catch (err) {
      console.error('Image analysis error:', err);
      showAlert('Error', 'Could not parse food image.', 'error');
    } finally {
      setNlpLoading(false);
    }
  };

  // Dynamic Micronutrient Estimates for detailed Day View screen
  const getMicroNutrient = (name: string, multiplier: number, unit = 'g') => {
    const val = (carbsConsumed + proteinConsumed + fatConsumed) * multiplier;
    return `${val.toFixed(1)} ${unit}`;
  };

  const quickSuggestions = [
    "Green salad with grilled chicken breast and an apple",
    "Grilled salmon with broccoli and a cup of brown rice",
  ];

  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-neutral-950' : 'bg-white'}`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Left Side Drawer Menu Overlay */}
        {isMenuOpen && (
          <View className="absolute inset-0 bg-black/40 z-50 flex-row">
            {/* Drawer Content Panel */}
            <View className={`w-[280px] h-full px-5 pt-8 shadow-2xl justify-between pb-10 ${
              isDarkMode ? 'bg-slate-900' : 'bg-white'
            }`}>
              <View>
                {/* Header */}
                <View className={`flex-row justify-between items-center pb-4 mb-6 border-b ${
                  isDarkMode ? 'border-slate-800' : 'border-neutral-100'
                }`}>
                  <View>
                    <Text className={`text-xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Caloriq</Text>
                    <Text className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider mt-0.5">Navigation Menu</Text>
                  </View>
                  <Pressable 
                    onPress={() => setIsMenuOpen(false)}
                    className={`p-1 active:opacity-60 rounded-full ${
                      isDarkMode ? 'bg-slate-800' : 'bg-neutral-50'
                    }`}
                  >
                    <X size={18} color={isDarkMode ? '#a3a3a3' : '#737373'} />
                  </Pressable>
                </View>
 
                {/* Nav Links */}
                <View className="space-y-2">
                  <Pressable
                    onPress={() => {
                      setIsMenuOpen(false);
                      router.push('/');
                    }}
                    className={`flex-row items-center p-3.5 rounded-2xl border ${
                      isDarkMode ? 'bg-green-950/20 border-green-900/40' : 'bg-green-50/50 border-green-100/50'
                    }`}
                  >
                    <Flame size={18} color="#22C55E" />
                    <Text className="text-sm font-bold text-green-700 ml-3">Dashboard</Text>
                  </Pressable>
 
                  <Pressable
                    onPress={() => {
                      setIsMenuOpen(false);
                      router.push('/log');
                    }}
                    className={`flex-row items-center p-3.5 rounded-2xl border ${
                      isDarkMode ? 'bg-slate-800/40 border-transparent active:bg-slate-800/80' : 'bg-neutral-50 border-transparent active:bg-neutral-100'
                    } mt-2`}
                  >
                    <BookOpen size={18} color={isDarkMode ? '#a3a3a3' : '#525252'} />
                    <Text className={`text-sm font-bold ml-3 ${isDarkMode ? 'text-slate-200' : 'text-neutral-700'}`}>Daily Journal</Text>
                  </Pressable>
 
                  <Pressable
                    onPress={() => {
                      setIsMenuOpen(false);
                      router.push('/profile');
                    }}
                    className={`flex-row items-center p-3.5 rounded-2xl border ${
                      isDarkMode ? 'bg-slate-800/40 border-transparent active:bg-slate-800/80' : 'bg-neutral-50 border-transparent active:bg-neutral-100'
                    } mt-2`}
                  >
                    <Settings size={18} color={isDarkMode ? '#a3a3a3' : '#525252'} />
                    <Text className={`text-sm font-bold ml-3 ${isDarkMode ? 'text-slate-200' : 'text-neutral-700'}`}>Profile Settings</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setIsMenuOpen(false);
                      setIsOnboardingOpen(true);
                    }}
                    className={`flex-row items-center p-3.5 rounded-2xl border ${
                      isDarkMode ? 'bg-teal-950/40 border-teal-800/50 active:bg-teal-900/40' : 'bg-teal-50 border-teal-200/60 active:bg-teal-100/50'
                    } mt-2`}
                  >
                    <Sliders size={18} color="#14B8A6" />
                    <Text className="text-sm font-bold text-teal-600 dark:text-teal-400 ml-3">Retake Onboarding</Text>
                  </Pressable>
 
                  {/* Account / Sync Status */}
                  <View className={`mt-6 pt-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-neutral-100'}`}>
                    {!user ? (
                      <Pressable
                        onPress={() => {
                          setIsMenuOpen(false);
                          router.push('/profile?openAuth=true');
                        }}
                        className={`flex-row items-center p-3.5 rounded-2xl border ${
                          isDarkMode ? 'bg-amber-950/20 border-amber-900/40' : 'bg-amber-50 border-amber-200/50'
                        }`}
                      >
                        <User size={18} color="#d97706" />
                        <Text className="text-sm font-bold text-amber-800 ml-3">Login / Sync Cloud</Text>
                      </Pressable>
                    ) : (
                      <View className={`rounded-2xl p-3 border ${
                        isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-neutral-50 border-neutral-100/80'
                      }`}>
                        <View className="flex-row items-center mb-2">
                          <User size={16} color="#737373" />
                          <Text numberOfLines={1} className="text-xs font-semibold text-neutral-500 ml-2 flex-1">
                            {user.email}
                          </Text>
                        </View>
                        <Pressable
                          onPress={async () => {
                            setIsMenuOpen(false);
                            try {
                              const { signOut } = await import('firebase/auth');
                              const { auth } = await import('../lib/firebase');
                              await signOut(auth);
                              clearAllData(); // Clear local logs on sign out!
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className={`flex-row items-center justify-center p-2 rounded-xl ${
                            isDarkMode ? 'bg-slate-800 active:bg-slate-700' : 'bg-neutral-200/50 active:bg-neutral-200'
                          }`}
                        >
                          <Text className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-neutral-700'}`}>Sign Out</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>
              </View>
 
              {/* Footer info */}
              <View className={`border-t ${isDarkMode ? 'border-slate-800' : 'border-neutral-100'} pt-4`}>
                <Text className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider text-center">Caloriq v1.0.0</Text>
              </View>
            </View>

            {/* Click Outside Overlay to Close */}
            <Pressable 
              onPress={() => setIsMenuOpen(false)}
              className="flex-1"
            />
          </View>
        )}

        {/* Header */}
        <View className={`flex-row justify-between items-center px-4 py-3 border-b z-20 ${
          isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-100'
        }`}>
          <View className="flex-row items-center">
            <Pressable 
              onPress={() => setIsMenuOpen(true)}
              className={`mr-3 p-1.5 active:opacity-60 rounded-full border ${
                isDarkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-50 border-neutral-100/50'
              }`}
            >
              <Menu size={18} color={isDarkMode ? '#e5e5e5' : '#404040'} />
            </Pressable>
            <View>
              <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{dayOfWeekName}</Text>
              <Text className={`text-xl font-black tracking-tight mt-0.5 ${
                isDarkMode ? 'text-white' : 'text-neutral-800'
              }`}>{dayOfMonthNumber}</Text>
            </View>
          </View>
          
          {/* Header Title Toggles Calendar */}
          <Pressable 
            onPress={() => setIsCalendarOpen(!isCalendarOpen)}
            className={`flex-row items-center py-1 px-3 border rounded-full ${
              isDarkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-50 border-neutral-100'
            }`}
          >
            <Text className={`text-base font-bold tracking-tight mr-1 ${
              isDarkMode ? 'text-white' : 'text-neutral-800'
            }`}>
              {formatDateKey(selectedDate) === formatDateKey(new Date()) ? 'Today' : formatDateKey(selectedDate)}
            </Text>
            <ChevronDown size={14} color={isDarkMode ? '#a3a3a3' : '#525252'} />
          </Pressable>
 
          <View className="flex-row items-center space-x-2">
            {/* Dark Mode Toggle */}
            <Pressable 
              onPress={toggleDarkMode}
              className={`p-1.5 active:opacity-60 rounded-full border w-8 h-8 items-center justify-center ${
                isDarkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-50 border-neutral-100'
              }`}
            >
              {isDarkMode ? <Sun size={14} color="#f59e0b" /> : <Moon size={14} color="#4b5563" />}
            </Pressable>

            <Pressable 
              onPress={() => setIsManualLogOpen(true)}
              className={`p-1.5 active:opacity-60 rounded-full border w-8 h-8 items-center justify-center ${
                isDarkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-50 border-neutral-100'
              }`}
            >
              <Plus size={16} color={isDarkMode ? '#e5e5e5' : '#4b5563'} />
            </Pressable>
            <View className={`flex-row items-center px-2 py-1 rounded-full border ${
              isDarkMode ? 'bg-amber-950/40 border-amber-900/60' : 'bg-amber-50 border-amber-100'
            }`}>
              <Zap size={14} color="#d97706" fill="#f59e0b" />
              <Text className="text-[11px] font-extrabold text-amber-700 ml-0.5">1</Text>
            </View>
          </View>
        </View>

        {/* Dropdown Calendar Modal */}
        {isCalendarOpen && (
          <View className="absolute top-[52px] left-0 right-0 bg-white border-b border-neutral-150 z-30 shadow-xl px-5 pt-4 pb-6">
            <Text className="text-center font-bold text-neutral-800 text-sm mb-4">
              {getFullMonthYear(calendarViewDate)}
            </Text>

            {/* Days Headers */}
            <View className="flex-row justify-between mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((h, i) => (
                <Text key={i} className="text-center text-xs font-semibold text-neutral-400 w-[12%]">{h}</Text>
              ))}
            </View>

            {/* Calendar Grid */}
            <View className="flex-row flex-wrap justify-between">
              {monthGridDays.map((day, idx) => {
                if (!day) {
                  return <View key={idx} className="w-[12%] py-2" />;
                }
                const todayMidnight = new Date();
                todayMidnight.setHours(0, 0, 0, 0);
                const isSelected = formatDateKey(day) === dateKey;
                const isToday = formatDateKey(day) === formatDateKey(new Date());
                const isFutureDay = day > todayMidnight;

                let btnStyle = "w-[12%] py-2 items-center justify-center rounded-full ";
                let txtStyle = "text-xs font-semibold ";

                if (isFutureDay) {
                  txtStyle += "text-neutral-300";
                } else if (isSelected) {
                  btnStyle += "bg-emerald-500";
                  txtStyle += "text-white font-bold";
                } else if (isToday) {
                  btnStyle += "border border-emerald-400 bg-emerald-50/20";
                  txtStyle += "text-emerald-600 font-bold";
                } else {
                  txtStyle += "text-neutral-700";
                }

                return (
                  <Pressable
                    key={idx}
                    onPress={() => {
                      if (isFutureDay) return;
                      setSelectedDate(day);
                      setIsCalendarOpen(false);
                    }}
                    className={btnStyle}
                  >
                    <Text className={txtStyle}>{day.getDate()}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Months Selector Pills */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              className="flex-row mt-5 border-t border-neutral-100 pt-4"
            >
              {['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'].map((mName, mIdx) => {
                const monthOffset = mIdx + 1; // mapping Feb to Index 1, Mar to 2, etc.
                const isActiveMonth = calendarViewDate.getMonth() === monthOffset;
                
                return (
                  <Pressable
                    key={mIdx}
                    onPress={() => {
                      const newDate = new Date(calendarViewDate);
                      newDate.setMonth(monthOffset);
                      setCalendarViewDate(newDate);
                    }}
                    className={`px-4 py-1.5 rounded-full border mx-1 ${
                      isActiveMonth 
                        ? 'bg-blue-100 border-blue-200' 
                        : 'bg-neutral-50 border-neutral-100'
                    }`}
                  >
                    <Text className={`text-xs font-bold ${isActiveMonth ? 'text-blue-700' : 'text-neutral-500'}`}>
                      {mName}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
          className={`flex-1 px-4 pt-3 ${isDarkMode ? 'bg-neutral-950' : 'bg-white'}`}
        >
          {/* Greeting */}
          <View className="mb-4">
            <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Welcome Back</Text>
            <Text className={`text-2xl font-black mt-0.5 tracking-tight ${isDarkMode ? 'text-white' : 'text-neutral-850'}`}>
              Good morning, {(() => {
                if (user?.email) {
                  const emailLower = user.email.toLowerCase();
                  if (emailLower.includes('gouthamraveendran123g')) return 'Goutham';
                  const clean = user.email.split('@')[0].replace(/[0-9]/g, '');
                  return clean.charAt(0).toUpperCase() + clean.slice(1);
                }
                return 'Goutham';
              })()}
            </Text>
          </View>

          {/* Week Date Slider */}
          <View style={{ overflow: 'hidden' }} className="mb-4">
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              className="flex-row py-1"
            >
              {weekDays.map((day, idx) => {
                const dKey = formatDateKey(day);
                const isSelected = dKey === dateKey;
                const isToday = dKey === formatDateKey(today);
                const isFuture = day > today;

                let wrapperStyle = "items-center justify-center w-[44px] py-2 mx-1 rounded-2xl border ";
                let textDayStyle = "text-[9px] font-semibold uppercase ";
                let textNumStyle = "text-sm font-bold mt-0.5 ";

                if (isSelected) {
                  wrapperStyle += isToday
                    ? "bg-emerald-600 border-emerald-600"
                    : "bg-neutral-700 border-neutral-700";
                  textDayStyle += "text-emerald-100";
                  textNumStyle += "text-white";
                } else {
                  wrapperStyle += "bg-transparent border-transparent";
                  textDayStyle += "text-neutral-400";
                  textNumStyle += isDarkMode ? "text-neutral-200" : "text-neutral-850";
                }

                return (
                  <Pressable
                    key={idx}
                    onPress={() => {
                      if (isFuture) return;
                      setSelectedDate(day);
                      setCalendarViewDate(day);
                    }}
                    className={wrapperStyle}
                  >
                    <Text className={textDayStyle}>{getDayName(day)}</Text>
                    <Text className={textNumStyle}>{day.getDate()}</Text>
                    {isToday && !isSelected && (
                      <View className="w-1 h-1 rounded-full bg-emerald-500 mt-1" />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Yellow Banner */}
          {(!profile || !profile.onboardingComplete) && (
            <Pressable 
              onPress={() => setIsOnboardingOpen(true)}
              className={`border rounded-2xl p-4 mb-4 flex-row items-start active:opacity-75 ${
                isDarkMode ? 'bg-amber-950/20 border-amber-900/60' : 'bg-amber-50 border-amber-100'
              }`}
            >
              <AlertTriangle size={18} color="#d97706" className="mt-0.5" />
              <View className="flex-1 ml-3">
                <Text className="text-amber-800 font-bold text-xs">Set Your Calorie Goal</Text>
                <Text className="text-neutral-500 text-[11px] mt-0.5 leading-relaxed">
                  You are using the default calorie target. Tap to update your goal.
                </Text>
              </View>
            </Pressable>
          )}

          {/* Goal Focus card */}
          {profile && profile.onboardingComplete && (
            <Pressable
              onPress={() => setIsGoalEditorOpen(true)}
              className={`mb-5 border rounded-3xl p-5 shadow-sm active:opacity-80 ${
                isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-100'
              }`}
            >
              <View className="flex-row justify-between items-center mb-3">
                <View>
                  <View className="flex-row items-center">
                    <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Goal Focus</Text>
                    <View className="ml-2 flex-row items-center bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-full border border-teal-100 dark:border-teal-900/50">
                      <Sliders size={10} color="#14B8A6" />
                      <Text className="text-[9px] font-extrabold text-teal-600 dark:text-teal-400 ml-1 uppercase">Tap to Edit</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center mt-1.5">
                    {/* Goal Indication Icon Badge */}
                    <View className="w-8 h-8 rounded-full items-center justify-center mr-2.5 bg-emerald-500/15 dark:bg-emerald-950/50 border border-emerald-500/30 shadow-sm">
                      {profile.goal === 'lose' ? (
                        <TrendingDown size={18} color="#10B981" />
                      ) : profile.goal === 'gain' ? (
                        <TrendingUp size={18} color="#10B981" />
                      ) : (
                        <MinusCircle size={18} color="#10B981" />
                      )}
                    </View>

                    <Text className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-neutral-850'}`}>
                      {profile.goal === 'lose' ? 'Lose Weight' : profile.goal === 'gain' ? 'Gain Weight' : 'Maintain Weight'}
                    </Text>
                  </View>
                </View>
                <View className="bg-blue-50 dark:bg-blue-950/30 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-900/50">
                  <Text className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    {(profile.weeklyRate || 0) > 0 ? `${profile.weeklyRate} kg/week` : 'Steady'}
                  </Text>
                </View>
              </View>

              <View className="flex-row justify-between border-t border-neutral-100 dark:border-neutral-800 pt-4">
                <View className="items-center flex-1">
                  <Text className={`text-base font-black ${isDarkMode ? 'text-neutral-200' : 'text-neutral-850'}`}>{profile.weight} kg</Text>
                  <Text className="text-[9px] font-bold text-neutral-400 mt-0.5 uppercase tracking-wide">Current</Text>
                </View>
                <View className="items-center flex-1 border-x border-neutral-100 dark:border-neutral-800">
                  <Text className={`text-base font-black ${isDarkMode ? 'text-neutral-200' : 'text-neutral-850'}`}>{profile.targetWeight} kg</Text>
                  <Text className="text-[9px] font-bold text-neutral-400 mt-0.5 uppercase tracking-wide">Target</Text>
                </View>
                <View className="items-center flex-1">
                  <Text className="text-base font-black text-blue-500">
                    {profile.goal === 'maintain' ? '0 kg' : `${Math.abs((profile.weight || 0) - (profile.targetWeight || 0))} kg`}
                  </Text>
                  <Text className="text-[9px] font-bold text-neutral-400 mt-0.5 uppercase tracking-wide">
                    {profile.goal === 'lose' ? 'Remaining' : profile.goal === 'gain' ? 'To Gain' : 'Difference'}
                  </Text>
                </View>
              </View>
            </Pressable>
          )}

          {/* Horizontal Stats Row */}
          <View className={`mb-5 rounded-2xl p-4 flex-row justify-between border ${
            isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-blue-50/40 border-blue-100/50'
          }`}>
            {/* Remaining */}
            <View className="flex-1 px-1">
              <Text className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Remaining</Text>
              <View className="h-1 bg-neutral-200 dark:bg-neutral-800 rounded-full mt-1.5 overflow-hidden">
                <View className="h-full bg-blue-500 rounded-full" style={{ width: `${calRemainingPercent}%` }} />
              </View>
              <Text className={`text-xs font-black mt-1.5 ${isDarkMode ? 'text-white' : 'text-neutral-800'}`}>{calRemaining} kcal</Text>
            </View>

            {/* Carbs */}
            <View className="flex-1 px-1">
              <Text className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Carbs (g)</Text>
              <View className="h-1 bg-neutral-200 dark:bg-neutral-800 rounded-full mt-1.5 overflow-hidden">
                <View className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, carbsPercent)}%` }} />
              </View>
              <Text className={`text-xs font-black mt-1.5 ${isDarkMode ? 'text-white' : 'text-neutral-800'}`}>{carbsConsumed} / {carbsTarget}</Text>
            </View>

            {/* Protein */}
            <View className="flex-1 px-1">
              <Text className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Protein (g)</Text>
              <View className="h-1 bg-neutral-200 dark:bg-neutral-800 rounded-full mt-1.5 overflow-hidden">
                <View className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, proteinPercent)}%` }} />
              </View>
              <Text className={`text-xs font-black mt-1.5 ${isDarkMode ? 'text-white' : 'text-neutral-800'}`}>{proteinConsumed} / {proteinTarget}</Text>
            </View>

            {/* Fat */}
            <View className="flex-1 px-1">
              <Text className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Fat (g)</Text>
              <View className="h-1 bg-neutral-200 dark:bg-neutral-800 rounded-full mt-1.5 overflow-hidden">
                <View className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, fatPercent)}%` }} />
              </View>
              <Text className={`text-xs font-black mt-1.5 ${isDarkMode ? 'text-white' : 'text-neutral-800'}`}>{fatConsumed} / {fatTarget}</Text>
            </View>
          </View>

          {/* Grouped Meals Feed */}
          <View className="space-y-4 mb-8">
            {getGroupedMeals().map((group, groupIdx) => {
              const cPercent = Math.round((group.totalCalories / calorieBudget) * 100) || 0;
              const cbPercent = Math.round((group.totalCarbs / carbsTarget) * 100) || 0;
              const pPercent = Math.round((group.totalProtein / proteinTarget) * 100) || 0;
              const fPercent = Math.round((group.totalFat / fatTarget) * 100) || 0;

              return (
                <View 
                  key={groupIdx} 
                  style={{ marginBottom: 16 }}
                  className={`border rounded-2xl p-4 shadow-sm ${
                    isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-150'
                  }`}
                >
                  {/* Prompt Text / Title */}
                  <Text className="text-xs font-semibold text-neutral-400 mb-3 italic">
                    "{group.originalPrompt}"
                  </Text>

                  {/* Foods List */}
                  <View className="space-y-3.5 mb-4">
                    {group.foods.map((food, fIdx) => (
                      <View key={fIdx} className="border-b border-neutral-100 dark:border-neutral-800 pb-3 last:border-b-0 last:pb-0">
                        <View className="flex-row justify-between items-center mb-1.5">
                          <Text className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-neutral-850'}`}>
                            {food.name} {food.quantity > 1 ? `(x${food.quantity})` : ''}
                          </Text>
                          
                          {/* Delete Item */}
                          <Pressable
                            onPress={() => {
                              Alert.alert(
                                'Delete Log',
                                'Are you sure you want to delete this food log?',
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  { text: 'Delete', style: 'destructive', onPress: () => deleteFood(dateKey, food.id) }
                                ]
                              );
                            }}
                            className="p-1 active:opacity-60 bg-red-50 dark:bg-red-950/20 rounded-md"
                          >
                            <Trash2 size={12} color="#ef4444" />
                          </Pressable>
                        </View>
                        
                        {/* Macro Pills Row */}
                        <View className="flex-row flex-wrap gap-1.5">
                          <View className="bg-neutral-50 dark:bg-neutral-850 px-2 py-0.5 rounded-md border border-neutral-100 dark:border-neutral-800">
                            <Text className="text-[9px] font-bold text-neutral-500">Calories: {food.calories} kcal</Text>
                          </View>
                          <View className="bg-neutral-50 dark:bg-neutral-850 px-2 py-0.5 rounded-md border border-neutral-100 dark:border-neutral-800">
                            <Text className="text-[9px] font-bold text-neutral-500">Carbs: {food.carbs}g</Text>
                          </View>
                          <View className="bg-neutral-50 dark:bg-neutral-850 px-2 py-0.5 rounded-md border border-neutral-100 dark:border-neutral-800">
                            <Text className="text-[9px] font-bold text-neutral-500">Protein: {food.protein}g</Text>
                          </View>
                          <View className="bg-neutral-50 dark:bg-neutral-850 px-2 py-0.5 rounded-md border border-neutral-100 dark:border-neutral-800">
                            <Text className="text-[9px] font-bold text-neutral-500">Fat: {food.fat}g</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Summary progress section */}
                  <View className="border-t border-neutral-100 dark:border-neutral-800 pt-4 flex-row justify-between">
                    {/* Calories */}
                    <View className="flex-1 px-1">
                      <Text className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider">Calories</Text>
                      <Text className={`text-xs font-black mt-0.5 ${isDarkMode ? 'text-neutral-200' : 'text-neutral-800'}`}>{group.totalCalories}</Text>
                      <View className="h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mt-1">
                        <View className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, cPercent)}%` }} />
                      </View>
                      <Text className="text-[8px] font-bold text-neutral-400 mt-0.5">{cPercent}%</Text>
                    </View>

                    {/* Carbs */}
                    <View className="flex-1 px-1">
                      <Text className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider">Carbs</Text>
                      <Text className={`text-xs font-black mt-0.5 ${isDarkMode ? 'text-neutral-200' : 'text-neutral-800'}`}>{group.totalCarbs}g</Text>
                      <View className="h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mt-1">
                        <View className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, cbPercent)}%` }} />
                      </View>
                      <Text className="text-[8px] font-bold text-neutral-400 mt-0.5">{cbPercent}%</Text>
                    </View>

                    {/* Protein */}
                    <View className="flex-1 px-1">
                      <Text className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider">Protein</Text>
                      <Text className={`text-xs font-black mt-0.5 ${isDarkMode ? 'text-neutral-200' : 'text-neutral-800'}`}>{group.totalProtein}g</Text>
                      <View className="h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mt-1">
                        <View className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, pPercent)}%` }} />
                      </View>
                      <Text className="text-[8px] font-bold text-neutral-400 mt-0.5">{pPercent}%</Text>
                    </View>

                    {/* Fat */}
                    <View className="flex-1 px-1">
                      <Text className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider">Fat</Text>
                      <Text className={`text-xs font-black mt-0.5 ${isDarkMode ? 'text-neutral-200' : 'text-neutral-800'}`}>{group.totalFat}g</Text>
                      <View className="h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mt-1">
                        <View className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, fPercent)}%` }} />
                      </View>
                      <Text className="text-[8px] font-bold text-neutral-400 mt-0.5">{fPercent}%</Text>
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Empty State */}
            {todayFoods.length === 0 && (
              <View className="py-16 items-center justify-center">
                <Text className="text-3xl mb-2 text-center">🍽️</Text>
                <Text className="text-sm font-bold text-neutral-400 text-center uppercase tracking-wider">No meals logged today</Text>
              </View>
            )}
          </View>

        </ScrollView>

        {/* Floating Bottom Chat Input Bar */}
        <View className={`absolute bottom-0 left-0 right-0 border-t px-4 pt-2.5 pb-4 flex-row items-center ${
          isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-100'
        }`}>
          {/* Rounded Input Field Container */}
          <View className={`flex-1 flex-row border rounded-[28px] items-center px-4 py-0.5 ${
            isDarkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
          }`}>
            <TextInput
              value={nlpInput}
              onChangeText={setNlpInput}
              placeholder="What did you eat or exercise?"
              placeholderTextColor={isDarkMode ? '#8a8a8e' : '#8e8e93'}
              onSubmitEditing={handleNlpLog}
              className={`flex-1 text-sm py-3 pl-2 mr-2 ${isDarkMode ? 'text-white' : 'text-neutral-850'}`}
              editable={!nlpLoading}
            />
 
            {/* Quick Actions (Clock/History Bookmark icon) */}
            <Pressable 
              onPress={() => router.push('/log')}
              className="p-2 active:opacity-60"
            >
              <Clock size={19} color="#636e72" />
            </Pressable>
            
            {/* Gallery Image Button */}
            <Pressable 
              onPress={() => handleImagePick(false)}
              disabled={nlpLoading}
              className="p-2 active:opacity-60"
            >
              <ImageIcon size={19} color="#636e72" />
            </Pressable>
 
            {/* Camera Button */}
            <Pressable 
              onPress={() => handleImagePick(true)}
              disabled={nlpLoading}
              className="p-2 active:opacity-60 mr-1"
            >
              <Camera size={19} color="#636e72" />
            </Pressable>

            {/* Send Paperplane Button */}
            <Pressable 
              onPress={handleNlpLog}
              disabled={nlpLoading || !nlpInput.trim()}
              className="p-2 active:opacity-60 mr-2"
            >
              <Send size={18} color={nlpInput.trim() ? '#3b82f6' : '#b2bec3'} />
            </Pressable>
          </View>
        </View>

        {/* Slide-Up Day View Modal */}
        <Modal 
          visible={isDayViewOpen} 
          animationType="slide" 
          presentationStyle="fullScreen"
          onRequestClose={() => setIsDayViewOpen(false)}
        >
          <SafeAreaView className="flex-1 bg-white">
            {/* Modal Header */}
            <View className="flex-row items-center px-4 py-3.5 border-b border-neutral-100 bg-white">
              <Pressable 
                onPress={() => setIsDayViewOpen(false)}
                className="p-1 active:opacity-60"
              >
                <ChevronLeft size={24} color="#1f2937" />
              </Pressable>
              <Text className="text-lg font-bold text-neutral-800 ml-4">Day View</Text>
            </View>

            <ScrollView className="flex-1 px-5 pt-4">
              <Text className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-2">
                {formatDateLong(selectedDate)}
              </Text>
              
              <View className="mb-6 pb-2 border-b border-neutral-100">
                <Text className="text-xl font-bold text-neutral-800">Nutritional Information</Text>
              </View>

              {/* Detailed Breakdown List */}
              <View className="space-y-4 pb-12">
                {/* Calories Row */}
                <View className="flex-row justify-between items-center pb-2.5 border-b border-neutral-100">
                  <Text className="text-sm font-bold text-neutral-800">Calories</Text>
                  <Text className="text-sm font-semibold text-neutral-700">{caloriesConsumed} kcal</Text>
                </View>

                {/* Carbohydrates Row */}
                <View className="flex-row justify-between items-center pb-2.5 border-b border-neutral-100">
                  <Text className="text-sm font-bold text-neutral-800">Total Carbohydrates</Text>
                  <Text className="text-sm font-semibold text-neutral-700">{carbsConsumed} g</Text>
                </View>

                {/* Sub-carb elements */}
                <View className="flex-row justify-between items-center pl-4 pb-2.5 border-b border-neutral-100/60">
                  <Text className="text-xs text-neutral-500">Dietary Fibre</Text>
                  <Text className="text-xs font-semibold text-neutral-600">{getMicroNutrient('fiber', 0.1, 'g')}</Text>
                </View>
                <View className="flex-row justify-between items-center pl-4 pb-2.5 border-b border-neutral-100/60">
                  <Text className="text-xs text-neutral-500">Sugar</Text>
                  <Text className="text-xs font-semibold text-neutral-600">{getMicroNutrient('sugar', 0.4, 'g')}</Text>
                </View>
                <View className="flex-row justify-between items-center pl-4 pb-2.5 border-b border-neutral-100/60">
                  <Text className="text-xs text-neutral-500">Added Sugars</Text>
                  <Text className="text-xs font-semibold text-neutral-600">{getMicroNutrient('addSugar', 0.15, 'g')}</Text>
                </View>
                <View className="flex-row justify-between items-center pl-4 pb-2.5 border-b border-neutral-100/60">
                  <Text className="text-xs text-neutral-500">Sugar Alcohols</Text>
                  <Text className="text-xs font-semibold text-neutral-600">0.0 g</Text>
                </View>
                <View className="flex-row justify-between items-center pl-4 pb-2.5 border-b border-neutral-100/60">
                  <Text className="text-xs text-neutral-500 font-semibold">Net Carbs</Text>
                  <Text className="text-xs font-bold text-neutral-600">{getMicroNutrient('netCarb', 0.85, 'g')}</Text>
                </View>

                {/* Protein Row */}
                <View className="flex-row justify-between items-center pb-2.5 border-b border-neutral-100">
                  <Text className="text-sm font-bold text-neutral-800">Protein</Text>
                  <Text className="text-sm font-semibold text-neutral-700">{proteinConsumed} g</Text>
                </View>

                {/* Total Fat Row */}
                <View className="flex-row justify-between items-center pb-2.5 border-b border-neutral-100">
                  <Text className="text-sm font-bold text-neutral-800">Total Fat</Text>
                  <Text className="text-sm font-semibold text-neutral-700">{fatConsumed} g</Text>
                </View>

                {/* Sub-fat elements */}
                <View className="flex-row justify-between items-center pl-4 pb-2.5 border-b border-neutral-100/60">
                  <Text className="text-xs text-neutral-500">Saturated Fat</Text>
                  <Text className="text-xs font-semibold text-neutral-600">{getMicroNutrient('satFat', 0.3, 'g')}</Text>
                </View>
                <View className="flex-row justify-between items-center pl-4 pb-2.5 border-b border-neutral-100/60">
                  <Text className="text-xs text-neutral-500">Trans Fat</Text>
                  <Text className="text-xs font-semibold text-neutral-600">{getMicroNutrient('transFat', 0.02, 'g')}</Text>
                </View>
                <View className="flex-row justify-between items-center pl-4 pb-2.5 border-b border-neutral-100/60">
                  <Text className="text-xs text-neutral-500">Polyunsaturated Fat</Text>
                  <Text className="text-xs font-semibold text-neutral-600">{getMicroNutrient('polyFat', 0.2, 'g')}</Text>
                </View>
                <View className="flex-row justify-between items-center pl-4 pb-2.5 border-b border-neutral-100/60">
                  <Text className="text-xs text-neutral-500">Monounsaturated Fat</Text>
                  <Text className="text-xs font-semibold text-neutral-600">{getMicroNutrient('monoFat', 0.45, 'g')}</Text>
                </View>

                {/* Other Elements */}
                <View className="flex-row justify-between items-center pb-2.5 border-b border-neutral-100">
                  <Text className="text-sm font-bold text-neutral-800">Cholesterol</Text>
                  <Text className="text-sm font-semibold text-neutral-700">{getMicroNutrient('chol', 0.2, 'mg')}</Text>
                </View>
                <View className="flex-row justify-between items-center pb-2.5 border-b border-neutral-100">
                  <Text className="text-sm font-bold text-neutral-800">Sodium</Text>
                  <Text className="text-sm font-semibold text-neutral-700">{getMicroNutrient('sodium', 1.5, 'mg')}</Text>
                </View>
                <View className="flex-row justify-between items-center pb-2.5 border-b border-neutral-100">
                  <Text className="text-sm font-bold text-neutral-800">Calcium</Text>
                  <Text className="text-sm font-semibold text-neutral-700">{getMicroNutrient('calc', 0.5, 'mg')}</Text>
                </View>
                <View className="flex-row justify-between items-center pb-2.5 border-b border-neutral-100">
                  <Text className="text-sm font-bold text-neutral-800">Iron</Text>
                  <Text className="text-sm font-semibold text-neutral-700">{getMicroNutrient('iron', 0.01, 'mg')}</Text>
                </View>
                <View className="flex-row justify-between items-center pb-2.5 border-b border-neutral-100">
                  <Text className="text-sm font-bold text-neutral-800">Potassium</Text>
                  <Text className="text-sm font-semibold text-neutral-700">{getMicroNutrient('pot', 1.2, 'mg')}</Text>
                </View>
                <View className="flex-row justify-between items-center pb-2.5 border-b border-neutral-100">
                  <Text className="text-sm font-bold text-neutral-800">Vitamin A</Text>
                  <Text className="text-sm font-semibold text-neutral-700">{getMicroNutrient('vitA', 0.05, 'IU')}</Text>
                </View>
                <View className="flex-row justify-between items-center pb-2.5 border-b border-neutral-100">
                  <Text className="text-sm font-bold text-neutral-800">Vitamin C</Text>
                  <Text className="text-sm font-semibold text-neutral-700">{getMicroNutrient('vitC', 0.08, 'mg')}</Text>
                </View>
                <View className="flex-row justify-between items-center pb-2.5 border-b border-neutral-100">
                  <Text className="text-sm font-bold text-neutral-800">Vitamin D</Text>
                  <Text className="text-sm font-semibold text-neutral-700">{getMicroNutrient('vitD', 0.02, 'mcg')}</Text>
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* Search & Manual Log Food Modal */}
        <Modal
          visible={isManualLogOpen}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => {
            setIsManualLogOpen(false);
            setSelectedFood(null);
            setIsCustomMode(false);
          }}
        >
          <SafeAreaView className="flex-1 bg-white">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-4 py-3.5 border-b border-neutral-100 bg-white">
              <View className="flex-row items-center">
                <Pressable
                  onPress={() => {
                    if (selectedFood) {
                      setSelectedFood(null);
                    } else {
                      setIsManualLogOpen(false);
                      setIsCustomMode(false);
                    }
                  }}
                  className="p-1 active:opacity-60"
                >
                  <ChevronLeft size={24} color="#1f2937" />
                </Pressable>
                <Text className="text-lg font-bold text-neutral-800 ml-4">
                  {selectedFood ? 'Adjust Quantity' : isCustomMode ? 'Custom Food' : 'Search Foods'}
                </Text>
              </View>
              
              {!selectedFood && (
                <Pressable
                  onPress={() => setIsCustomMode(!isCustomMode)}
                  className="px-3.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-full active:bg-neutral-100"
                >
                  <Text className="text-xs font-bold text-neutral-700">
                    {isCustomMode ? 'Search Database' : 'Log Custom'}
                  </Text>
                </Pressable>
              )}
            </View>

            {isCustomMode ? (
              /* Custom Food Manual Form */
              <ScrollView className="flex-1 px-5 pt-4">
                <Text className="text-neutral-800 font-extrabold text-base mb-4">Log a Custom Food</Text>
                
                <View className="space-y-4">
                  <View>
                    <Text className="text-neutral-500 text-xs font-bold mb-1.5">Food Name</Text>
                    <TextInput
                      value={customName}
                      onChangeText={setCustomName}
                      placeholder="e.g. Oats Upma"
                      placeholderTextColor="#a3a3a3"
                      className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-800"
                    />
                  </View>

                  <View className="flex-row space-x-3.5 mt-3">
                    <View className="flex-1">
                      <Text className="text-neutral-500 text-xs font-bold mb-1.5">Calories (kcal)</Text>
                      <TextInput
                        value={customCalories}
                        onChangeText={setCustomCalories}
                        placeholder="e.g. 150"
                        placeholderTextColor="#a3a3a3"
                        keyboardType="numeric"
                        className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-800"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-neutral-500 text-xs font-bold mb-1.5">Protein (g)</Text>
                      <TextInput
                        value={customProtein}
                        onChangeText={setCustomProtein}
                        placeholder="e.g. 6"
                        placeholderTextColor="#a3a3a3"
                        keyboardType="numeric"
                        className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-800"
                      />
                    </View>
                  </View>

                  <View className="flex-row space-x-3.5 mt-3">
                    <View className="flex-1">
                      <Text className="text-neutral-500 text-xs font-bold mb-1.5">Carbs (g)</Text>
                      <TextInput
                        value={customCarbs}
                        onChangeText={setCustomCarbs}
                        placeholder="e.g. 27"
                        placeholderTextColor="#a3a3a3"
                        keyboardType="numeric"
                        className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-800"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-neutral-500 text-xs font-bold mb-1.5">Fat (g)</Text>
                      <TextInput
                        value={customFat}
                        onChangeText={setCustomFat}
                        placeholder="e.g. 2.5"
                        placeholderTextColor="#a3a3a3"
                        keyboardType="numeric"
                        className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-800"
                      />
                    </View>
                  </View>

                  {/* Meal Type selection */}
                  <View className="mt-4">
                    <Text className="text-neutral-500 text-xs font-bold mb-2">Select Meal</Text>
                    <View className="flex-row justify-between space-x-2">
                      {['breakfast', 'lunch', 'dinner', 'snacks'].map((meal) => {
                        const isSelected = selectedMealType === meal;
                        return (
                          <Pressable
                            key={meal}
                            onPress={() => setSelectedMealType(meal as any)}
                            className={`flex-1 py-2.5 rounded-xl border items-center capitalize ${
                              isSelected ? 'bg-black border-black' : 'bg-neutral-50 border-neutral-200'
                            }`}
                          >
                            <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-neutral-600'}`}>
                              {meal}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {/* CTA button */}
                  <Pressable
                    onPress={handleLogCustomFood}
                    className="w-full bg-black rounded-xl py-4 items-center mt-6 active:opacity-85"
                  >
                    <Text className="text-white text-sm font-bold">Log Custom Food</Text>
                  </Pressable>
                </View>
              </ScrollView>
            ) : selectedFood ? (
              /* Adjust Quantity for Database Selection */
              <ScrollView className="flex-1 px-5 pt-4">
                <Text className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider">Selected Food</Text>
                <Text className="text-xl font-black text-neutral-800 mt-1">{selectedFood.name}</Text>
                <Text className="text-neutral-500 text-xs font-bold mt-0.5">{selectedFood.name_ml}</Text>

                {/* Gram / KG inputs */}
                <View className="mt-6">
                  <Text className="text-neutral-500 text-xs font-bold mb-2">Quantity</Text>
                  <View className="flex-row space-x-2 items-center mb-4">
                    <View className="flex-1 flex-row items-center bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3">
                      <TextInput
                        value={quantityInput}
                        onChangeText={(v) => updateGrams(v, selectedUnit)}
                        keyboardType="numeric"
                        placeholder="0"
                        className="flex-1 text-sm font-bold text-neutral-800"
                      />
                    </View>
                    
                    {/* Unit Selector Toggle */}
                    <View className="flex-row bg-neutral-100 p-1 rounded-xl border border-neutral-200">
                      {(['g', 'kg'] as const).map((unit) => {
                        const isSelected = selectedUnit === unit;
                        return (
                          <Pressable
                            key={unit}
                            onPress={() => handleUnitChange(unit)}
                            className={`px-4 py-2 rounded-lg ${
                              isSelected ? 'bg-white shadow-sm' : 'bg-transparent'
                            }`}
                          >
                            <Text className={`text-xs font-bold ${isSelected ? 'text-black' : 'text-neutral-500'}`}>
                              {unit}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {/* Quick helpers */}
                  <View className="flex-row space-x-2 mb-6">
                    {[50, 100, 150, 200, 250, 300, 500].map((g) => (
                      <Pressable
                        key={g}
                        onPress={() => handleQuickGrams(g)}
                        className={`px-3 py-1.5 rounded-lg border ${
                          specifiedGrams === g ? 'bg-neutral-800 border-neutral-800' : 'bg-white border-neutral-200'
                        }`}
                      >
                        <Text className={`text-[11px] font-bold ${specifiedGrams === g ? 'text-white' : 'text-neutral-600'}`}>
                          {g}g
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* Meal Type selection */}
                  <Text className="text-neutral-500 text-xs font-bold mb-2">Select Meal</Text>
                  <View className="flex-row justify-between space-x-2 mb-6">
                    {['breakfast', 'lunch', 'dinner', 'snacks'].map((meal) => {
                      const isSelected = selectedMealType === meal;
                      return (
                        <Pressable
                          key={meal}
                          onPress={() => setSelectedMealType(meal as any)}
                          className={`flex-1 py-2.5 rounded-xl border items-center capitalize ${
                            isSelected ? 'bg-black border-black' : 'bg-neutral-50 border-neutral-200'
                          }`}
                        >
                          <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-neutral-600'}`}>
                            {meal}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Live scaled Macro calculation details */}
                  <Text className="text-neutral-500 text-xs font-bold mb-2.5">Nutrition Preview</Text>
                  <View className="flex-row justify-between bg-blue-50/20 border border-blue-100/50 rounded-2xl p-4.5 mb-6">
                    <View className="items-center flex-1">
                      <Text className="text-[9px] text-neutral-400 font-bold uppercase">Calories</Text>
                      <Text className="text-base font-extrabold text-neutral-800 mt-1">
                        {Math.round(selectedFood.nutrition_per_100g.calories_kcal * (specifiedGrams / 100))}
                      </Text>
                      <Text className="text-[9px] text-neutral-400 font-bold uppercase mt-0.5">kcal</Text>
                    </View>
                    <View className="items-center flex-1 border-l border-neutral-100 pl-2">
                      <Text className="text-[9px] text-neutral-400 font-bold uppercase">Carbs</Text>
                      <Text className="text-base font-extrabold text-neutral-800 mt-1">
                        {(selectedFood.nutrition_per_100g.carbs_g * (specifiedGrams / 100)).toFixed(1)}g
                      </Text>
                      <Text className="text-[9px] text-neutral-400 font-bold uppercase mt-0.5">{(selectedFood.nutrition_per_100g.carbs_g * (specifiedGrams / 100) * 4).toFixed(0)} kcal</Text>
                    </View>
                    <View className="items-center flex-1 border-l border-neutral-100 pl-2">
                      <Text className="text-[9px] text-neutral-400 font-bold uppercase">Protein</Text>
                      <Text className="text-base font-extrabold text-neutral-800 mt-1">
                        {(selectedFood.nutrition_per_100g.protein_g * (specifiedGrams / 100)).toFixed(1)}g
                      </Text>
                      <Text className="text-[9px] text-neutral-400 font-bold uppercase mt-0.5">{(selectedFood.nutrition_per_100g.protein_g * (specifiedGrams / 100) * 4).toFixed(0)} kcal</Text>
                    </View>
                    <View className="items-center flex-1 border-l border-neutral-100 pl-2">
                      <Text className="text-[9px] text-neutral-400 font-bold uppercase">Fat</Text>
                      <Text className="text-base font-extrabold text-neutral-800 mt-1">
                        {(selectedFood.nutrition_per_100g.fat_g * (specifiedGrams / 100)).toFixed(1)}g
                      </Text>
                      <Text className="text-[9px] text-neutral-400 font-bold uppercase mt-0.5">{(selectedFood.nutrition_per_100g.fat_g * (specifiedGrams / 100) * 9).toFixed(0)} kcal</Text>
                    </View>
                  </View>

                  {/* CTA button */}
                  <Pressable
                    onPress={handleLogManualFood}
                    className="w-full bg-black rounded-xl py-4 items-center active:opacity-85 shadow-sm"
                  >
                    <Text className="text-white text-sm font-bold">Log Food ({specifiedGrams}g)</Text>
                  </Pressable>
                </View>
              </ScrollView>
            ) : (
              /* Database Search Interface */
              <View className="flex-1 px-4 pt-4">
                {/* Search Bar */}
                <View className="flex-row items-center bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-1 mb-4">
                  <Search size={18} color="#8e8e93" className="mr-2" />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search Kerala foods, e.g. puttu, avial, choru..."
                    placeholderTextColor="#8e8e93"
                    className="flex-1 text-sm text-neutral-800 py-3"
                  />
                  {searchQuery !== '' && (
                    <Pressable onPress={() => setSearchQuery('')} className="p-1">
                      <X size={16} color="#8e8e93" />
                    </Pressable>
                  )}
                </View>

                {/* Search Results / popular list */}
                <ScrollView className="flex-1 mt-1">
                  <Text className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider mb-2.5">
                    {searchQuery ? `Search Results (${filteredFoods.length})` : 'Popular Kerala Foods'}
                  </Text>
                  {filteredFoods.map((food: any) => (
                    <Pressable
                      key={food.id}
                      onPress={() => {
                        setSelectedFood(food);
                        setSpecifiedGrams(100);
                        setQuantityInput('100');
                        setSelectedUnit('g');
                      }}
                      className="flex-row justify-between items-center py-3.5 border-b border-neutral-100 active:bg-neutral-50/50 px-1"
                    >
                      <View className="flex-1 pr-2">
                        <Text className="text-sm font-bold text-neutral-800">{food.name}</Text>
                        <Text className="text-neutral-500 text-xs mt-0.5">{food.name_ml}</Text>
                        <Text className="text-[10px] text-neutral-400 font-semibold mt-1">
                          {food.category} • {food.food_type}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-xs font-extrabold text-neutral-800">{food.nutrition_per_100g.calories_kcal} kcal</Text>
                        <Text className="text-[10px] text-neutral-400 mt-0.5">per 100g</Text>
                      </View>
                    </Pressable>
                  ))}
                  {filteredFoods.length === 0 && (
                    <View className="py-12 items-center">
                      <Text className="text-neutral-500 text-sm font-semibold">No foods found matching "{searchQuery}"</Text>
                      <Pressable
                        onPress={() => {
                          setIsCustomMode(true);
                          setCustomName(searchQuery);
                        }}
                        className="mt-4 px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl active:bg-neutral-100"
                      >
                        <Text className="text-xs font-bold text-neutral-700">Log as Custom Food instead</Text>
                      </Pressable>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}
          </SafeAreaView>
        </Modal>

        <OnboardingFlow visible={isOnboardingOpen} onClose={() => setIsOnboardingOpen(false)} />

        <GoalFocusEditorModal
          visible={isGoalEditorOpen}
          onClose={() => setIsGoalEditorOpen(false)}
          onSaved={() => showAlert('Goal Updated!', 'Your goal focus and daily calorie budget have been recalculated successfully.', 'success')}
        />

        <NiceLoaderOverlay
          visible={nlpLoading}
          message="Caloriq AI Coach Analyzing..."
          subMessage="Identifying nutrition, calories & macros"
          isDarkMode={isDarkMode}
        />

        <NiceAlertModal
          config={alertConfig}
          onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
          isDarkMode={isDarkMode}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
