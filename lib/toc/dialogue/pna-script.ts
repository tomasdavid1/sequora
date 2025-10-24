// Pneumonia 72-hour check-in dialogue script

export const PNA_DIALOGUE = {
  intro: {
    en: "Hi, this is a check-in call from your care team about your recent pneumonia hospitalization. This will take about 5 minutes. Is now a good time to talk?",
    es: "Hola, esta es una llamada de seguimiento de su equipo de atención sobre su hospitalización reciente por neumonía. Tomará unos 5 minutos. ¿Es un buen momento para hablar?"
  },
  
  questions: [
    {
      code: 'PNA_FEVER',
      text: {
        en: "Have you had a fever over 101 degrees Fahrenheit in the last 24 hours? Press 1 for yes, 2 for no.",
        es: "¿Ha tenido fiebre de más de 101 grados Fahrenheit en las últimas 24 horas? Presione 1 para sí, 2 para no."
      },
      type: 'yes_no',
      followUp: {
        yes_en: "A persistent fever needs attention. A nurse will call you to discuss this.",
        yes_es: "Una fiebre persistente necesita atención. Una enfermera le llamará para hablar de esto."
      }
    },
    {
      code: 'PNA_DYSPNEA',
      text: {
        en: "Is your breathing getting worse instead of better? Press 1 for yes, 2 for no.",
        es: "¿Su respiración está empeorando en lugar de mejorar? Presione 1 para sí, 2 para no."
      },
      type: 'yes_no',
      followUp: {
        yes_en: "Worsening breathing is concerning. A nurse will call you shortly.",
        yes_es: "El empeoramiento de la respiración es preocupante. Una enfermera le llamará pronto."
      }
    },
    {
      code: 'PNA_COUGH',
      text: {
        en: "Is your cough getting worse, or are you coughing up more mucus? Press 1 for yes, 2 for no.",
        es: "¿Su tos está empeorando o está tosiendo más moco? Presione 1 para sí, 2 para no."
      },
      type: 'yes_no'
    },
    {
      code: 'PNA_ANTIBIOTIC_PICKUP',
      text: {
        en: "Have you picked up your antibiotic from the pharmacy? Press 1 for yes, 2 for no.",
        es: "¿Ha recogido su antibiótico de la farmacia? Presione 1 para sí, 2 para no."
      },
      type: 'yes_no',
      followUp: {
        no_en: "It's very important to start your antibiotic right away. A coordinator will help you get your medication.",
        no_es: "Es muy importante comenzar su antibiótico de inmediato. Un coordinador le ayudará a obtener su medicamento."
      }
    },
    {
      code: 'PNA_ANTIBIOTIC_ADHERENCE',
      text: {
        en: "Are you taking your antibiotic as prescribed? Press 1 for yes, 2 for no.",
        es: "¿Está tomando su antibiótico según lo recetado? Presione 1 para sí, 2 para no."
      },
      type: 'yes_no',
      followUp: {
        no_en: "It's important to complete the full course of antibiotics. A nurse will call to discuss this.",
        no_es: "Es importante completar el curso completo de antibióticos. Una enfermera llamará para hablar de esto."
      }
    },
    {
      code: 'PNA_SIDE_EFFECTS',
      text: {
        en: "Are you experiencing any side effects from the antibiotic, such as upset stomach or diarrhea? Press 1 for yes, 2 for no.",
        es: "¿Está experimentando efectos secundarios del antibiótico, como malestar estomacal o diarrea? Presione 1 para sí, 2 para no."
      },
      type: 'yes_no',
      followUp: {
        yes_en: "A nurse will call to discuss these side effects.",
        yes_es: "Una enfermera llamará para hablar de estos efectos secundarios."
      }
    },
    {
      code: 'PNA_APPT_CONFIRMED',
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
    en: "Thank you for completing this check-in. Remember to finish your full course of antibiotics and get plenty of rest. If you're having trouble breathing, go to the emergency room right away. Get well soon!",
    es: "Gracias por completar esta llamada de seguimiento. Recuerde terminar su curso completo de antibióticos y descansar mucho. Si tiene problemas para respirar, vaya a la sala de emergencias de inmediato. ¡Que se mejore pronto!"
  }
};

