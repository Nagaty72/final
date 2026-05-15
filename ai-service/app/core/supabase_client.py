import os
import httpx
import logging
from pathlib import Path
from dotenv import load_dotenv
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

# Load env variables from backend/.env
_backend_env = Path(__file__).resolve().parents[3] / "backend" / ".env"
load_dotenv(dotenv_path=_backend_env)

SUPABASE_URL = os.getenv("SUPABASE_URL")
# Prefer service role key for backend AI service to ensure full access, fallback to anon key
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.warning("Supabase URL or Key not found in backend/.env")

class SupabaseClient:
    """Lightweight Supabase REST API client using httpx."""
    
    def __init__(self):
        self.base_url = f"{SUPABASE_URL}/rest/v1" if SUPABASE_URL else ""
        self.headers = {
            "apikey": SUPABASE_KEY or "",
            "Authorization": f"Bearer {SUPABASE_KEY or ''}",
            "Content-Profile": "public",
        }
        self.timeout = httpx.Timeout(15.0)

    async def fetch_data(
        self, 
        table: str, 
        select: str = "*", 
        limit: int = 100, 
        order: str = "", 
        filters: Dict[str, str] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch data from a Supabase table via REST API.
        """
        if not self.base_url:
            logger.error("Supabase client initialized without URL")
            return []

        url = f"{self.base_url}/{table}"
        params = {
            "select": select,
            "limit": str(limit)
        }
        
        if order:
            params["order"] = order
            
        if filters:
            for k, v in filters.items():
                params[k] = v

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=self.headers, params=params)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP status error fetching from Supabase table '{table}': {e}")
            return []
        except Exception as e:
            logger.error(f"Network or unknown error fetching from Supabase table '{table}': {e}")
            return []

    async def fetch_all_data(
        self, 
        table: str, 
        select: str = "*", 
        order: str = "", 
        filters: Dict[str, str] = None,
        chunk_size: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        Fetch ALL data from a Supabase table via REST API using offset/limit pagination.
        This ensures full-dataset aggregation instead of partial counts.
        """
        if not self.base_url:
            logger.error("Supabase client initialized without URL")
            return []

        url = f"{self.base_url}/{table}"
        all_results = []
        offset = 0

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                while True:
                    params = {
                        "select": select,
                        "limit": str(chunk_size),
                        "offset": str(offset)
                    }
                    if order:
                        params["order"] = order
                    if filters:
                        for k, v in filters.items():
                            params[k] = v

                    response = await client.get(url, headers=self.headers, params=params)
                    response.raise_for_status()
                    
                    data = response.json()
                    if not data:
                        break
                        
                    all_results.extend(data)
                    
                    if len(data) < chunk_size:
                        # We've reached the last page
                        break
                        
                    offset += chunk_size
                    
            return all_results
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP status error fetching all from '{table}' at offset {offset}: {e}")
            return all_results
        except Exception as e:
            logger.error(f"Network error fetching all from '{table}': {e}")
            return all_results

    async def call_rpc(
        self, 
        function_name: str, 
        payload: Dict[str, Any] = None
    ) -> Any:
        """
        Call a Supabase PostgreSQL function (RPC) via REST API.
        This provides high-performance SQL aggregation natively inside the database.
        """
        if not self.base_url:
            logger.error("Supabase client initialized without URL")
            return None

        url = f"{self.base_url}/rpc/{function_name}"
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, headers=self.headers, json=payload or {})
                response.raise_for_status()
                
                # RPCs can return empty content if they return void or just nothing
                if response.content:
                    return response.json()
                return []
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP status error calling RPC '{function_name}': {e.response.text if e.response else str(e)}")
            return None
        except Exception as e:
            logger.error(f"Network error calling RPC '{function_name}': {e}")
            return None

# Singleton instance for use across the app
supabase_client = SupabaseClient()
