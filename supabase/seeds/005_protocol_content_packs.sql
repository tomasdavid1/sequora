-- Protocol Content Packs Seed Data
-- Comprehensive protocol packs for all 4 conditions with education levels

-- Heart Failure Protocol Pack - Low Education Level
INSERT INTO public."RedFlagRule" (
  condition_code,
  rule_code,
  description,
  severity,
  logic_spec,
  action_hint,
  active,
  created_at
) VALUES 
-- Heart Failure - Low Education Level Rules
('HF', 'HF_LOW_CHEST_PAIN', 'Chest pain or pressure (Low Education)', 'HIGH', 
 '{"any_text": ["chest pain", "pressure", "tightness", "squeezing"], "pain_score_gte": 7}', 
 'URGENT_NURSE_CALLBACK', true, NOW()),

('HF', 'HF_LOW_SHORTNESS_BREATH', 'Shortness of breath (Low Education)', 'MODERATE', 
 '{"any_text": ["shortness of breath", "can''t breathe", "hard to breathe", "breathing problems"]}', 
 'NURSE_CALLBACK_4H', true, NOW()),

('HF', 'HF_LOW_SWELLING', 'Swelling in feet/ankles (Low Education)', 'MODERATE', 
 '{"any_text": ["swollen", "swelling", "puffy", "feet", "ankles", "legs"]}', 
 'NURSE_CALLBACK_4H', true, NOW()),

('HF', 'HF_LOW_MEDICATION_MISSED', 'Missed heart medication (Low Education)', 'LOW', 
 '{"any_text": ["missed dose", "ran out", "forgot medication", "no pills", "empty bottle"]}', 
 'EDUCATION_ONLY', true, NOW()),

-- Heart Failure - Medium Education Level Rules
('HF', 'HF_MED_CHEST_PAIN', 'Chest pain or angina (Medium Education)', 'HIGH', 
 '{"any_text": ["chest pain", "pressure", "tightness", "squeezing", "angina"], "pain_score_gte": 7}', 
 'URGENT_NURSE_CALLBACK', true, NOW()),

('HF', 'HF_MED_DYSPNEA', 'Dyspnea or orthopnea (Medium Education)', 'MODERATE', 
 '{"any_text": ["shortness of breath", "dyspnea", "orthopnea", "paroxysmal nocturnal dyspnea"]}', 
 'NURSE_CALLBACK_4H', true, NOW()),

('HF', 'HF_MED_EDEMA', 'Peripheral edema (Medium Education)', 'MODERATE', 
 '{"any_text": ["peripheral edema", "swelling", "pitting edema", "weight gain"]}', 
 'NURSE_CALLBACK_4H', true, NOW()),

('HF', 'HF_MED_MEDICATION_ADHERENCE', 'Medication adherence issues (Medium Education)', 'LOW', 
 '{"any_text": ["medication adherence", "missed doses", "pharmacy issues", "cost concerns"]}', 
 'EDUCATION_ONLY', true, NOW()),

-- Heart Failure - High Education Level Rules
('HF', 'HF_HIGH_CHEST_PAIN', 'Acute chest pain (High Education)', 'HIGH', 
 '{"any_text": ["chest pain", "pressure", "tightness", "squeezing", "angina", "myocardial infarction"], "pain_score_gte": 7}', 
 'URGENT_NURSE_CALLBACK', true, NOW()),

('HF', 'HF_HIGH_DYSPNEA', 'Advanced dyspnea (High Education)', 'MODERATE', 
 '{"any_text": ["dyspnea", "orthopnea", "paroxysmal nocturnal dyspnea", "exertional dyspnea"]}', 
 'NURSE_CALLBACK_4H', true, NOW()),

('HF', 'HF_HIGH_EDEMA', 'Fluid overload (High Education)', 'MODERATE', 
 '{"any_text": ["peripheral edema", "pitting edema", "ascites", "weight gain", "fluid overload"]}', 
 'NURSE_CALLBACK_4H', true, NOW()),

('HF', 'HF_HIGH_MEDICATION_ADHERENCE', 'Optimal therapy adherence (High Education)', 'LOW', 
 '{"any_text": ["medication adherence", "ACE inhibitor", "beta blocker", "diuretic", "aldosterone antagonist"]}', 
 'EDUCATION_ONLY', true, NOW()),

-- COPD Protocol Pack - Low Education Level
('COPD', 'COPD_LOW_BREATHING_PROBLEMS', 'Severe breathing problems (Low Education)', 'HIGH', 
 '{"any_text": ["can''t breathe", "hard to breathe", "breathing problems", "wheezing"]}', 
 'URGENT_NURSE_CALLBACK', true, NOW()),

('COPD', 'COPD_LOW_COUGH', 'Cough and phlegm (Low Education)', 'MODERATE', 
 '{"any_text": ["cough", "coughing", "phlegm", "mucus", "sputum"]}', 
 'NURSE_CALLBACK_4H', true, NOW()),

('COPD', 'COPD_LOW_FEVER', 'Fever or infection signs (Low Education)', 'MODERATE', 
 '{"any_text": ["fever", "hot", "temperature", "sick"]}', 
 'NURSE_CALLBACK_4H', true, NOW()),

('COPD', 'COPD_LOW_INHALER_ACCESS', 'Inhaler access issues (Low Education)', 'LOW', 
 '{"any_text": ["inhaler", "puffer", "breathing medicine", "ran out"]}', 
 'EDUCATION_ONLY', true, NOW()),

-- COPD Protocol Pack - Medium Education Level
('COPD', 'COPD_MED_RESPIRATORY_DISTRESS', 'Respiratory distress (Medium Education)', 'HIGH', 
 '{"any_text": ["dyspnea", "shortness of breath", "respiratory distress", "wheezing"]}', 
 'URGENT_NURSE_CALLBACK', true, NOW()),

('COPD', 'COPD_MED_PRODUCTIVE_COUGH', 'Productive cough (Medium Education)', 'MODERATE', 
 '{"any_text": ["productive cough", "sputum", "purulent sputum", "increased sputum"]}', 
 'NURSE_CALLBACK_4H', true, NOW()),

('COPD', 'COPD_MED_SYSTEMIC_SYMPTOMS', 'Systemic symptoms (Medium Education)', 'MODERATE', 
 '{"any_text": ["fever", "chills", "malaise", "systemic symptoms"]}', 
 'NURSE_CALLBACK_4H', true, NOW()),

('COPD', 'COPD_MED_MEDICATION_MANAGEMENT', 'Medication management (Medium Education)', 'LOW', 
 '{"any_text": ["inhaler technique", "medication adherence", "bronchodilator", "corticosteroid"]}', 
 'EDUCATION_ONLY', true, NOW()),

-- COPD Protocol Pack - High Education Level
('COPD', 'COPD_HIGH_EXACERBATION', 'Acute exacerbation (High Education)', 'HIGH', 
 '{"any_text": ["acute exacerbation", "respiratory distress", "dyspnea", "wheezing", "respiratory failure"]}', 
 'URGENT_NURSE_CALLBACK', true, NOW()),

('COPD', 'COPD_HIGH_SPUTUM_CHANGE', 'Sputum production changes (High Education)', 'MODERATE', 
 '{"any_text": ["productive cough", "purulent sputum", "increased sputum production", "sputum color change"]}', 
 'NURSE_CALLBACK_4H', true, NOW()),

('COPD', 'COPD_HIGH_INFECTION', 'Infection signs (High Education)', 'MODERATE', 
 '{"any_text": ["fever", "chills", "malaise", "systemic symptoms", "infection"]}', 
 'NURSE_CALLBACK_4H', true, NOW()),

('COPD', 'COPD_HIGH_OPTIMAL_THERAPY', 'Optimal therapy adherence (High Education)', 'LOW', 
 '{"any_text": ["inhaler technique", "medication adherence", "bronchodilator", "corticosteroid", "long-acting bronchodilator"]}', 
 'EDUCATION_ONLY', true, NOW()),

-- AMI Protocol Pack - Low Education Level
('AMI', 'AMI_LOW_CHEST_PAIN', 'Chest pain or heart attack (Low Education)', 'HIGH', 
 '{"any_text": ["chest pain", "heart attack", "chest pressure", "squeezing"], "pain_score_gte": 8}', 
 'URGENT_NURSE_CALLBACK', true, NOW()),

('AMI', 'AMI_LOW_BREATHING_TROUBLE', 'Breathing problems (Low Education)', 'MODERATE', 
 '{"any_text": ["shortness of breath", "can''t breathe", "breathing problems"]}', 
 'NURSE_CALLBACK_4H', true, NOW()),

('AMI', 'AMI_LOW_DIZZY', 'Dizziness or weakness (Low Education)', 'MODERATE', 
 '{"any_text": ["dizzy", "lightheaded", "faint", "weak"]}', 
 'NURSE_CALLBACK_4H', true, NOW()),

('AMI', 'AMI_LOW_HEART_MEDICINE', 'Heart medication issues (Low Education)', 'LOW', 
 '{"any_text": ["heart medicine", "blood thinner", "aspirin", "missed dose"]}', 
 'EDUCATION_ONLY', true, NOW()),

-- AMI Protocol Pack - Medium Education Level
('AMI', 'AMI_MED_CHEST_PAIN', 'Chest pain or angina (Medium Education)', 'HIGH', 
 '{"any_text": ["chest pain", "angina", "chest pressure", "squeezing", "crushing"], "pain_score_gte": 8}', 
 'URGENT_NURSE_CALLBACK', true, NOW()),

('AMI', 'AMI_MED_DYSPNEA', 'Dyspnea (Medium Education)', 'MODERATE', 
 '{"any_text": ["dyspnea", "shortness of breath", "respiratory distress"]}', 
 'NURSE_CALLBACK_4H', true, NOW()),

('AMI', 'AMI_MED_CIRCULATORY', 'Circulatory symptoms (Medium Education)', 'MODERATE', 
 '{"any_text": ["dizziness", "lightheadedness", "syncope", "weakness"]}', 
 'NURSE_CALLBACK_4H', true, NOW()),

('AMI', 'AMI_MED_MEDICATION_ADHERENCE', 'Medication adherence (Medium Education)', 'LOW', 
 '{"any_text": ["medication adherence", "antiplatelet", "statin", "beta blocker", "ACE inhibitor"]}', 
 'EDUCATION_ONLY', true, NOW()),

-- AMI Protocol Pack - High Education Level
('AMI', 'AMI_HIGH_CHEST_PAIN', 'Acute chest pain (High Education)', 'HIGH', 
 '{"any_text": ["chest pain", "angina", "chest pressure", "squeezing", "crushing", "myocardial infarction"], "pain_score_gte": 8}', 
 'URGENT_NURSE_CALLBACK', true, NOW()),

('AMI', 'AMI_HIGH_DYSPNEA', 'Advanced dyspnea (High Education)', 'MODERATE', 
 '{"any_text": ["dyspnea", "shortness of breath", "respiratory distress", "pulmonary edema"]}', 
 'NURSE_CALLBACK_4H', true, NOW()),

('AMI', 'AMI_HIGH_CIRCULATORY', 'Advanced circulatory symptoms (High Education)', 'MODERATE', 
 '{"any_text": ["dizziness", "lightheadedness", "syncope", "weakness", "hypotension"]}', 
 'NURSE_CALLBACK_4H', true, NOW()),

('AMI', 'AMI_HIGH_OPTIMAL_THERAPY', 'Optimal medical therapy (High Education)', 'LOW', 
 '{"any_text": ["medication adherence", "antiplatelet therapy", "statin therapy", "beta blocker", "ACE inhibitor", "dual antiplatelet therapy"]}', 
 'EDUCATION_ONLY', true, NOW()),

-- Pneumonia Protocol Pack - Low Education Level
('PNA', 'PNA_LOW_FEVER', 'High fever (Low Education)', 'HIGH', 
 '{"any_text": ["fever", "hot", "temperature", "sick"], "temperature_gte": 101}', 
 'URGENT_NURSE_CALLBACK', true, NOW()),

('PNA', 'PNA_LOW_BREATHING_PROBLEMS', 'Breathing problems (Low Education)', 'HIGH', 
 '{"any_text": ["can''t breathe", "hard to breathe", "breathing problems", "shortness of breath"]}', 
 'URGENT_NURSE_CALLBACK', true, NOW()),

('PNA', 'PNA_LOW_COUGH', 'Cough and phlegm (Low Education)', 'MODERATE', 
 '{"any_text": ["cough", "coughing", "phlegm", "mucus", "sputum"]}', 
 'NURSE_CALLBACK_4H', true, NOW()),

('PNA', 'PNA_LOW_ANTIBIOTIC', 'Antibiotic issues (Low Education)', 'LOW', 
 '{"any_text": ["antibiotic", "medicine", "pills", "missed dose", "ran out"]}', 
 'EDUCATION_ONLY', true, NOW()),

-- Pneumonia Protocol Pack - Medium Education Level
('PNA', 'PNA_MED_FEVER', 'High fever (Medium Education)', 'HIGH', 
 '{"any_text": ["fever", "pyrexia", "temperature", "systemic symptoms"], "temperature_gte": 101}', 
 'URGENT_NURSE_CALLBACK', true, NOW()),

('PNA', 'PNA_MED_RESPIRATORY_DISTRESS', 'Respiratory distress (Medium Education)', 'HIGH', 
 '{"any_text": ["dyspnea", "shortness of breath", "respiratory distress", "tachypnea"]}', 
 'URGENT_NURSE_CALLBACK', true, NOW()),

('PNA', 'PNA_MED_PRODUCTIVE_COUGH', 'Productive cough (Medium Education)', 'MODERATE', 
 '{"any_text": ["productive cough", "sputum", "purulent sputum", "increased sputum"]}', 
 'NURSE_CALLBACK_4H', true, NOW()),

('PNA', 'PNA_MED_ANTIBIOTIC_ADHERENCE', 'Antibiotic adherence (Medium Education)', 'LOW', 
 '{"any_text": ["antibiotic adherence", "medication compliance", "antimicrobial therapy"]}', 
 'EDUCATION_ONLY', true, NOW()),

-- Pneumonia Protocol Pack - High Education Level
('PNA', 'PNA_HIGH_SEPSIS', 'Sepsis risk (High Education)', 'HIGH', 
 '{"any_text": ["fever", "pyrexia", "temperature", "systemic symptoms", "sepsis"], "temperature_gte": 101}', 
 'URGENT_NURSE_CALLBACK', true, NOW()),

('PNA', 'PNA_HIGH_RESPIRATORY_FAILURE', 'Respiratory failure (High Education)', 'HIGH', 
 '{"any_text": ["dyspnea", "shortness of breath", "respiratory distress", "tachypnea", "respiratory failure"]}', 
 'URGENT_NURSE_CALLBACK', true, NOW()),

('PNA', 'PNA_HIGH_SPUTUM_CHANGE', 'Sputum changes (High Education)', 'MODERATE', 
 '{"any_text": ["productive cough", "sputum", "purulent sputum", "increased sputum production", "sputum culture"]}', 
 'NURSE_CALLBACK_4H', true, NOW()),

('PNA', 'PNA_HIGH_OPTIMAL_THERAPY', 'Optimal antibiotic therapy (High Education)', 'LOW', 
 '{"any_text": ["antibiotic adherence", "medication compliance", "antimicrobial therapy", "antibiotic resistance"]}', 
 'EDUCATION_ONLY', true, NOW());