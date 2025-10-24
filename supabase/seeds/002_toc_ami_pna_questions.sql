-- Seed AMI and PNA outreach questions and red flag rules

set search_path = public;

-- AMI Questions (English)
insert into outreach_question (condition_code, code, version, text, response_type, language_code, active) values
('AMI', 'AMI_CHEST_PAIN', 1, 'Have you experienced any chest pain or pressure since discharge?', 'YES_NO', 'EN', true),
('AMI', 'AMI_DYSPNEA', 1, 'Are you experiencing shortness of breath?', 'YES_NO', 'EN', true),
('AMI', 'AMI_MED_PICKUP', 1, 'Have you picked up all your heart medications from the pharmacy?', 'YES_NO', 'EN', true),
('AMI', 'AMI_MED_TOLERANCE', 1, 'Are you experiencing side effects from your medications?', 'YES_NO', 'EN', true),
('AMI', 'AMI_CARDIAC_REHAB', 1, 'Have you scheduled your cardiac rehabilitation appointment?', 'YES_NO', 'EN', true),
('AMI', 'AMI_APPT_CONFIRMED', 1, 'Do you have a follow-up appointment scheduled with your cardiologist?', 'YES_NO', 'EN', true);

-- AMI Questions (Spanish)
insert into outreach_question (condition_code, code, version, text, response_type, language_code, active) values
('AMI', 'AMI_CHEST_PAIN', 1, '¿Ha experimentado dolor o presión en el pecho desde el alta?', 'YES_NO', 'ES', true),
('AMI', 'AMI_DYSPNEA', 1, '¿Tiene falta de aire?', 'YES_NO', 'ES', true),
('AMI', 'AMI_MED_PICKUP', 1, '¿Ha recogido todos sus medicamentos cardíacos de la farmacia?', 'YES_NO', 'ES', true),
('AMI', 'AMI_MED_TOLERANCE', 1, '¿Está experimentando efectos secundarios de sus medicamentos?', 'YES_NO', 'ES', true),
('AMI', 'AMI_CARDIAC_REHAB', 1, '¿Ha programado su cita de rehabilitación cardíaca?', 'YES_NO', 'ES', true),
('AMI', 'AMI_APPT_CONFIRMED', 1, '¿Tiene una cita de seguimiento con su cardiólogo?', 'YES_NO', 'ES', true);

-- PNA Questions (English)
insert into outreach_question (condition_code, code, version, text, response_type, language_code, active) values
('PNA', 'PNA_FEVER', 1, 'Have you had a fever over 101°F in the last 24 hours?', 'YES_NO', 'EN', true),
('PNA', 'PNA_DYSPNEA', 1, 'Is your breathing getting worse?', 'YES_NO', 'EN', true),
('PNA', 'PNA_COUGH', 1, 'Is your cough getting worse or are you coughing up more mucus?', 'YES_NO', 'EN', true),
('PNA', 'PNA_ANTIBIOTIC_PICKUP', 1, 'Have you picked up your antibiotic from the pharmacy?', 'YES_NO', 'EN', true),
('PNA', 'PNA_ANTIBIOTIC_ADHERENCE', 1, 'Are you taking your antibiotic as prescribed?', 'YES_NO', 'EN', true),
('PNA', 'PNA_SIDE_EFFECTS', 1, 'Are you experiencing side effects from the antibiotic?', 'YES_NO', 'EN', true),
('PNA', 'PNA_APPT_CONFIRMED', 1, 'Do you have a follow-up appointment scheduled?', 'YES_NO', 'EN', true);

-- PNA Questions (Spanish)
insert into outreach_question (condition_code, code, version, text, response_type, language_code, active) values
('PNA', 'PNA_FEVER', 1, '¿Ha tenido fiebre de más de 101°F en las últimas 24 horas?', 'YES_NO', 'ES', true),
('PNA', 'PNA_DYSPNEA', 1, '¿Su respiración está empeorando?', 'YES_NO', 'ES', true),
('PNA', 'PNA_COUGH', 1, '¿Su tos está empeorando o está tosiendo más moco?', 'YES_NO', 'ES', true),
('PNA', 'PNA_ANTIBIOTIC_PICKUP', 1, '¿Ha recogido su antibiótico de la farmacia?', 'YES_NO', 'ES', true),
('PNA', 'PNA_ANTIBIOTIC_ADHERENCE', 1, '¿Está tomando su antibiótico según lo recetado?', 'YES_NO', 'ES', true),
('PNA', 'PNA_SIDE_EFFECTS', 1, '¿Está experimentando efectos secundarios del antibiótico?', 'YES_NO', 'ES', true),
('PNA', 'PNA_APPT_CONFIRMED', 1, '¿Tiene una cita de seguimiento programada?', 'YES_NO', 'ES', true);

-- Red Flag Rules for AMI
insert into redflag_rule (condition_code, rule_code, description, severity, logic_spec, action_hint, active) values
('AMI', 'AMI_CHEST_PAIN_RECURRENT', 'Recurrent chest pain post-discharge', 'CRITICAL', '{"question_code": "AMI_CHEST_PAIN", "operator": "=", "value": "YES"}', 'ED_REFERRAL', true),
('AMI', 'AMI_DYSPNEA_NEW', 'New or worsening shortness of breath', 'HIGH', '{"question_code": "AMI_DYSPNEA", "operator": "=", "value": "YES"}', 'URGENT_TELEVISIT', true),
('AMI', 'AMI_MED_NOT_FILLED', 'Cardiac medications not picked up', 'HIGH', '{"question_code": "AMI_MED_PICKUP", "operator": "=", "value": "NO"}', 'NURSE_CALLBACK_2H', true),
('AMI', 'AMI_MED_INTOLERANCE', 'Medication side effects reported', 'MODERATE', '{"question_code": "AMI_MED_TOLERANCE", "operator": "=", "value": "YES"}', 'NURSE_CALLBACK_24H', true);

-- Red Flag Rules for PNA
insert into redflag_rule (condition_code, rule_code, description, severity, logic_spec, action_hint, active) values
('PNA', 'PNA_PERSISTENT_FEVER', 'Fever >101F after 48h of antibiotics', 'HIGH', '{"question_code": "PNA_FEVER", "operator": "=", "value": "YES"}', 'URGENT_TELEVISIT', true),
('PNA', 'PNA_WORSENING_DYSPNEA', 'Worsening dyspnea', 'HIGH', '{"question_code": "PNA_DYSPNEA", "operator": "=", "value": "YES"}', 'NURSE_CALLBACK_2H', true),
('PNA', 'PNA_ANTIBIOTIC_NOT_FILLED', 'Antibiotic not picked up after 24h', 'HIGH', '{"question_code": "PNA_ANTIBIOTIC_PICKUP", "operator": "=", "value": "NO"}', 'NURSE_CALLBACK_2H', true),
('PNA', 'PNA_NON_ADHERENT', 'Not taking antibiotic as prescribed', 'MODERATE', '{"question_code": "PNA_ANTIBIOTIC_ADHERENCE", "operator": "=", "value": "NO"}', 'NURSE_CALLBACK_24H', true);

