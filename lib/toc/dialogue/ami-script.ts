// Acute MI 72-hour check-in dialogue script

export const AMI_DIALOGUE = {
  intro: {
    en: "Hi, this is a check-in call from your care team about your recent heart attack hospitalization. This will take about 5 minutes. Is now a good time to talk?",
    es: "Hola, esta es una llamada de seguimiento de su equipo de atención sobre su hospitalización reciente por ataque cardíaco. Tomará unos 5 minutos. ¿Es un buen momento para hablar?"
  },
  
  questions: [
    {
      code: 'AMI_CHEST_PAIN',
      text: {
        en: "Have you experienced any chest pain or pressure since you left the hospital? Press 1 for yes, 2 for no.",
        es: "¿Ha experimentado dolor o presión en el pecho desde que salió del hospital? Presione 1 para sí, 2 para no."
      },
      type: 'yes_no',
      followUp: {
        yes_en: "This is important. I'm going to have a nurse call you right away to discuss this.",
        yes_es: "Esto es importante. Voy a hacer que una enfermera le llame de inmediato para hablar de esto.",
        no_en: "That's good to hear.",
        no_es: "Eso es bueno escuchar."
      }
    },
    {
      code: 'AMI_DYSPNEA',
      text: {
        en: "Are you experiencing shortness of breath? Press 1 for yes, 2 for no.",
        es: "¿Tiene falta de aire? Presione 1 para sí, 2 para no."
      },
      type: 'yes_no',
      followUp: {
        yes_en: "A nurse will call you shortly to discuss this.",
        yes_es: "Una enfermera le llamará pronto para hablar de esto."
      }
    },
    {
      code: 'AMI_MED_PICKUP',
      text: {
        en: "Have you picked up all your heart medications from the pharmacy, including aspirin, blood pressure pills, and cholesterol medication? Press 1 for yes, 2 for no.",
        es: "¿Ha recogido todos sus medicamentos cardíacos de la farmacia, incluyendo aspirina, pastillas para la presión arterial y medicamento para el colesterol? Presione 1 para sí, 2 para no."
      },
      type: 'yes_no',
      followUp: {
        no_en: "These medications are very important for your heart health. A coordinator will help you get your medications.",
        no_es: "Estos medicamentos son muy importantes para la salud de su corazón. Un coordinador le ayudará a obtener sus medicamentos."
      }
    },
    {
      code: 'AMI_MED_TOLERANCE',
      text: {
        en: "Are you experiencing any side effects from your medications, such as dizziness, bleeding, or upset stomach? Press 1 for yes, 2 for no.",
        es: "¿Está experimentando efectos secundarios de sus medicamentos, como mareos, sangrado o malestar estomacal? Presione 1 para sí, 2 para no."
      },
      type: 'yes_no',
      followUp: {
        yes_en: "A nurse will call to discuss these side effects and see if adjustments are needed.",
        yes_es: "Una enfermera le llamará para hablar de estos efectos secundarios y ver si se necesitan ajustes."
      }
    },
    {
      code: 'AMI_CARDIAC_REHAB',
      text: {
        en: "Have you scheduled your cardiac rehabilitation appointment? Press 1 for yes, 2 for no.",
        es: "¿Ha programado su cita de rehabilitación cardíaca? Presione 1 para sí, 2 para no."
      },
      type: 'yes_no',
      followUp: {
        no_en: "Cardiac rehab is very important for your recovery. A coordinator will help you schedule this.",
        no_es: "La rehabilitación cardíaca es muy importante para su recuperación. Un coordinador le ayudará a programar esto."
      }
    },
    {
      code: 'AMI_APPT_CONFIRMED',
      text: {
        en: "Do you have a follow-up appointment scheduled with your cardiologist? Press 1 for yes, 2 for no.",
        es: "¿Tiene una cita de seguimiento programada con su cardiólogo? Presione 1 para sí, 2 para no."
      },
      type: 'yes_no',
      followUp: {
        no_en: "A coordinator will help you schedule an appointment.",
        no_es: "Un coordinador le ayudará a programar una cita."
      }
    }
  ],
  
  closing: {
    en: "Thank you for completing this check-in. Remember to take your medications as prescribed and call 911 immediately if you experience any chest pain. Take care of your heart!",
    es: "Gracias por completar esta llamada de seguimiento. Recuerde tomar sus medicamentos según lo recetado y llamar al 911 inmediatamente si experimenta dolor en el pecho. ¡Cuide su corazón!"
  }
};

