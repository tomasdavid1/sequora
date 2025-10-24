// COPD 72-hour check-in dialogue script

export const COPD_DIALOGUE = {
  intro: {
    en: "Hi, this is a check-in call from your care team about your recent COPD hospitalization. This will take about 5 minutes. Is now a good time to talk?",
    es: "Hola, esta es una llamada de seguimiento de su equipo de atención sobre su hospitalización reciente por EPOC. Tomará unos 5 minutos. ¿Es un buen momento para hablar?"
  },
  
  questions: [
    {
      code: 'COPD_RESCUE_USE',
      text: {
        en: "How many times have you used your rescue inhaler in the last 24 hours? Please tell me the number of times.",
        es: "¿Cuántas veces ha usado su inhalador de rescate en las últimas 24 horas? Por favor dígame el número de veces."
      },
      type: 'numeric',
      unit: 'times',
      followUp: {
        en: "Thank you. We'll monitor this to make sure your breathing is well controlled.",
        es: "Gracias. Monitorearemos esto para asegurarnos de que su respiración esté bien controlada."
      }
    },
    {
      code: 'COPD_DYSPNEA_INCREASE',
      text: {
        en: "Is your shortness of breath worse than when you left the hospital? Press 1 for yes, 2 for no.",
        es: "¿Su falta de aire es peor que cuando salió del hospital? Presione 1 para sí, 2 para no."
      },
      type: 'yes_no',
      followUp: {
        yes_en: "I understand. A nurse will call you shortly to assess your breathing.",
        yes_es: "Entiendo. Una enfermera le llamará pronto para evaluar su respiración."
      }
    },
    {
      code: 'COPD_COUGH_CHANGE',
      text: {
        en: "Has your cough or the amount of mucus you're coughing up changed? Press 1 for yes, 2 for no.",
        es: "¿Ha cambiado su tos o la cantidad de moco que está tosiendo? Presione 1 para sí, 2 para no."
      },
      type: 'yes_no'
    },
    {
      code: 'COPD_MED_PICKUP',
      text: {
        en: "Have you picked up all your inhalers and medications from the pharmacy? Press 1 for yes, 2 for no.",
        es: "¿Ha recogido todos sus inhaladores y medicamentos de la farmacia? Presione 1 para sí, 2 para no."
      },
      type: 'yes_no',
      followUp: {
        no_en: "It's very important to have your inhalers. A coordinator will help you get your medications.",
        no_es: "Es muy importante tener sus inhaladores. Un coordinador le ayudará a obtener sus medicamentos."
      }
    },
    {
      code: 'COPD_APPT_CONFIRMED',
      text: {
        en: "Do you have a follow-up appointment scheduled? Press 1 for yes, 2 for no.",
        es: "¿Tiene una cita de seguimiento programada? Presione 1 para sí, 2 para no."
      },
      type: 'yes_no',
      followUp: {
        no_en: "A coordinator will help you schedule an appointment.",
        no_es: "Un coordinador le ayudará a programar una cita."
      }
    }
  ],
  
  closing: {
    en: "Thank you for completing this check-in. Remember to use your inhalers as prescribed. If you're having trouble breathing, call 911 or go to the emergency room right away. Take care!",
    es: "Gracias por completar esta llamada de seguimiento. Recuerde usar sus inhaladores según lo recetado. Si tiene problemas para respirar, llame al 911 o vaya a la sala de emergencias de inmediato. ¡Cuídese!"
  }
};

