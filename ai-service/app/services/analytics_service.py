import logging
import json
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Union, List
from app.core.supabase_client import supabase_client
from app.services.sql_generator import SQLGenerator

logger = logging.getLogger(__name__)

# --- SEMANTIC NORMALIZATION ---
# Maps semantically equivalent terms to a canonical form to improve DB hits.
NORMALIZATION_MAP = {
    "covid": "covid-19",
    "tb": "tuberculosis",
    "dengue fever": "dengue",
    "flu": "influenza",
    "bp": "hypertension",
    "cairo": "cairo",
    "alex": "alexandria",
    "القاهرة": "cairo",
    "الإسكندرية": "alexandria",
    "الأقصر": "luxor"
}

def normalize_entity(text: Optional[str]) -> Optional[str]:
    if not text: return None
    t = text.lower().strip()
    return NORMALIZATION_MAP.get(t, t)

# --- AGGRESSIVE CACHING ---
_ANALYTICS_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_MINUTES = 60

def _get_cache_key(tool_name: str, params: dict) -> str:
    param_str = json.dumps(params, sort_keys=True)
    return hashlib.md5(f"{tool_name}:{param_str}".encode()).hexdigest()

def get_from_cache(key: str) -> Optional[Union[str, dict]]:
    if key in _ANALYTICS_CACHE:
        entry = _ANALYTICS_CACHE[key]
        if datetime.now() < entry["expiry"]:
            return entry["data"]
    return None

def save_to_cache(key: str, data: Any):
    _ANALYTICS_CACHE[key] = {
        "data": data,
        "expiry": datetime.now() + timedelta(minutes=CACHE_TTL_MINUTES)
    }

# --- NON-AI FORMATTER ---

def format_data_nicely(data: Any) -> str:
    if not data or not isinstance(data, list):
        return "No records found matching your criteria."
    
    output = ["📊 **Direct Analytics Report**\n"]
    if len(data) > 0:
        headers = list(data[0].keys())
        output.append(" | ".join([h.capitalize() for h in headers]))
        output.append("-" * 30)
        for row in data[:8]:
            output.append(" | ".join([str(row.get(h, "")) for h in headers]))
    
    if len(data) > 8:
        output.append(f"\n*...and {len(data)-8} more records.*")
    return "\n".join(output)

# --- SUMMARIZATION ---

def summarize_analytics_data(data: Any, max_rows: int = 15, relaxed: bool = False) -> str:
    if not data or not isinstance(data, list):
        return json.dumps({"m": {"total": 0}, "data": []})

    total_count = len(data)
    summary_data = data[:max_rows]
    
    output = {
        "m": {
            "total": total_count, 
            "top": len(summary_data),
            "relaxed": relaxed # Indicator for confidence layer
        },
        "data": summary_data
    }
    return json.dumps(output, ensure_ascii=False)

# --- RELAXATION ENGINE ---

async def execute_with_relaxation(tool_name: str, rpc_name: Optional[str], payload: dict, full_plan: dict = None) -> str:
    """Progressively relaxes query filters to find relevant data."""
    
    # 1. Try Original (Normalized)
    try:
        data = await supabase_client.call_rpc(rpc_name, payload) if rpc_name else None
        if data and len(data) > 0:
            return summarize_analytics_data(data)
    except Exception: pass

    # 2. Try Relaxation: Widen Date Window (2x)
    if payload.get("p_start_date") and payload.get("p_end_date"):
        logger.info(f"[RELAXATION] Widening date window for {tool_name}")
        try:
            start = datetime.strptime(payload["p_start_date"], '%Y-%m-%d')
            end = datetime.strptime(payload["p_end_date"], '%Y-%m-%d')
            diff = (end - start).days or 30
            relaxed_payload = payload.copy()
            relaxed_payload["p_start_date"] = (start - timedelta(days=diff)).strftime('%Y-%m-%d')
            
            data = await supabase_client.call_rpc(rpc_name, relaxed_payload) if rpc_name else None
            if data and len(data) > 0:
                return summarize_analytics_data(data, relaxed=True)
        except Exception: pass

    # 3. Final Fallback: Dynamic SQL with fuzzy matching (handled in generator)
    if full_plan:
        logger.info(f"[RELAXATION] Attempting Dynamic SQL fallback for {tool_name}")
        sql_query = SQLGenerator.generate_sql(full_plan)
        try:
            data = await supabase_client.call_rpc("execute_ai_sql", {"sql_query": sql_query})
            if data and len(data) > 0:
                return summarize_analytics_data(data, relaxed=True)
        except Exception: pass

    return "No data available."

# --- EXECUTION ENGINE ---

async def execute_analytics_tool(tool_name: str, params: dict, full_plan: dict = None) -> str:
    # Normalize inputs
    params["city"] = normalize_entity(params.get("city"))
    params["disease"] = normalize_entity(params.get("disease"))
    
    cache_key = _get_cache_key(tool_name, params)
    cached = get_from_cache(cache_key)
    if cached: return cached

    logger.info(f"[EXECUTOR] Tool: {tool_name} (Params: {params})")
    
    tool_mapping = {
        "top_diseases": "get_top_diseases_v2",
        "chronic_analysis": "get_chronic_diseases_analysis",
        "compare_governorates": "compare_governorates_v2",
        "hospital_load": "get_hospital_load_analysis_v2",
        "disease_trends": "get_disease_trends_v2"
    }
    
    rpc_name = tool_mapping.get(tool_name)
    payload = {
        "p_start_date": params.get("start_date"),
        "p_end_date": params.get("end_date"),
        "p_city": params.get("city"),
        "p_disease_name": params.get("disease")
    }

    summary = await execute_with_relaxation(tool_name, rpc_name, payload, full_plan)
    save_to_cache(cache_key, summary)
    return summary
