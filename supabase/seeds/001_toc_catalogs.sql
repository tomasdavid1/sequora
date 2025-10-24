-- Seed outreach questions and red flag rules for HF, COPD, AMI, PNA

set search_path = public;

-- HF Questions (English)
insert into outreach_question (condition_code, code, version, text, response_type, unit, min_value, language_code, active) values
('HF', 'HF_WEIGHT_DELTA', 1, 'What is your weight today compared to your discharge weight?', 'NUMERIC', 'lb', -50, 'EN', true),
('HF', 'HF_DYSPNEA_REST', 1, 'Are you experiencing shortness of breath while resting?', 'YES_NO', null, null, 'EN', true),
('HF', 'HF_SWELLING', 1, 'Have you noticed new or worsening swelling in your legs or ankles?', 'YES_NO', null, null, 'EN', true),
('HF', 'HF_MED_PICKUP', 1, 'Have you picked up your water pill (diuretic) from the pharmacy?', 'YES_NO', null, null, 'EN', true),
('HF', 'HF_APPT_CONFIRMED', 1, 'Do you have a follow-up appointment scheduled with your doctor?', 'YES_NO', null, null, 'EN', true);

-- HF Questions (Spanish)
insert into outreach_question (condition_code, code, version, text, response_type, unit, min_value, language_code, active) values
('HF', 'HF_WEIGHT_DELTA', 1, '¿Cuál es su peso hoy en comparación con su peso al alta?', 'NUMERIC', 'lb', -50, 'ES', true),
('HF', 'HF_DYSPNEA_REST', 1, '¿Tiene falta de aire mientras descansa?', 'YES_NO', null, null, 'ES', true),
('HF', 'HF_SWELLING', 1, '¿Ha notado hinchazón nueva o que empeora en sus piernas o tobillos?', 'YES_NO', null, null, 'ES', true),
('HF', 'HF_MED_PICKUP', 1, '¿Ha recogido su pastilla de agua (diurético) de la farmacia?', 'YES_NO', null, null, 'ES', true),
('HF', 'HF_APPT_CONFIRMED', 1, '¿Tiene una cita programada con su médico?', 'YES_NO', null, null, 'ES', true);

-- COPD Questions (English)
insert into outreach_question (condition_code, code, version, text, response_type, unit, min_value, language_code, active) values
('COPD', 'COPD_RESCUE_USE', 1, 'How many times have you used your rescue inhaler in the last 24 hours?', 'NUMERIC', 'times', 0, 'EN', true),
('COPD', 'COPD_DYSPNEA_INCREASE', 1, 'Is your shortness of breath worse than when you left the hospital?', 'YES_NO', null, null, 'EN', true),
('COPD', 'COPD_COUGH_CHANGE', 1, 'Has your cough or mucus production changed?', 'YES_NO', null, null, 'EN', true),
('COPD', 'COPD_MED_PICKUP', 1, 'Have you picked up all your inhalers and medications from the pharmacy?', 'YES_NO', null, null, 'EN', true),
('COPD', 'COPD_APPT_CONFIRMED', 1, 'Do you have a follow-up appointment scheduled?', 'YES_NO', null, null, 'EN', true);

-- COPD Questions (Spanish)
insert into outreach_question (condition_code, code, version, text, response_type, unit, min_value, language_code, active) values
('COPD', 'COPD_RESCUE_USE', 1, '¿Cuántas veces ha usado su inhalador de rescate en las últimas 24 horas?', 'NUMERIC', 'times', 0, 'ES', true),
('COPD', 'COPD_DYSPNEA_INCREASE', 1, '¿Su falta de aire es peor que cuando salió del hospital?', 'YES_NO', null, null, 'ES', true),
('COPD', 'COPD_COUGH_CHANGE', 1, '¿Ha cambiado su tos o producción de moco?', 'YES_NO', null, null, 'ES', true),
('COPD', 'COPD_MED_PICKUP', 1, '¿Ha recogido todos sus inhaladores y medicamentos de la farmacia?', 'YES_NO', null, null, 'ES', true),
('COPD', 'COPD_APPT_CONFIRMED', 1, '¿Tiene una cita de seguimiento programada?', 'YES_NO', null, null, 'ES', true);

-- AMI Questions (English)
insert into outreach_question (condition_code, code, version, text, response_type, unit, language_code, active) values
('AMI', 'AMI_CHEST_PAIN', 1, 'Have you experienced any chest pain or pressure since discharge?', 'YES_NO', null, 'EN', true),
('AMI', 'AMI_MED_PICKUP', 1, 'Have you picked up your heart medications from the pharmacy?', 'YES_NO', null, 'EN', true),
('AMI', 'AMI_CARDIAC_REHAB', 1, 'Have you scheduled your cardiac rehabilitation appointment?', 'YES_NO', null, 'EN', true);

-- PNA Questions (English)
insert into outreach_question (condition_code, code, version, text, response_type, unit, language_code, active) values
('PNA', 'PNA_FEVER', 1, 'Have you had a fever over 101°F in the last 24 hours?', 'YES_NO', null, 'EN', true),
('PNA', 'PNA_DYSPNEA', 1, 'Is your breathing getting worse?', 'YES_NO', null, 'EN', true),
('PNA', 'PNA_ANTIBIOTIC_PICKUP', 1, 'Have you picked up your antibiotic from the pharmacy?', 'YES_NO', null, 'EN', true);

-- Red Flag Rules for HF
insert into redflag_rule (condition_code, rule_code, description, severity, logic_spec, action_hint, active) values
('HF', 'HF_WEIGHT_GAIN_2LB_24H', 'Weight gain of 2+ lbs in 24 hours', 'HIGH', '{"question_code": "HF_WEIGHT_DELTA", "operator": ">=", "threshold": 2}', 'NURSE_CALLBACK_2H', true),
('HF', 'HF_WEIGHT_GAIN_4LB_3D', 'Weight gain of 4+ lbs in 3 days', 'HIGH', '{"question_code": "HF_WEIGHT_DELTA", "operator": ">=", "threshold": 4}', 'NURSE_CALLBACK_2H', true),
('HF', 'HF_DYSPNEA_AT_REST', 'Dyspnea at rest reported', 'CRITICAL', '{"question_code": "HF_DYSPNEA_REST", "operator": "=", "value": "YES"}', 'URGENT_TELEVISIT', true),
('HF', 'HF_MED_NOT_FILLED', 'Diuretic not picked up after 48h', 'MODERATE', '{"question_code": "HF_MED_PICKUP", "operator": "=", "value": "NO"}', 'NURSE_CALLBACK_24H', true);

-- Red Flag Rules for COPD
insert into redflag_rule (condition_code, rule_code, description, severity, logic_spec, action_hint, active) values
('COPD', 'COPD_RESCUE_OVERUSE', 'Rescue inhaler used >2x above baseline per day', 'HIGH', '{"question_code": "COPD_RESCUE_USE", "operator": ">", "threshold": 4}', 'NURSE_CALLBACK_2H', true),
('COPD', 'COPD_WORSENING_DYSPNEA', 'Worsening dyspnea reported', 'HIGH', '{"question_code": "COPD_DYSPNEA_INCREASE", "operator": "=", "value": "YES"}', 'NURSE_CALLBACK_2H', true),
('COPD', 'COPD_MED_NOT_FILLED', 'Inhalers not picked up after 48h', 'MODERATE', '{"question_code": "COPD_MED_PICKUP", "operator": "=", "value": "NO"}', 'NURSE_CALLBACK_24H', true);

-- Red Flag Rules for AMI
insert into redflag_rule (condition_code, rule_code, description, severity, logic_spec, action_hint, active) values
('AMI', 'AMI_CHEST_PAIN_RECURRENT', 'Recurrent chest pain post-discharge', 'CRITICAL', '{"question_code": "AMI_CHEST_PAIN", "operator": "=", "value": "YES"}', 'ED_REFERRAL', true),
('AMI', 'AMI_MED_NOT_FILLED', 'Cardiac medications not picked up', 'HIGH', '{"question_code": "AMI_MED_PICKUP", "operator": "=", "value": "NO"}', 'NURSE_CALLBACK_2H', true);

-- Red Flag Rules for PNA
insert into redflag_rule (condition_code, rule_code, description, severity, logic_spec, action_hint, active) values
('PNA', 'PNA_PERSISTENT_FEVER', 'Fever >101F after 48h of antibiotics', 'HIGH', '{"question_code": "PNA_FEVER", "operator": "=", "value": "YES"}', 'URGENT_TELEVISIT', true),
('PNA', 'PNA_WORSENING_DYSPNEA', 'Worsening dyspnea', 'HIGH', '{"question_code": "PNA_DYSPNEA", "operator": "=", "value": "YES"}', 'NURSE_CALLBACK_2H', true),
('PNA', 'PNA_ANTIBIOTIC_NOT_FILLED', 'Antibiotic not picked up after 24h', 'HIGH', '{"question_code": "PNA_ANTIBIOTIC_PICKUP", "operator": "=", "value": "NO"}', 'NURSE_CALLBACK_2H', true);

