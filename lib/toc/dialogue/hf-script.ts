// Heart Failure 72-hour check-in dialogue script

export const HF_DIALOGUE = {
  intro: {
    en: "Hi, this is a check-in call from your care team about your recent heart failure hospitalization. This will take about 5 minutes. Is now a good time to talk?",
    es: "Hola, esta es una llamada de seguimiento de su equipo de atención sobre su hospitalización reciente por insuficiencia cardíaca. Tomará unos 5 minutos. ¿Es un buen momento para hablar?"
  },
  
  questions: [
    {
      code: 'HF_WEIGHT_DELTA',
      text: {
        en: "What is your weight today? Please tell me in pounds.",
        es: "¿Cuál es su peso hoy? Por favor dígame en libras."
      },
      type: 'numeric',
      unit: 'lb',
      followUp: {
        en: "Thank you. We'll compare this to your discharge weight.",
        es: "Gracias. Compararemos esto con su peso al alta."
      }
    },
    {
      code: 'HF_DYSPNEA_REST',
      text: {
        en: "Are you experiencing shortness of breath while resting? Press 1 for yes, 2 for no.",
        es: "¿Tiene falta de aire mientras descansa? Presione 1 para sí, 2 para no."
      },
      type: 'yes_no',
      followUp: {
        yes_en: "I understand. A nurse will call you shortly to discuss this.",
        yes_es: "Entiendo. Una enfermera le llamará pronto para hablar de esto.",
        no_en: "That's good to hear.",
        no_es: "Eso es bueno escuchar."
      }
    },
    {
      code: 'HF_SWELLING',
      text: {
        en: "Have you noticed new or worsening swelling in your legs or ankles? Press 1 for yes, 2 for no.",
        es: "¿Ha notado hinchazón nueva o que empeora en sus piernas o tobillos? Presione 1 para sí, 2 para no."
      },
      type: 'yes_no'
    },
    {
      code: 'HF_MED_PICKUP',
      text: {
        en: "Have you picked up your water pill, also called a diuretic, from the pharmacy? Press 1 for yes, 2 for no.",
        es: "¿Ha recogido su pastilla de agua, también llamada diurético, de la farmacia? Presione 1 para sí, 2 para no."
      },
      type: 'yes_no',
      followUp: {
        no_en: "It's important to take your water pill as prescribed. A coordinator will help you get your medication.",
        no_es: "Es importante tomar su pastilla de agua según lo recetado. Un coordinador le ayudará a obtener su medicamento."
      }
    },
    {
      code: 'HF_APPT_CONFIRMED',
      text: {
        en: "Do you have a follow-up appointment scheduled with your doctor? Press 1 for yes, 2 for no.",
        es: "¿Tiene una cita de seguimiento programada con su médico? Presione 1 para sí, 2 para no."
      },
      type: 'yes_no',
      followUp: {
        no_en: "A coordinator will help you schedule an appointment.",
        no_es: "Un coordinador le ayudará a programar una cita."
      }
    }
  ],
  
  closing: {
    en: "Thank you for completing this check-in. If you have any urgent concerns, please call 911 or go to the emergency room. Otherwise, someone from our team may follow up with you soon. Take care!",
    es: "Gracias por completar esta llamada de seguimiento. Si tiene alguna preocupación urgente, llame al 911 o vaya a la sala de emergencias. De lo contrario, alguien de nuestro equipo puede comunicarse con usted pronto. ¡Cuídese!"
  }
};

