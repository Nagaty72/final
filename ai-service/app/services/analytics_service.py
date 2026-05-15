import logging
import json
from app.core.supabase_client import supabase_client

logger = logging.getLogger(__name__)

def _format_data(data) -> str:
    """Format data cleanly for the AI prompt."""
    if not data:
        return "No data available in the database."
    return json.dumps(data, ensure_ascii=False, indent=2)

async def get_top_diseases() -> str:
    """Fetch most common diseases using PostgreSQL RPC."""
    try:
        data = await supabase_client.call_rpc("get_top_diseases")
        return _format_data(data)
    except Exception as e:
        logger.error(f"Error in get_top_diseases: {e}")
        return "Failed to fetch top diseases data."

async def get_chronic_diseases_analysis() -> str:
    """Fetch chronic disease statistics using PostgreSQL RPC."""
    try:
        data = await supabase_client.call_rpc("get_chronic_diseases_analysis")
        return _format_data(data)
    except Exception as e:
        logger.error(f"Error in get_chronic_diseases_analysis: {e}")
        return "Failed to fetch chronic disease statistics."

async def compare_governorates() -> str:
    """Compare total cases grouped by districts.city using PostgreSQL RPC."""
    try:
        data = await supabase_client.call_rpc("compare_governorates")
        return _format_data(data)
    except Exception as e:
        logger.error(f"Error in compare_governorates: {e}")
        return "Failed to fetch governorate comparison data."

async def get_hospital_load_analysis() -> str:
    """Compare hospital cases vs capacity using PostgreSQL RPC."""
    try:
        data = await supabase_client.call_rpc("get_hospital_load_analysis")
        return _format_data(data)
    except Exception as e:
        logger.error(f"Error in get_hospital_load_analysis: {e}")
        return "Failed to fetch hospital load analysis."

async def get_emergency_analysis() -> str:
    """Fetch hospitals where emergency_available = true using PostgreSQL RPC."""
    try:
        data = await supabase_client.call_rpc("get_emergency_analysis")
        return _format_data(data)
    except Exception as e:
        logger.error(f"Error in get_emergency_analysis: {e}")
        return "Failed to fetch emergency availability."

async def get_gender_analysis() -> str:
    """Analyze disease distribution by gender using PostgreSQL RPC."""
    try:
        data = await supabase_client.call_rpc("get_gender_analysis")
        return _format_data(data)
    except Exception as e:
        logger.error(f"Error in get_gender_analysis: {e}")
        return "Failed to fetch gender analysis."

async def get_age_group_analysis() -> str:
    """Calculate age groups using PostgreSQL RPC."""
    try:
        data = await supabase_client.call_rpc("get_age_group_analysis")
        return _format_data(data)
    except Exception as e:
        logger.error(f"Error in get_age_group_analysis: {e}")
        return "Failed to fetch age group analysis."

async def get_disease_trends() -> str:
    """Fetch disease trends over time using PostgreSQL RPC."""
    try:
        data = await supabase_client.call_rpc("get_disease_trends")
        return _format_data(data)
    except Exception as e:
        logger.error(f"Error in get_disease_trends: {e}")
        return "Failed to fetch disease trends."

async def get_outbreak_predictions() -> str:
    """Fetch outbreak predictions using PostgreSQL RPC."""
    try:
        data = await supabase_client.call_rpc("get_outbreak_predictions")
        return _format_data(data)
    except Exception as e:
        logger.error(f"Error in get_outbreak_predictions: {e}")
        return "Failed to fetch outbreak predictions."
