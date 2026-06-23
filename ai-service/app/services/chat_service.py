"""
Healthcare AI Chat Service
===========================
Provides AI-powered healthcare analytics chat using Google Gemini API.
Supports bilingual responses (Arabic & English) with professional
healthcare domain expertise. Includes robust error handling and retries.
"""

import os
import re
import logging
from pathlib import Path

from google import genai
from google.genai import types
from google.genai.errors import APIError
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from fastapi import HTTPException

from app.services import analytics_service
from google.genai.errors import APIError
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Load environment variables from the backend .env (single source of truth)
# ---------------------------------------------------------------------------
_backend_env = Path(__file__).resolve().parents[3] / "backend" / ".env"
load_dotenv(dotenv_path=_backend_env)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY is not set in backend/.env")
    raise RuntimeError(
        "GEMINI_API_KEY is not set. "
        "Please add it to backend/.env"
    )

# ---------------------------------------------------------------------------
# Gemini Client & Model Configuration
# ---------------------------------------------------------------------------
client = genai.Client(api_key=GEMINI_API_KEY)

# Downgraded to gemini-1.5-flash for better free-tier availability and stability
MODEL_NAME = "gemini-2.5-flash"

GENERATION_CONFIG = types.GenerateContentConfig(
    temperature=0.7,
    top_p=0.92,
    top_k=40,
    max_output_tokens=4096,
    safety_settings=[
        types.SafetySetting(
            category="HARM_CATEGORY_HARASSMENT",
            threshold="BLOCK_NONE",
        ),
        types.SafetySetting(
            category="HARM_CATEGORY_HATE_SPEECH",
            threshold="BLOCK_NONE",
        ),
        types.SafetySetting(
            category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold="BLOCK_NONE",
        ),
        types.SafetySetting(
            category="HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold="BLOCK_NONE",
        ),
    ],
    system_instruction="""You are the public-facing Health Intelligence Assistant for Epicare.

### Your Identity & Role
- You are an expert data scientist and epidemiologist specializing in public health surveillance, disease analytics, and healthcare management in Egypt and the MENA region.
- You assist both the general public and healthcare decision-makers.

### Core Capabilities
1. **Data-Driven Analysis** — Analyze and interpret the real-time context data provided to you from the database.
2. **Geospatial Comparisons** — Compare healthcare metrics across Egyptian governorates (e.g., Cairo, Alexandria, Luxor) identifying hotspots and disparities.
3. **Actionable Healthcare Insights** — Generate high-value insights from health data, identifying trends, anomalies, and forecasting potential outbreaks.
4. **Educational Public Health** — Provide general, educational public health knowledge based on typical epidemiological and seasonal trends in Egypt and the MENA region.

### Rules for Processing Context Data
- If context data from the database is provided in the prompt, you **MUST base your answer on that data**.
- NEVER apologize for not having real-time data, and NEVER mention your lack of database access or system constraints.
- When asked about current diseases or statistics without provided database context, respond confidently with general, educational public health knowledge based on typical epidemiological and seasonal trends.
- Do not provide exact live statistical numbers unless they are explicitly provided in the database context. Instead, discuss categories (e.g., NCDs vs. Communicable diseases) and prevention strategies.

### Language & Localization Rules
- **Detect the user's language automatically.**
- If the user writes in **Arabic**, respond fully in professional Arabic (فصحى) with proper formatting and medical terminology transliterated when helpful.
- If the user writes in **English**, respond in formal, professional English.

### Response Style & Formatting
- **Tone:** Maintain a professional, reassuring, and authoritative tone suitable for the general public.
- **Analytical & Precise:** Always base your answers on logical reasoning.
- **Structured:** Use markdown extensively. Use headers (`###`), bullet points (`-`), bold text (`**`), and tables to present data cleanly.
- **Action-Oriented:** Conclude analyses with strategic recommendations.

### Guardrails
- **NO Medical Diagnoses:** Never provide personal medical diagnoses or treatment prescriptions. Always advise consulting a licensed healthcare professional for clinical issues.
- **Scope Focus:** Strictly refuse queries unrelated to healthcare, analytics, or public health.
""",
)

# ---------------------------------------------------------------------------
# Fallback Messages
# ---------------------------------------------------------------------------
FALLBACK_MESSAGE = (
    "⚠️ **Service Temporarily Unavailable**\n\n"
    "The AI analytics service is currently experiencing high demand or network issues. "
    "Please try your request again in a few moments.\n\n"
    "---\n\n"
    "⚠️ **الخدمة غير متاحة مؤقتاً**\n\n"
    "تواجه خدمة التحليلات الذكية ضغطاً عالياً أو مشكلة في الشبكة حالياً. "
    "يرجى إعادة المحاولة بعد قليل."
)

def log_retry_attempt(retry_state):
    """Log when a retry happens."""
    logger.warning(f"Retrying Gemini API call... Attempt {retry_state.attempt_number}/3. Error: {retry_state.outcome.exception()}")

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((APIError, ConnectionError, TimeoutError)),
    before_sleep=log_retry_attempt,
    reraise=True
)
async def _call_gemini_api(message: str) -> str:
    """Make the actual API call to Gemini with retry logic."""
    response = await client.aio.models.generate_content(
        model=MODEL_NAME,
        contents=message,
        config=GENERATION_CONFIG,
    )
    return response.text

async def _detect_intent(message: str) -> str:
    """Lightweight call to detect user intent."""
    prompt = f"""Analyze the following user message regarding healthcare in Egypt.
Determine the primary intent from this list:
- top_diseases
- chronic_analysis
- compare_governorates
- hospital_load
- emergency_analysis
- gender_analysis
- age_analysis
- disease_trends
- nearest_hospital
- contact_support
- prevention_tips
- disease_prevalence

- general_chat

Respond ONLY with the exact intent name from the list above. No other text.
User Message: {message}"""

    try:
        response = await client.aio.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.0)
        )
        intent = response.text.strip().lower()
        intent = re.sub(r'[^a-z_]', '', intent)
        valid_intents = [
            "top_diseases", "chronic_analysis", "compare_governorates", 
            "hospital_load", "emergency_analysis", "gender_analysis", 
            "age_analysis", "disease_trends", "nearest_hospital",
            "contact_support", "prevention_tips", "disease_prevalence", "general_chat"
        ]
        return intent if intent in valid_intents else "general_chat"
    except Exception as e:
        logger.error(f"Intent detection failed: {e}")
        return "general_chat"

async def generate_chat_response(message: str, history: list = None, user_role: str = "normal_user", context_obj: dict = None) -> str:
    """
    Generate a healthcare-focused AI response using Gemini.
    Includes exponential backoff retries and fallback responses.

    Parameters
    ----------
    message : str
        The user's chat message (Arabic or English).

    Returns
    -------
    dict
        A dictionary containing the AI-generated response text and fallback status.
    """
    if not message or not message.strip():
        return {"response": "Please provide a message to get started. | يرجى إدخال رسالة للبدء.", "isFallback": False}

    try:
        logger.info(f"Generating chat response for message length: {len(message)}")
        
        # 1. Detect Intent
        intent = await _detect_intent(message)
        logger.info(f"Detected intent: {intent}")
        
        # 1.5. Validate Public Guest Access
        if user_role == "public_guest":
            allowed_public_intents = {
                "nearest_hospital", "contact_support", 
                "prevention_tips", "disease_prevalence", "general_chat"
            }
            if intent not in allowed_public_intents:
                logger.warning(f"Public guest attempted restricted intent: {intent}")
                raise HTTPException(status_code=403, detail="This administrative or diagnostic query is restricted. Please log in for full access.")

        
        # 2. Fetch Relevant Analytics Data
        context_data = ""
        if intent == "top_diseases":
            context_data = await analytics_service.get_top_diseases(user_role)
        elif intent == "chronic_analysis":
            context_data = await analytics_service.get_chronic_diseases_analysis(user_role)
        elif intent == "compare_governorates":
            context_data = await analytics_service.compare_governorates(user_role)
        elif intent == "hospital_load":
            context_data = await analytics_service.get_hospital_load_analysis(user_role)
        elif intent == "emergency_analysis":
            context_data = await analytics_service.get_emergency_analysis(user_role)
        elif intent == "gender_analysis":
            context_data = await analytics_service.get_gender_analysis(user_role)
        elif intent == "age_analysis":
            context_data = await analytics_service.get_age_group_analysis(user_role)
        elif intent == "disease_trends":
            context_data = await analytics_service.get_disease_trends(user_role)
            
        if context_obj:
            import json
            context_data = str(context_data) + f"\n\n[USER LOCATION/PREFERENCE CONTEXT]\n{json.dumps(context_obj, ensure_ascii=False)}"
            
        # 3. Build Augmented Prompt
        augmented_prompt = message
        source_badge = "\n\n---\n**Source:** 🤖 AI Response"
        
        if context_data and context_data != "No data available in the database.":
            source_badge = "\n\n---\n**Source:** 🟢 Live Database"
            augmented_prompt = f"""
User Message: {message}

=== DATABASE CONTEXT (Real Healthcare Analytics Data) ===
Intent Detected: {intent}
Data fetched from Supabase:
{context_data}
=========================================================

Instructions: 
1. Answer the user's message using the REAL database context provided above. 
2. You MUST base all numerical claims and statistics EXCLUSIVELY on this context. 
3. Do NOT generate generic or fabricated numbers. 
4. Analyze the real data and present insights clearly using tables and markdown.
"""
        
        response_text = await _call_gemini_api(augmented_prompt)
        logger.info("Successfully generated response from Gemini AI.")
        
        return {"response": response_text + source_badge, "isFallback": False}
        
    except HTTPException as http_exc:
        raise http_exc
    except Exception as exc:
        error_msg = str(exc)
        logger.error(f"Gemini API generation failed after retries: {error_msg}")
        logger.warning("WARNING: AI API failed. Serving response from Fallback DB/Hardcoded logic.")
        
        is_ar = bool(re.search(r'[\u0600-\u06FF]', message))
        indicator = "⚡ [رد تلقائي] - " if is_ar else "⚡ [Automated Response] - "
        fallback_msg = indicator + FALLBACK_MESSAGE
        
        # Return a professional fallback response instead of crashing the endpoint
        return {"response": fallback_msg, "isFallback": True}

async def generate_chat_title(message: str) -> str:
    """
    Generate a smart, short conversation title from the first message.
    """
    if not message or not message.strip():
        return "Healthcare Analytics"
        
    prompt = f"""Generate a short, professional healthcare-related title (max 3-5 words) summarizing the following message.
The message may be in English or Arabic. Return the title in English if the message is English, or Arabic if the message is Arabic.
Do NOT include quotes, periods, or extra text. Just the title itself.

Examples:
"show top diseases in cairo" -> "Cairo Disease Analytics"
"عدد مرضى السكر" -> "إحصائيات مرض السكري"
"top hospitals this month" -> "Hospital Performance"

Message: {message}"""

    try:
        response = await client.aio.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.3)
        )
        title = response.text.strip().strip('"').strip("'")
        
        if not title or len(title.split()) > 10:
            return "Healthcare Analytics"
            
        return title
    except Exception as exc:
        logger.error(f"Failed to generate title: {exc}")
        return "Healthcare Analytics"

