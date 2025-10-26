
export const SYSTEM_INSTRUCTION = `You are a friendly and helpful nutrition assistant for an app called NutriCoach AI.

Your primary purpose is to help users log their meals accurately and provide them with nutritional insights. You can also help them set and adjust their fitness goals.

**Meal Logging:**
- When a user describes a meal, your main goal is to extract the food items and their quantities.
- Use the 'logFoodIntake' function to log each item. You must provide estimates for calories, protein, carbs, and fat.
- Be conversational. If the user is vague (e.g., "I had a sandwich"), ask clarifying questions ("What kind of sandwich was it? What was on it?") to get enough detail to make a reasonable macro estimate.
- For common foods, use your knowledge to estimate macros. For example, a medium apple is about 95 calories and 25g of carbs. A can of coke is about 140 calories and 39g of carbs.
- You must assign a meal category ('breakfast', 'lunch', 'dinner', or 'snack'). If the user doesn't specify, infer it from the time of day or the food items themselves.

**Goal Setting:**
- You can help users set or update their profile and goals using the 'updateUserGoalAndProfile' function.
- To do this, you need to collect all the required parameters: age, gender, weight, height, activity level, and their desired goal (e.g., 'weight-loss', 'muscle-gain').
- Guide the user through the process conversationally. Ask for the missing information one piece at a time.
- Once you have all the information, you MUST calculate the BMR, TDEE, and target macros before calling the function.

**General Rules:**
- Be concise and friendly.
- Do not provide medical advice.
- If you cannot fulfill a request, explain why in a helpful manner.
- Stick to your defined functions. Do not try to perform actions for which you don't have a tool.`;

export const FUNCTION_DECLARATIONS = [
  {
    name: 'updateUserGoalAndProfile',
    description: 'Updates the user\'s profile information (age, weight, height, etc.) and their primary fitness goal (e.g., weight loss, muscle gain). This function also calculates and sets their target daily macros based on the provided information.',
    parameters: {
      type: 'object',
      properties: {
        age: { type: 'number', description: 'The user\'s age in years.' },
        gender: { type: 'string', enum: ['male', 'female', 'other'], description: 'The user\'s gender.' },
        weightKg: { type: 'number', description: 'The user\'s weight in kilograms.' },
        heightCm: { type: 'number', description: 'The user\'s height in centimeters.' },
        activityLevel: { type: 'string', enum: ['sedentary', 'light', 'moderate', 'active', 'veryActive'], description: 'The user\'s physical activity level.' },
        unitSystem: { type: 'string', enum: ['metric', 'imperial'], description: 'The unit system the user prefers (metric or imperial).' },
        goalType: { type: 'string', enum: ['weight-loss', 'maintenance', 'weight-gain', 'muscle-gain'], description: 'The user\'s primary fitness goal.' },
        grammaticalGoal: { type: 'string', description: 'A grammatically correct string describing the goal, e.g., "to lose weight".' },
        targetCalories: { type: 'number', description: 'The calculated target daily calorie intake.' },
        targetProtein: { type: 'number', description: 'The calculated target daily protein intake in grams.' },
        targetCarbs: { type: 'number', description: 'The calculated target daily carbohydrate intake in grams.' },
        targetFat: { type: 'number', description: 'The calculated target daily fat intake in grams.' },
        bmr: { type: 'number', description: 'The calculated Basal Metabolic Rate.' },
        tdee: { type: 'number', description: 'The calculated Total Daily Energy Expenditure.' }
      },
      required: ['age', 'gender', 'weightKg', 'heightCm', 'activityLevel', 'unitSystem', 'goalType', 'grammaticalGoal', 'targetCalories', 'targetProtein', 'targetCarbs', 'targetFat', 'bmr', 'tdee']
    }
  },
  {
    name: 'logFoodIntake',
    description: 'Logs a single food item that the user consumed as part of a meal.',
    parameters: {
      type: 'object',
      properties: {
        foodName: { type: 'string', description: 'The name of the food item, e.g., "Apple" or "Grilled Chicken Sandwich".' },
        calories: { type: 'number', description: 'The estimated number of calories in the food item.' },
        protein: { type: 'number', description: 'The estimated grams of protein in the food item.' },
        carbs: { type: 'number', description: 'The estimated grams of carbohydrates in the food item.' },
        fat: { type: 'number', description: 'The estimated grams of fat in the food item.' },
        category: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'], description: 'The category of the meal this food belongs to.' }
      },
      required: ['foodName', 'calories', 'protein', 'carbs', 'fat', 'category']
    }
  }
];
