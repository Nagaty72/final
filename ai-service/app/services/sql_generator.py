import re
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

# --- CONFIGURATION ---
ALLOWED_TABLES = {
    "medical_records", 
    "diseases", 
    "hospitals", 
    "districts", 
    "patients", 
    "disease_predictions"
}

FORBIDDEN_KEYWORDS = {
    "drop", "delete", "update", "insert", "alter", "create", "truncate", 
    "execute", "grant", "revoke", "comment", "copy", "reindex", "vacuum",
    "into", "outfile", "dumpfile", "information_schema", "pg_catalog", 
    "pg_user", "pg_authid", "pg_shadow", "pg_settings"
}

class SQLGenerator:
    """
    Safely converts an AI Execution Plan into a validated SQL query.
    """

    @staticmethod
    def generate_sql(plan: Dict[str, Any]) -> str:
        """
        Converts a structured plan into a SELECT statement.
        """
        intent = plan.get("intent", "general_analytics")
        filters = plan.get("filters", {})
        limit = plan.get("limit", 50)
        
        # 1. Base query selection based on intent
        # (This is a simplified generator that builds common analytical joins)
        
        if intent == "disease_trends" or "medical_records" in plan.get("tables", []):
            query = "SELECT m.diagnosis_date, d.name as disease, dst.city, COUNT(*) as count "
            query += "FROM medical_records m "
            query += "JOIN diseases d ON m.disease_id = d.id "
            query += "JOIN hospitals h ON m.hospital_id = h.id "
            query += "JOIN districts dst ON h.district_id = dst.id "
            query += "WHERE 1=1 "
        elif "hospitals" in plan.get("tables", []):
            query = "SELECT h.name, dst.city, h.capacity, h.emergency_available "
            query += "FROM hospitals h "
            query += "JOIN districts dst ON h.district_id = dst.id "
            query += "WHERE 1=1 "
        else:
            # Generic fallback if AI didn't specify tables clearly but wants analytics
            query = "SELECT * FROM medical_records WHERE 1=1 "

        # 2. Apply Filters
        if filters.get("date_range"):
            dr = filters["date_range"]
            if dr.get("start"):
                query += f" AND m.diagnosis_date >= '{dr['start']}'"
            if dr.get("end"):
                query += f" AND m.diagnosis_date <= '{dr['end']}'"
        
        if filters.get("city"):
            query += f" AND dst.city ILIKE '%{filters['city']}%'"
            
        if filters.get("disease"):
            query += f" AND d.name ILIKE '%{filters['disease']}%'"

        # 3. Apply Grouping & Ordering
        if "group_by" in plan:
            # Logic for group by can be complex, for now we keep it simple
            if "disease_name" in plan["group_by"]:
                query += " GROUP BY m.diagnosis_date, d.name, dst.city"
                query += " ORDER BY m.diagnosis_date DESC, count DESC"

        # 4. Enforce Limit
        query += f" LIMIT {limit};"
        
        return query

    @staticmethod
    def validate_sql(sql: str) -> bool:
        """
        Validates the generated SQL against a strict allowlist and blacklist.
        """
        clean_sql = sql.lower().strip()

        # 1. MUST be a SELECT statement
        if not clean_sql.startswith("select"):
            logger.error("Security violation: Query is not a SELECT statement.")
            return False

        # 2. Check for blacklisted keywords
        for keyword in FORBIDDEN_KEYWORDS:
            # Match whole word to avoid false positives (e.g., "update" vs "updated_at")
            if re.search(rf"\b{keyword}\b", clean_sql):
                logger.error(f"Security violation: Forbidden keyword '{keyword}' detected.")
                return False

        # 3. Check table allowlist
        # Extract table names using regex (look for FROM or JOIN followed by word)
        found_tables = re.findall(r"(?:from|join)\s+([a-zA-Z0-9_]+)", clean_sql)
        for table in found_tables:
            if table not in ALLOWED_TABLES:
                logger.error(f"Security violation: Access to table '{table}' is not allowed.")
                return False

        # 4. Prevent semi-colon chaining (multiple queries)
        if clean_sql.count(";") > 1 or (clean_sql.count(";") == 1 and not clean_sql.endswith(";")):
            logger.error("Security violation: Multiple queries or semicolon injection detected.")
            return False

        return True
