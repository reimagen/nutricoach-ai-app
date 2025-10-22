# **App Name**: NutriCoach AI

## Core Features:

- Voice Meal Logging: Log meals via voice using Google Speech-to-Text, converting speech to text, identifying food items, and estimating macros.
- Photo Meal Logging (OCR): Log meals by taking a photo, using Google Vision to identify food items and estimate macros.
- AI Macro Estimation Tool: Employ an LLM-based tool parser to estimate macros, utilizing portion heuristics and learning user preferences over time.
- Profile and Target Setting: Allow users to create profiles with optional details (weight, height, goal) to auto-calculate personalized macro targets.
- Nutrition Education Program: Deliver a 30-day nutrition education program via voice or text, providing micro-lessons to enhance user knowledge and habit formation.
- Data Persistence: Data storage to a Firestore database with meal entries and the computed totals
- Push Notifications: Implement daily reminders, insights, and educational content, sent via push notifications to keep users engaged.

## Style Guidelines:

- Primary color: Forest green (#228B22), evoking health and growth.
- Background color: Light beige (#F5F5DC), provides a clean and natural backdrop.
- Accent color: Sunset orange (#FFA500), used for call-to-action buttons and highlights to grab attention.
- Headline font: 'Belleza' (sans-serif) for headings, creating a stylish and personable feel. Body font: 'Alegreya' (serif) for body text.
- Code font: 'Source Code Pro' for displaying code snippets or technical information related to food composition.
- Employ clear and modern icons that represent food categories and app functions, enhancing usability.
- Implement smooth transitions and subtle animations when logging meals and viewing progress, creating a seamless user experience.