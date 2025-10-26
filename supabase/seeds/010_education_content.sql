-- Populate patient education content for each condition
-- Replaces hardcoded content in app/api/toc/patient/[patientId]/route.ts

-- Update Heart Failure education
UPDATE public."ConditionCatalog"
SET 
  education_title = 'Understanding Heart Failure',
  education_level = 'BASIC',
  education_content = 'Heart failure means your heart isn''t pumping blood as well as it should. This doesn''t mean your heart has stopped working, but it needs some help.

Key things to know:
• Take your medications exactly as prescribed
• Weigh yourself daily at the same time
• Watch for swelling in your feet, ankles, or legs
• Call your doctor if you gain 3+ pounds in a day or 5+ pounds in a week
• Limit salt in your diet
• Stay active but don''t overdo it

Warning signs to watch for:
• Shortness of breath that''s getting worse
• Swelling that''s new or getting worse
• Feeling more tired than usual
• Coughing or wheezing
• Feeling dizzy or lightheaded

If you experience any of these warning signs, contact your healthcare team immediately.',
  education_topics = ARRAY[
    'Medication Management',
    'Daily Weight Monitoring',
    'Diet and Nutrition',
    'Exercise Guidelines',
    'Warning Signs',
    'When to Call Your Doctor'
  ]
WHERE condition_code = 'HF';

-- Update COPD education
UPDATE public."ConditionCatalog"
SET 
  education_title = 'Living with COPD',
  education_level = 'BASIC',
  education_content = 'COPD (Chronic Obstructive Pulmonary Disease) makes it harder to breathe. With proper care, you can manage your symptoms and stay active.

Important daily habits:
• Use your inhalers as prescribed
• Avoid smoke and air pollution
• Stay active with gentle exercises
• Eat a healthy diet
• Get your flu and pneumonia vaccines
• Practice breathing exercises

Managing flare-ups:
• Know your triggers (smoke, dust, cold air, infections)
• Have a plan for when symptoms get worse
• Keep your rescue inhaler with you
• Call your doctor if symptoms don''t improve

Breathing techniques:
• Pursed-lip breathing: Breathe in through your nose, then breathe out slowly through pursed lips
• Diaphragmatic breathing: Focus on breathing with your belly, not your chest

Remember: Even small improvements in your breathing can make a big difference in your daily life.',
  education_topics = ARRAY[
    'Inhaler Use',
    'Breathing Techniques',
    'Exercise and Activity',
    'Avoiding Triggers',
    'Managing Flare-ups',
    'Vaccinations'
  ]
WHERE condition_code = 'COPD';

-- Update AMI (Heart Attack) education
UPDATE public."ConditionCatalog"
SET 
  education_title = 'Recovery After Heart Attack',
  education_level = 'BASIC',
  education_content = 'Recovering from a heart attack takes time and patience. Your heart is healing, and with proper care, you can return to a healthy, active life.

Recovery timeline:
• First few weeks: Focus on rest and gentle activity
• 4-6 weeks: Gradual increase in activity
• 6-12 weeks: Return to most normal activities
• Ongoing: Maintain heart-healthy lifestyle

Medication importance:
• Take all medications exactly as prescribed
• Don''t stop medications without talking to your doctor
• Keep a list of all your medications
• Know what each medication does

Lifestyle changes:
• Quit smoking if you smoke
• Eat a heart-healthy diet (low salt, low fat)
• Exercise regularly as approved by your doctor
• Manage stress
• Control other health conditions (diabetes, high blood pressure)

Warning signs of another heart attack:
• Chest pain or pressure
• Pain in arms, back, neck, or jaw
• Shortness of breath
• Nausea or vomiting
• Cold sweat
• Feeling lightheaded

If you experience these symptoms, call 911 immediately.',
  education_topics = ARRAY[
    'Recovery Timeline',
    'Medication Management',
    'Lifestyle Changes',
    'Exercise Guidelines',
    'Warning Signs',
    'Emergency Response'
  ]
WHERE condition_code = 'AMI';

-- Update Pneumonia education
UPDATE public."ConditionCatalog"
SET 
  education_title = 'Recovering from Pneumonia',
  education_level = 'BASIC',
  education_content = 'Pneumonia is an infection in your lungs that can make breathing difficult. Recovery takes time, but most people fully recover with proper care.

Recovery process:
• Rest is important - don''t rush your recovery
• Take all antibiotics exactly as prescribed
• Drink plenty of fluids
• Use a humidifier to help with breathing
• Practice deep breathing exercises

When to call your doctor:
• Fever returns or gets worse
• Breathing becomes more difficult
• Chest pain gets worse
• You''re coughing up blood
• You feel confused or disoriented
• You can''t keep food or fluids down

Preventing future infections:
• Get your flu shot every year
• Get the pneumonia vaccine as recommended
• Wash your hands frequently
• Avoid close contact with sick people
• Don''t smoke
• Eat a healthy diet
• Get enough sleep

Remember: It''s normal to feel tired for several weeks after pneumonia. Listen to your body and don''t push yourself too hard.',
  education_topics = ARRAY[
    'Recovery Process',
    'Medication Adherence',
    'Breathing Exercises',
    'When to Call Doctor',
    'Prevention',
    'Rest and Recovery'
  ]
WHERE condition_code = 'PNA';

-- Verify updates
SELECT 
  condition_code,
  full_name,
  education_title,
  array_length(education_topics, 1) as topic_count,
  length(education_content) as content_length
FROM public."ConditionCatalog"
WHERE education_content IS NOT NULL
ORDER BY condition_code;

