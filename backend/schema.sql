-- =========================
-- EXTENSIONS
-- =========================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- =========================
-- ROLES
-- =========================
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

INSERT INTO roles (name) VALUES
('super_admin'),
('decision_maker'),
('normal_user')
ON CONFLICT DO NOTHING;

-- =========================
-- USERS
-- =========================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role_id INT REFERENCES roles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role_id);

-- =========================
-- GEOGRAPHY: DISTRICTS
-- =========================
CREATE TABLE districts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(name, city)
);

CREATE INDEX idx_districts_city ON districts(city);

-- =========================
-- HOSPITALS
-- =========================
CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT NOT NULL,
  district_id UUID REFERENCES districts(id),

  location GEOGRAPHY(POINT, 4326),
  capacity INT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_hospitals_city ON hospitals(city);
CREATE INDEX idx_hospitals_district ON hospitals(district_id);
CREATE INDEX idx_hospitals_location ON hospitals USING GIST(location);

-- =========================
-- DISEASES
-- =========================
CREATE TABLE diseases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  category TEXT,
  is_chronic BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_diseases_category ON diseases(category);

-- =========================
-- PATIENTS
-- =========================
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gender TEXT,
  birth_date DATE,

  city TEXT,
  district_id UUID REFERENCES districts(id),

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_patients_city ON patients(city);
CREATE INDEX idx_patients_district ON patients(district_id);

-- =========================
-- MEDICAL RECORDS (CORE TABLE)
-- =========================
CREATE TABLE medical_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  patient_id UUID NOT NULL,
  hospital_id UUID NOT NULL,
  disease_id UUID NOT NULL,

  diagnosis_date DATE NOT NULL,
  severity INT,
  outcome TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  CONSTRAINT fk_disease FOREIGN KEY (disease_id) REFERENCES diseases(id),

  CONSTRAINT valid_severity CHECK (severity BETWEEN 1 AND 5)
);

CREATE INDEX idx_records_date ON medical_records(diagnosis_date);
CREATE INDEX idx_records_disease ON medical_records(disease_id);
CREATE INDEX idx_records_hospital ON medical_records(hospital_id);
CREATE INDEX idx_records_patient ON medical_records(patient_id);
CREATE INDEX idx_records_disease_date ON medical_records(disease_id, diagnosis_date);
CREATE INDEX idx_records_hospital_date ON medical_records(hospital_id, diagnosis_date);

-- =========================
-- DAILY ANALYTICS (AGGREGATED)
-- =========================
CREATE TABLE disease_stats_daily (
  id SERIAL PRIMARY KEY,

  disease_id UUID NOT NULL,
  district_id UUID,
  date DATE NOT NULL,

  total_cases INT DEFAULT 0,

  CONSTRAINT fk_stats_disease FOREIGN KEY (disease_id) REFERENCES diseases(id),
  CONSTRAINT fk_stats_district FOREIGN KEY (district_id) REFERENCES districts(id),

  UNIQUE(disease_id, district_id, date)
);

CREATE INDEX idx_stats_disease_date ON disease_stats_daily(disease_id, date);
CREATE INDEX idx_stats_district ON disease_stats_daily(district_id);

-- =========================
-- AI PREDICTIONS
-- =========================
CREATE TABLE disease_predictions (
  id SERIAL PRIMARY KEY,

  disease_id UUID NOT NULL,
  district_id UUID,

  prediction_date DATE NOT NULL,
  predicted_cases INT,
  model_version TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_pred_disease FOREIGN KEY (disease_id) REFERENCES diseases(id),
  CONSTRAINT fk_pred_district FOREIGN KEY (district_id) REFERENCES districts(id)
);

CREATE INDEX idx_predictions_disease_date ON disease_predictions(disease_id, prediction_date);
CREATE INDEX idx_predictions_district ON disease_predictions(district_id);

-- =========================
-- REPORTS
-- =========================
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  type TEXT,
  file_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_report_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_reports_user ON reports(user_id);

-- =========================
-- REFRESH TOKENS
-- =========================
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- =========================
-- BACKGROUND JOBS
-- =========================
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',

  payload JSONB,
  error TEXT,
  retries INT DEFAULT 0,

  scheduled_at TIMESTAMP,
  completed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_type ON jobs(type);

-- =========================
-- MATERIALIZED VIEW (FAST DASHBOARD)
-- =========================
CREATE MATERIALIZED VIEW disease_summary AS
SELECT 
  disease_id,
  COUNT(*) AS total_cases
FROM medical_records
GROUP BY disease_id;

CREATE OR REPLACE FUNCTION refresh_disease_summary()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW disease_summary;
END;
$$ LANGUAGE plpgsql;
