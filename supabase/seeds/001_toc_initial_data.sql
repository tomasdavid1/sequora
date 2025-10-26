-- TOC Initial Data Seeds
-- Seed initial data for the Transition of Care platform

-- Insert default agent configurations
INSERT INTO public."AgentConfig" (agent_type, name, description, active) VALUES
('OUTREACH_COORDINATOR', 'Outreach Coordinator', 'Primary agent for patient outreach and check-ins', true),
('MEDICATION_ADVISOR', 'Medication Advisor', 'Agent specialized in medication adherence and questions', true),
('TRIAGE_AGENT', 'Triage Agent', 'Agent for initial patient response analysis and flagging', true),
('EDUCATION_AGENT', 'Education Agent', 'Agent for patient education and condition-specific guidance', true),
('ESCALATION_HANDLER', 'Escalation Handler', 'Agent for managing escalation workflows', true);

-- Insert default outreach questions for Heart Failure
INSERT INTO public."OutreachQuestion" (condition_code, code, text, response_type, choices, active) VALUES
('HF', 'HF_WEIGHT_DELTA', 'How much weight have you gained since yesterday?', 'NUMERIC', NULL, true),
('HF', 'HF_BREATHING', 'Are you having more trouble breathing than usual?', 'YES_NO', NULL, true),
('HF', 'HF_SWELLING', 'Do you have swelling in your feet, ankles, or legs?', 'YES_NO', NULL, true),
('HF', 'HF_ENERGY', 'How is your energy level today?', 'SINGLE_CHOICE', ARRAY['Much better', 'Better', 'Same', 'Worse', 'Much worse'], true),
('HF', 'HF_SLEEP', 'Are you having trouble sleeping due to breathing problems?', 'YES_NO', NULL, true),
('HF', 'HF_MEDICATIONS', 'Are you taking all your medications as prescribed?', 'YES_NO', NULL, true);

-- Insert default outreach questions for COPD
INSERT INTO public."OutreachQuestion" (condition_code, code, text, response_type, choices, active) VALUES
('COPD', 'COPD_BREATHING', 'How is your breathing today compared to yesterday?', 'SINGLE_CHOICE', ARRAY['Much better', 'Better', 'Same', 'Worse', 'Much worse'], true),
('COPD', 'COPD_COUGH', 'Are you coughing more than usual?', 'YES_NO', NULL, true),
('COPD', 'COPD_SPUTUM', 'Has your sputum (phlegm) changed color or amount?', 'YES_NO', NULL, true),
('COPD', 'COPD_INHALER', 'How many times have you used your rescue inhaler today?', 'NUMERIC', NULL, true),
('COPD', 'COPD_ACTIVITY', 'Are you able to do your usual activities?', 'SINGLE_CHOICE', ARRAY['Yes, easily', 'Yes, with some difficulty', 'No, too difficult'], true),
('COPD', 'COPD_FEVER', 'Do you have a fever or feel like you have an infection?', 'YES_NO', NULL, true);

-- Insert default outreach questions for Acute MI
INSERT INTO public."OutreachQuestion" (condition_code, code, text, response_type, choices, active) VALUES
('AMI', 'AMI_CHEST_PAIN', 'Are you having any chest pain or pressure?', 'YES_NO', NULL, true),
('AMI', 'AMI_ARM_PAIN', 'Do you have pain in your arms, back, neck, or jaw?', 'YES_NO', NULL, true),
('AMI', 'AMI_BREATHING', 'Are you having trouble breathing?', 'YES_NO', NULL, true),
('AMI', 'AMI_NAUSEA', 'Are you feeling nauseous or have you vomited?', 'YES_NO', NULL, true),
('AMI', 'AMI_SWEATING', 'Are you having cold sweats?', 'YES_NO', NULL, true),
('AMI', 'AMI_DIZZY', 'Do you feel dizzy or lightheaded?', 'YES_NO', NULL, true),
('AMI', 'AMI_MEDICATIONS', 'Are you taking all your heart medications as prescribed?', 'YES_NO', NULL, true);

-- Insert default outreach questions for Pneumonia
INSERT INTO public."OutreachQuestion" (condition_code, code, text, response_type, choices, active) VALUES
('PNA', 'PNA_FEVER', 'Do you have a fever?', 'YES_NO', NULL, true),
('PNA', 'PNA_BREATHING', 'Is your breathing getting worse?', 'YES_NO', NULL, true),
('PNA', 'PNA_COUGH', 'Are you coughing up blood or dark sputum?', 'YES_NO', NULL, true),
('PNA', 'PNA_CHEST_PAIN', 'Do you have chest pain that is getting worse?', 'YES_NO', NULL, true),
('PNA', 'PNA_ANTIBIOTICS', 'Are you taking your antibiotics as prescribed?', 'YES_NO', NULL, true),
('PNA', 'PNA_APPETITE', 'Are you able to eat and drink normally?', 'YES_NO', NULL, true),
('PNA', 'PNA_CONFUSION', 'Are you feeling confused or disoriented?', 'YES_NO', NULL, true);

-- Insert red flag rules for Heart Failure
INSERT INTO public."RedFlagRule" (condition_code, rule_code, description, severity, action_hint, active) VALUES
('HF', 'HF_CHEST_PAIN', 'Chest pain or pressure - possible heart attack', 'CRITICAL', 'ED_REFERRAL', true),
('HF', 'HF_WEIGHT_GAIN_3LB', 'Weight gain of 3+ pounds in 1 day', 'HIGH', 'NURSE_CALLBACK_2H', true),
('HF', 'HF_WEIGHT_GAIN_5LB', 'Weight gain of 5+ pounds in 1 week', 'HIGH', 'NURSE_CALLBACK_2H', true),
('HF', 'HF_BREATHING_WORSE', 'Significantly worse breathing', 'CRITICAL', 'URGENT_TELEVISIT', true),
('HF', 'HF_SWELLING_NEW', 'New or worsening swelling', 'MODERATE', 'NURSE_CALLBACK_4H', true),
('HF', 'HF_SLEEP_DIFFICULTY', 'Sleep difficulty due to breathing', 'MODERATE', 'NURSE_CALLBACK_4H', true),
('HF', 'HF_MEDICATION_MISSED', 'Missed heart failure medications', 'LOW', 'EDUCATION_ONLY', true);

-- Insert red flag rules for COPD
INSERT INTO public."RedFlagRule" (condition_code, rule_code, description, severity, action_hint, active) VALUES
('COPD', 'COPD_BREATHING_WORSE', 'Significantly worse breathing', 'CRITICAL', 'URGENT_TELEVISIT', true),
('COPD', 'COPD_INHALER_OVERUSE', 'Rescue inhaler used 4+ times today', 'HIGH', 'NURSE_CALLBACK_2H', true),
('COPD', 'COPD_SPUTUM_CHANGE', 'Change in sputum color or amount', 'MODERATE', 'NURSE_CALLBACK_4H', true),
('COPD', 'COPD_FEVER', 'Fever or signs of infection', 'HIGH', 'NURSE_CALLBACK_2H', true),
('COPD', 'COPD_ACTIVITY_LIMITED', 'Unable to do usual activities', 'MODERATE', 'NURSE_CALLBACK_4H', true);

-- Insert red flag rules for Acute MI
INSERT INTO public."RedFlagRule" (condition_code, rule_code, description, severity, action_hint, active) VALUES
('AMI', 'AMI_CHEST_PAIN', 'Chest pain or pressure', 'CRITICAL', 'ED_REFERRAL', true),
('AMI', 'AMI_ARM_PAIN', 'Pain in arms, back, neck, or jaw', 'CRITICAL', 'ED_REFERRAL', true),
('AMI', 'AMI_BREATHING_TROUBLE', 'Trouble breathing', 'HIGH', 'NURSE_CALLBACK_2H', true),
('AMI', 'AMI_NAUSEA_VOMITING', 'Nausea or vomiting', 'MODERATE', 'NURSE_CALLBACK_4H', true),
('AMI', 'AMI_SWEATING', 'Cold sweats', 'HIGH', 'NURSE_CALLBACK_2H', true),
('AMI', 'AMI_DIZZY', 'Dizziness or lightheadedness', 'MODERATE', 'NURSE_CALLBACK_4H', true);

-- Insert red flag rules for Pneumonia
INSERT INTO public."RedFlagRule" (condition_code, rule_code, description, severity, action_hint, active) VALUES
('PNA', 'PNA_FEVER_RETURN', 'Fever returns or gets worse', 'HIGH', 'NURSE_CALLBACK_2H', true),
('PNA', 'PNA_BREATHING_WORSE', 'Breathing getting worse', 'CRITICAL', 'URGENT_TELEVISIT', true),
('PNA', 'PNA_COUGH_BLOOD', 'Coughing up blood', 'CRITICAL', 'ED_REFERRAL', true),
('PNA', 'PNA_CHEST_PAIN_WORSE', 'Chest pain getting worse', 'HIGH', 'NURSE_CALLBACK_2H', true),
('PNA', 'PNA_CONFUSION', 'Confusion or disorientation', 'CRITICAL', 'ED_REFERRAL', true),
('PNA', 'PNA_ANTIBIOTICS_MISSED', 'Missed antibiotic doses', 'MODERATE', 'NURSE_CALLBACK_4H', true);

-- Insert default agent prompt templates
INSERT INTO public."AgentPromptTemplate" (agent_type, condition_code, template_name, template_content, variables, active) VALUES
('OUTREACH_COORDINATOR', 'HF', 'heart_failure_checkin', 'You are calling to check in on a patient recovering from heart failure. Be warm, professional, and encouraging. Ask about their weight, breathing, swelling, energy level, sleep, and medication adherence. If they report concerning symptoms, reassure them that a nurse will call them back soon.', ARRAY['patient_name', 'days_since_discharge'], true),
('OUTREACH_COORDINATOR', 'COPD', 'copd_checkin', 'You are calling to check in on a patient with COPD. Be warm, professional, and encouraging. Ask about their breathing, cough, sputum, inhaler use, activity level, and any signs of infection. If they report concerning symptoms, reassure them that a nurse will call them back soon.', ARRAY['patient_name', 'days_since_discharge'], true),
('OUTREACH_COORDINATOR', 'AMI', 'heart_attack_checkin', 'You are calling to check in on a patient recovering from a heart attack. Be warm, professional, and encouraging. Ask about chest pain, breathing, nausea, sweating, dizziness, and medication adherence. If they report concerning symptoms, reassure them that a nurse will call them back soon.', ARRAY['patient_name', 'days_since_discharge'], true),
('OUTREACH_COORDINATOR', 'PNA', 'pneumonia_checkin', 'You are calling to check in on a patient recovering from pneumonia. Be warm, professional, and encouraging. Ask about fever, breathing, cough, chest pain, antibiotic adherence, appetite, and any confusion. If they report concerning symptoms, reassure them that a nurse will call them back soon.', ARRAY['patient_name', 'days_since_discharge'], true);
