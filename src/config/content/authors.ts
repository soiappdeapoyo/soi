import type { Author } from './types';

/**
 * Páginas de autor: el centro de cada clúster temático. Quien llega desde un video de TikTok busca al autor;
 * aquí encuentra quién fue, sus ideas parafraseadas con su fuente (Regla #8), lo que la evidencia dice de ellas
 * y su reto de 7 días. Nada de texto protegido: solo frases cortas que ya usan los Moments oficiales.
 */
export const AUTHORS: Author[] = [
  {
    slug: 'neville-goddard',
    key: 'neville',
    name: 'Neville Goddard',
    title: 'Neville Goddard: ley de asunción y técnica SATS',
    description: 'Quién fue Neville Goddard, qué es la ley de asunción, cómo practicar SATS y la revisión, qué dice la ciencia y cómo aplicarlo en 7 noches.',
    h1: 'Neville Goddard: la ley de asunción, explicada y aplicada',
    answer: 'Neville Goddard (1905–1972) fue un maestro espiritual nacido en Barbados que enseñó la **ley de asunción**: vivir en la imaginación, y sentir, que tu deseo ya se cumplió. Su práctica más conocida es SATS: antes de dormir, relajado, repites una escena corta del deseo cumplido hasta quedarte dormido.',
    intro: [
      'Si llegaste aquí desde un video, probablemente escuchaste algo como «asume el sentimiento del deseo cumplido». Suena simple y lo es. Lo difícil es practicarlo cada noche sin perderse en la teoría.',
      'En esta página te explicamos quién fue Neville, sus cinco ideas centrales con la obra donde aparecen, lo que la psicología dice (y lo que no) y cómo llevarlo a tu vida esta semana. Si buscas el paso a paso de la manifestación en general, está en la [guía de manifestación](/manifestacion).',
    ],
    facts: [
      { label: 'Nació', value: '1905, Barbados' },
      { label: 'Murió', value: '1972, Los Ángeles' },
      { label: 'Obra clave', value: 'Feeling is the Secret (1944)' },
      { label: 'Su práctica', value: 'SATS, la revisión' },
    ],
    sameAs: ['https://en.wikipedia.org/wiki/Neville_Goddard'],
    books: [
      { title: 'Your Faith Is Your Fortune', year: 1941, idea: 'Tu concepto de ti mismo da forma a lo que vives.' },
      { title: 'Feeling is the Secret', year: 1944, idea: 'Sentir el deseo cumplido, sobre todo antes de dormir, es la clave.' },
      { title: 'Out of This World', year: 1949, idea: 'Pensar desde el final: habitar el deseo, no mirarlo de lejos.' },
      { title: 'The Power of Awareness', year: 1952, idea: 'Las asunciones sostenidas se vuelven hechos.' },
      { title: 'The Law and the Promise', year: 1961, idea: 'Casos reales de la ley y la práctica de la revisión.' },
    ],
    sections: [
      {
        h2: 'La idea central: la ley de asunción',
        paragraphs: [
          'Para Neville, la imaginación no es fantasía: es el lugar donde empieza lo que luego vives. Su propuesta es **asumir** que lo que deseas ya es tuyo, y sostener esa asunción hasta que se sienta natural. No se trata de pedir ni de repetir palabras, sino de cambiar el estado desde el que piensas y sientes.',
          'La pregunta que guía toda su enseñanza es sencilla: si ya lo tuvieras, ¿cómo te sentirías? ¿Qué pensarías al despertar? ¿Cómo hablarías de ti? Ese estado, repetido, es lo que él llamaba asumir.',
        ],
        source: 'Neville Goddard, «Feeling is the Secret» (1944)',
      },
      {
        h2: 'SATS: el estado parecido al sueño',
        paragraphs: [
          'SATS viene de «state akin to sleep». Neville proponía usar los minutos antes de dormir, cuando el cuerpo está relajado y la mente se aquieta, porque en ese estado la imaginación tiene más fuerza y menos resistencia.',
        ],
        list: [
          '**Elige una escena corta** que solo pasaría si tu deseo ya se cumplió: alguien te felicita, das las gracias, lo tienes en las manos.',
          '**Acuéstate y suelta el cuerpo**, de los pies a la cabeza, hasta sentir somnolencia sin dormirte del todo.',
          '**Entra en la escena desde dentro**: no la mires como una película; estás ahí, escuchas, sientes.',
          '**Repítela como un bucle** hasta quedarte dormida o dormido en ella.',
        ],
        ordered: true,
        source: 'Neville Goddard, «Feeling is the Secret» (1944)',
      },
      {
        h2: 'La revisión: reescribir el día',
        paragraphs: [
          'Por la noche, Neville sugería repasar el día y elegir un momento que no salió como querías. Luego lo imaginas como te habría gustado que pasara, con detalle, hasta que la nueva versión se sienta más real que la original.',
          'Desde la psicología, esto se parece a lo que hoy se llama reprocesar: no cambias lo que pasó, pero sí la carga emocional con la que te vas a dormir. Si una conversación te dejó con un nudo, la revisión es una forma suave de soltarlo.',
        ],
        source: 'Neville Goddard, «The Law and the Promise» (1961)',
      },
      {
        h2: 'Pensar desde el final, no en el final',
        paragraphs: [
          'Una de sus distinciones más útiles: pensar **en** tu deseo es mirarlo desde fuera, como algo que falta. Pensar **desde** tu deseo es habitarlo, como alguien que ya lo vive. La primera forma refuerza la carencia; la segunda cambia tu forma de actuar.',
          'Un ejercicio práctico: escribe qué harías mañana al despertar si ya fuera tuyo. Ese gesto pequeño es el puente entre la imaginación y la acción.',
        ],
        source: 'Neville Goddard, «Out of This World» (1949)',
      },
      {
        h2: 'La dieta mental: tu conversación interior',
        paragraphs: [
          'Neville insistía en vigilar lo que te dices por dentro durante el día. Si en la noche asumes el deseo cumplido y en la mañana te repites «esto nunca me va a pasar», las dos asunciones compiten.',
          'La dieta mental no es reprimir pensamientos, sino notar los que no van con lo que quieres y responderles como lo haría la persona que ya lo tiene. Es muy parecido a lo que la terapia cognitiva llama reestructurar un pensamiento, que explicamos en [7 pensamientos que bloquean tu crecimiento](/blog/pensamientos-que-bloquean-tu-crecimiento).',
        ],
        source: 'Neville Goddard, conferencias; «The Power of Awareness» (1952)',
      },
      {
        h2: 'Lo que dice la ciencia (y lo que no)',
        paragraphs: [
          'Las ideas de Neville son espirituales, no científicas: no hay estudios que prueben que imaginar un resultado lo produce por sí solo. Y hay un dato importante: la psicóloga Gabriele Oettingen encontró que fantasear solo con el resultado positivo puede **bajar** la energía para conseguirlo, porque la mente se siente como si ya hubiera llegado.',
          'Lo que sí tiene respaldo es la imaginación que prepara la acción: visualizar el proceso, nombrar el obstáculo y decidir qué harás cuando aparezca. Por eso en SOI cada práctica de Neville termina con un paso concreto. Lo explicamos en [por qué manifestar sin acción no funciona](/blog/manifestar-sin-accion) y en la [guía de visualización](/visualizacion).',
        ],
        source: 'Gabriele Oettingen, «Rethinking Positive Thinking» (2014); Pham y Taylor, simulación mental (1999)',
      },
      {
        h2: 'Cómo practicar a Neville esta semana',
        paragraphs: [],
        list: [
          '**Noche 1:** escribe tu deseo en una frase, como si ya hubiera pasado, y elige tu escena.',
          '**Noche 2:** nombra lo que sentirías en el cuerpo y llévalo a la escena.',
          '**Noche 3:** practica la revisión con un momento del día.',
          '**Noche 4:** observa tu conversación interior y reescribe una frase.',
          '**Noche 5:** piensa desde el final: ¿qué harías mañana al despertar?',
          '**Noche 6:** haz un gesto pequeño, mañana, como alguien que ya lo tiene.',
          '**Noche 7:** mira la semana: ¿qué cambió en cómo te sientes con tu deseo?',
        ],
        ordered: true,
      },
    ],
    cta: {
      heading: '7 noches con Neville, guiadas por voz',
      text: 'Cada noche, unos minutos: te relajas, entras en tu escena y SOI te acompaña con voz hasta dormirte. Una enseñanza nueva por noche, con su fuente.',
      button: 'Empezar la noche 1 gratis',
    },
    faq: [
      { q: '¿Quién fue Neville Goddard?', a: 'Un autor y conferencista nacido en Barbados en 1905 que vivió en Estados Unidos y murió en 1972. Enseñó que la imaginación y el sentimiento del deseo cumplido dan forma a lo que vivimos, lo que llamó la ley de asunción.' },
      { q: '¿Qué es SATS?', a: 'Es la sigla de «state akin to sleep», el estado parecido al sueño. Es la técnica de Neville de repetir una escena corta del deseo cumplido antes de dormir, relajado, hasta quedarte dormido en ella.' },
      { q: '¿La ley de asunción está comprobada científicamente?', a: 'No. Es una enseñanza espiritual. Lo que sí tiene evidencia es que la imaginación ayuda cuando prepara la acción: visualizar el proceso y planear cómo responder a los obstáculos.' },
      { q: '¿Cuánto tiempo hay que practicar SATS?', a: 'Neville hablaba de practicarlo cada noche hasta que la escena se sienta natural, no de un número de días. Una semana es un buen inicio para notar cómo cambia tu forma de sentir el deseo.' },
    ],
    guides: ['manifestacion', 'visualizacion', 'afirmaciones'],
    posts: ['manifestar-sin-accion', 'visualizacion-para-objetivos-reales', 'como-reprogramar-tu-identidad'],
  },

  {
    slug: 'brian-tracy',
    key: 'tracy',
    name: 'Brian Tracy',
    title: 'Brian Tracy: metas, el sapo y su ritual de 5 minutos',
    description: 'Las ideas de Brian Tracy para lograr metas: el ritual de 5 minutos, las 10 metas, sus 7 pasos y «cómete ese sapo», con lo que dice la evidencia.',
    h1: 'Brian Tracy: cómo aplicar su método de metas en tu vida',
    answer: 'Brian Tracy, nacido en Canadá en 1944, es autor de «Goals!» y «Eat That Frog!». Su método se resume en tres hábitos: **escribir tus metas** cada día en presente, decidir cuál es la más importante y **hacer primero la tarea que más te cuesta** (tu sapo). Todo empieza con un ritual escrito de 5 minutos al despertar.',
    intro: [
      'Tracy no habla de motivación: habla de claridad. Para él, la mayoría no logra sus metas porque no las tiene por escrito, no las ordena y deja para después lo que más importa.',
      'Aquí tienes sus ideas centrales con el libro donde aparecen, lo que la investigación dice de ellas y una forma de practicarlas una semana. Si lo que te frena es postergar, empieza por la [guía para dejar de procrastinar](/procrastinacion).',
    ],
    facts: [
      { label: 'Nació', value: '1944, Canadá' },
      { label: 'Obras clave', value: 'Goals! (2003), Eat That Frog! (2001)' },
      { label: 'Su práctica', value: 'Ritual de 5 min, 10 metas, el sapo' },
      { label: 'Eslabón SOI', value: 'Pensamientos → acciones' },
    ],
    sameAs: ['https://en.wikipedia.org/wiki/Brian_Tracy'],
    books: [
      { title: 'The Psychology of Achievement', year: 1984, idea: 'Tu autoconcepto marca hasta dónde llegas.' },
      { title: 'Maximum Achievement', year: 1993, idea: 'Principios para dirigir tu mente hacia tus metas.' },
      { title: 'Eat That Frog!', year: 2001, idea: 'Haz primero lo más importante y lo que más evitas.' },
      { title: 'Goals!', year: 2003, idea: 'Escribir, ordenar y trabajar tus metas cada día.' },
      { title: 'No Excuses!', year: 2010, idea: 'La autodisciplina como la base de todo logro.' },
    ],
    sections: [
      {
        h2: 'El ritual de 5 minutos al despertar',
        paragraphs: [
          'Tracy propone empezar el día escribiendo, antes de tocar el teléfono. La idea es que tu mente toma la dirección de lo primero que le das, así que conviene que sea tu intención y no las noticias.',
        ],
        list: [
          'Siéntate con lápiz y papel. No toques el teléfono.',
          'Di en voz alta: «Hoy va a ser el mejor día de todos».',
          'Escribe esa frase arriba de la página.',
          'Escribe cómo se va a desarrollar tu día, específico y positivo.',
          'Termina escribiendo y diciendo en voz alta: «Gracias».',
        ],
        ordered: true,
        source: 'Brian Tracy, «Goals!» (2003)',
      },
      {
        h2: 'Las 10 metas y la meta principal',
        paragraphs: [
          'El ejercicio más conocido de Tracy: escribe 10 metas para los próximos 12 meses, en presente y primera persona, como si ya las hubieras logrado («Gano…», «Corro…», «Termino…»). Luego pregúntate cuál, si la lograras, tendría el mayor impacto en tu vida. Esa es tu **meta principal**.',
          'Para mantenerla presente, sugiere escribirla en una tarjeta pequeña y leerla al despertar y antes de dormir. Lo desarrollamos en la [guía de metas personales](/metas-personales).',
        ],
        source: 'Brian Tracy, «Goals!» (2003)',
      },
      {
        h2: 'Los 7 pasos para lograr una meta',
        paragraphs: ['En «Goals!», Tracy resume su método en una secuencia que se puede aplicar a cualquier meta:'],
        list: [
          'Decide exactamente qué quieres.',
          'Escríbelo.',
          'Ponle una fecha límite.',
          'Haz una lista de todo lo que podrías hacer para lograrlo.',
          'Ordena esa lista en un plan: qué va primero y qué depende de qué.',
          'Actúa de inmediato sobre tu plan.',
          'Haz algo cada día que te acerque a tu meta.',
        ],
        ordered: true,
        source: 'Brian Tracy, «Goals!» (2003)',
      },
      {
        h2: 'Cómete ese sapo',
        paragraphs: [
          'Tu sapo es la tarea más importante del día y, casi siempre, la que más evitas. Tracy propone hacerla primero, antes que cualquier otra cosa. Si haces eso, el resto del día ya ganó.',
          'Para decidir cuál es, usa el **método ABCDE**: A = debes hacerla (tiene consecuencias), B = deberías, C = sería bueno, D = delégala, E = elimínala. Tu sapo es tu A-1. Si te cuesta empezar aunque sepas cuál es, lee [sé lo que tengo que hacer pero no lo hago](/blog/se-lo-que-tengo-que-hacer-pero-no-lo-hago).',
        ],
        source: 'Brian Tracy, «Eat That Frog!» (2001)',
      },
      {
        h2: 'Tu autoconcepto marca el techo',
        paragraphs: [
          'Antes de los métodos, Tracy habla de la imagen que tienes de ti: tiendes a actuar de forma coherente con quien crees que eres. Si te ves como alguien desordenado, ninguna agenda te durará mucho.',
          'Por eso sus técnicas de escritura en presente no son solo productividad: son una forma de ensayar una identidad nueva. Es la misma idea que explicamos en [cómo reprogramar tu identidad](/blog/como-reprogramar-tu-identidad).',
        ],
        source: 'Brian Tracy, «The Psychology of Achievement»',
      },
      {
        h2: 'La autodisciplina, la llave de lo demás',
        paragraphs: [
          'En «No Excuses!», Tracy define la autodisciplina como hacer lo que debes hacer, cuando debes hacerlo, tengas ganas o no. Para él no es un rasgo con el que se nace, sino un hábito: cada vez que cumples algo que te prometiste, se vuelve un poco más fácil la siguiente.',
          'Lo interesante es que no la presenta como sacrificio, sino como libertad: la persona disciplinada elige su día, en lugar de que el día la elija a ella. Si sientes que la perdiste, lee [cómo recuperar la disciplina](/blog/como-recuperar-la-disciplina).',
        ],
        source: 'Brian Tracy, «No Excuses!» (2010)',
      },
      {
        h2: 'Errores comunes al aplicar a Tracy',
        paragraphs: [],
        list: [
          '**Escribir 10 metas y no volver a verlas.** El ejercicio funciona por la repetición diaria, no por la lista.',
          '**Elegir un sapo que no es el importante.** Tu sapo no es lo más urgente ni lo más fácil: es lo que más impacto tiene y más evitas.',
          '**Hacer el ritual con el teléfono en la mano.** La idea es que lo primero que entra a tu mente sea tu intención.',
          '**Metas que no son tuyas.** Si una meta es lo que otros esperan de ti, la vas a postergar. Pregúntate para qué la quieres.',
          '**Querer hacer todo el primer día.** Un ritual de 5 minutos sostenido vale más que una mañana perfecta que dura una semana.',
        ],
      },
      {
        h2: 'Lo que dice la evidencia',
        paragraphs: [
          'La parte de Tracy mejor respaldada es la de metas concretas: décadas de estudios de Edwin Locke y Gary Latham muestran que una meta **específica y retadora** produce más rendimiento que «hacer lo mejor posible». Decidir cuándo y dónde vas a actuar también ayuda mucho, como mostró Peter Gollwitzer.',
          'Un aviso honesto: el famoso «estudio de Harvard (o Yale)» sobre el 3 % que escribía sus metas, muy citado en libros de este tipo, nunca existió. Lo que sí hay es un estudio pequeño de Gail Matthews en el que escribir metas, comprometerse con alguien y reportar avances mejoró los resultados. Escribirlas ayuda; revisarlas y actuar ayuda más.',
        ],
        source: 'Locke y Latham, «Building a practically useful theory of goal setting» (2002); Gollwitzer y Sheeran (2006); Gail Matthews, Dominican University of California (2015)',
      },
      {
        h2: 'Cómo practicar a Tracy esta semana',
        paragraphs: [
          'Cada mañana repite el ritual de 5 minutos y suma una pieza: el día 1, tus 10 metas; el día 2, tu meta principal; el día 3, la lista de todo lo que podrías hacer; el día 4, tu primer sapo; el día 5, el ABCDE; el día 6, tu tarjeta; el día 7, revisas la semana. Para armar la mañana completa, mira la [guía de rutina de mañana](/rutina-mananas).',
        ],
      },
    ],
    cta: {
      heading: '7 mañanas con Brian Tracy, guiadas por voz',
      text: 'Unos minutos cada mañana: el ritual escrito, una técnica nueva por día y, al final de la semana, tu meta principal, tu plan y tu primer sapo comido.',
      button: 'Empezar la mañana 1 gratis',
    },
    faq: [
      { q: '¿Quién es Brian Tracy?', a: 'Un autor y conferencista nacido en Canadá en 1944, conocido por sus libros sobre metas, productividad y ventas, como «Goals!», «Eat That Frog!» y «Maximum Achievement».' },
      { q: '¿Qué significa «cómete ese sapo»?', a: 'Hacer primero, a primera hora, la tarea más importante del día, que suele ser la que más evitas. El nombre viene de la idea de que, si lo primero que haces es lo más difícil, el resto del día es más fácil.' },
      { q: '¿Por qué escribir las metas en presente?', a: 'Tracy propone escribirlas como si ya fueran reales («Gano…», «Termino…») para que tu mente las tome como parte de quién eres y no como algo lejano. Es una forma de ensayar la identidad que buscas.' },
      { q: '¿Existe el estudio de Harvard sobre escribir metas?', a: 'No. Ese estudio tan citado no tiene registro. Sí hay evidencia de que las metas específicas, con fecha, plan y seguimiento, mejoran los resultados.' },
    ],
    guides: ['metas-personales', 'procrastinacion', 'rutina-mananas', 'disciplina-personal'],
    posts: ['rutina-de-manana-de-personas-exitosas', 'se-lo-que-tengo-que-hacer-pero-no-lo-hago', 'como-recuperar-la-disciplina'],
  },

  {
    slug: 'napoleon-hill',
    key: 'hill',
    name: 'Napoleon Hill',
    title: 'Napoleon Hill: Piense y hágase rico, aplicado hoy',
    description: 'Quién fue Napoleon Hill, las ideas de «Piense y hágase rico» (deseo, autosugestión, mente maestra, persistencia) y cómo aplicarlas, con una mirada crítica.',
    h1: 'Napoleon Hill: las ideas de «Piense y hágase rico» para tu vida',
    answer: 'Napoleon Hill (1883–1970) fue un autor estadounidense conocido por «Piense y hágase rico» (1937). Su idea central es que todo logro empieza con un **deseo definido**: saber exactamente qué quieres, qué darás a cambio y cuándo, escribirlo en una declaración y leerla cada día con fe y persistencia.',
    intro: [
      '«Piense y hágase rico» es uno de los libros de desarrollo personal más vendidos de la historia. Aunque habla de dinero, la mayoría de sus principios sirven para cualquier propósito: un negocio, un cambio de carrera, una meta personal.',
      'Aquí te explicamos quién fue Hill, sus ideas principales con el capítulo donde aparecen, qué tomar con pinzas y cómo aplicarlo en 7 días. Si todavía no tienes claro qué quieres, empieza por la [guía para encontrar tu propósito](/encontrar-proposito).',
    ],
    facts: [
      { label: 'Nació', value: '1883, Virginia (EE. UU.)' },
      { label: 'Murió', value: '1970, Carolina del Sur' },
      { label: 'Obra clave', value: 'Think and Grow Rich (1937)' },
      { label: 'Su práctica', value: 'Declaración del deseo, mente maestra' },
    ],
    sameAs: ['https://en.wikipedia.org/wiki/Napoleon_Hill'],
    books: [
      { title: 'The Law of Success', year: 1928, idea: 'Su primer gran curso: los principios del logro.' },
      { title: 'Think and Grow Rich', year: 1937, idea: 'Del deseo a la riqueza en trece principios.' },
      { title: 'Outwitting the Devil', year: 2011, idea: 'Escrito en 1938 y publicado después: el miedo y la deriva.' },
    ],
    sections: [
      {
        h2: 'El deseo definido: el punto de partida',
        paragraphs: [
          'Para Hill, querer algo no basta. La diferencia entre desear y lograr está en convertir el deseo en algo **definido**: una cantidad exacta, una fecha, un plan y un precio que estás dispuesto a pagar. Un deseo vago no te mueve; uno definido organiza tus decisiones.',
          'Lo llamaba propósito principal definido, y lo ponía antes que cualquier otra técnica. Si no sabes con exactitud a dónde vas, ningún método te sirve.',
        ],
        source: 'Napoleon Hill, «Think and Grow Rich» (1937), cap. 2: Deseo',
      },
      {
        h2: 'Los 6 pasos para convertir un deseo en realidad',
        paragraphs: [
          'Hill resume el capítulo del deseo en seis pasos: fijar lo que deseas con exactitud, decidir qué darás a cambio, poner una fecha, crear un plan y empezar de inmediato, escribir una declaración con todo lo anterior y leerla en voz alta dos veces al día. Los explicamos uno por uno, con ejemplos, en [los 6 pasos de Napoleon Hill](/blog/los-6-pasos-de-napoleon-hill).',
        ],
        source: 'Napoleon Hill, «Think and Grow Rich» (1937), cap. 2: Deseo',
      },
      {
        h2: 'La autosugestión',
        paragraphs: [
          'Hill pensaba que lo que te repites con emoción termina guiando tu conducta. Por eso la declaración no se lee de forma mecánica: se lee sintiendo que ya tienes lo que deseas. Es la misma intuición que hay detrás de las [afirmaciones](/afirmaciones) y de la asunción de [Neville Goddard](/neville-goddard).',
          'La psicología moderna lo matiza: repetir frases que no crees puede hacerte sentir peor. Funciona mejor una declaración que puedas sostener hoy, acompañada de una acción que la respalde.',
        ],
        source: 'Napoleon Hill, «Think and Grow Rich» (1937), cap. 4: Autosugestión; Wood, Perunovic y Lee (2009)',
      },
      {
        h2: 'La mente maestra',
        paragraphs: [
          'Ningún logro grande se hace en solitario. Hill llamó **mente maestra** a un grupo pequeño de personas que se reúnen con un propósito común y se ayudan con conocimiento, ideas y apoyo. Hoy diríamos un grupo de pares o de rendición de cuentas.',
          'Una versión mínima: una persona a la que le cuentas tu meta y con la que revisas avances cada semana. Comprometerte con alguien es de lo que más ayuda a cumplir una meta.',
        ],
        source: 'Napoleon Hill, «Think and Grow Rich» (1937), cap. 10: El poder de la mente maestra',
      },
      {
        h2: 'Conocimiento especializado e imaginación',
        paragraphs: [
          'Hill distingue entre saber mucho y saber lo que necesitas. El conocimiento general, dice, no sirve de mucho hasta que se organiza en un plan con un propósito. No necesitas saberlo todo: necesitas saber qué te falta para tu meta y dónde conseguirlo, incluso a través de otras personas.',
          'Junto a eso pone la imaginación: la capacidad de combinar ideas que ya existen en algo nuevo y de ver un plan donde otros ven un problema. Una pregunta útil para hoy: ¿qué es lo único que, si lo aprendieras este mes, más te acercaría a tu meta?',
        ],
        source: 'Napoleon Hill, «Think and Grow Rich» (1937), cap. 5: Conocimiento especializado y cap. 6: Imaginación',
      },
      {
        h2: 'Los seis miedos que te frenan',
        paragraphs: [
          'Al final del libro, Hill describe seis miedos básicos que, según él, frenan a casi todo el mundo: a la pobreza, a la crítica, a la enfermedad, a perder el amor de alguien, a la vejez y a la muerte. Su consejo no es eliminarlos, sino reconocer cuál te está deteniendo, porque un miedo sin nombre decide por ti.',
          'El más común cuando persigues una meta es el miedo a la crítica: «¿qué van a decir?». En SOI lo tratamos como un enemigo interior, algo que aparece y se puede vencer, no como un defecto tuyo. Lo trabajamos en la [guía de mentalidad ganadora](/mentalidad-ganadora).',
        ],
        source: 'Napoleon Hill, «Think and Grow Rich» (1937), cap. 15: Los seis fantasmas del miedo',
      },
      {
        h2: 'Decisión y persistencia',
        paragraphs: [
          'Hill observó que la gente que logra mucho decide rápido y cambia de opinión despacio, y que la mayoría abandona justo antes de lograrlo. Para él, la persistencia no es fuerza de voluntad: es la consecuencia de un deseo claro, un plan y hábitos que te sostienen cuando la motivación baja.',
          'Esto conecta con lo que hoy sabemos de la disciplina: depende menos de aguantar y más de diseñar tu entorno y tus rutinas. Lo explicamos en la [guía de disciplina personal](/disciplina-personal).',
        ],
        source: 'Napoleon Hill, «Think and Grow Rich» (1937), cap. 8: Decisión y cap. 9: Persistencia',
      },
      {
        h2: 'Cómo leer a Hill hoy: una mirada crítica',
        paragraphs: [
          'Vale la pena leerlo con ojos abiertos. Hill decía haber escrito el libro por encargo de Andrew Carnegie tras entrevistar a cientos de personas exitosas, pero investigaciones posteriores, como la del periodista Matt Novak (2016), no encontraron pruebas independientes de muchas de esas historias.',
          'Además, el libro estudia solo a quienes tuvieron éxito, sin mirar a quienes hicieron lo mismo y no lo lograron (el sesgo del superviviente), y a veces sugiere que pensar basta. No basta. Lo valioso de Hill es lo que sí resiste: metas definidas, un plan, empezar ya, rodearte de gente que te impulse y no rendirte ante el primer fracaso. Eso coincide con la investigación sobre metas de Locke y Latham.',
        ],
        source: 'Matt Novak, «Gizmodo» (2016); Locke y Latham (2002)',
      },
      {
        h2: 'Cómo practicar a Hill esta semana',
        paragraphs: [],
        list: [
          '**Día 1:** escribe lo que deseas, con exactitud. Si es dinero, la cantidad.',
          '**Día 2:** decide qué darás a cambio: tiempo, aprendizaje, servicio, esfuerzo.',
          '**Día 3:** fija una fecha.',
          '**Día 4:** escribe un plan de tres pasos y haz el primero hoy.',
          '**Día 5:** escribe tu declaración: deseo, fecha, lo que das y tu plan.',
          '**Día 6:** léela en voz alta al despertar y antes de dormir, sintiéndola.',
          '**Día 7:** decide qué harás cuando aparezca la duda, en lugar de rendirte.',
        ],
        ordered: true,
      },
    ],
    cta: {
      heading: '7 días con Napoleon Hill, guiados por voz',
      text: 'Un paso del deseo por día, con su capítulo. Al final de la semana tu deseo tiene cantidad, precio, fecha, plan y una declaración que lees cada día.',
      button: 'Empezar el día 1 gratis',
    },
    faq: [
      { q: '¿Quién fue Napoleon Hill?', a: 'Un autor estadounidense (1883–1970) conocido por «Think and Grow Rich» (1937), traducido como «Piense y hágase rico», uno de los libros de desarrollo personal más vendidos de la historia.' },
      { q: '¿Cuáles son los principios de «Piense y hágase rico»?', a: 'Hill describe trece: deseo, fe, autosugestión, conocimiento especializado, imaginación, planificación organizada, decisión, persistencia, mente maestra, transmutación, mente subconsciente, cerebro y sexto sentido. El punto de partida de todos es el deseo definido.' },
      { q: '¿«Piense y hágase rico» solo sirve para ganar dinero?', a: 'No. Aunque usa el dinero como ejemplo, sus principios (deseo definido, plan, decisión, persistencia, grupo de apoyo) se aplican a cualquier meta personal o profesional.' },
      { q: '¿Es cierta la historia de Andrew Carnegie?', a: 'No hay pruebas independientes de que Carnegie le encargara el libro ni de muchas de las entrevistas que Hill relata. Sus principios prácticos siguen siendo útiles, pero conviene tomar su biografía con cautela.' },
    ],
    guides: ['encontrar-proposito', 'metas-personales', 'disciplina-personal', 'mentalidad-ganadora'],
    posts: ['los-6-pasos-de-napoleon-hill', 'mentalidad-de-abundancia-vs-escasez', 'cambiar-tu-relacion-con-el-dinero'],
  },
];
