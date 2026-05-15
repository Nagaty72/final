-- ======================================================
-- ENHANCED ANALYTICS RPCs (V2)
-- Supports filtering by date, city, and disease
-- ======================================================

-- 1. get_top_diseases_v2
CREATE OR REPLACE FUNCTION get_top_diseases_v2(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_city TEXT DEFAULT NULL
)
RETURNS TABLE(disease_name TEXT, total_cases BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT d.name, COUNT(m.id) as total_cases
    FROM diseases d
    JOIN medical_records m ON d.id = m.disease_id
    JOIN hospitals h ON m.hospital_id = h.id
    JOIN districts dst ON h.district_id = dst.id
    WHERE 
        (p_start_date IS NULL OR m.diagnosis_date >= p_start_date) AND
        (p_end_date IS NULL OR m.diagnosis_date <= p_end_date) AND
        (p_city IS NULL OR dst.city ILIKE p_city)
    GROUP BY d.name
    ORDER BY total_cases DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- 2. compare_governorates_v2
CREATE OR REPLACE FUNCTION compare_governorates_v2(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(city TEXT, total_cases BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT dst.city, COUNT(m.id) as total_cases
    FROM medical_records m
    JOIN hospitals h ON m.hospital_id = h.id
    JOIN districts dst ON h.district_id = dst.id
    WHERE 
        (p_start_date IS NULL OR m.diagnosis_date >= p_start_date) AND
        (p_end_date IS NULL OR m.diagnosis_date <= p_end_date)
    GROUP BY dst.city
    ORDER BY total_cases DESC;
END;
$$ LANGUAGE plpgsql;

-- 3. get_hospital_load_analysis_v2
CREATE OR REPLACE FUNCTION get_hospital_load_analysis_v2(
    p_city TEXT DEFAULT NULL
)
RETURNS TABLE(hospital_name TEXT, current_cases BIGINT, capacity INT, load_percentage FLOAT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.name,
        COUNT(m.id) as current_cases,
        h.capacity,
        CASE WHEN h.capacity > 0 THEN (COUNT(m.id)::FLOAT / h.capacity::FLOAT) * 100 ELSE 0 END as load_percentage
    FROM hospitals h
    JOIN districts dst ON h.district_id = dst.id
    LEFT JOIN medical_records m ON h.id = m.hospital_id
    WHERE (p_city IS NULL OR dst.city ILIKE p_city)
    GROUP BY h.id, h.name, h.capacity
    ORDER BY load_percentage DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. get_disease_trends_v2
CREATE OR REPLACE FUNCTION get_disease_trends_v2(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_disease_name TEXT DEFAULT NULL
)
RETURNS TABLE(month TEXT, total_cases BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT to_char(m.diagnosis_date, 'YYYY-MM') as month, COUNT(m.id) as total_cases
    FROM medical_records m
    JOIN diseases d ON m.disease_id = d.id
    WHERE 
        (p_start_date IS NULL OR m.diagnosis_date >= p_start_date) AND
        (p_end_date IS NULL OR m.diagnosis_date <= p_end_date) AND
        (p_disease_name IS NULL OR d.name ILIKE p_disease_name)
    GROUP BY month
    ORDER BY month ASC;
END;
$$ LANGUAGE plpgsql;
