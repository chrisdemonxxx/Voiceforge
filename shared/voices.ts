// Voice Library for Indic Parler TTS
// Shared between backend and frontend

export interface Voice {
  id: string;
  name: string;
  language: string;
  gender: "male" | "female";
  description: string;
  prompt: string; // Natural language description for the model
}

export const VOICE_LIBRARY: Voice[] = [
  // Hindi Voices
  { id: "hindi-aditi-f", name: "Aditi", language: "Hindi", gender: "female", description: "Clear and expressive female voice", prompt: "Aditi speaks in a clear and expressive voice" },
  { id: "hindi-rahul-m", name: "Rahul", language: "Hindi", gender: "male", description: "Professional male voice", prompt: "Rahul speaks in a professional and confident tone" },
  { id: "hindi-priya-f", name: "Priya", language: "Hindi", gender: "female", description: "Warm and friendly female voice", prompt: "Priya speaks in a warm and friendly manner" },
  { id: "hindi-vikram-m", name: "Vikram", language: "Hindi", gender: "male", description: "Deep and authoritative male voice", prompt: "Vikram speaks with a deep and authoritative voice" },
  
  // Tamil Voices
  { id: "tamil-lakshmi-f", name: "Lakshmi", language: "Tamil", gender: "female", description: "Melodious female voice", prompt: "Lakshmi speaks in a melodious and pleasant voice" },
  { id: "tamil-kumar-m", name: "Kumar", language: "Tamil", gender: "male", description: "Strong male voice", prompt: "Kumar speaks with a strong and clear voice" },
  { id: "tamil-meena-f", name: "Meena", language: "Tamil", gender: "female", description: "Soft and gentle female voice", prompt: "Meena speaks in a soft and gentle manner" },
  
  // Telugu Voices
  { id: "telugu-anjali-f", name: "Anjali", language: "Telugu", gender: "female", description: "Bright and cheerful female voice", prompt: "Anjali speaks in a bright and cheerful tone" },
  { id: "telugu-ravi-m", name: "Ravi", language: "Telugu", gender: "male", description: "Confident male voice", prompt: "Ravi speaks with confidence and clarity" },
  { id: "telugu-sita-f", name: "Sita", language: "Telugu", gender: "female", description: "Calm and soothing female voice", prompt: "Sita speaks in a calm and soothing voice" },
  
  // Malayalam Voices
  { id: "malayalam-maya-f", name: "Maya", language: "Malayalam", gender: "female", description: "Elegant female voice", prompt: "Maya speaks in an elegant and refined manner" },
  { id: "malayalam-suresh-m", name: "Suresh", language: "Malayalam", gender: "male", description: "Warm male voice", prompt: "Suresh speaks with a warm and welcoming voice" },
  { id: "malayalam-divya-f", name: "Divya", language: "Malayalam", gender: "female", description: "Sweet and pleasant female voice", prompt: "Divya speaks in a sweet and pleasant tone" },
  
  // Bengali Voices
  { id: "bengali-riya-f", name: "Riya", language: "Bengali", gender: "female", description: "Expressive female voice", prompt: "Riya speaks in an expressive and emotional voice" },
  { id: "bengali-amit-m", name: "Amit", language: "Bengali", gender: "male", description: "Distinguished male voice", prompt: "Amit speaks with a distinguished and mature voice" },
  { id: "bengali-puja-f", name: "Puja", language: "Bengali", gender: "female", description: "Lively and energetic female voice", prompt: "Puja speaks in a lively and energetic manner" },
  
  // Urdu Voices
  { id: "urdu-zara-f", name: "Zara", language: "Urdu", gender: "female", description: "Poetic female voice", prompt: "Zara speaks in a poetic and graceful voice" },
  { id: "urdu-hassan-m", name: "Hassan", language: "Urdu", gender: "male", description: "Eloquent male voice", prompt: "Hassan speaks with eloquence and sophistication" },
  { id: "urdu-aisha-f", name: "Aisha", language: "Urdu", gender: "female", description: "Refined female voice", prompt: "Aisha speaks in a refined and cultured manner" },
  
  // Additional languages...
  // Kannada
  { id: "kannada-deepa-f", name: "Deepa", language: "Kannada", gender: "female", description: "Melodious female voice", prompt: "Deepa speaks in a melodious Kannada voice" },
  { id: "kannada-kiran-m", name: "Kiran", language: "Kannada", gender: "male", description: "Clear male voice", prompt: "Kiran speaks with clarity in Kannada" },
  
  // Marathi
  { id: "marathi-sneha-f", name: "Sneha", language: "Marathi", gender: "female", description: "Sweet female voice", prompt: "Sneha speaks in a sweet Marathi voice" },
  { id: "marathi-rohit-m", name: "Rohit", language: "Marathi", gender: "male", description: "Confident male voice", prompt: "Rohit speaks confidently in Marathi" },
  
  // Gujarati
  { id: "gujarati-rupa-f", name: "Rupa", language: "Gujarati", gender: "female", description: "Warm female voice", prompt: "Rupa speaks warmly in Gujarati" },
  { id: "gujarati-jay-m", name: "Jay", language: "Gujarati", gender: "male", description: "Professional male voice", prompt: "Jay speaks professionally in Gujarati" },
  
  // Punjabi
  { id: "punjabi-simran-f", name: "Simran", language: "Punjabi", gender: "female", description: "Cheerful female voice", prompt: "Simran speaks cheerfully in Punjabi" },
  { id: "punjabi-jaspal-m", name: "Jaspal", language: "Punjabi", gender: "male", description: "Strong male voice", prompt: "Jaspal speaks with strength in Punjabi" },
];
