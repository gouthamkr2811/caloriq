import { ENV } from '../config/env';
import axios from 'axios';

// Structures
export interface ParsedFood {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quantity: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
}

export interface CoachResponse {
  reply: string;
  foods?: ParsedFood[];
  exercise?: {
    steps?: number;
    caloriesBurned?: number;
  };
  isDemo: boolean;
}

export function getRandomFoodImage(foodName: string): string {
  const name = foodName.toLowerCase();
  if (name.includes('pancake')) {
    return 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&auto=format&fit=crop&q=80';
  }
  if (name.includes('salad') || name.includes('greens') || name.includes('vegetable') || name.includes('spinach') || name.includes('chickpea') || name.includes('bowl')) {
    return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=80';
  }
  if (name.includes('toast') || name.includes('bread') || name.includes('avocado')) {
    return 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=600&auto=format&fit=crop&q=80';
  }
  if (name.includes('egg')) {
    return 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=80';
  }
  if (name.includes('chicken') || name.includes('poultry') || name.includes('meat') || name.includes('turkey') || name.includes('breast')) {
    return 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=600&auto=format&fit=crop&q=80';
  }
  if (name.includes('salmon') || name.includes('fish') || name.includes('seafood') || name.includes('tuna')) {
    return 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&auto=format&fit=crop&q=80';
  }
  if (name.includes('banana') || name.includes('apple') || name.includes('fruit') || name.includes('berry') || name.includes('orange') || name.includes('lemon')) {
    return 'https://images.unsplash.com/photo-1490818384919-6b06e2652972?w=600&auto=format&fit=crop&q=80';
  }
  if (name.includes('yogurt') || name.includes('milk') || name.includes('dairy') || name.includes('cheese')) {
    return 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80';
  }
  if (name.includes('rice') || name.includes('grain') || name.includes('oatmeal') || name.includes('oat') || name.includes('potato')) {
    return 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&auto=format&fit=crop&q=80';
  }
  if (name.includes('shake') || name.includes('protein') || name.includes('smoothie')) {
    return 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&auto=format&fit=crop&q=80';
  }
  return 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&auto=format&fit=crop&q=80';
}

// Local mock database subset for offline NLP parsing fallback
const LOCAL_NLP_DATABASE: Record<string, { calories: number; protein: number; carbs: number; fat: number; name: string; refGrams: number; baseName: string }> = {
  egg: { name: 'Boiled Egg (Large)', calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, refGrams: 50, baseName: 'Boiled Egg' },
  eggs: { name: 'Boiled Egg (Large)', calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, refGrams: 50, baseName: 'Boiled Egg' },
  chicken: { name: 'Chicken Breast (cooked, 100g)', calories: 165, protein: 31, carbs: 0, fat: 3.6, refGrams: 100, baseName: 'Chicken Breast' },
  oatmeal: { name: 'Oatmeal (cooked, 1 cup)', calories: 150, protein: 6, carbs: 27, fat: 2.5, refGrams: 234, baseName: 'Oatmeal' },
  banana: { name: 'Banana (Medium)', calories: 105, protein: 1.3, carbs: 27, fat: 0.3, refGrams: 118, baseName: 'Banana' },
  apple: { name: 'Apple (Medium)', calories: 95, protein: 0.5, carbs: 25, fat: 0.3, refGrams: 182, baseName: 'Apple' },
  yogurt: { name: 'Greek Yogurt (plain, 150g)', calories: 100, protein: 15, carbs: 6, fat: 0.5, refGrams: 150, baseName: 'Greek Yogurt' },
  rice: { name: 'White Rice (cooked, 1 cup)', calories: 200, protein: 4.3, carbs: 45, fat: 0.4, refGrams: 195, baseName: 'White Rice' },
  avocado: { name: 'Avocado (Medium)', calories: 240, protein: 3, carbs: 12, fat: 22, refGrams: 150, baseName: 'Avocado' },
  peanut: { name: 'Peanut Butter (2 tbsp)', calories: 188, protein: 8, carbs: 6, fat: 16, refGrams: 32, baseName: 'Peanut Butter' },
  salmon: { name: 'Atlantic Salmon (cooked, 100g)', calories: 206, protein: 22, carbs: 0, fat: 12, refGrams: 100, baseName: 'Atlantic Salmon' },
  almond: { name: 'Almonds (1 oz / 28g)', calories: 164, protein: 6, carbs: 6, fat: 14, refGrams: 28, baseName: 'Almonds' },
  almonds: { name: 'Almonds (1 oz / 28g)', calories: 164, protein: 6, carbs: 6, fat: 14, refGrams: 28, baseName: 'Almonds' },
  milk: { name: 'Whole Milk (1 cup / 240ml)', calories: 149, protein: 8, carbs: 12, fat: 8, refGrams: 240, baseName: 'Whole Milk' },
  shake: { name: 'Protein Shake (1 scoop)', calories: 120, protein: 24, carbs: 3, fat: 1.5, refGrams: 30, baseName: 'Protein Shake' },
  salad: { name: 'Mixed Salad Greens (2 cups)', calories: 15, protein: 1, carbs: 3, fat: 0, refGrams: 85, baseName: 'Mixed Salad Greens' },
  oil: { name: 'Olive Oil (1 tbsp)', calories: 119, protein: 0, carbs: 0, fat: 13.5, refGrams: 14, baseName: 'Olive Oil' },
  potato: { name: 'Sweet Potato (Medium)', calories: 112, protein: 2, carbs: 26, fat: 0.1, refGrams: 150, baseName: 'Sweet Potato' },
};

const GROQ_API_KEY = ENV.groqApiKey || process.env.EXPO_PUBLIC_GROQ_API_KEY || '';

const isGroqConfigured = (): boolean => {
  return !!GROQ_API_KEY && GROQ_API_KEY.trim() !== '' && GROQ_API_KEY !== 'your_groq_key_here';
};

/**
 * Smart Local Regular Expression Rule-based Parser for offline/fallback mode
 */
function localNlpParse(text: string): CoachResponse {
  const lowerText = text.toLowerCase();
  
  // Detect exercise / step logging
  if (lowerText.includes('walk') || lowerText.includes('step')) {
    const match = lowerText.match(/(\d+)/);
    const steps = match ? parseInt(match[1], 10) : 10000;
    return {
      reply: `I've logged ${steps.toLocaleString()} steps to your tracker today. Keep up the active movement!`,
      exercise: { steps },
      isDemo: true,
    };
  }
  if (lowerText.includes('run') || lowerText.includes('jog') || lowerText.includes('workout') || lowerText.includes('burn') || lowerText.includes('exercise')) {
    const match = lowerText.match(/(\d+)/);
    const caloriesBurned = match ? parseInt(match[1], 10) : 350;
    return {
      reply: `Great workout! I've logged ${caloriesBurned} kcal burned to your active exercise log.`,
      exercise: { caloriesBurned },
      isDemo: true,
    };
  }

  const foundFoods: ParsedFood[] = [];
  
  // Detect meal type keywords
  let mealType: ParsedFood['mealType'] = 'breakfast';
  if (lowerText.includes('lunch')) mealType = 'lunch';
  else if (lowerText.includes('dinner')) mealType = 'dinner';
  else if (lowerText.includes('snack') || lowerText.includes('supper')) mealType = 'snacks';

  // Check if user specifies a weight like "100gram", "100g", "250 gram", "50 grams"
  const gramMatch = lowerText.match(/(\d+)\s*(?:g|gram|grams)\b/i);
  const specifiedGrams = gramMatch ? parseInt(gramMatch[1], 10) : null;

  // Basic regex matches for numbers followed by keywords, e.g., "2 eggs", "1 avocado", "some almonds"
  // Scan all keys in our local database
  Object.keys(LOCAL_NLP_DATABASE).forEach((key) => {
    if (lowerText.includes(key)) {
      // Look for a number preceding the word (up to 3 words away)
      const regex = new RegExp(`(\\d+)?\\s*(?:and|a|an|some|with|of)?\\s*${key}`, 'i');
      const match = lowerText.match(regex);
      let quantity = 1;
      
      const dbItem = LOCAL_NLP_DATABASE[key];
      let foodName = dbItem.name;
      let calories = dbItem.calories;
      let protein = dbItem.protein;
      let carbs = dbItem.carbs;
      let fat = dbItem.fat;

      if (specifiedGrams !== null) {
        // Proportional scale factor
        const scale = specifiedGrams / dbItem.refGrams;
        foodName = `${dbItem.baseName} (${specifiedGrams}g)`;
        calories = Math.round(dbItem.calories * scale);
        protein = Math.round(dbItem.protein * scale * 10) / 10;
        carbs = Math.round(dbItem.carbs * scale * 10) / 10;
        fat = Math.round(dbItem.fat * scale * 10) / 10;
      } else {
        if (match && match[1]) {
          quantity = parseInt(match[1], 10);
        }
      }
      
      // Prevent duplicates in a single phrase
      if (!foundFoods.some(f => f.name === foodName)) {
        foundFoods.push({
          name: foodName,
          calories,
          protein,
          carbs,
          fat,
          quantity,
          mealType,
        });
      }
    }
  });

  if (foundFoods.length > 0) {
    const foodListString = foundFoods.map(f => `${f.quantity}x ${f.name}`).join(', ');
    return {
      reply: `[Demo AI Mode]: I parsed your log and identified: ${foodListString}. I've successfully added these foods to your ${mealType} log!`,
      foods: foundFoods,
      isDemo: true,
    };
  }

  // Fallback conversional chatbot for general fitness statements
  if (lowerText.includes('hi') || lowerText.includes('hello') || lowerText.includes('hey')) {
    return {
      reply: "Hello! I'm your Caloriq AI nutrition coach. Tell me what you ate today (e.g. 'I had 2 eggs and a banana for breakfast'), or ask me any fitness or dieting questions!",
      isDemo: true,
    };
  }
  if (lowerText.includes('protein') || lowerText.includes('muscle')) {
    return {
      reply: "[Demo AI Mode]: To maximize muscle synthesis or maintain muscle tone, aim for 1.6 to 2.2 grams of protein per kilogram of body weight daily. Ensure you distribute intake evenly across your meals.",
      isDemo: true,
    };
  }
  if (lowerText.includes('water') || lowerText.includes('hydration')) {
    return {
      reply: "[Demo AI Mode]: Hydration is key! Try to drink at least 2.5 to 3 liters of water daily, especially if you exercise actively. It keeps metabolism high and reduces false hunger signals.",
      isDemo: true,
    };
  }

  return {
    reply: "[Demo AI Mode]: I'm running in offline/demo mode since your Groq API Key is not set up or is invalid. Try mentioning some common foods like 'eggs', 'chicken', 'oatmeal', 'banana', or 'avocado' and I will automatically parse and log them for you!",
    isDemo: true,
  };
}

function cleanJson(str: string): string {
  let res = str.trim();
  if (res.startsWith('```')) {
    res = res.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  }
  return res;
}

export async function queryAiCoach(
  userMessage: string,
  userMetricsSummary: string,
  recentLogsSummary: string
): Promise<CoachResponse> {
  if (!isGroqConfigured()) {
    // Return smart offline fallback
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(localNlpParse(userMessage));
      }, 800); // Simulate network lag
    });
  }

  try {
    const systemPrompt = `You are a premium AI Nutritionist and Fitness Coach named "Caloriq Coach".
Your objective is to converse with the user, provide actionable dietary recommendations, and automatically log food items if the user describes what they ate.

USER PROFILE METRICS:
${userMetricsSummary}

RECENT FOOD LOGS:
${recentLogsSummary}

IMPORTANT TECHNICAL CAPABILITY:
1. If the user describes a meal they ate (e.g. "I had 2 boiled eggs and a banana for breakfast"), you MUST identify the foods, calculate their nutritional content, and provide structured details so the app can automatically add them to the database.
2. If the user describes a workout or active movement (e.g. "I walked 10000 steps today" or "I burned 350 kcal running"), you MUST identify the steps or calories burned and output them in the "exercise" object.

Provide your response strictly in the following JSON format. Do not add markdown wrapping or formatting except a valid stringified JSON:
{
  "reply": "Your conversational response here. Keep it brief, supportive, and informative. This is the text displayed as the AI explanation of the meal in their logs.",
  "foods": [
    {
      "name": "Food name (be clean, e.g. Boiled Egg)",
      "calories": 78,
      "protein": 6,
      "carbs": 0.6,
      "fat": 5,
      "quantity": 2,
      "mealType": "breakfast" // Must be one of: 'breakfast', 'lunch', 'dinner', 'snacks'
    }
  ],
  "exercise": {
    "steps": 10000,          // Integer steps walked, if described
    "caloriesBurned": 350    // Integer calories burned during exercise, if described
  }
}

If the user is NOT logging food, but rather asking a general health or diet question, do NOT include the "foods" or "exercise" arrays/objects in the JSON response, only the "reply".`;

    let response;
    const modelsToTry = [
      'llama-3.3-70b-versatile',
      'llama-3.1-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768'
    ];
    
    let lastError: any = null;
    for (const model of modelsToTry) {
      try {
        response = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            timeout: 5000
          }
        );
        if (response.data.choices?.[0]?.message?.content) {
          break; // Success!
        }
      } catch (err) {
        lastError = err;
        console.warn(`Failed to call Groq model ${model}, trying next...`, err);
      }
    }

    if (!response || !response.data.choices?.[0]?.message?.content) {
      throw lastError || new Error('All Groq models failed.');
    }

    const jsonText = response.data.choices[0].message.content;
    const parsedData = JSON.parse(cleanJson(jsonText));

    return {
      reply: parsedData.reply || "I've processed your request.",
      foods: parsedData.foods || undefined,
      exercise: parsedData.exercise || undefined,
      isDemo: false,
    };
  } catch (error: any) {
    console.error('Error calling Groq API:', error);
    const isAuthError = error?.response?.status === 401 || error?.response?.status === 403;
    const fallback = localNlpParse(userMessage);
    if (isAuthError) {
      fallback.reply = `[Error]: Groq API Key is unauthorized or invalid (Error 401/403). Please verify your key.`;
    } else {
      fallback.reply = `[Error]: Failed to connect to Groq API. Please check your internet connection or model availability.`;
    }
    return fallback;
  }
}

export async function analyzeFoodImage(
  base64Image: string,
  mealType: ParsedFood['mealType']
): Promise<CoachResponse> {
  if (!isGroqConfigured()) {
    // Mock vision analysis response
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          reply: `[Demo AI Mode] Image analysis complete! I identified a grilled chicken salad bowl in your photo. I've logged it to your ${mealType}.`,
          foods: [
            {
              name: 'Grilled Chicken Salad Bowl (Demo Image)',
              calories: 320,
              protein: 28,
              carbs: 12,
              fat: 16,
              quantity: 1,
              mealType,
            },
          ],
          isDemo: true,
        });
      }, 1500);
    });
  }

  try {
    const systemPrompt = `You are the Caloriq Image Recognition API. Identify the food in the image, estimate the serving sizes, and output their calorie and macro counts.
Provide your response strictly in the following JSON format:
{
  "reply": "A brief analysis of what food was identified in the image.",
  "foods": [
    {
      "name": "Identified Food Item",
      "calories": 250,
      "protein": 15,
      "carbs": 25,
      "fat": 10,
      "quantity": 1,
      "mealType": "${mealType}"
    }
  ]
}`;

    let response;
    const visionModelsToTry = [
      'llama-3.2-11b-vision-preview',
      'llama-3.2-90b-vision-preview'
    ];
    
    let lastError: any = null;
    for (const model of visionModelsToTry) {
      try {
        response = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              {
                role: 'user',
                content: [
                  { type: 'text', text: 'Analyze this food image and output the results.' },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:image/jpeg;base64,${base64Image}`
                    }
                  }
                ]
              }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            timeout: 8500
          }
        );
        if (response.data.choices?.[0]?.message?.content) {
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`Failed to call Groq Vision model ${model}, trying next...`, err);
      }
    }

    if (!response || !response.data.choices?.[0]?.message?.content) {
      throw lastError || new Error('All Groq vision models failed.');
    }

    const jsonText = response.data.choices[0].message.content;
    const parsedData = JSON.parse(cleanJson(jsonText));

    return {
      reply: parsedData.reply || "I identified food in the image.",
      foods: parsedData.foods || undefined,
      isDemo: false,
    };
  } catch (error: any) {
    console.error('Error calling Groq Vision API:', error);
    const isAuthError = error?.response?.status === 401 || error?.response?.status === 403;
    if (isAuthError) {
      return {
        reply: "[Error]: Groq API Key is unauthorized or invalid (Error 401/403) for image scanning.",
        isDemo: true,
      };
    }
    return {
      reply: "I encountered an error trying to connect to the Groq AI vision service. Please make sure you are online.",
      isDemo: true,
    };
  }
}
