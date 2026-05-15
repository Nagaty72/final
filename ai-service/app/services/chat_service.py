"""
Healthcare AI Runtime Engine (Intent Optimized)
==============================================
Intelligent orchestration with priority-based intent classification.
Ensures analytics intent is never shadowed by educational keywords.
"""

import os
import re
import json
import logging
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Tuple, Optional, Dict, Any

from google import genai
from google.genai import types
from google.genai.errors import APIError
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.services import analytics_service, knowledge_base

# --- LOGGING ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_backend_env = Path(__file__).resolve().parents[3] / "backend" / ".env"
load_dotenv(dotenv_path=_backend_env)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY)
MODEL_NAME = "gemini-flash-latest"

class QuotaManager:
    def __init__(self):
        self.is_low_quota = False
        self.last_429_time = 0
        self.recovery_window = 300

    def mark_exhausted(self):
        self.is_low_quota = True
        self.last_429_time = time.time()

    def check_status(self):
        if self.is_low_quota and (time.time() - self.last_429_time > self.recovery_window):
            self.is_low_quota = False
        return self.is_low_quota

quota_manager = QuotaManager()

SYSTEM_COMPRESSED = """HealthBot Agent. 
Rule: Prioritize Analytics (stats/trends/cases) over Knowledge (definitions).
Rule: If data is 'relaxed', explain you widened the search.
Grounded. Markdown."""

# --- INTENT SIGNALS ---
ANALYTICS_SIGNALS = [
    r"top", r"common", r"أهم", r"منتشرة", r"increase", r"زيادة", 
    r"trend", r"اتجاه", r"compare", r"مقارنة", r"statistics", r"إحصائيات",
    r"cases", r"حالات", r"hospitals", r"مستشفيات", r"districts", r"مناطق",
    r"recently", r"حاليًا", r"month", r"year", r"today"
]

EDUCATIONAL_SIGNALS = [
    r"what is", r"ما هو", r"ماهو", r"explain", r"اشرح", r"تعريف", 
    r"symptoms", r"أعراض", r"causes", r"أسباب", r"treatment", r"علاج",
    r"prevention", r"وقاية", r"how does", r"كيف"
]

def _get_routing_tier(message: str) -> str:
    """
    [ROUTER] Weighted intent classification.
    Analytics intent ALWAYS overrides educational keywords.
    """
    msg = message.lower().strip()
    
    # 1. ANALYTICS CHECK (Highest Priority)
    is_analytics = any(re.search(pattern, msg) for pattern in ANALYTICS_SIGNALS)
    if is_analytics:
        if re.search(r"(top|common|أهم|منتشرة) (diseases|illness|الأمراض)", msg):
            return "tier1_top_diseases"
        if re.search(r"(hospital|load|مستشفى|سعة)", msg):
            return "tier1_hospital_load"
        logger.info("[ROUTER] Signal: ANALYTICS detected. Forcing Tier 3.")
        return "tier3_full_analytics"
    
    # 2. EDUCATIONAL CHECK (Medium Priority)
    is_educational = any(re.search(pattern, msg) for pattern in EDUCATIONAL_SIGNALS)
    if is_educational:
        logger.info("[ROUTER] Signal: EDUCATIONAL detected. Checking Local KB.")
        return "tier1_local_kb"
        
    # 3. DEFAULT
    return "tier3_full"

@retry(
    stop=stop_after_attempt(2),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((ConnectionError, TimeoutError)),
    reraise=True
)
async def _safe_call_gemini(contents: list, temperature=0.2) -> str:
    try:
        response = await client.aio.models.generate_content(
            model=MODEL_NAME,
            contents=contents,
            config=types.GenerateContentConfig(
                temperature=temperature,
                system_instruction=SYSTEM_COMPRESSED,
                max_output_tokens=1024
            ),
        )
        return response.text
    except APIError as e:
        if "429" in str(e): quota_manager.mark_exhausted()
        raise

async def generate_chat_response(message: str, history: list = []) -> str:
    if not message or not message.strip(): return "How can I help?"

    try:
        tier = _get_routing_tier(message)
        is_low_quota = quota_manager.check_status()
        
        # --- PHASE 0: STRATEGIC ROUTING ---
        # Note: Local KB check only triggers for EXPLICIT educational intents now.
        if tier == "tier1_local_kb":
            local_info = knowledge_base.get_local_knowledge(message)
            if local_info:
                logger.info("[KB] Served definitional medical info.")
                return local_info
            # Fallback to AI if KB doesn't have it
            tier = "tier3_full"

        logger.info(f"[ROUTER] Final Path: {tier} (Low Quota: {is_low_quota})")
        
        context_data = None
        plan = None

        # --- PHASE 1: EXECUTION ---
        if tier.startswith("tier1") and tier != "tier1_local_kb":
            tool = tier.replace("tier1_", "")
            params = {"start_date": (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d')}
            context_data = await analytics_service.execute_analytics_tool(tool, params)
        else:
            # Reasoning Path
            prompt = f"Plan JSON for: {message}. Priority: ANALYTICS. Today: {datetime.now().strftime('%Y-%m-%d')}"
            try:
                plan_text = await _safe_call_gemini([prompt], temperature=0.0)
                plan = json.loads(re.search(r'\{.*\}', plan_text, re.DOTALL).group())
                
                # Double check KB with normalized disease if AI thinks it's knowledge
                if plan.get("mode") == "knowledge":
                    local_info = knowledge_base.get_local_knowledge(plan.get("disease", ""))
                    if local_info: return local_info
                
                if plan.get("requires_db"):
                    context_data = await analytics_service.execute_analytics_tool(
                        plan.get("tool", "top_diseases"), plan.get("params", {}), full_plan=plan
                    )
            except Exception:
                if is_low_quota: return "I'm currently in power-saving mode. Analytics are available for simple requests."

        # --- PHASE 2: SYNTHESIS ---
        if is_low_quota and context_data:
            return analytics_service.format_data_nicely(context_data)

        if not context_data and not plan:
            return "I'm sorry, I couldn't find a direct answer. Could you rephrase your question?"

        # Synth prompt logic
        is_relaxed = False
        try:
            if context_data:
                meta = json.loads(context_data).get("m", {})
                is_relaxed = meta.get("relaxed", False)
        except: pass

        synth_prompt = f"Message: {message}\nContext: {context_data}\n"
        if is_relaxed:
            synth_prompt += "Instruction: Explain that you widened the search."
        if plan and plan.get("mode") == "knowledge":
            synth_prompt = f"Provide medical education for: {message}. Disclaimer included."

        final_history = []
        for msg in history[-3:]:
            role = "user" if msg.get("role") == "user" else "model"
            final_history.append(types.Content(role=role, parts=[types.Part(text=msg.get("content"))]))
        
        final_history.append(types.Content(role="user", parts=[types.Part(text=synth_prompt)]))
        
        try:
            return await _safe_call_gemini(final_history)
        except Exception:
            if context_data: return analytics_service.format_data_nicely(context_data)
            return "The AI service is currently at capacity. Please try again in a few minutes."

    except Exception as exc:
        logger.error(f"[RUNTIME ERROR] {exc}")
        return "I encountered an error. Please try again with a simple question."
