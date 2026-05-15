-- ==========================================
-- ADD MISSING COLUMNS
-- ==========================================
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS emergency_available BOOLEAN DEFAULT FALSE;

-- ==========================================
-- RPCs FOR AI ANALYTICS SERVICE
-- ==========================================

-- 1. get_top_diseases
CREATE OR REPLACE FUNCTION get_top_diseases()
RETURNS TABLE(disease_name TEXT, total_cases BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT d.name, COUNT(m.id) as total_cases
    FROM diseases d
    JOIN medical_records m ON d.id = m.disease_id
    GROUP BY d.name
    ORDER BY total_cases DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- 2. get_chronic_diseases_analysis
CREATE OR REPLACE FUNCTION get_chronic_diseases_analysis()
RETURNS TABLE(category TEXT, total_cases BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE WHEN d.is_chronic THEN 'Chronic' ELSE 'Non-Chronic' END as category,
        COUNT(m.id) as total_cases
    FROM diseases d
    JOIN medical_records m ON d.id = m.disease_id
    GROUP BY d.is_chronic;
END;
$$ LANGUAGE plpgsql;

-- 3. compare_governorates
CREATE OR REPLACE FUNCTION compare_governorates()
RETURNS TABLE(city TEXT, total_cases BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT dst.city, COUNT(m.id) as total_cases
    FROM medical_records m
    JOIN hospitals h ON m.hospital_id = h.id
    JOIN districts dst ON h.district_id = dst.id
    GROUP BY dst.city
    ORDER BY total_cases DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. get_hospital_load_analysis
CREATE OR REPLACE FUNCTION get_hospital_load_analysis()
RETURNS TABLE(hospital_name TEXT, current_cases BIGINT, capacity INT, load_percentage FLOAT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.name,
        COUNT(m.id) as current_cases,
        h.capacity,
        CASE WHEN h.capacity > 0 THEN (COUNT(m.id)::FLOAT / h.capacity::FLOAT) * 100 ELSE 0 END as load_percentage
    FROM hospitals h
    LEFT JOIN medical_records m ON h.id = m.hospital_id
    GROUP BY h.id, h.name, h.capacity
    ORDER BY load_percentage DESC;
END;
$$ LANGUAGE plpgsql;

-- 5. get_emergency_analysis
CREATE OR REPLACE FUNCTION get_emergency_analysis()
RETURNS TABLE(hospital_name TEXT, city TEXT, emergency_available BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT name, city, emergency_available
    FROM hospitals
    WHERE emergency_available = TRUE;
END;
$$ LANGUAGE plpgsql;

-- 6. get_gender_analysis
CREATE OR REPLACE FUNCTION get_gender_analysis()
RETURNS TABLE(gender TEXT, total_cases BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT p.gender, COUNT(m.id) as total_cases
    FROM patients p
    JOIN medical_records m ON p.id = m.patient_id
    GROUP BY p.gender;
END;
$$ LANGUAGE plpgsql;

-- 7. get_age_group_analysis
CREATE OR REPLACE FUNCTION get_age_group_analysis()
RETURNS TABLE(age_group TEXT, total_cases BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN date_part('year', age(p.birth_date)) < 18 THEN '0-17'
            WHEN date_part('year', age(p.birth_date)) BETWEEN 18 AND 35 THEN '18-35'
            WHEN date_part('year', age(p.birth_date)) BETWEEN 36 AND 60 THEN '36-60'
            ELSE '60+'
        END as age_group,
        COUNT(m.id) as total_cases
    FROM patients p
    JOIN medical_records m ON p.id = m.patient_id
    GROUP BY age_group;
END;
$$ LANGUAGE plpgsql;

-- 8. get_disease_trends
CREATE OR REPLACE FUNCTION get_disease_trends()
RETURNS TABLE(month TEXT, total_cases BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT to_char(diagnosis_date, 'YYYY-MM') as month, COUNT(id) as total_cases
    FROM medical_records
    GROUP BY month
    ORDER BY month ASC;
END;
$$ LANGUAGE plpgsql;

-- 9. get_outbreak_predictions
CREATE OR REPLACE FUNCTION get_outbreak_predictions()
RETURNS TABLE(disease_name TEXT, prediction_date DATE, predicted_cases INT) AS $$
BEGIN
    RETURN QUERY
    SELECT d.name, p.prediction_date, p.predicted_cases
    FROM disease_predictions p
    JOIN diseases d ON p.disease_id = d.id
    ORDER BY p.prediction_date ASC;
END;
$$ LANGUAGE plpgsql;
