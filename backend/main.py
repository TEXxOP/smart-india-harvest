from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from pydantic import BaseModel
from PIL import Image
import io
import os
import json
import math
import tempfile
import torch
import httpx
import joblib
import numpy as np
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from typing import Optional, List
from datetime import datetime, timedelta
import random
import re

load_dotenv()

from database import create_db_and_tables, get_session
from models import FarmProfile

# Keys will be fetched dynamically inside endpoints to ensure env vars are picked up

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load ViT model at startup ──
print("Loading crop disease model...")
from transformers import ViTImageProcessor, ViTForImageClassification

try:
    processor = ViTImageProcessor.from_pretrained('wambugu71/crop_leaf_diseases_vit')
    model = ViTForImageClassification.from_pretrained(
        'wambugu71/crop_leaf_diseases_vit',
        ignore_mismatched_sizes=True
    )
    model.eval()
    print(f"Disease model loaded! {len(model.config.id2label)} disease classes available.")
except Exception as e:
    print(f"Disease model loading failed: {e}")
    model = None

# ── Load ML .pkl models ──
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

print("Loading crop recommendation model (RandomForest)...")
try:
    crop_recommender = joblib.load(os.path.join(BASE_DIR, "RandomForest.pkl"))
    print("Crop recommender loaded successfully.")
except Exception as e:
    print(f"Crop recommender loading failed: {e}")
    crop_recommender = None

print("Loading crop yield prediction model...")
try:
    yield_predictor = joblib.load(os.path.join(BASE_DIR, "crop_yield_model.pkl"))
    print("Yield predictor loaded successfully.")
except Exception as e:
    print(f"Yield predictor loading failed: {e}")
    yield_predictor = None

# ── Soil type → NPK, pH lookup (agronomic reference values) ──
SOIL_PROFILES = {
    "Alluvial":   {"N": 80, "P": 40, "K": 45, "ph": 7.0},
    "Black":      {"N": 55, "P": 25, "K": 60, "ph": 7.8},
    "Red":        {"N": 40, "P": 20, "K": 30, "ph": 6.0},
    "Laterite":   {"N": 35, "P": 15, "K": 25, "ph": 5.5},
    "Sandy":      {"N": 25, "P": 10, "K": 15, "ph": 6.5},
    "Clay":       {"N": 70, "P": 35, "K": 55, "ph": 7.5},
    "Loamy":      {"N": 75, "P": 42, "K": 50, "ph": 6.8},
    "Saline":     {"N": 30, "P": 12, "K": 20, "ph": 8.5},
}

# ── State encoding map (must match training data) ──
STATE_ENCODING = {
    "Andhra Pradesh": 0, "Assam": 1, "Bihar": 2, "Chhattisgarh": 3,
    "Gujarat": 4, "Haryana": 5, "Himachal Pradesh": 6, "Jharkhand": 7,
    "Karnataka": 8, "Kerala": 9, "Madhya Pradesh": 10, "Maharashtra": 11,
    "Manipur": 12, "Meghalaya": 13, "Nagaland": 14, "Odisha": 15,
    "Punjab": 16, "Rajasthan": 17, "Tamil Nadu": 18, "Telangana": 19,
    "Tripura": 20, "Uttar Pradesh": 21, "Uttarakhand": 22, "West Bengal": 23,
}

CROP_ENCODING = {
    "Arecanut": 0, "Arhar/Tur": 1, "Bajra": 2, "Banana": 3, "Barley": 4,
    "Black pepper": 5, "Cardamom": 6, "Cashewnut": 7, "Castor seed": 8,
    "Coconut": 9, "Coriander": 10, "Cotton": 11, "Cowpea": 12,
    "Dry chillies": 13, "Garlic": 14, "Ginger": 15, "Gram": 16,
    "Groundnut": 17, "Guar seed": 18, "Horse-gram": 19, "Jowar": 20,
    "Jute": 21, "Khesari": 22, "Linseed": 23, "Maize": 24,
    "Masoor": 25, "Mesta": 26, "Moong": 27, "Moth": 28,
    "Niger seed": 29, "Oilseeds total": 30, "Onion": 31, "Other Rabi pulses": 32,
    "Peas & beans": 33, "Potato": 34, "Ragi": 35, "Rapeseed & Mustard": 36,
    "Rice": 37, "Safflower": 38, "Sannhamp": 39, "Sesamum": 40,
    "Small millets": 41, "Soyabean": 42, "Sugarcane": 43, "Sunflower": 44,
    "Sweet potato": 45, "Tapioca": 46, "Tobacco": 47, "Turmeric": 48,
    "Urad": 49, "Wheat": 50,
}

# ── Crop coefficients (Kc) for ET₀-based irrigation ──
CROP_KC = {
    "Wheat": {"initial": 0.7, "mid": 1.15, "late": 0.4},
    "Rice": {"initial": 1.05, "mid": 1.2, "late": 0.9},
    "Maize": {"initial": 0.7, "mid": 1.2, "late": 0.6},
    "Cotton": {"initial": 0.45, "mid": 1.15, "late": 0.7},
    "Sugarcane": {"initial": 0.4, "mid": 1.25, "late": 0.75},
    "Potato": {"initial": 0.5, "mid": 1.15, "late": 0.75},
    "Soyabean": {"initial": 0.5, "mid": 1.15, "late": 0.5},
    "Groundnut": {"initial": 0.5, "mid": 1.05, "late": 0.6},
    "Mustard": {"initial": 0.35, "mid": 1.15, "late": 0.35},
    "Bajra": {"initial": 0.35, "mid": 1.0, "late": 0.3},
    "Jowar": {"initial": 0.35, "mid": 1.1, "late": 0.55},
}
DEFAULT_KC = {"initial": 0.5, "mid": 1.1, "late": 0.5}


@app.get("/")
def read_root():
    return {"message": "Smart India Harvest — FastAPI Backend"}


@app.get("/api/health")
def health_check():
    return {"status": "ok", "model_loaded": model is not None}


# ── Database Endpoints ──

@app.post("/api/onboarding")
def create_farm_profile(profile: FarmProfile, session: Session = Depends(get_session)):
    """Saves user's farm details during onboarding."""
    existing = session.exec(select(FarmProfile).where(FarmProfile.user_id == profile.user_id)).first()
    if existing:
        # Update existing
        existing.land_size = profile.land_size
        existing.land_unit = profile.land_unit
        existing.soil_type = profile.soil_type
        existing.previous_crop = profile.previous_crop
        existing.current_status = profile.current_status
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return {"success": True, "profile": existing}
    
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return {"success": True, "profile": profile}

@app.get("/api/farm-profile/{user_id}")
def get_farm_profile(user_id: str, session: Session = Depends(get_session)):
    profile = session.exec(select(FarmProfile).where(FarmProfile.user_id == user_id)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


# ── AI Endpoints ──

@app.post("/api/detect-disease")
async def detect_disease(file: UploadFile = File(...)):
    """
    Accepts a crop leaf image and returns disease prediction.
    Uses ViT (Vision Transformer) model from HuggingFace.
    """
    if model is None:
        return {"success": False, "error": "Model not loaded correctly"}

    try:
        # Read and open image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")

        # Run inference
        inputs = processor(images=image, return_tensors="pt")
        with torch.no_grad():
            outputs = model(**inputs)

        logits = outputs.logits
        probabilities = torch.nn.functional.softmax(logits, dim=-1)[0]

        # Get top 5 predictions
        top5 = torch.topk(probabilities, min(5, len(probabilities)))
        predictions = []
        for score, idx in zip(top5.values, top5.indices):
            label = model.config.id2label[idx.item()]
            predictions.append({
                "label": label,
                "score": round(score.item(), 4)
            })

        return {
            "success": True,
            "predictions": predictions,
            "top_prediction": predictions[0] if predictions else None,
        }

    except Exception as e:
        print(f"Disease detection error: {e}")
        return {
            "success": False,
            "error": str(e),
            "predictions": [],
        }


@app.get("/api/model-labels")
def get_model_labels():
    """Returns all disease labels the model can identify."""
    if model is None: return {"error": "Model not loaded"}
    return {
        "total_classes": len(model.config.id2label),
        "labels": model.config.id2label,
    }

# ── Translation Endpoints ──

TRANSLATIONS = {
    "en": {
        "app_title": "Smart India Harvest",
        "greeting": "Welcome, Farmer!",
        "good_morning": "Good Morning",
        "good_afternoon": "Good Afternoon",
        "good_evening": "Good Evening",
        "weather_title": "Weather",
        "disease_detection": "Disease Detection",
        "crop_recommendation": "Crop Recommendation",
        "ai_chat": "AI Assistant",
        "profile": "Farm Profile",
        "select_language": "Select Language",
        "camera": "Camera",
        "gallery": "Gallery",
        "analyze": "Analyze",
        "healthy": "Healthy",
        "disease_found": "Disease Detected",
        "confidence": "Confidence",
        "remedy": "Remedy",
        "description": "Description",
        "loading": "Loading...",
        "error": "Error",
        "retry": "Retry",
        "continue": "Continue",
        "login_title": "Welcome Back!",
        "login_subtitle": "Login to your account.",
        "signup_title": "Welcome to Kisan App!",
        "signup_subtitle": "Create an account to get started.",
        "mobile_number": "Mobile Number",
        "password": "Password",
        "full_name": "Full Name",
        "login_button": "Login",
        "signup_button": "Create Account",
        "no_account": "Don't have an account?",
        "have_account": "Already a member?",
        "create_account": "Create Account",
        "login_link": "Login",
        "my_crops": "My Crops",
        "add_crop": "Add Crop",
        "farming_status_query": "How is your farming going in {location}?",
        "farming_status_query_default": "How is your farming going?",
        "crop_management": "Crop Management",
        "agri_advice": "Agricultural Advice",
        "check_from_photo": "Check from Photo",
        "yield_prediction": "Yield Prediction",
        "view_estimated_production": "View estimated production",
        "agri_knowledge": "Agricultural Knowledge",
        "learn_about_farming": "Learn about farming",
        "gov_schemes": "Government Schemes",
        "scheme_info": "Information on farmer schemes",
        "home_tab": "Home",
        "chat_tab": "Chat",
        "profile_tab": "Profile",
        "active_crops": "Active Crops",
        "todays_temp": "Today's Temp",
        "crop_health": "Crop Health",
        "check_weather": "Check today's weather",
        # Weather Screen
        "humidity": "Humidity",
        "wind": "Wind",
        "feels_like": "Feels Like",
        "next_24_hours": "Next 24 Hours",
        "7_day_forecast": "7-Day Forecast",
        "today": "Today",
        "sunrise": "Sunrise",
        "sunset": "Sunset",
        # Fasalein Screen
        "my_farm": "My Farm",
        "soil_type": "Soil Type",
        "current_crop": "Current Crop",
        "maturity_stage": "Maturity Stage",
        "recommendations": "Recommendations",
        "based_on_soil": "Based on your soil and previous crop",
        "learn_more": "Learn More",
        "farm_setup": "Farm Setup",
        "no_farm_details": "You haven't added farm details yet.",
        "setup_farm": "Setup Farm",
        "growing": "Growing",
        "empty_field": "Empty Field",
        # AI Chat Screen
        "chat_title": "Krishi Mitra",
        "chat_subtitle": "AI Agri Assistant",
        "typing": "typing...",
        "thinking": "Thinking...",
        "welcome_chat_title": "Namaste, Farmer! 🙏",
        "welcome_chat_desc": "I am Krishi Mitra — your AI farming assistant.\nAsk me anything about crops, soil, weather, pests, or\ngovernment schemes!",
        "quick_ask": "Quick Ask:",
        "ask_placeholder": "Ask your question...",
        "error_msg": "Sorry, something went wrong. Please try again.",
        "prompt_crop": "Crop Advice",
        "prompt_pest": "Pest Control",
        "prompt_water": "Irrigation",
        "prompt_soil": "Soil Health",
        "success_stories": "Success Stories",
        "share_story": "Share Your Story",
        "read_more": "Read More",
        "story_by": "Story by",
        "name_placeholder": "Your Name",
        "crop_placeholder": "Crop Name",
        "story_placeholder": "Write your success story here...",
        "submit": "Submit",
        "cancel": "Cancel",
        "image_url_placeholder": "Image Link (Optional)",
        "tap_to_speak": "Tap to Speak",
        "listening": "Listening...",
        "processing_voice": "Processing...",
        "voice_error": "Could not understand. Please try again.",
        "voice_ready": "Voice assistant ready",
        "speak_now": "Speak now...",
        # Irrigation
        "smart_irrigation": "Smart Irrigation",
        "irrigation_desc": "AI optimized watering schedules",
        "soil_moisture": "Soil Moisture",
        "water_needed": "Water Needed",
        "liters": "Liters",
        "savings": "Water Savings",
        "best_time": "Best Time to Water",
    },
    "hi": {
        "app_title": "स्मार्ट इंडिया हार्वेस्ट",
        "greeting": "स्वागत है, किसान भाई!",
        "good_morning": "शुभ प्रभात",
        "good_afternoon": "शुभ दोपहर",
        "good_evening": "शुभ संध्या",
        "weather_title": "मौसम",
        "disease_detection": "रोग पहचान",
        "crop_recommendation": "फसल सुझाव",
        "ai_chat": "AI सहायक",
        "profile": "खेत प्रोफाइल",
        "select_language": "भाषा चुनें",
        "camera": "कैमरा",
        "gallery": "गैलरी",
        "analyze": "विश्लेषण करें",
        "healthy": "स्वस्थ",
        "disease_found": "रोग मिला",
        "confidence": "विश्वास",
        "remedy": "उपचार",
        "description": "विवरण",
        "loading": "लोड हो रहा है...",
        "error": "त्रुटि",
        "retry": "पुनः प्रयास करें",
        "continue": "जारी रखें",
        "login_title": "पुनः स्वागत है!",
        "login_subtitle": "अपने खाते में लॉग इन करें।",
        "signup_title": "किसान ऐप में आपका स्वागत है!",
        "signup_subtitle": "अपना खाता बनाकर शुरुआत करें।",
        "mobile_number": "मोबाइल नंबर",
        "password": "पासवर्ड",
        "full_name": "पूरा नाम",
        "login_button": "लॉग इन करें",
        "signup_button": "खाता बनाएं",
        "no_account": "अभी तक खाता नहीं है?",
        "have_account": "पहले से एक सदस्य हैं?",
        "create_account": "खाता बनाएं",
        "login_link": "लॉग इन करें",
        "my_crops": "मेरी फसलें",
        "add_crop": "फसल जोड़ें",
        "farming_status_query": "{location} में आपकी खेती कैसी चल रही है?",
        "farming_status_query_default": "आपकी खेती कैसी चल रही है?",
        "crop_management": "फसल प्रबंधन",
        "agri_advice": "कृषि सलाह",
        "check_from_photo": "फोटो से जांच",
        "yield_prediction": "उपज भविष्यवाणी",
        "view_estimated_production": "अनुमानित उत्पादन देखें",
        "agri_knowledge": "कृषि ज्ञान",
        "learn_about_farming": "खेती के बारे में जानें",
        "gov_schemes": "सरकारी योजनाएं",
        "scheme_info": "किसान योजनाओं की जानकारी",
        "home_tab": "घर",
        "chat_tab": "चैट",
        "profile_tab": "प्रोफ़ाइल",
        "active_crops": "सक्रिय फसलें",
        "todays_temp": "आज का तापमान",
        "crop_health": "फसल स्वास्थ्य",
        "check_weather": "आज का मौसम देखें",
        # Weather Screen
        "humidity": "नमी",
        "wind": "हवा",
        "feels_like": "महसूस",
        "next_24_hours": "अगले 24 घंटे",
        "7_day_forecast": "7-दिन का पूर्वानुमान",
        "today": "आज",
        "sunrise": "सूर्योदय",
        "sunset": "सूर्यास्त",
        # Fasalein Screen
        "my_farm": "मेरा खेत",
        "soil_type": "मिट्टी",
        "current_crop": "वर्तमान फसल",
        "maturity_stage": "पकने की अवस्था",
        "recommendations": "सुझाव",
        "based_on_soil": "आपकी मिट्टी और पिछली फसल के आधार पर",
        "learn_more": "अधिक जानें",
        "farm_setup": "खेत सेटअप",
        "no_farm_details": "आपने अभी तक खेत का विवरण नहीं जोड़ा है।",
        "setup_farm": "खेत सेटअप करें",
        "growing": "फसल खड़ी है",
        "empty_field": "खेत खाली है",
        # AI Chat Screen
        "chat_title": "कृषि मित्र",
        "chat_subtitle": "AI कृषि सहायक",
        "typing": "टाइप कर रहा है...",
        "thinking": "सोच रहा हूँ...",
        "welcome_chat_title": "नमस्ते, किसान जी! 🙏",
        "welcome_chat_desc": "मैं कृषि मित्र हूँ — आपका AI खेती सहायक।\nमुझसे फसल, मिट्टी, मौसम, कीट, या\nसरकारी योजनाओं के बारे में कुछ भी पूछें!",
        "quick_ask": "जल्दी पूछें:",
        "ask_placeholder": "अपना सवाल पूछें...",
        "error_msg": "माफ़ करें, कुछ गलत हो गया। कृपया पुनः प्रयास करें।",
        "prompt_crop": "फसल सलाह",
        "prompt_pest": "कीट नियंत्रण",
        "prompt_water": "सिंचाई",
        "prompt_soil": "मिट्टी",
        "success_stories": "सफलता की कहानियाँ",
        "share_story": "अपनी कहानी साझा करें",
        "read_more": "और पढ़ें",
        "story_by": "कहानी",
        "name_placeholder": "आपका नाम",
        "crop_placeholder": "फसल का नाम",
        "story_placeholder": "अपनी सफलता की कहानी यहाँ लिखें...",
        "submit": "भेजें",
        "cancel": "रद्द करें",
        "image_url_placeholder": "फोटो लिंक (वैकल्पिक)",
        "tap_to_speak": "बोलने के लिए टैप करें",
        "listening": "सुन रहा हूँ...",
        "processing_voice": "प्रोसेस हो रहा है...",
        "voice_error": "समझ नहीं आया। कृपया फिर से बोलें।",
        "voice_ready": "वॉइस सहायक तैयार",
        "speak_now": "अब बोलें...",
        # Irrigation
        "smart_irrigation": "स्मार्ट सिंचाई",
        "irrigation_desc": "AI अनुकूलित सिंचाई कार्यक्रम",
        "soil_moisture": "मिट्टी की नमी",
        "water_needed": "पानी की आवश्यकता",
        "liters": "लीटर",
        "savings": "पानी की बचत",
        "best_time": "सिंचाई का सही समय",
    },
    "pa": {
        "app_title": "ਸਮਾਰਟ ਇੰਡੀਆ ਹਾਰਵੈਸਟ",
        "greeting": "ਜੀ ਆਇਆਂ ਨੂੰ, ਕਿਸਾਨ ਵੀਰੋ!",
        "good_morning": "ਸ਼ੁਭ ਸਵੇਰ",
        "good_afternoon": "ਸ਼ੁਭ ਦੁਪਹਿਰ",
        "good_evening": "ਸ਼ੁਭ ਸ਼ਾਮ",
        "weather_title": "ਮੌਸਮ",
        "disease_detection": "ਰੋਗ ਪਛਾਣ",
        "crop_recommendation": "ਫਸਲ ਸਿਫਾਰਸ਼",
        "ai_chat": "AI ਸਹਾਇਕ",
        "profile": "ਖੇਤ ਪ੍ਰੋਫਾਈਲ",
        "select_language": "ਭਾਸ਼ਾ ਚੁਣੋ",
        "camera": "ਕੈਮਰਾ",
        "gallery": "ਗੈਲਰੀ",
        "analyze": "ਵਿਸ਼ਲੇਸ਼ਣ ਕਰੋ",
        "healthy": "ਤੰਦਰੁਸਤ",
        "disease_found": "ਰੋਗ ਮਿਲਿਆ",
        "confidence": "ਭਰੋਸਾ",
        "remedy": "ਇਲਾਜ",
        "description": "ਵੇਰਵਾ",
        "loading": "ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...",
        "error": "ਗਲਤੀ",
        "retry": "ਫਿਰ ਕੋਸ਼ਿਸ਼ ਕਰੋ",
        "continue": "ਜਾਰੀ ਰੱਖੋ",
        "login_title": "ਜੀ ਆਇਆਂ ਨੂੰ!",
        "login_subtitle": "ਆਪਣੇ ਖਾਤੇ ਵਿੱਚ ਲੌਗ ਇਨ ਕਰੋ।",
        "signup_title": "ਕਿਸਾਨ ਐਪ ਵਿੱਚ ਸੁਆਗਤ ਹੈ!",
        "signup_subtitle": "ਆਪਣਾ ਖਾਤਾ ਬਣਾ ਕੇ ਸ਼ੁਰੂ ਕਰੋ।",
        "mobile_number": "ਮੋਬਾਈਲ ਨੰਬਰ",
        "password": "ਪਾਸਵਰਡ",
        "full_name": "ਪੂਰਾ ਨਾਮ",
        "login_button": "ਲੌਗ ਇਨ ਕਰੋ",
        "signup_button": "ਖਾਤਾ ਬਣਾਓ",
        "no_account": "ਅਜੇ ਤੱਕ ਖਾਤਾ ਨਹੀਂ ਹੈ?",
        "have_account": "ਪਹਿਲਾਂ ਹੀ ਇੱਕ ਮੈਂਬਰ ਹੋ?",
        "create_account": "ਖਾਤਾ ਬਣਾਓ",
        "login_link": "ਲੌਗ ਇਨ ਕਰੋ",
        "my_crops": "ਮੇਰੀਆਂ ਫਸਲਾਂ",
        "add_crop": "ਫਸਲ ਜੋੜੋ",
        "farming_status_query": "{location} ਵਿੱਚ ਤੁਹਾਡੀ ਖੇਤੀ ਕਿਵੇਂ ਚੱਲ ਰਹੀ ਹੈ?",
        "farming_status_query_default": "ਤੁਹਾਡੀ ਖੇਤੀ ਕਿਵੇਂ ਚੱਲ ਰਹੀ ਹੈ?",
        "crop_management": "ਫਸਲ ਪ੍ਰਬੰਧਨ",
        "agri_advice": "ਖੇਤੀਬਾੜੀ ਸਲਾਹ",
        "check_from_photo": "ਫੋਟੋ ਤੋਂ ਜਾਂਚ",
        "yield_prediction": "ਝਾੜ ਦੀ ਭਵਿੱਖਬਾਣੀ",
        "view_estimated_production": "ਅੰਦਾਜ਼ਨ ਉਤਪਾਦਨ ਵੇਖੋ",
        "agri_knowledge": "ਖੇਤੀਬਾੜੀ ਗਿਆਨ",
        "learn_about_farming": "ਖੇਤੀ ਬਾਰੇ ਜਾਣੋ",
        "gov_schemes": "ਸਰਕਾਰੀ ਸਕੀਮਾਂ",
        "scheme_info": "ਕਿਸਾਨ ਸਕੀਮਾਂ ਬਾਰੇ ਜਾਣਕਾਰੀ",
        "home_tab": "ਘਰ",
        "chat_tab": "ਗੱਲਬਾਤ",
        "profile_tab": "ਪ੍ਰੋਫਾਈਲ",
        "active_crops": "ਸਰਗਰਮ ਫਸਲਾਂ",
        "todays_temp": "ਅੱਜ ਦਾ ਤਾਪਮਾਨ",
        "crop_health": "ਫਸਲ ਸਿਹਤ",
        "check_weather": "ਅੱਜ ਦਾ ਮੌਸਮ ਦੇਖੋ",
        # Weather Screen
        "humidity": "ਨਮੀ",
        "wind": "ਹਵਾ",
        "feels_like": "ਮਹਿਸੂਸ",
        "next_24_hours": "ਅਗਲੇ 24 ਘੰਟੇ",
        "7_day_forecast": "7-ਦਿਨਾਂ ਦੀ ਭਵਿੱਖਬਾਣੀ",
        "today": "ਅੱਜ",
        "sunrise": "ਸੂਰਜ ਚੜ੍ਹਨਾ",
        "sunset": "ਸੂਰਜ ਡੁੱਬਣਾ",
        # Fasalein Screen
        "my_farm": "ਮੇਰਾ ਖੇਤ",
        "soil_type": "ਮਿੱਟੀ",
        "current_crop": "ਮੌਜੂਦਾ ਫਸਲ",
        "maturity_stage": "ਪੱਕਣ ਦੀ ਅਵਸਥਾ",
        "recommendations": "ਸਿਫਾਰਸ਼ਾਂ",
        "based_on_soil": "ਤੁਹਾਡੀ ਮਿੱਟੀ ਅਤੇ ਪਿਛਲੀ ਫਸਲ ਦੇ ਅਧਾਰ ਤੇ",
        "learn_more": "ਹੋਰ ਜਾਣੋ",
        "farm_setup": "ਖੇਤ ਸੈੱਟਅੱਪ",
        "no_farm_details": "ਤੁਸੀਂ ਅਜੇ ਤੱਕ ਖੇਤ ਦੇ ਵੇਰਵੇ ਨਹੀਂ ਸ਼ਾਮਲ ਕੀਤੇ ਹਨ।",
        "setup_farm": "ਖੇਤ ਸੈੱਟਅੱਪ ਕਰੋ",
        "growing": "ਫਸਲ ਖੜ੍ਹੀ ਹੈ",
        "empty_field": "ਖੇਤ ਖਾਲੀ ਹੈ",
        # AI Chat Screen
        "chat_title": "ਕ੍ਰਿਸ਼ੀ ਮਿੱਤਰ",
        "chat_subtitle": "AI ਖੇਤੀ ਸਹਾਇਕ",
        "typing": "ਟਾਈਪ ਕਰ ਰਿਹਾ ਹੈ...",
        "thinking": "ਸੋਚ ਰਿਹਾ ਹਾਂ...",
        "welcome_chat_title": "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਕਿਸਾਨ ਜੀ! 🙏",
        "welcome_chat_desc": "ਮੈਂ ਕ੍ਰਿਸ਼ੀ ਮਿੱਤਰ ਹਾਂ — ਤੁਹਾਡਾ AI ਖੇਤੀ ਸਹਾਇਕ।\nਮੇਰੇ ਤੋਂ ਫਸਲ, ਮਿੱਟੀ, ਮੌਸਮ, ਕੀੜੇ, ਜਾਂ\nਸਰਕਾਰੀ ਸਕੀਮਾਂ ਬਾਰੇ ਕੁਝ ਵੀ ਪੁੱਛੋ!",
        "quick_ask": "ਜਲਦੀ ਪੁੱਛੋ:",
        "ask_placeholder": "ਆਪਣਾ ਸਵਾਲ ਪੁੱਛੋ...",
        "error_msg": "ਮਾਫ ਕਰਨਾ, ਕੁਝ ਗਲਤ ਹੋ ਗਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
        "prompt_crop": "ਫਸਲ ਸਲਾਹ",
        "prompt_pest": "ਕੀੜੇ ਕੰਟਰੋਲ",
        "prompt_water": "ਸਿੰਚਾਈ",
        "prompt_soil": "ਮਿੱਟੀ ਦੀ ਸਿਹਤ",
        "success_stories": "ਸਫਲਤਾ ਦੀਆਂ ਕਹਾਣੀਆਂ",
        "share_story": "ਆਪਣੀ ਕਹਾਣੀ ਸਾਂਝੀ ਕਰੋ",
        "read_more": "ਹੋਰ ਪੜ੍ਹੋ",
        "story_by": "ਕਹਾਣੀ",
        "name_placeholder": "ਤੁਹਾਡਾ ਨਾਮ",
        "crop_placeholder": "ਫਸਲ ਦਾ ਨਾਮ",
        "story_placeholder": "ਆਪਣੀ ਸਫਲਤਾ ਦੀ ਕਹਾਣੀ ਇੱਥੇ ਲਿਖੋ...",
        "submit": "ਭੇਜੋ",
        "cancel": "ਰੱਦ ਕਰੋ",
        "image_url_placeholder": "ਫੋਟੋ ਲਿੰਕ (ਵਿਕਲਪਿਕ)",
        "tap_to_speak": "ਬੋਲਣ ਲਈ ਟੈਪ ਕਰੋ",
        "listening": "ਸੁਣ ਰਿਹਾ ਹਾਂ...",
        "processing_voice": "ਪ੍ਰੋਸੈਸ ਹੋ ਰਿਹਾ ਹੈ...",
        "voice_error": "ਸਮਝ ਨਹੀਂ ਆਇਆ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਬੋਲੋ।",
        "voice_ready": "ਵੋਇਸ ਸਹਾਇਕ ਤਿਆਰ",
        "speak_now": "ਹੁਣ ਬੋਲੋ...",
        # Irrigation
        "smart_irrigation": "ਸਮਾਰਟ ਸਿੰਚਾਈ",
        "irrigation_desc": "AI ਅਨੁਕੂਲਿਤ ਸਿੰਚਾਈ ਪ੍ਰੋਗਰਾਮ",
        "soil_moisture": "ਮਿੱਟੀ ਦੀ ਨਮੀ",
        "water_needed": "ਪਾਣੀ ਦੀ ਲੋੜ",
        "liters": "ਲੀਟਰ",
        "savings": "ਪਾਣੀ ਦੀ ਬੱਚਤ",
        "best_time": "ਸਿੰਚਾਈ ਦਾ ਸਹੀ ਸਮਾਂ",
    }
}

@app.get("/api/translations/{lang_code}")
def get_translations(lang_code: str):
    """Returns UI translations for the specified language."""
    return TRANSLATIONS.get(lang_code, TRANSLATIONS["en"])


# ── Voice Endpoint ──

INTENT_SYSTEM_PROMPT = """You are an intent classifier for an Indian farming app called AgriDSS.
Given the farmer's spoken query (transcribed text), classify the intent and generate a helpful response.

You MUST respond ONLY with valid JSON (no markdown, no extra text) in this format:
{
  "intent": "<INTENT>",
  "navigate_to": "<SCREEN_NAME or null>",
  "response_text": "<helpful response in the SAME language as the query>"
}

Intent categories and their screen mappings:
- WEATHER: Questions about weather, rain, temperature, forecast → navigate_to: "Weather"
- DISEASE_SCAN: Wants to scan/check plant disease from photo → navigate_to: "DiseaseDetection"
- CROP_ADVICE: Questions about what to grow, crop recommendations → navigate_to: "Fasalein"
- GOV_SCHEMES: Questions about government schemes, PM-KISAN, subsidies → navigate_to: "GovSchemes"
- AGRI_KNOWLEDGE: Wants to learn about farming techniques → navigate_to: "AgriKnowledge"
- IRRIGATION: Questions about watering, smart irrigation, water usage, moisture → navigate_to: "IrrigationDashboard"
- ACTION_PLAN: Questions about what to do today, weekly plan, tasks, schedule, action plan → navigate_to: "ActionPlan"
- GENERAL: General farming questions (pest control, soil, irrigation, etc.) → navigate_to: "AIChat"
- NAVIGATE_HOME: Wants to go home → navigate_to: "Home"
- NAVIGATE_PROFILE: Wants to see profile → navigate_to: "Profile"

Rules:
1. response_text MUST be in the SAME language as the input query.
2. For WEATHER queries, give a brief acknowledgment like "Opening weather for you" in the query language.
3. For GENERAL queries, give a full helpful farming answer (2-3 sentences).
4. Keep responses short and farmer-friendly.
5. Use simple language suitable for rural farmers.
"""

LANG_NAMES = {"en": "English", "hi": "Hindi", "pa": "Punjabi"}


@app.post("/api/voice")
async def voice_command(
    file: UploadFile = File(...),
    lang_code: str = Form("hi"),
):
    """
    Receives audio from the mobile app, transcribes via Groq Whisper,
    detects intent via Groq LLM, and returns structured response.
    """
    GROQ_API_KEY = os.getenv("GROQ_API_KEY") or os.getenv("EXPO_PUBLIC_GROQ_API_KEY")
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")

    try:
        # 1. Save uploaded audio to a temp file
        audio_content = await file.read()
        suffix = ".m4a" if file.filename and file.filename.endswith(".m4a") else ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(audio_content)
            tmp_path = tmp.name

        # 2. Transcribe with Groq Whisper
        transcript = ""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                with open(tmp_path, "rb") as audio_file:
                    whisper_response = await client.post(
                        "https://api.groq.com/openai/v1/audio/transcriptions",
                        headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                        data={
                            "model": "whisper-large-v3-turbo",
                            "language": lang_code if lang_code in ["en", "hi", "pa"] else "hi",
                            "response_format": "json",
                            "prompt": "This is a farmer speaking about agriculture, crops, weather, or farming in India.",
                        },
                        files={"file": (f"audio{suffix}", audio_file, f"audio/{suffix.strip('.')}")},
                    )
                if whisper_response.status_code != 200:
                    print(f"Whisper error: {whisper_response.text}")
                    raise HTTPException(status_code=502, detail="Speech transcription failed")

                whisper_data = whisper_response.json()
                transcript = whisper_data.get("text", "").strip()
        finally:
            os.unlink(tmp_path)

        if not transcript:
            return {
                "success": False,
                "error": "Could not understand the audio",
                "transcript": "",
                "intent": None,
                "navigate_to": None,
                "response_text": {
                    "en": "Sorry, I could not understand. Please try again.",
                    "hi": "माफ़ करें, समझ नहीं आया। कृपया फिर से बोलें।",
                    "pa": "ਮਾਫ਼ ਕਰਨਾ, ਸਮਝ ਨਹੀਂ ਆਇਆ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਬੋਲੋ।",
                }.get(lang_code, "Sorry, I could not understand."),
            }

        # 3. Detect intent and generate response via Groq LLM
        async with httpx.AsyncClient(timeout=30.0) as client:
            llm_response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {"role": "system", "content": INTENT_SYSTEM_PROMPT},
                        {"role": "user", "content": f"Language: {LANG_NAMES.get(lang_code, 'Hindi')}\nQuery: {transcript}"},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 512,
                },
            )

            if llm_response.status_code != 200:
                print(f"LLM error: {llm_response.text}")
                # Fallback: route everything to chat
                return {
                    "success": True,
                    "transcript": transcript,
                    "intent": "GENERAL",
                    "navigate_to": "AIChat",
                    "response_text": transcript,
                }

            llm_data = llm_response.json()
            raw_reply = llm_data.get("choices", [{}])[0].get("message", {}).get("content", "{}")

            # Parse the JSON response
            try:
                parsed = json.loads(raw_reply)
            except json.JSONDecodeError:
                # Try to extract JSON from the response
                import re
                json_match = re.search(r'\{.*\}', raw_reply, re.DOTALL)
                if json_match:
                    parsed = json.loads(json_match.group())
                else:
                    parsed = {
                        "intent": "GENERAL",
                        "navigate_to": "AIChat",
                        "response_text": transcript,
                    }

        return {
            "success": True,
            "transcript": transcript,
            "intent": parsed.get("intent", "GENERAL"),
            "navigate_to": parsed.get("navigate_to", "AIChat"),
            "response_text": parsed.get("response_text", transcript),
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Voice endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Helper: Reverse Geocode lat/lon → Indian State ──

# Approximate bounding boxes for Indian states (lat_min, lat_max, lon_min, lon_max)
STATE_BOUNDS = [
    ("Punjab", 29.5, 32.5, 73.8, 76.9),
    ("Haryana", 27.6, 30.9, 74.5, 77.6),
    ("Uttar Pradesh", 23.8, 30.5, 77.0, 84.7),
    ("Bihar", 24.3, 27.5, 83.3, 88.2),
    ("West Bengal", 21.5, 27.2, 86.0, 89.9),
    ("Rajasthan", 23.0, 30.2, 69.5, 78.2),
    ("Gujarat", 20.1, 24.7, 68.2, 74.5),
    ("Maharashtra", 15.6, 22.0, 72.6, 80.9),
    ("Madhya Pradesh", 21.0, 26.9, 74.0, 82.8),
    ("Karnataka", 11.5, 18.5, 74.0, 78.6),
    ("Tamil Nadu", 8.0, 13.6, 76.2, 80.4),
    ("Kerala", 8.2, 12.8, 74.8, 77.4),
    ("Andhra Pradesh", 12.6, 19.9, 76.8, 84.8),
    ("Telangana", 15.8, 19.9, 77.2, 81.3),
    ("Odisha", 17.8, 22.6, 81.3, 87.5),
    ("Chhattisgarh", 17.8, 24.1, 80.2, 84.4),
    ("Jharkhand", 21.9, 25.3, 83.3, 87.9),
    ("Assam", 24.1, 28.0, 89.7, 96.0),
    ("Himachal Pradesh", 30.4, 33.3, 75.6, 79.0),
    ("Uttarakhand", 28.7, 31.5, 77.5, 81.0),
    ("Tripura", 22.9, 24.5, 91.1, 92.3),
    ("Meghalaya", 25.0, 26.1, 89.8, 92.8),
    ("Manipur", 23.8, 25.7, 93.0, 94.8),
    ("Nagaland", 25.2, 27.0, 93.3, 95.2),
]

def get_state_from_coords(lat: float, lon: float) -> str:
    """Simple reverse geocode: lat/lon → Indian state name."""
    best = None
    best_dist = float('inf')
    for name, lat_min, lat_max, lon_min, lon_max in STATE_BOUNDS:
        if lat_min <= lat <= lat_max and lon_min <= lon <= lon_max:
            return name
        # Track closest state as fallback
        clat = (lat_min + lat_max) / 2
        clon = (lon_min + lon_max) / 2
        dist = (lat - clat) ** 2 + (lon - clon) ** 2
        if dist < best_dist:
            best_dist = dist
            best = name
    return best or "Uttar Pradesh"

def get_current_season() -> str:
    """Returns Indian agricultural season based on current month."""
    month = datetime.now().month
    if month in [6, 7, 8, 9, 10]:
        return "Kharif (Monsoon)"
    elif month in [10, 11, 12, 1, 2, 3]:
        return "Rabi (Winter)"
    else:
        return "Zaid (Summer)"


# Groq LLM helper used across multiple endpoints
async def call_groq_llm(prompt: str, system: str = "", max_tokens: int = 500, temperature: float = 0.3) -> str:
    """Calls Groq LLM and returns raw response text."""
    GROQ_API_KEY = os.getenv("GROQ_API_KEY") or os.getenv("EXPO_PUBLIC_GROQ_API_KEY")
    if not GROQ_API_KEY:
        return ""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
        )
        if resp.status_code == 200:
            return resp.json()["choices"][0]["message"]["content"].strip()
    return ""

def parse_json_response(raw: str):
    """Safely parse JSON from LLM response, handling markdown wrapping."""
    import re
    raw = raw.strip()
    # Remove markdown code blocks
    raw = re.sub(r'^```(?:json)?\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Try to find JSON object or array
        m = re.search(r'[\[{].*[\]}]', raw, re.DOTALL)
        if m:
            return json.loads(m.group())
    return None


# ═══════════════════════════════════════════════════════════════
# ██  CROP RECOMMENDATION (Groq LLM — Context-Aware)          ██
# ═══════════════════════════════════════════════════════════════

class CropRecommendationRequest(BaseModel):
    soil_type: str = "Alluvial"
    previous_crop: Optional[str] = None
    latitude: float = 28.6
    longitude: float = 77.2
    state: Optional[str] = None
    lang_code: str = "en"


@app.post("/api/crop-recommendation")
async def crop_recommendation(req: CropRecommendationRequest):
    """
    Context-aware crop recommendation using Groq LLM.
    Auto-fetches: weather (Open-Meteo), state (reverse geocode), season (date).
    Considers: soil type, NPK, pH, previous crop, weather, season, region, market demand.
    """
    # 1. Auto-fetch context
    state = req.state or get_state_from_coords(req.latitude, req.longitude)
    season = get_current_season()
    soil = SOIL_PROFILES.get(req.soil_type, SOIL_PROFILES["Alluvial"])

    # 2. Fetch live weather
    try:
        weather = await fetch_open_meteo_weather(req.latitude, req.longitude)
        temperature = weather["current"]["temperature_2m"]
        humidity = weather["current"]["relative_humidity_2m"]
        rainfall = sum(weather["daily"]["precipitation_sum"][:7]) if weather["daily"].get("precipitation_sum") else 50.0
        rain_forecast = weather["daily"].get("precipitation_probability_max", [0]*7)[:7]
    except Exception as e:
        print(f"Weather fetch failed: {e}")
        temperature = 25.0
        humidity = 65.0
        rainfall = 50.0
        rain_forecast = [20] * 7

    # 3. Build context-aware prompt
    system_prompt = """You are an expert Indian agricultural scientist and crop advisor.
You have deep knowledge of Indian agriculture including:
- Crop-soil compatibility for all Indian soil types
- Seasonal crop calendars (Kharif, Rabi, Zaid)  
- Regional crop traditions and market demand across Indian states
- Crop rotation best practices
- Weather impact on crop selection
- Current market prices and demand trends
- NPK and pH requirements for each crop

You MUST respond ONLY with valid JSON. No markdown, no explanations outside JSON."""

    user_prompt = f"""Recommend the top 5 best crops for this farmer:

FARMER CONTEXT:
- Location: {state}, India (lat: {req.latitude}, lon: {req.longitude})
- Soil Type: {req.soil_type}
- Soil Nutrients: N={soil['N']}, P={soil['P']}, K={soil['K']}, pH={soil['ph']}
- Previous Crop: {req.previous_crop or 'Not specified'}
- Current Season: {season}
- Current Weather: {temperature}°C, {humidity}% humidity
- Recent Rainfall: {rainfall:.1f}mm (last 7 days)
- Rain Forecast: {rain_forecast}

RESPOND in {LANG_NAMES.get(req.lang_code, 'English')}.

Return ONLY this JSON structure:
[
  {{
    "crop": "<crop name in local language + English>",
    "confidence": <number 70-98>,
    "reason": "<1-2 sentence reason considering soil, weather, season, region, and market>",
    "market_demand": "<High/Medium/Low>",
    "estimated_price_per_quintal": <number in INR>,
    "season_match": "<Perfect/Good/Moderate>"
  }}
]

Give exactly 5 crops. Be region-specific (e.g., suggest rice varieties for Punjab, coconut for Kerala)."""

    try:
        raw = await call_groq_llm(user_prompt, system=system_prompt, max_tokens=800)
        parsed = parse_json_response(raw)
        
        if parsed and isinstance(parsed, list) and len(parsed) > 0:
            return {
                "success": True,
                "recommendations": parsed,
                "context": {
                    "state": state,
                    "season": season,
                    "soil_type": req.soil_type,
                    "temperature": temperature,
                    "humidity": humidity,
                    "rainfall": round(rainfall, 1),
                    "previous_crop": req.previous_crop,
                },
            }
    except Exception as e:
        print(f"Groq crop recommendation failed: {e}")

    # Fallback
    return {
        "success": True,
        "recommendations": [
            {"crop": "Wheat (गेहूं)", "confidence": 90, "reason": f"Well-suited for {req.soil_type} soil in {season}.", "market_demand": "High", "estimated_price_per_quintal": 2275, "season_match": "Good"},
            {"crop": "Rice (धान)", "confidence": 85, "reason": "Staple crop with reliable market demand.", "market_demand": "High", "estimated_price_per_quintal": 2183, "season_match": "Good"},
            {"crop": "Mustard (सरसों)", "confidence": 80, "reason": "Low water requirement, good returns.", "market_demand": "Medium", "estimated_price_per_quintal": 5450, "season_match": "Good"},
        ],
        "context": {
            "state": state, "season": season, "soil_type": req.soil_type,
            "temperature": temperature, "humidity": humidity, "rainfall": round(rainfall, 1),
            "previous_crop": req.previous_crop,
        },
    }


# ═══════════════════════════════════════════════════════════════
# ██  MANDI PRICES ENDPOINT (Real-time Market Prices)         ██
# ═══════════════════════════════════════════════════════════════

@app.get("/api/mandi-prices")
async def get_mandi_prices(
    latitude: float = 28.6,
    longitude: float = 77.2,
    state: Optional[str] = None,
    lang_code: str = "en",
):
    """
    Returns real-time mandi (market) prices for crops relevant to the farmer's region.
    Uses Groq LLM with current market knowledge + regional context.
    Auto-detects state from GPS coordinates if not provided.
    """
    if not state:
        state = get_state_from_coords(latitude, longitude)
    
    season = get_current_season()
    today = datetime.now().strftime("%d %B %Y")

    system_prompt = """You are an Indian agricultural market price expert.
You have up-to-date knowledge of commodity prices across Indian mandis (APMC markets).
You know MSP (Minimum Support Price) rates set by the government and typical market prices.

Use these REAL MSP rates for 2024-25 as baseline (actual government rates):
- Wheat: ₹2,275/quintal
- Rice (Common): ₹2,300/quintal  
- Maize: ₹2,090/quintal
- Bajra: ₹2,625/quintal
- Jowar: ₹3,371/quintal
- Groundnut: ₹6,377/quintal
- Soyabean: ₹4,892/quintal
- Cotton (Medium): ₹7,121/quintal
- Sugarcane: ₹315/quintal
- Mustard: ₹5,650/quintal
- Gram: ₹5,440/quintal
- Moong: ₹8,558/quintal
- Urad: ₹6,950/quintal
- Potato: ₹800-1,500/quintal (market)
- Onion: ₹1,000-3,000/quintal (market, volatile)
- Tomato: ₹800-2,500/quintal (market, volatile)

Market prices are typically 5-25% above MSP depending on season and demand.
Respond ONLY with valid JSON. No markdown."""

    user_prompt = f"""Give current mandi prices for the top 10 most traded crops in {state}, India.
Date: {today}, Season: {season}

Return ONLY this JSON:
[
  {{
    "crop": "<crop name>",
    "msp": <MSP in ₹/quintal or null if no MSP>,
    "market_price": <current market price ₹/quintal>,
    "price_trend": "<up/down/stable>",
    "trend_pct": <percentage change as number>,
    "mandi": "<nearest major mandi name in {state}>"
  }}
]

Respond in {LANG_NAMES.get(lang_code, 'English')} for crop names. Give exactly 10 crops.
Use realistic prices based on the MSP baseline and current season demand."""

    try:
        raw = await call_groq_llm(user_prompt, system=system_prompt, max_tokens=800)
        parsed = parse_json_response(raw)

        if parsed and isinstance(parsed, list):
            return {
                "success": True,
                "state": state,
                "date": today,
                "season": season,
                "prices": parsed,
            }
    except Exception as e:
        print(f"Mandi prices fetch failed: {e}")

    # Fallback with known MSP + estimates
    return {
        "success": True,
        "state": state,
        "date": today,
        "season": season,
        "prices": [
            {"crop": "Wheat (गेहूं)", "msp": 2275, "market_price": 2450, "price_trend": "stable", "trend_pct": 2, "mandi": state},
            {"crop": "Rice (धान)", "msp": 2300, "market_price": 2500, "price_trend": "up", "trend_pct": 5, "mandi": state},
            {"crop": "Mustard (सरसों)", "msp": 5650, "market_price": 5900, "price_trend": "up", "trend_pct": 4, "mandi": state},
            {"crop": "Gram (चना)", "msp": 5440, "market_price": 5700, "price_trend": "stable", "trend_pct": 1, "mandi": state},
            {"crop": "Potato (आलू)", "msp": None, "market_price": 1200, "price_trend": "down", "trend_pct": -8, "mandi": state},
        ],
    }


# ═══════════════════════════════════════════════════════════════
# ██  YIELD PREDICTION (ML Model + Auto-Fetch Everything)      ██
# ═══════════════════════════════════════════════════════════════

class YieldPredictionRequest(BaseModel):
    crop: str = "Wheat"
    state: Optional[str] = None  # Auto-detected from GPS if not provided
    latitude: float = 30.9
    longitude: float = 75.8
    soil_ph: Optional[float] = None  # Auto from soil type if not provided
    soil_type: Optional[str] = None  # Used to derive pH
    land_area_hectares: float = 1.0
    lang_code: str = "en"


@app.post("/api/yield-prediction")
async def yield_prediction(req: YieldPredictionRequest):
    """
    Uses the RandomForestRegressor to predict crop yield.
    Auto-fetches: state (GPS), soil pH (soil type), weather (Open-Meteo).
    Falls back to Groq if ML fails.
    """
    GROQ_API_KEY = os.getenv("GROQ_API_KEY") or os.getenv("EXPO_PUBLIC_GROQ_API_KEY")

    # 1. Auto-fetch state from coordinates
    state = req.state or get_state_from_coords(req.latitude, req.longitude)

    # 2. Auto-fetch soil pH from soil type
    soil_ph = req.soil_ph
    if soil_ph is None and req.soil_type:
        soil_ph = SOIL_PROFILES.get(req.soil_type, {}).get("ph", 7.0)
    elif soil_ph is None:
        soil_ph = 7.0

    # 3. Encode state and crop
    state_enc = STATE_ENCODING.get(state)
    if state_enc is None:
        for k, v in STATE_ENCODING.items():
            if k.lower() == state.lower():
                state_enc = v
                break
        if state_enc is None:
            state_enc = 21

    crop_enc = CROP_ENCODING.get(req.crop)
    if crop_enc is None:
        for k, v in CROP_ENCODING.items():
            if k.lower() == req.crop.lower():
                crop_enc = v
                break
        if crop_enc is None:
            crop_enc = 50

    # 4. Fetch live weather
    try:
        weather = await fetch_open_meteo_weather(req.latitude, req.longitude)
        temp_c = weather["current"]["temperature_2m"]
        humidity_pct = weather["current"]["relative_humidity_2m"]
        precip_mm = sum(weather["daily"]["precipitation_sum"][:7]) if weather["daily"].get("precipitation_sum") else 50.0
        sunshine_hours = sum([
            (s / 3600.0) for s in weather["daily"].get("sunshine_duration", [6 * 3600] * 7)[:7]
        ]) / 7.0
    except Exception as e:
        print(f"Weather fetch failed: {e}")
        temp_c, humidity_pct, precip_mm, sunshine_hours = 25.0, 65.0, 50.0, 6.0

    # 5. Try ML model first
    yield_tonnes = None
    ml_used = False
    if yield_predictor is not None:
        try:
            year = datetime.now().year
            features = np.array([[year, state_enc, crop_enc, req.latitude, req.longitude,
                                  soil_ph, temp_c, humidity_pct, precip_mm, sunshine_hours]])
            yield_tonnes = float(yield_predictor.predict(features)[0])
            yield_tonnes = max(round(yield_tonnes, 2), 0.1)
            ml_used = True
        except Exception as e:
            print(f"ML yield prediction failed: {e}")

    # 6. Fallback to Groq if ML fails
    if yield_tonnes is None and GROQ_API_KEY:
        try:
            prompt = f"""Estimate the crop yield for:
- Crop: {req.crop}
- State: {state}, India  
- Weather: {temp_c}°C, {humidity_pct}% humidity, {precip_mm}mm rain
- Soil pH: {soil_ph}
- Season: {get_current_season()}

Return ONLY JSON: {{"yield_per_hectare": <number in tonnes>}}
Use realistic Indian agricultural yield data. No markdown."""
            raw = await call_groq_llm(prompt, max_tokens=100)
            parsed = parse_json_response(raw)
            if parsed:
                yield_tonnes = float(parsed.get("yield_per_hectare", 2.5))
        except Exception:
            yield_tonnes = 2.5  # Safe fallback

    if yield_tonnes is None:
        yield_tonnes = 2.5

    total_production = round(yield_tonnes * req.land_area_hectares, 2)

    # 7. Get advisory from Groq
    advisory = ""
    if GROQ_API_KEY:
        try:
            prompt = f"""Predicted yield for {req.crop} in {state}: {yield_tonnes} tonnes/hectare.
Weather: {temp_c}°C, {humidity_pct}% humidity, {precip_mm}mm precipitation.
Season: {get_current_season()}. Soil pH: {soil_ph}.
Give 2-3 SHORT practical tips to maximize this yield.
Respond in {LANG_NAMES.get(req.lang_code, 'English')}.
Return ONLY JSON: {{"advisory": "your tips as a single paragraph"}}
No markdown."""
            raw = await call_groq_llm(prompt, max_tokens=300)
            parsed = parse_json_response(raw)
            if parsed:
                advisory = parsed.get("advisory", "")
        except Exception as e:
            print(f"Advisory failed: {e}")

    return {
        "success": True,
        "crop": req.crop,
        "state": state,
        "state_auto_detected": req.state is None,
        "yield_per_hectare": yield_tonnes,
        "land_area_hectares": req.land_area_hectares,
        "total_production_tonnes": total_production,
        "model_used": "RandomForestRegressor" if ml_used else "Groq LLM",
        "advisory": advisory or f"Maintain proper irrigation and nutrient management for optimal {req.crop} yield.",
        "weather_snapshot": {
            "temperature": temp_c,
            "humidity": humidity_pct,
            "precipitation_mm": round(precip_mm, 1),
            "sunshine_hours": round(sunshine_hours, 1),
        },
        "auto_fetched": {
            "state": state,
            "soil_ph": soil_ph,
            "season": get_current_season(),
        },
    }


async def fetch_open_meteo_weather(lat: float, lon: float) -> dict:
    """Fetches current + daily weather from Open-Meteo API (free, no key)."""
    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}"
        f"&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code"
        f"&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,sunshine_duration,precipitation_probability_max"
        f"&timezone=auto&forecast_days=7"
    )
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.json()


def compute_et0(temp_max: float, temp_min: float, sunshine_hours: float, lat: float) -> float:
    """
    Simplified Hargreaves ET₀ estimation (mm/day).
    ET₀ = 0.0023 × (T_mean + 17.8) × (T_max - T_min)^0.5 × Ra
    Ra is approximated from latitude.
    """
    t_mean = (temp_max + temp_min) / 2.0
    t_diff = max(temp_max - temp_min, 0.1)
    # Approximate extraterrestrial radiation (Ra) in mm/day equivalent
    lat_rad = abs(lat) * math.pi / 180.0
    ra = 15.0 + 5.0 * math.cos(lat_rad)  # Simplified Ra approximation
    et0 = 0.0023 * (t_mean + 17.8) * math.sqrt(t_diff) * ra
    return round(max(et0, 0.5), 2)


# ═══════════════════════════════════════════════════════════════
# ██  CROP RECOMMENDATION ENDPOINT (RandomForest ML Model)    ██
# ═══════════════════════════════════════════════════════════════

class CropRecommendationRequest(BaseModel):
    soil_type: str = "Alluvial"
    latitude: float = 28.6
    longitude: float = 77.2
    lang_code: str = "en"


@app.post("/api/crop-recommendation")
async def crop_recommendation(req: CropRecommendationRequest):
    """
    Uses the RandomForest MultiOutputClassifier to recommend crops.
    Features: N, P, K, temperature, humidity, ph, rainfall
    Fills soil NPK/pH from lookup, weather from Open-Meteo.
    Uses Groq LLM to generate reasoning text in the user's language.
    """
    GROQ_API_KEY = os.getenv("GROQ_API_KEY") or os.getenv("EXPO_PUBLIC_GROQ_API_KEY")

    if crop_recommender is None:
        raise HTTPException(status_code=500, detail="Crop recommendation model not loaded")

    # 1. Get soil profile
    soil = SOIL_PROFILES.get(req.soil_type, SOIL_PROFILES["Alluvial"])

    # 2. Fetch live weather
    try:
        weather = await fetch_open_meteo_weather(req.latitude, req.longitude)
        temperature = weather["current"]["temperature_2m"]
        humidity = weather["current"]["relative_humidity_2m"]
        # Sum of last 7 days precipitation as rainfall proxy
        rainfall = sum(weather["daily"]["precipitation_sum"][:7]) if weather["daily"].get("precipitation_sum") else 100.0
    except Exception as e:
        print(f"Weather fetch failed, using defaults: {e}")
        temperature = 25.0
        humidity = 65.0
        rainfall = 100.0

    # 3. Build feature vector: [N, P, K, temperature, humidity, ph, rainfall]
    features = np.array([[soil["N"], soil["P"], soil["K"], temperature, humidity, soil["ph"], rainfall]])

    # 4. Predict
    try:
        prediction = crop_recommender.predict(features)
        # MultiOutputClassifier may return multiple outputs
        if hasattr(prediction, 'shape') and len(prediction.shape) > 1:
            predicted_crops = [str(p) for p in prediction[0]]
        else:
            predicted_crops = [str(prediction[0])]

        # Also get probability if available
        try:
            proba = crop_recommender.predict_proba(features)
            # Get top 3 crops with highest probability
            top_crops = []
            if isinstance(proba, list):
                # MultiOutput: take first output's probabilities
                p = proba[0][0]
                classes = crop_recommender.estimators_[0].classes_
                indices = np.argsort(p)[::-1][:5]
                for idx in indices:
                    if p[idx] > 0.01:
                        top_crops.append({"crop": str(classes[idx]), "confidence": round(float(p[idx]) * 100, 1)})
            else:
                # Single output
                p = proba[0]
                classes = crop_recommender.classes_
                indices = np.argsort(p)[::-1][:5]
                for idx in indices:
                    if p[idx] > 0.01:
                        top_crops.append({"crop": str(classes[idx]), "confidence": round(float(p[idx]) * 100, 1)})
        except Exception:
            top_crops = [{"crop": c, "confidence": 85.0} for c in predicted_crops]

    except Exception as e:
        print(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Model prediction failed: {str(e)}")

    # 5. Use Groq LLM for natural-language reasoning
    reasoning = []
    if GROQ_API_KEY and top_crops:
        try:
            crop_list = ", ".join([f"{c['crop']} ({c['confidence']}%)" for c in top_crops[:3]])
            llm_prompt = f"""Based on these conditions:
- Soil: {req.soil_type} (N={soil['N']}, P={soil['P']}, K={soil['K']}, pH={soil['ph']})
- Weather: {temperature}°C, {humidity}% humidity, {rainfall}mm recent rainfall
- Location: lat {req.latitude}, lon {req.longitude}

ML model recommends: {crop_list}

For each of the top 3 crops, give a SHORT one-line reason why it's suitable.
Respond in {LANG_NAMES.get(req.lang_code, 'English')}.
Return ONLY a JSON array: [{{"crop": "name", "reason": "short reason"}}]
No markdown, raw JSON only."""

            async with httpx.AsyncClient(timeout=20.0) as client:
                llm_resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": [{"role": "user", "content": llm_prompt}],
                        "temperature": 0.3, "max_tokens": 400,
                    },
                )
                if llm_resp.status_code == 200:
                    raw = llm_resp.json()["choices"][0]["message"]["content"].strip()
                    try:
                        reasoning = json.loads(raw)
                    except json.JSONDecodeError:
                        import re
                        m = re.search(r'\[.*\]', raw, re.DOTALL)
                        if m:
                            reasoning = json.loads(m.group())
        except Exception as e:
            print(f"LLM reasoning failed (non-critical): {e}")

    # 6. Merge ML confidence with LLM reasoning
    results = []
    for crop_data in top_crops[:5]:
        reason_text = ""
        for r in reasoning:
            if r.get("crop", "").lower() == crop_data["crop"].lower():
                reason_text = r.get("reason", "")
                break
        results.append({
            "crop": crop_data["crop"],
            "confidence": crop_data["confidence"],
            "reason": reason_text or f"Suitable for {req.soil_type} soil in current weather conditions.",
        })

    return {
        "success": True,
        "recommendations": results,
        "input_features": {
            "soil_type": req.soil_type,
            "N": soil["N"], "P": soil["P"], "K": soil["K"], "pH": soil["ph"],
            "temperature": temperature, "humidity": humidity, "rainfall": round(rainfall, 1),
        },
    }


# ═══════════════════════════════════════════════════════════════
# ██  YIELD PREDICTION ENDPOINT (RandomForestRegressor)       ██
# ═══════════════════════════════════════════════════════════════

class YieldPredictionRequest(BaseModel):
    crop: str = "Wheat"
    state: str = "Punjab"
    latitude: float = 30.9
    longitude: float = 75.8
    soil_ph: float = 7.0
    land_area_hectares: float = 1.0
    lang_code: str = "en"


@app.post("/api/yield-prediction")
async def yield_prediction(req: YieldPredictionRequest):
    """
    Uses the RandomForestRegressor to predict crop yield (tonnes/hectare).
    Features: Year, State_Encoded, Crop_Encoded, Latitude, Longitude,
              Soil pH, weather_temp_c, weather_humidity_pct,
              weather_precip_mm, weather_sunshine_hours
    """
    GROQ_API_KEY = os.getenv("GROQ_API_KEY") or os.getenv("EXPO_PUBLIC_GROQ_API_KEY")

    if yield_predictor is None:
        raise HTTPException(status_code=500, detail="Yield prediction model not loaded")

    # 1. Encode state and crop
    state_enc = STATE_ENCODING.get(req.state)
    crop_enc = CROP_ENCODING.get(req.crop)

    # If encoding missing, use Groq to find closest match
    if state_enc is None:
        # Try case-insensitive match
        for k, v in STATE_ENCODING.items():
            if k.lower() == req.state.lower():
                state_enc = v
                break
        if state_enc is None:
            state_enc = 21  # Default: Uttar Pradesh

    if crop_enc is None:
        for k, v in CROP_ENCODING.items():
            if k.lower() == req.crop.lower():
                crop_enc = v
                break
        if crop_enc is None:
            crop_enc = 50  # Default: Wheat

    # 2. Fetch live weather
    try:
        weather = await fetch_open_meteo_weather(req.latitude, req.longitude)
        temp_c = weather["current"]["temperature_2m"]
        humidity_pct = weather["current"]["relative_humidity_2m"]
        precip_mm = sum(weather["daily"]["precipitation_sum"][:7]) if weather["daily"].get("precipitation_sum") else 50.0
        sunshine_hours = sum([
            (s / 3600.0) for s in weather["daily"].get("sunshine_duration", [6 * 3600] * 7)[:7]
        ]) / 7.0  # Average daily sunshine hours
    except Exception as e:
        print(f"Weather fetch failed, using defaults: {e}")
        temp_c = 25.0
        humidity_pct = 65.0
        precip_mm = 50.0
        sunshine_hours = 6.0

    # 3. Build feature vector
    year = datetime.now().year
    features = np.array([[year, state_enc, crop_enc, req.latitude, req.longitude,
                          req.soil_ph, temp_c, humidity_pct, precip_mm, sunshine_hours]])

    # 4. Predict
    try:
        yield_tonnes = float(yield_predictor.predict(features)[0])
        yield_tonnes = max(round(yield_tonnes, 2), 0.1)
        total_production = round(yield_tonnes * req.land_area_hectares, 2)
    except Exception as e:
        print(f"Yield prediction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Model prediction failed: {str(e)}")

    # 5. Use Groq for advisory text
    advisory = ""
    if GROQ_API_KEY:
        try:
            llm_prompt = f"""Predicted yield for {req.crop} in {req.state}: {yield_tonnes} tonnes/hectare.
Weather: {temp_c}°C, {humidity_pct}% humidity, {precip_mm}mm precipitation.
Give 2-3 SHORT practical tips to maximize this yield.
Respond in {LANG_NAMES.get(req.lang_code, 'English')}.
Return ONLY a JSON object: {{"advisory": "your tips as a single paragraph"}}
No markdown."""

            async with httpx.AsyncClient(timeout=20.0) as client:
                llm_resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": [{"role": "user", "content": llm_prompt}],
                        "temperature": 0.3, "max_tokens": 300,
                    },
                )
                if llm_resp.status_code == 200:
                    raw = llm_resp.json()["choices"][0]["message"]["content"].strip()
                    try:
                        advisory = json.loads(raw).get("advisory", "")
                    except json.JSONDecodeError:
                        import re
                        m = re.search(r'\{.*\}', raw, re.DOTALL)
                        if m:
                            advisory = json.loads(m.group()).get("advisory", "")
        except Exception as e:
            print(f"LLM advisory failed (non-critical): {e}")

    return {
        "success": True,
        "crop": req.crop,
        "state": req.state,
        "yield_per_hectare": yield_tonnes,
        "land_area_hectares": req.land_area_hectares,
        "total_production_tonnes": total_production,
        "advisory": advisory or f"Maintain proper irrigation and nutrient management for optimal {req.crop} yield.",
        "weather_snapshot": {
            "temperature": temp_c,
            "humidity": humidity_pct,
            "precipitation_mm": round(precip_mm, 1),
            "sunshine_hours": round(sunshine_hours, 1),
        },
    }


# ═══════════════════════════════════════════════════════════════
# ██  SMART IRRIGATION ENDPOINT (ET₀ Computation + Groq)      ██
# ═══════════════════════════════════════════════════════════════

@app.get("/api/irrigation/dashboard")
async def get_irrigation_dashboard(
    crop: str = "Wheat",
    lang_code: str = "en",
    latitude: float = 28.6,
    longitude: float = 77.2,
    land_area_hectares: float = 1.0,
    soil_type: str = "Alluvial",
):
    """
    Computation-based irrigation dashboard using:
    - Hargreaves ET₀ from live Open-Meteo weather data
    - Crop coefficient (Kc) for water requirement
    - Soil type for moisture retention estimation
    - Groq LLM for natural-language recommendation only
    """
    GROQ_API_KEY = os.getenv("GROQ_API_KEY") or os.getenv("EXPO_PUBLIC_GROQ_API_KEY")

    # 1. Fetch live 7-day weather from Open-Meteo
    try:
        weather = await fetch_open_meteo_weather(latitude, longitude)
        temp_now = weather["current"]["temperature_2m"]
        humidity_now = weather["current"]["relative_humidity_2m"]
        wind_now = weather["current"]["wind_speed_10m"]

        daily = weather["daily"]
        temp_maxes = daily["temperature_2m_max"]
        temp_mins = daily["temperature_2m_min"]
        precip_sums = daily.get("precipitation_sum", [0] * 7)
        sunshine_durations = daily.get("sunshine_duration", [6 * 3600] * 7)
        precip_probs = daily.get("precipitation_probability_max", [0] * 7)
    except Exception as e:
        print(f"Weather fetch failed: {e}")
        # Fallback defaults
        temp_now = 28.0
        humidity_now = 55.0
        wind_now = 8.0
        temp_maxes = [30, 31, 29, 32, 28, 30, 31]
        temp_mins = [18, 19, 17, 20, 16, 18, 19]
        precip_sums = [0, 0, 2, 0, 0, 5, 0]
        sunshine_durations = [7 * 3600] * 7
        precip_probs = [10, 15, 40, 10, 5, 60, 15]

    # 2. Compute ET₀ for each of the 7 days
    kc = CROP_KC.get(crop, DEFAULT_KC)
    kc_mid = kc["mid"]  # Use mid-season Kc as representative

    et0_values = []
    crop_water_needs = []  # mm/day
    for i in range(min(7, len(temp_maxes))):
        sunshine_hrs = sunshine_durations[i] / 3600.0 if i < len(sunshine_durations) else 6.0
        et0 = compute_et0(temp_maxes[i], temp_mins[i], sunshine_hrs, latitude)
        et0_values.append(et0)
        etc = round(et0 * kc_mid, 2)  # Crop evapotranspiration
        crop_water_needs.append(etc)

    # 3. Compute water needed today (liters)
    today_et0 = et0_values[0] if et0_values else 4.0
    today_etc = today_et0 * kc_mid
    today_precip = precip_sums[0] if precip_sums else 0
    effective_rain = today_precip * 0.8  # 80% of rain is effective
    net_irrigation_mm = max(today_etc - effective_rain, 0)
    water_needed_liters = round(net_irrigation_mm * land_area_hectares * 10000 / 1000, 0)  # mm→L conversion

    # 4. Soil moisture estimation
    soil = SOIL_PROFILES.get(soil_type, SOIL_PROFILES["Alluvial"])
    # Estimate soil moisture from recent rain + ET
    recent_rain_mm = sum(precip_sums[:3]) if len(precip_sums) >= 3 else 0
    recent_et = sum(crop_water_needs[:3]) if len(crop_water_needs) >= 3 else 12
    moisture_balance = recent_rain_mm - recent_et
    # Map to 0-100% scale; clay retains more, sandy retains less
    retention_factor = {"Clay": 1.3, "Black": 1.2, "Loamy": 1.1, "Alluvial": 1.0, "Red": 0.9, "Sandy": 0.7, "Laterite": 0.8, "Saline": 0.85}
    rf = retention_factor.get(soil_type, 1.0)
    base_moisture = 35 + moisture_balance * rf * 0.5
    soil_moisture = int(max(10, min(90, base_moisture)))

    # 5. Best irrigation time
    if temp_now > 35:
        best_time = "05:00 AM"
    elif temp_now > 28:
        best_time = "06:00 AM"
    elif wind_now > 15:
        best_time = "06:30 AM"
    else:
        best_time = "07:00 AM"

    # 6. Historical vs AI-optimized comparison (compute-based)
    # Traditional: farmers typically irrigate ~30% more than ET-based need
    historical_usage = [round(cw * land_area_hectares * 10000 / 1000 * 1.35) for cw in crop_water_needs]
    ai_optimized = [round(max(cw - (p * 0.8), 0) * land_area_hectares * 10000 / 1000)
                    for cw, p in zip(crop_water_needs, precip_sums)]

    total_hist = sum(historical_usage)
    total_ai = sum(ai_optimized)
    savings_pct = round((1 - total_ai / max(total_hist, 1)) * 100) if total_hist > 0 else 25

    # 7. Weather condition description
    if humidity_now > 70 and temp_now > 30:
        weather_condition = "Hot & Humid"
    elif humidity_now < 40:
        weather_condition = "Sunny & Dry"
    elif any(p > 50 for p in precip_probs[:2]):
        weather_condition = "Rain Expected"
    elif temp_now > 35:
        weather_condition = "Very Hot"
    else:
        weather_condition = "Pleasant"

    # 8. Build 7-day schedule
    schedule = []
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    today_idx = datetime.now().weekday()
    for i in range(min(7, len(crop_water_needs))):
        day_name = day_names[(today_idx + i) % 7]
        need_mm = crop_water_needs[i]
        rain_mm = precip_sums[i] if i < len(precip_sums) else 0
        net_mm = max(need_mm - rain_mm * 0.8, 0)
        liters = round(net_mm * land_area_hectares * 10000 / 1000, 0)
        schedule.append({
            "day": day_name if i > 0 else "Today",
            "et0_mm": et0_values[i],
            "crop_need_mm": need_mm,
            "rain_mm": round(rain_mm, 1),
            "irrigate_liters": liters,
            "rain_probability": precip_probs[i] if i < len(precip_probs) else 0,
        })

    # 9. Get Groq LLM recommendation text (language-aware)
    recommendation = f"Water {crop} with {water_needed_liters}L today at {best_time}."
    crop_health_impact = "Good"

    if GROQ_API_KEY:
        try:
            llm_prompt = f"""Smart Irrigation data for {crop} ({soil_type} soil, {land_area_hectares} ha):
- Soil Moisture: {soil_moisture}%
- ET₀ today: {today_et0} mm/day, Crop ET: {today_etc:.1f} mm/day
- Weather: {temp_now}°C, {humidity_now}% humidity, Wind {wind_now} km/h
- Rain today: {today_precip}mm, Rain forecast next 3 days: {precip_probs[:3]}
- Water needed: {water_needed_liters}L at {best_time}
- Water savings: {savings_pct}%

Return ONLY JSON (no markdown):
{{"recommendation": "<2-sentence actionable farming advice in {LANG_NAMES.get(lang_code, 'English')}>", "crop_health_impact": "<one phrase health status in {LANG_NAMES.get(lang_code, 'English')}>"}}""" 

            async with httpx.AsyncClient(timeout=20.0) as client:
                llm_resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": [{"role": "user", "content": llm_prompt}],
                        "temperature": 0.3, "max_tokens": 200,
                    },
                )
                if llm_resp.status_code == 200:
                    raw = llm_resp.json()["choices"][0]["message"]["content"].strip()
                    try:
                        parsed_rec = json.loads(raw)
                    except json.JSONDecodeError:
                        import re
                        m = re.search(r'\{.*\}', raw, re.DOTALL)
                        if m:
                            parsed_rec = json.loads(m.group())
                        else:
                            parsed_rec = {}
                    recommendation = parsed_rec.get("recommendation", recommendation)
                    crop_health_impact = parsed_rec.get("crop_health_impact", crop_health_impact)
        except Exception as e:
            print(f"LLM recommendation failed (non-critical): {e}")

    return {
        "moisture_level": soil_moisture,
        "weather_condition": weather_condition,
        "recommendation": recommendation,
        "water_needed_liters": water_needed_liters,
        "best_time": best_time,
        "savings_percentage": savings_pct,
        "historical_usage": historical_usage,
        "ai_optimized_usage": ai_optimized,
        "crop_health_impact": crop_health_impact,
        "et0_today_mm": today_et0,
        "crop_et_today_mm": round(today_etc, 2),
        "schedule": schedule,
    }


# ═══════════════════════════════════════════════════════════════
# ██  7-DAY ACTION PLAN ENGINE                                ██
# ═══════════════════════════════════════════════════════════════

# Crop duration data (days) for crop stage estimation
CROP_DURATIONS = {
    "Wheat": {"total": 140, "seedling": 20, "vegetative": 50, "flowering": 30, "maturity": 40},
    "Rice": {"total": 150, "seedling": 25, "vegetative": 55, "flowering": 30, "maturity": 40},
    "Maize": {"total": 120, "seedling": 15, "vegetative": 45, "flowering": 25, "maturity": 35},
    "Cotton": {"total": 180, "seedling": 20, "vegetative": 60, "flowering": 45, "maturity": 55},
    "Sugarcane": {"total": 360, "seedling": 35, "vegetative": 150, "flowering": 75, "maturity": 100},
    "Potato": {"total": 100, "seedling": 15, "vegetative": 35, "flowering": 20, "maturity": 30},
    "Mustard": {"total": 130, "seedling": 20, "vegetative": 40, "flowering": 30, "maturity": 40},
    "Soyabean": {"total": 110, "seedling": 15, "vegetative": 40, "flowering": 25, "maturity": 30},
    "Groundnut": {"total": 120, "seedling": 15, "vegetative": 45, "flowering": 25, "maturity": 35},
    "Gram": {"total": 130, "seedling": 20, "vegetative": 40, "flowering": 30, "maturity": 40},
    "Bajra": {"total": 90, "seedling": 15, "vegetative": 30, "flowering": 20, "maturity": 25},
    "Jowar": {"total": 110, "seedling": 15, "vegetative": 40, "flowering": 25, "maturity": 30},
}
DEFAULT_CROP_DURATION = {"total": 120, "seedling": 20, "vegetative": 40, "flowering": 25, "maturity": 35}

# Task category icons/colors for the frontend
TASK_CATEGORIES = {
    "irrigation": {"icon": "water-outline", "color": "#0EA5E9"},
    "fertilizer": {"icon": "leaf-outline", "color": "#16A34A"},
    "spray": {"icon": "bug-outline", "color": "#9333EA"},
    "weeding": {"icon": "cut-outline", "color": "#F59E0B"},
    "monitoring": {"icon": "eye-outline", "color": "#3B82F6"},
    "harvest": {"icon": "basket-outline", "color": "#EA580C"},
    "market": {"icon": "storefront-outline", "color": "#D946EF"},
    "soil": {"icon": "earth-outline", "color": "#78716C"},
    "general": {"icon": "checkmark-circle-outline", "color": "#64748B"},
}


def compute_crop_stage(sowing_date_str: Optional[str], crop: str) -> dict:
    """Compute crop stage and days info from sowing date."""
    durations = CROP_DURATIONS.get(crop, DEFAULT_CROP_DURATION)
    
    if not sowing_date_str:
        return {
            "stage": "vegetative",
            "days_since_sowing": 45,
            "days_to_harvest": durations["total"] - 45,
            "stage_progress_pct": 35,
            "total_duration": durations["total"],
        }
    
    try:
        sowing_date = datetime.strptime(sowing_date_str, "%Y-%m-%d")
    except ValueError:
        sowing_date = datetime.now() - timedelta(days=45)
    
    days_elapsed = (datetime.now() - sowing_date).days
    days_elapsed = max(0, min(days_elapsed, durations["total"]))
    
    # Determine stage
    cumulative = 0
    stage = "maturity"
    for s in ["seedling", "vegetative", "flowering", "maturity"]:
        cumulative += durations[s]
        if days_elapsed <= cumulative:
            stage = s
            break
    
    return {
        "stage": stage,
        "days_since_sowing": days_elapsed,
        "days_to_harvest": max(0, durations["total"] - days_elapsed),
        "stage_progress_pct": round(days_elapsed / durations["total"] * 100),
        "total_duration": durations["total"],
    }


class ActionPlanRequest(BaseModel):
    crop: str = "Wheat"
    soil_type: str = "Alluvial"
    land_area_hectares: float = 1.0
    latitude: float = 28.6
    longitude: float = 77.2
    sowing_date: Optional[str] = None  # YYYY-MM-DD
    crop_stage: Optional[str] = None   # seedling/vegetative/flowering/maturity
    lang_code: str = "en"


@app.post("/api/action-plan")
async def generate_action_plan(req: ActionPlanRequest):
    """
    Generates a structured 7-day farm action plan.
    Auto-fetches weather, computes crop stage, calculates irrigation via ET₀,
    and uses Groq LLM for intelligent task generation.
    """
    GROQ_API_KEY = os.getenv("GROQ_API_KEY") or os.getenv("EXPO_PUBLIC_GROQ_API_KEY")

    # 1. Auto-fetch context
    state = get_state_from_coords(req.latitude, req.longitude)
    season = get_current_season()
    soil = SOIL_PROFILES.get(req.soil_type, SOIL_PROFILES["Alluvial"])
    crop_info = compute_crop_stage(req.sowing_date, req.crop)
    stage = req.crop_stage or crop_info["stage"]

    # 2. Fetch 7-day weather
    try:
        weather = await fetch_open_meteo_weather(req.latitude, req.longitude)
        temp_now = weather["current"]["temperature_2m"]
        humidity_now = weather["current"]["relative_humidity_2m"]
        wind_now = weather["current"]["wind_speed_10m"]

        daily = weather["daily"]
        temp_maxes = daily["temperature_2m_max"]
        temp_mins = daily["temperature_2m_min"]
        precip_sums = daily.get("precipitation_sum", [0] * 7)
        precip_probs = daily.get("precipitation_probability_max", [0] * 7)
        sunshine_durations = daily.get("sunshine_duration", [6 * 3600] * 7)
        dates = daily.get("time", [])
    except Exception as e:
        print(f"Weather fetch failed: {e}")
        temp_now, humidity_now, wind_now = 28.0, 55.0, 8.0
        temp_maxes = [30, 31, 29, 32, 28, 30, 31]
        temp_mins = [18, 19, 17, 20, 16, 18, 19]
        precip_sums = [0, 0, 2, 0, 0, 5, 0]
        precip_probs = [10, 15, 40, 10, 5, 60, 15]
        sunshine_durations = [7 * 3600] * 7
        dates = [(datetime.now() + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)]

    # 3. Compute ET₀-based irrigation for 7 days
    kc = CROP_KC.get(req.crop, DEFAULT_KC)
    kc_stage = kc.get({"seedling": "initial", "vegetative": "mid", "flowering": "mid", "maturity": "late"}.get(stage, "mid"), kc["mid"])
    
    irrigation_data = []
    for i in range(min(7, len(temp_maxes))):
        sun_hrs = sunshine_durations[i] / 3600.0 if i < len(sunshine_durations) else 6.0
        et0 = compute_et0(temp_maxes[i], temp_mins[i], sun_hrs, req.latitude)
        etc = round(et0 * kc_stage, 2)
        rain_mm = precip_sums[i] if i < len(precip_sums) else 0
        net_mm = max(etc - rain_mm * 0.8, 0)
        water_liters = round(net_mm * req.land_area_hectares * 10, 0)  # mm to L per ha
        irrigation_data.append({
            "et0": et0,
            "crop_need_mm": etc,
            "rain_mm": round(rain_mm, 1),
            "net_irrigation_mm": round(net_mm, 1),
            "water_liters": water_liters,
        })

    # 4. Build weather summary for each day
    day_names_full = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    today_idx = datetime.now().weekday()
    weather_by_day = []
    for i in range(min(7, len(temp_maxes))):
        rain_prob = precip_probs[i] if i < len(precip_probs) else 0
        weather_by_day.append({
            "day_index": i,
            "date": dates[i] if i < len(dates) else (datetime.now() + timedelta(days=i)).strftime("%Y-%m-%d"),
            "day_name": "Today" if i == 0 else ("Tomorrow" if i == 1 else day_names_full[(today_idx + i) % 7]),
            "temp_max": temp_maxes[i],
            "temp_min": temp_mins[i],
            "rain_mm": round(precip_sums[i], 1) if i < len(precip_sums) else 0,
            "rain_probability": rain_prob,
            "is_rainy": rain_prob > 50,
            "is_spray_safe": rain_prob < 30 and (wind_now if i == 0 else 8) < 15,
        })

    # 5. Determine urgent/avoid actions from rules
    do_now = []
    avoid_today = []
    rain_prob_today = precip_probs[0] if precip_probs else 0
    irr_today = irrigation_data[0] if irrigation_data else {}

    if irr_today.get("net_irrigation_mm", 0) > 2:
        do_now.append({
            "title": "Irrigate field" if req.lang_code == "en" else ("खेत में सिंचाई करें" if req.lang_code == "hi" else "ਖੇਤ ਵਿੱਚ ਸਿੰਚਾਈ ਕਰੋ"),
            "detail": f"{irr_today.get('water_liters', 0):.0f}L needed",
            "category": "irrigation",
            "urgency": "high",
        })
    if rain_prob_today > 50:
        avoid_today.append({
            "title": "Do not spray" if req.lang_code == "en" else ("छिड़काव न करें" if req.lang_code == "hi" else "ਛਿੜਕਾਅ ਨਾ ਕਰੋ"),
            "detail": f"{rain_prob_today}% rain chance",
            "category": "spray",
            "urgency": "avoid",
        })
    if temp_now > 38:
        avoid_today.append({
            "title": "Avoid field work afternoon" if req.lang_code == "en" else ("दोपहर में खेत कार्य टालें" if req.lang_code == "hi" else "ਦੁਪਹਿਰ ਨੂੰ ਖੇਤ ਕੰਮ ਟਾਲੋ"),
            "detail": f"Temperature {temp_now}°C",
            "category": "general",
            "urgency": "avoid",
        })
    if humidity_now > 80 and stage in ["flowering", "maturity"]:
        do_now.append({
            "title": "Monitor for fungal disease" if req.lang_code == "en" else ("फफूंद रोग की निगरानी करें" if req.lang_code == "hi" else "ਉੱਲੀ ਰੋਗ ਦੀ ਨਿਗਰਾਨੀ ਕਰੋ"),
            "detail": f"Humidity {humidity_now}%",
            "category": "monitoring",
            "urgency": "high",
        })

    # 6. Generate full plan via Groq LLM
    daily_plan = []
    weekly_summary = f"7-day plan for {req.crop} in {state}"
    
    if GROQ_API_KEY:
        try:
            # Find upcoming spray-safe windows
            spray_windows = [w["day_name"] for w in weather_by_day if w["is_spray_safe"]]
            rainy_days = [w["day_name"] for w in weather_by_day if w["is_rainy"]]

            system_prompt = """You are an expert Indian agronomist generating a weekly farm action plan.
You generate PRACTICAL, SPECIFIC daily tasks for farmers. Every task must include exact quantities, timing, and cost.

CRITICAL RULES:
1. Respond ONLY with valid JSON. No markdown, no extra text.
2. Each task must have: category, title, time, details, quantity, cost_estimate, why_now, urgency
3. Categories: irrigation, fertilizer, spray, weeding, monitoring, harvest, market, soil, general
4. Urgency levels: high, medium, low, avoid
5. Cost estimates in ₹ (Indian Rupees)
6. Quantities must be specific to the land area provided
7. Do NOT schedule spraying on rainy days
8. Consider crop stage for appropriate tasks
9. Keep 3-5 tasks per day maximum"""

            user_prompt = f"""Generate a 7-day action plan for this farmer:

FARM CONTEXT:
- Crop: {req.crop}
- Crop Stage: {stage} (Day {crop_info['days_since_sowing']}/{crop_info['total_duration']}, {crop_info['stage_progress_pct']}% complete)
- Days to Harvest: {crop_info['days_to_harvest']}
- Soil: {req.soil_type} (N={soil['N']}, P={soil['P']}, K={soil['K']}, pH={soil['ph']})
- Land Area: {req.land_area_hectares} hectares
- Location: {state}, India
- Season: {season}

WEATHER (7-day):
{json.dumps([{
    "day": w["day_name"], "date": w["date"],
    "temp": f"{w['temp_min']}-{w['temp_max']}°C",
    "rain_prob": f"{w['rain_probability']}%",
    "rain_mm": w["rain_mm"]
} for w in weather_by_day], indent=2)}

IRRIGATION DATA (pre-computed ET₀):
{json.dumps([{"day": weather_by_day[i]["day_name"], "water_needed_liters": d["water_liters"], "rain_mm": d["rain_mm"]} for i, d in enumerate(irrigation_data)], indent=2)}

Spray-safe days: {', '.join(spray_windows) if spray_windows else 'None this week'}
Rainy days: {', '.join(rainy_days) if rainy_days else 'None this week'}

RESPOND in {LANG_NAMES.get(req.lang_code, 'English')}.

Return ONLY this JSON:
{{
  "weekly_summary": "<1-2 sentence overview>",
  "daily_plan": [
    {{
      "day_index": 0,
      "tasks": [
        {{
          "category": "<category>",
          "title": "<short task title>",
          "time": "<recommended time e.g. 06:00 AM>",
          "details": "<specific instructions>",
          "quantity": "<exact quantity for {req.land_area_hectares} ha>",
          "cost_estimate": "<₹ amount>",
          "why_now": "<1-sentence reason>",
          "urgency": "<high/medium/low>"
        }}
      ]
    }}
  ]
}}

Generate for all 7 days. 3-5 tasks per day. Be crop-stage-specific and weather-aware."""

            raw = await call_groq_llm(user_prompt, system=system_prompt, max_tokens=2500, temperature=0.4)
            parsed = parse_json_response(raw)

            if parsed and isinstance(parsed, dict):
                weekly_summary = parsed.get("weekly_summary", "")
                raw_daily = parsed.get("daily_plan", [])
                
                for day_data in raw_daily:
                    day_idx = day_data.get("day_index", 0)
                    if day_idx < len(weather_by_day):
                        w = weather_by_day[day_idx]
                        tasks = []
                        for task in day_data.get("tasks", []):
                            cat = task.get("category", "general")
                            cat_info = TASK_CATEGORIES.get(cat, TASK_CATEGORIES["general"])
                            tasks.append({
                                "category": cat,
                                "icon": cat_info["icon"],
                                "color": cat_info["color"],
                                "title": task.get("title", ""),
                                "time": task.get("time", ""),
                                "details": task.get("details", ""),
                                "quantity": task.get("quantity", ""),
                                "cost_estimate": task.get("cost_estimate", ""),
                                "why_now": task.get("why_now", ""),
                                "urgency": task.get("urgency", "medium"),
                            })
                        daily_plan.append({
                            "day_index": day_idx,
                            "date": w["date"],
                            "day_name": w["day_name"],
                            "temp_range": f"{w['temp_min']}°–{w['temp_max']}°C",
                            "rain_probability": w["rain_probability"],
                            "is_rainy": w["is_rainy"],
                            "is_spray_safe": w["is_spray_safe"],
                            "tasks": tasks,
                        })

        except Exception as e:
            print(f"Action plan LLM failed: {e}")

    # 7. Fallback: rule-based plan if LLM failed
    if not daily_plan:
        weekly_summary = f"Weekly plan for {req.crop} ({stage} stage) in {state}."
        for i, w in enumerate(weather_by_day):
            tasks = []
            irr = irrigation_data[i] if i < len(irrigation_data) else {}

            # Irrigation task
            if irr.get("net_irrigation_mm", 0) > 1:
                tasks.append({
                    "category": "irrigation",
                    "icon": "water-outline",
                    "color": "#0EA5E9",
                    "title": "Irrigate field",
                    "time": "06:00 AM",
                    "details": f"Apply {irr['water_liters']:.0f} liters",
                    "quantity": f"{irr['water_liters']:.0f} L",
                    "cost_estimate": f"₹{int(irr['water_liters'] * 0.08)}",
                    "why_now": f"ET₀ demand: {irr['crop_need_mm']}mm, Rain: {irr['rain_mm']}mm",
                    "urgency": "high" if irr["net_irrigation_mm"] > 3 else "medium",
                })

            # Monitoring
            tasks.append({
                "category": "monitoring",
                "icon": "eye-outline",
                "color": "#3B82F6",
                "title": "Field inspection",
                "time": "07:00 AM",
                "details": f"Check {req.crop} for pests and diseases",
                "quantity": "-",
                "cost_estimate": "₹0",
                "why_now": f"Humidity {humidity_now}%, regular monitoring needed at {stage} stage",
                "urgency": "medium",
            })

            # Spray only on safe days
            if w["is_spray_safe"] and i % 3 == 0:
                tasks.append({
                    "category": "spray",
                    "icon": "bug-outline",
                    "color": "#9333EA",
                    "title": "Preventive spray",
                    "time": "05:30 PM",
                    "details": f"Neem oil 5ml/L for pest prevention",
                    "quantity": f"{int(req.land_area_hectares * 500)}ml neem oil",
                    "cost_estimate": f"₹{int(req.land_area_hectares * 200)}",
                    "why_now": f"Low wind, no rain expected — safe spray window",
                    "urgency": "medium",
                })

            daily_plan.append({
                "day_index": i,
                "date": w["date"],
                "day_name": w["day_name"],
                "temp_range": f"{w['temp_min']}°–{w['temp_max']}°C",
                "rain_probability": w["rain_probability"],
                "is_rainy": w["is_rainy"],
                "is_spray_safe": w["is_spray_safe"],
                "tasks": tasks,
            })

    return {
        "success": True,
        "weekly_summary": weekly_summary,
        "crop": req.crop,
        "crop_stage": stage,
        "crop_info": crop_info,
        "state": state,
        "season": season,
        "do_now": do_now,
        "avoid_today": avoid_today,
        "daily_plan": daily_plan,
        "generated_at": datetime.now().isoformat(),
    }
