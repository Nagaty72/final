import logging
import json
from app.core.supabase_client import supabase_client

logger = logging.getLogger(__name__)

def formatAnalyticsResponseByRole(role: str, value):
    """
    Restrict exact sensitive analytics values for normal_users.
    Super_admin and decision_maker get exact values.
    """
    if role in ["super_admin", "decision_maker"]:
        return value

    if isinstance(value, (int, float)):
        v = int(value)
        if v >= 100000:
            return "more than 100 thousand"
        elif v >= 10000:
            return "tens of thousands"
        elif v >= 1000:
            return "several thousand"
        elif v >= 100:
            return "hundreds of cases"
        elif v > 0:
            return "dozens of cases"
        else:
            return "zero cases"
    return value

def _sanitize_data(data, role: str):
    """Recursively apply formatting to data based on user role."""
    if isinstance(data, dict):
        return {k: _sanitize_data(v, role) if isinstance(v, (int, float, dict, list)) else formatAnalyticsResponseByRole(role, v) for k, v in data.items()}
    elif isinstance(data, list):
        return [_sanitize_data(item, role) for item in data]
    else:
        return formatAnalyticsResponseByRole(role, data)

def _format_data(data, role: str) -> str:
    """Format data cleanly for the AI prompt, applying role-based restrictions."""
    if not data:
        return "No data available in the database."
    sanitized = _sanitize_data(data, role)
    return json.dumps(sanitized, ensure_ascii=False, indent=2)

async def get_top_diseases(role: str = "normal_user") -> str:
    """Fetch most common diseases using PostgreSQL RPC."""
    try:
        data = await supabase_client.call_rpc("get_top_diseases")
        return _format_data(data, role)
    except Exception as e:
        logger.error(f"Error in get_top_diseases: {e}")
        return "Failed to fetch top diseases data."

async def get_chronic_diseases_analysis(role: str = "normal_user") -> str:
    """Fetch chronic disease statistics using PostgreSQL RPC."""
    try:
        data = await supabase_client.call_rpc("get_chronic_diseases_analysis")
        return _format_data(data, role)
    except Exception as e:
        logger.error(f"Error in get_chronic_diseases_analysis: {e}")
        return "Failed to fetch chronic disease statistics."

async def compare_governorates(role: str = "normal_user") -> str:
    """Compare total cases grouped by districts.city using PostgreSQL RPC."""
    try:
        data = await supabase_client.call_rpc("compare_governorates")
        return _format_data(data, role)
    except Exception as e:
        logger.error(f"Error in compare_governorates: {e}")
        return "Failed to fetch governorate comparison data."

async def get_hospital_load_analysis(role: str = "normal_user") -> str:
    """Compare hospital cases vs capacity using PostgreSQL RPC."""
    try:
        data = await supabase_client.call_rpc("get_hospital_load_analysis")
        return _format_data(data, role)
    except Exception as e:
        logger.error(f"Error in get_hospital_load_analysis: {e}")
        return "Failed to fetch hospital load analysis."

async def get_emergency_analysis(role: str = "normal_user") -> str:
    """Fetch hospitals where emergency_available = true using PostgreSQL RPC."""
    try:
        data = await supabase_client.call_rpc("get_emergency_analysis")
        return _format_data(data, role)
    except Exception as e:
        logger.error(f"Error in get_emergency_analysis: {e}")
        return "Failed to fetch emergency availability."

async def get_gender_analysis(role: str = "normal_user") -> str:
    """Analyze disease distribution by gender using PostgreSQL RPC."""
    try:
        data = await supabase_client.call_rpc("get_gender_analysis")
        return _format_data(data, role)
    except Exception as e:
        logger.error(f"Error in get_gender_analysis: {e}")
        return "Failed to fetch gender analysis."

async def get_age_group_analysis(role: str = "normal_user") -> str:
    """Calculate age groups using PostgreSQL RPC."""
    try:
        data = await supabase_client.call_rpc("get_age_group_analysis")
        return _format_data(data, role)
    except Exception as e:
        logger.error(f"Error in get_age_group_analysis: {e}")
        return "Failed to fetch age group analysis."

async def get_disease_trends(role: str = "normal_user") -> str:
    """Fetch disease trends over time using PostgreSQL RPC."""
    try:
        data = await supabase_client.call_rpc("get_disease_trends")
        return _format_data(data, role)
    except Exception as e:
        logger.error(f"Error in get_disease_trends: {e}")
        return "Failed to fetch disease trends."

async def get_outbreak_predictions(role: str = "normal_user") -> str:
    """Fetch outbreak predictions using PostgreSQL RPC."""
    try:
        data = await supabase_client.call_rpc("get_outbreak_predictions")
        return _format_data(data, role)
    except Exception as e:
        logger.error(f"Error in get_outbreak_predictions: {e}")
        return "Failed to fetch outbreak predictions."
