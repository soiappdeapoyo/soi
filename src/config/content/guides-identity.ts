import type { Guide } from './types';

/** Guías: propósito, autoestima, mentalidad ganadora y metas personales. */
export const GUIDES_IDENTITY: Guide[] = [
  {
    slug: 'encontrar-proposito',
    name: 'Encontrar tu propósito',
    keyword: 'cómo encontrar mi propósito',
    title: 'Cómo encontrar tu propósito de vida: guía práctica',
    description: 'Por qué no encuentras tu propósito esperando una revelación, 5 preguntas para descubrirlo y cómo probarlo con acciones pequeñas. Con Hill y Frankl.',
    h1: 'Cómo encontrar tu propósito de vida',
    answer: 'El propósito no se encuentra de golpe: se descubre probando. Empieza por responder qué te indigna o te conmueve, qué harías aunque no te pagaran y a quién te gustaría ayudar. Con eso, escribe tres versiones posibles de tu vida en cinco años y elige un experimento pequeño para esta semana. La claridad llega con la acción, no antes.',
    intro: [
      'Sientes que tu vida va en piloto automático. Trabajas, cumples, descansas y vuelves a empezar, pero algo no termina de encajar. Y la pregunta aparece cada vez más seguido: ¿para qué hago todo esto?',
      'Buscar tu propósito no es un lujo ni una crisis: es una de las preguntas más humanas que existen. La buena noticia es que no necesitas esperar una revelación. Aquí tienes un camino práctico, con las ideas de quienes más pensaron en esto.',
    ],
    eslabon: 'pensamiento',
    sections: [
      {
        h2: 'Qué es el propósito (y qué no)',
        paragraphs: [
          'El propósito es una dirección que le da sentido a lo que haces. No es un trabajo, ni una meta que se cumple y termina, ni algo que todos los demás tengan que admirar. Puede ser cuidar, crear, enseñar, construir, sanar o abrir caminos para otros.',
          'Viktor Frankl, psiquiatra que sobrevivió a los campos de concentración, escribió en «El hombre en busca de sentido» que quien tiene un **para qué** puede soportar casi cualquier **cómo**. El sentido no se inventa en abstracto: se encuentra en lo que haces, en a quién amas y en cómo enfrentas lo difícil.',
        ],
        source: 'Viktor Frankl, «El hombre en busca de sentido» (1946)',
      },
      {
        h2: 'Por qué no lo encuentras pensando',
        paragraphs: [
          'Muchas personas esperan tener claridad antes de moverse: «cuando sepa qué quiero, empiezo». Pero el propósito rara vez llega así. Bill Burnett y Dave Evans, que enseñan diseño de vida en Stanford, lo dicen claro: no puedes pensar tu camino hacia el futuro, tienes que construirlo probando.',
          'Pensar ayuda a encontrar pistas. La acción te dice cuáles son verdaderas: qué te da energía de verdad y qué solo sonaba bien en tu cabeza.',
        ],
        source: 'Bill Burnett y Dave Evans, «Designing Your Life» (2016)',
      },
      {
        h2: '5 preguntas para descubrir tu propósito',
        paragraphs: ['Respóndelas por escrito, sin filtrar. Busca lo que se repite:'],
        list: [
          '¿Qué te indigna o te conmueve tanto que quisieras cambiarlo?',
          '¿Qué harías durante horas aunque nadie te pagara ni te viera?',
          '¿Qué te piden o te agradecen otras personas una y otra vez?',
          '¿A quién te gustaría ayudar, si pudieras ayudar a alguien?',
          'Si tuvieras 80 años y miraras atrás, ¿qué te dolería no haber intentado?',
        ],
        ordered: true,
      },
      {
        h2: 'Napoleon Hill y el propósito definido',
        paragraphs: [
          'Para Napoleon Hill, todo logro empieza con un **propósito principal definido**: saber exactamente qué quieres y comprometerte con eso. En «Think and Grow Rich» propone seis pasos para transformar un deseo en realidad: definirlo con precisión, decidir qué darás a cambio, ponerle fecha, crear un plan y empezar de inmediato, escribirlo y leerlo en voz alta dos veces al día.',
          'No hace falta que tu propósito sea definitivo para usar estos pasos. Puedes aplicarlos a tu propósito de esta temporada y ajustarlo después. Si quieres llevarlo a metas concretas, sigue con la [guía de metas personales](/metas-personales).',
        ],
        source: 'Napoleon Hill, «Think and Grow Rich» (1937)',
      },
      {
        h2: 'El diagrama del propósito (y su verdadero origen)',
        paragraphs: [
          'Seguramente viste el diagrama de cuatro círculos: lo que amas, lo que se te da bien, lo que el mundo necesita y por lo que te pueden pagar. Se suele llamar «ikigai», pero su origen es otro: es el diagrama del **propósito** del astrólogo español Andrés Zuzunaga, que el bloguero Marc Winn rebautizó como ikigai en 2014. En Japón, ikigai significa algo más sencillo: aquello que hace que valga la pena levantarse cada día.',
          'Como herramienta para reflexionar, el diagrama es útil. Solo no lo uses como examen: tu propósito no tiene que cumplir los cuatro círculos para ser valioso.',
        ],
        source: 'Andrés Zuzunaga, diagrama del propósito (2011); Marc Winn (2014)',
      },
      {
        h2: 'Prueba tu propósito con experimentos pequeños',
        paragraphs: [
          'Burnett y Evans proponen los **planes Odisea**: escribir tres versiones de tu vida en los próximos cinco años. La que ya estás viviendo, la que harías si la primera desapareciera y la que harías si el dinero y la opinión de los demás no importaran.',
          'Después, elige un experimento pequeño para la versión que más te atrae: conversar con alguien que ya vive así, tomar un curso de una tarde, hacer un voluntariado, crear algo durante un fin de semana. Observa cómo te sientes. Eso es información, no un compromiso de por vida.',
        ],
        source: 'Bill Burnett y Dave Evans, «Designing Your Life» (2016)',
      },
    ],
    method: {
      name: 'Pistas de propósito (10 minutos)',
      minutes: 10,
      source: 'Bill Burnett y Dave Evans, «Designing Your Life»; Napoleon Hill, propósito principal definido; Viktor Frankl',
      steps: [
        'Responde por escrito las 5 preguntas, sin filtrar.',
        'Subraya las palabras o temas que aparecen más de una vez.',
        'Escribe una frase de propósito provisional: «Quiero [verbo] a [quién] para [qué].»',
        'Elige un experimento de esta semana que te acerque a esa frase.',
        'Después del experimento, anota cómo te sentiste: ¿te dio energía o te la quitó?',
      ],
    },
    moment: {
      title: 'Descubrir hacia dónde voy',
      blocks: [
        { label: 'Respiración para llegar', minutes: 1 },
        { label: 'Preguntas de propósito', minutes: 5 },
        { label: 'Tu frase de propósito', minutes: 2 },
        { label: 'Un experimento para esta semana', minutes: 2 },
      ],
    },
    cta: {
      heading: 'Descubre tu propósito conversando',
      text: 'Cuéntale a SOI qué te inquieta. Napoleon Hill, el mentor de propósito de SOI, te hace las preguntas correctas, recuerda tus respuestas y te ayuda a probar tu camino.',
      button: 'Encontrar mi propósito con SOI',
    },
    agent: 'napoleon_hill',
    faq: [
      { q: '¿Qué hago si no sé qué quiero hacer con mi vida?', a: 'Es más común de lo que parece. En vez de esperar claridad, busca pistas (qué te da energía, qué te conmueve, qué te piden) y pruébalas con experimentos pequeños. La claridad aparece con la acción.' },
      { q: '¿Se puede tener más de un propósito?', a: 'Sí. Muchas personas tienen un propósito en su trabajo, otro en su familia y otro en lo que crean. Además, el propósito puede cambiar con las etapas de la vida. Lo importante es que te dé dirección hoy.' },
      { q: '¿El propósito tiene que ver con el trabajo?', a: 'No necesariamente. Para algunas personas el trabajo es el camino de su propósito; para otras es lo que lo financia. Viktor Frankl encontraba el sentido en lo que haces, en a quién amas y en cómo enfrentas el sufrimiento.' },
      { q: '¿Qué es el propósito principal definido?', a: 'Es la idea central de Napoleon Hill: saber con precisión qué quieres lograr, comprometerte con ello y organizar tu vida alrededor de ese objetivo, con un plan y una fecha.' },
    ],
    related: ['metas-personales', 'mentalidad-ganadora', 'manifestacion'],
    emotions: ['sentirse-estancado', 'desmotivacion'],
    posts: ['como-reprogramar-tu-identidad', 'por-que-consumes-motivacion-pero-no-cambias'],
  },

  {
    slug: 'mejorar-autoestima',
    name: 'Mejorar la autoestima',
    keyword: 'cómo mejorar mi autoestima',
    title: 'Cómo mejorar tu autoestima: 6 prácticas con fuente',
    description: 'Qué es la autoestima de verdad, por qué no se arregla con frases positivas y 6 prácticas diarias para construirla, con Nathaniel Branden y Kristin Neff.',
    h1: 'Cómo mejorar tu autoestima de verdad',
    answer: 'La autoestima no se construye repitiéndote que eres increíble, sino con evidencia: cumplir promesas pequeñas contigo, tratarte con la amabilidad con la que tratarías a alguien que quieres, revisar tus pensamientos más duros y registrar cada día lo que hiciste bien. Con el tiempo, tu mente deja de discutir contigo porque las pruebas están ahí.',
    intro: [
      'Te comparas, te criticas, sientes que no eres suficiente. Y aunque los demás te digan que vales, una parte de ti no lo cree.',
      'La autoestima no es algo que se tiene o no se tiene: se construye, y se puede reconstruir a cualquier edad. Esta guía te explica cómo, con prácticas concretas que no dependen de convencerte con frases.',
    ],
    eslabon: 'pensamiento',
    sections: [
      {
        h2: 'Qué es la autoestima',
        paragraphs: [
          'El psicoterapeuta Nathaniel Branden, uno de los autores que más estudió el tema, la definió como la experiencia de sentirte **capaz** de enfrentar los desafíos de la vida y **merecedor** de ser feliz. Son dos partes: confianza en lo que puedes hacer y respeto por quien eres.',
          'Por eso la autoestima no es creerte mejor que los demás. Es tener una relación sana contigo, en la que puedes reconocer tus errores sin destruirte y tus logros sin minimizarlos.',
        ],
        source: 'Nathaniel Branden, «Los seis pilares de la autoestima» (1994)',
      },
      {
        h2: 'Por qué las frases positivas no bastan',
        paragraphs: [
          'Si tu autoestima está baja, repetir «soy maravillosa» puede hacerte sentir peor: un estudio encontró justamente ese efecto en personas con baja autoestima. Tu mente busca pruebas en contra y las encuentra.',
          'Lo que sí funciona es cambiar la conducta y el diálogo interno al mismo tiempo, con frases creíbles y acciones que las respalden. Te explicamos cómo escribirlas en la [guía de afirmaciones](/afirmaciones).',
        ],
        source: 'Wood, Perunovic y Lee (2009)',
      },
      {
        h2: 'Los seis pilares de Nathaniel Branden',
        paragraphs: ['Branden propuso que la autoestima se sostiene en seis prácticas, no en pensamientos:'],
        list: [
          '**Vivir conscientemente:** darte cuenta de lo que haces, sientes y eliges.',
          '**Aceptarte:** reconocer lo que eres, incluso lo que no te gusta, sin pelear con ello.',
          '**Responsabilizarte:** asumir que eres quien decide qué haces con tu vida.',
          '**Afirmarte:** expresar lo que piensas y necesitas, con respeto.',
          '**Vivir con propósito:** tener metas y actuar para lograrlas.',
          '**Integridad:** que lo que haces coincida con lo que dices que valoras.',
        ],
        ordered: true,
        source: 'Nathaniel Branden, «Los seis pilares de la autoestima» (1994)',
      },
      {
        h2: 'Autocompasión: tratarte como a alguien que quieres',
        paragraphs: [
          'La psicóloga Kristin Neff estudió una alternativa a la autoestima basada en logros: la **autocompasión**. Tiene tres partes: ser amable contigo cuando fallas (en vez de criticarte), recordar que equivocarse es humano y le pasa a todos, y notar lo que sientes sin exagerarlo ni ignorarlo.',
          'Una pregunta para practicarla: ¿qué le dirías a una amiga que te cuenta exactamente lo que te pasó? Escríbelo, y luego léelo como si fuera para ti.',
        ],
        source: 'Kristin Neff, «Self-Compassion» (2011)',
      },
      {
        h2: 'Revisa a tu crítico interior',
        paragraphs: [
          'La voz que te dice «no sirves» o «siempre lo arruinas» suele usar los mismos trucos: generaliza («siempre», «nunca»), etiqueta («soy un fracaso») y filtra solo lo negativo. En SOI la llamamos **El Crítico**: no eres tú, es un patrón al que se le puede ganar.',
          'Cuando aparezca, escribe lo que dice y pregúntate: ¿es un hecho o una interpretación? ¿Qué evidencia hay en contra? Lo explicamos paso a paso en [cómo controlar los pensamientos negativos](/ansiedad) y en [7 pensamientos que bloquean tu crecimiento](/blog/pensamientos-que-bloquean-tu-crecimiento).',
        ],
        source: 'Aaron Beck, terapia cognitiva; David Burns, «Feeling Good» (1980)',
      },
      {
        h2: 'El diario de evidencias',
        paragraphs: [
          'Cada noche, escribe tres cosas que hiciste bien hoy, por pequeñas que sean: cumpliste una promesa, pusiste un límite, te levantaste aunque costaba. Con las semanas, tendrás algo que tu crítico interior no puede discutir: pruebas.',
          'En SOI esto se llama el **Muro de Evidencias**, y cada Moment que vives suma evidencia a la identidad que estás construyendo.',
        ],
      },
    ],
    method: {
      name: 'Evidencia y autocompasión (7 minutos)',
      minutes: 7,
      source: 'Kristin Neff, autocompasión; Nathaniel Branden, los seis pilares; Aaron Beck, terapia cognitiva',
      steps: [
        'Escribe la frase más dura que te dijiste hoy.',
        'Pregúntate: ¿es un hecho o una interpretación? Escribe una evidencia en contra.',
        'Escribe lo que le dirías a una amiga en tu lugar, y léelo para ti.',
        'Anota tres cosas que hiciste bien hoy, por pequeñas que sean.',
        'Elige una promesa pequeña para mañana y cúmplela.',
      ],
    },
    moment: {
      title: 'Hablarme con respeto',
      blocks: [
        { label: 'Respiración para llegar', minutes: 1 },
        { label: 'Reencuadra al Crítico', minutes: 3 },
        { label: 'Tres evidencias de hoy', minutes: 2 },
        { label: 'Una afirmación puente', minutes: 1 },
      ],
    },
    cta: {
      heading: 'Construye tu autoestima con evidencia, no con frases',
      text: 'Cuéntale a SOI qué te dices cuando fallas. Te ayuda a reencuadrarlo, guarda cada logro en tu Muro de Evidencias y te muestra quién te estás volviendo.',
      button: 'Empezar con SOI',
    },
    agent: 'afirmacion',
    faq: [
      { q: '¿Cómo saber si tengo baja autoestima?', a: 'Algunas señales comunes: te criticas con dureza, te comparas todo el tiempo, te cuesta aceptar un halago, dices que sí cuando quieres decir que no o sientes que tus logros fueron suerte. Reconocerlo es el primer paso.' },
      { q: '¿Cuánto tarda en mejorar la autoestima?', a: 'Es un proceso gradual. Muchas personas notan cambios en semanas cuando practican de forma constante (cumplir promesas pequeñas, registrar evidencias, autocompasión), pero la autoestima se sigue construyendo toda la vida.' },
      { q: '¿Qué diferencia hay entre autoestima y autocompasión?', a: 'La autoestima suele depender de cómo te evalúas (logros, comparación). La autocompasión, estudiada por Kristin Neff, es cómo te tratas cuando fallas. La autocompasión es más estable porque no depende de que las cosas salgan bien.' },
      { q: '¿Necesito terapia para mejorar mi autoestima?', a: 'No siempre, pero puede ayudar mucho, sobre todo si la baja autoestima viene de experiencias difíciles o afecta tu vida diaria. SOI te acompaña con prácticas, pero no sustituye a un profesional.' },
    ],
    related: ['afirmaciones', 'ansiedad', 'mentalidad-ganadora'],
    emotions: ['baja-autoestima', 'ansiedad'],
    posts: ['pensamientos-que-bloquean-tu-crecimiento', 'como-reprogramar-tu-identidad'],
  },

  {
    slug: 'mentalidad-ganadora',
    name: 'Mentalidad ganadora',
    keyword: 'cómo cambiar mi mentalidad',
    title: 'Mentalidad ganadora: cómo cambiar tu forma de pensar',
    description: 'Qué es la mentalidad de crecimiento de Carol Dweck, las creencias que te frenan y 5 hábitos para cambiar tu mentalidad con evidencia, no con frases.',
    h1: 'Mentalidad ganadora: cómo cambiar tu forma de pensar',
    answer: 'Cambiar tu mentalidad es pasar de «soy así» a «estoy aprendiendo». Empieza por notar tus creencias fijas («no soy bueno para esto»), agrégales la palabra «todavía», trata los errores como información y mide tu progreso contra quien eras ayer, no contra otros. Lo que cambia la mentalidad no es pensar distinto una vez, sino actuar distinto cada día.',
    intro: [
      '«Yo no soy bueno para eso.» «Así soy, no voy a cambiar.» «Para otros es fácil, para mí no.» Son frases que parecen descripciones, pero funcionan como sentencias: deciden lo que intentas y lo que no.',
      'Una mentalidad ganadora no es pensar que vas a ganar siempre. Es creer que puedes mejorar, y comportarte como alguien que lo cree. Aquí te explicamos de dónde viene la idea y cómo practicarla.',
    ],
    eslabon: 'pensamiento',
    sections: [
      {
        h2: 'Mentalidad fija y mentalidad de crecimiento',
        paragraphs: [
          'La psicóloga Carol Dweck, de Stanford, describió dos formas de ver las propias capacidades. En la **mentalidad fija**, crees que tu inteligencia y tus talentos son los que son: o los tienes o no. En la **mentalidad de crecimiento**, crees que se desarrollan con esfuerzo, estrategia y ayuda.',
          'La diferencia se nota frente a un error. Con mentalidad fija, un error es una prueba de que no sirves; con mentalidad de crecimiento, es información sobre qué ajustar. Por eso la segunda te lleva a intentar más, y la primera a evitar lo difícil.',
        ],
        source: 'Carol Dweck, «Mindset: la actitud del éxito» (2006)',
      },
      {
        h2: 'Lo que dice la evidencia (sin exagerar)',
        paragraphs: [
          'La idea se popularizó tanto que a veces se vende como solución mágica. La evidencia es más modesta: un gran estudio nacional en Estados Unidos encontró que una intervención corta de mentalidad de crecimiento mejoró un poco las calificaciones, sobre todo de estudiantes con bajo rendimiento.',
          'La lección: cambiar cómo piensas ayuda, pero no basta con conocer la idea. Funciona cuando se convierte en conducta: buscar retos, pedir retroalimentación, practicar de forma deliberada.',
        ],
        source: 'David Yeager y colegas, Nature (2019)',
      },
      {
        h2: 'El poder de la palabra «todavía»',
        paragraphs: [
          'Dweck propone un cambio pequeño y muy útil: agregar «todavía» a tus frases fijas. «No sé hablar en público» se vuelve «no sé hablar en público **todavía**». «No me sale» se vuelve «no me sale todavía».',
          'Parece un juego de palabras, pero cambia la pregunta que te haces: ya no «¿tengo talento?», sino «¿qué necesito practicar?».',
        ],
        source: 'Carol Dweck, charla TED «The power of believing that you can improve» (2014)',
      },
      {
        h2: 'Napoleon Hill y la mentalidad del logro',
        paragraphs: [
          'Décadas antes, Napoleon Hill entrevistó a cientos de personas exitosas y concluyó que todas compartían ciertos principios: un deseo definido, fe en que es posible, decisión rápida y persistencia frente a la derrota temporal. Para Hill, la derrota no es fracaso mientras no la aceptes como definitiva.',
          'Su enfoque es menos científico que el de Dweck, pero apunta a lo mismo: lo que crees sobre ti decide lo que te atreves a intentar. En SOI, Hill es el mentor de propósito, y te ayuda a llevar esa mentalidad a un plan concreto. Mira cómo en la [guía de propósito](/encontrar-proposito).',
        ],
        source: 'Napoleon Hill, «Think and Grow Rich» (1937)',
      },
      {
        h2: '5 hábitos para cambiar tu mentalidad',
        paragraphs: ['La mentalidad cambia con lo que haces todos los días:'],
        list: [
          '**Atrapa tus frases fijas.** Cuando digas «yo no soy…», agrega «todavía».',
          '**Busca un reto pequeño a la semana.** Algo que te cueste un poco y que puedas lograr.',
          '**Revisa el error, no a la persona.** Pregúntate qué aprendiste y qué harás distinto.',
          '**Compárate con tu versión de ayer.** No con la vida editada de otros en redes.',
          '**Registra tu progreso.** Lo que no se ve se olvida; lo que se anota se vuelve evidencia.',
        ],
        ordered: true,
      },
      {
        h2: 'Tu mentalidad es tu identidad en acción',
        paragraphs: [
          'Al final, tu mentalidad es la historia que te cuentas sobre quién eres. Y esa historia cambia con pruebas: cada vez que intentas algo difícil y sobrevives, cada vez que fallas y vuelves, tu mente actualiza quién eres. Lo profundizamos en [cómo reprogramar tu identidad](/blog/como-reprogramar-tu-identidad) y en los [pensamientos que bloquean tu crecimiento](/blog/pensamientos-que-bloquean-tu-crecimiento).',
        ],
      },
    ],
    method: {
      name: 'De fijo a crecimiento (5 minutos)',
      minutes: 5,
      source: 'Carol Dweck, mentalidad de crecimiento; Aaron Beck, terapia cognitiva',
      steps: [
        'Escribe una frase fija que te dices: «Yo no soy bueno para…».',
        'Reescríbela con «todavía» y con lo que necesitas practicar.',
        'Recuerda una vez en que aprendiste algo que antes no sabías. Escríbela.',
        'Elige un reto pequeño para esta semana relacionado con esa frase.',
        'Al terminar el reto, anota qué aprendiste, salga como salga.',
      ],
    },
    moment: {
      title: 'Todavía no, pero voy',
      blocks: [
        { label: 'Respiración para llegar', minutes: 1 },
        { label: 'Reencuadra tu frase fija', minutes: 2 },
        { label: 'Recuerda una vez que aprendiste', minutes: 1 },
        { label: 'Tu reto de esta semana', minutes: 1 },
      ],
    },
    cta: {
      heading: 'Cambia tu mentalidad con evidencia diaria',
      text: 'Cuéntale a SOI qué creencia te frena. Te ayuda a reencuadrarla, te propone retos a tu medida y te muestra, con tus propios datos, cómo estás cambiando.',
      button: 'Cambiar mi mentalidad con SOI',
    },
    agent: 'napoleon_hill',
    faq: [
      { q: '¿Qué es una mentalidad ganadora?', a: 'Es la creencia de que puedes mejorar con esfuerzo y estrategia, acompañada de la conducta que la respalda: buscar retos, aprender de los errores y persistir. No significa ganar siempre, sino no rendirte ante la primera derrota.' },
      { q: '¿Cuánto tiempo tarda en cambiar la mentalidad?', a: 'No hay un plazo fijo. Las creencias cambian a medida que acumulas evidencias en su contra. Practicar todos los días un pequeño reto y registrar lo que aprendes acelera el proceso.' },
      { q: '¿La mentalidad de crecimiento es solo pensar positivo?', a: 'No. Pensar positivo es esperar que todo salga bien. La mentalidad de crecimiento acepta que puede salir mal y se enfoca en qué aprender y qué practicar. Es más realista y más útil.' },
      { q: '¿Qué libros leer para cambiar la mentalidad?', a: 'Algunos clásicos: «Mindset» de Carol Dweck, «Think and Grow Rich» de Napoleon Hill, «Grit» de Angela Duckworth y «Atomic Habits» de James Clear.' },
    ],
    related: ['encontrar-proposito', 'mejorar-autoestima', 'disciplina-personal'],
    emotions: ['sentirse-estancado', 'baja-autoestima'],
    posts: ['pensamientos-que-bloquean-tu-crecimiento', 'mentalidad-de-abundancia-vs-escasez'],
  },

  {
    slug: 'metas-personales',
    name: 'Metas personales',
    keyword: 'cómo establecer metas personales',
    title: 'Cómo establecer metas personales y cumplirlas',
    description: 'El método de 7 pasos de Brian Tracy, por qué las metas específicas funcionan mejor y cómo convertir una meta en una acción diaria. Con ejemplos.',
    h1: 'Cómo establecer metas personales y cumplirlas',
    answer: 'Para cumplir una meta, escríbela de forma específica, ponle fecha límite, haz una lista de lo que necesitas, ordénala en un plan y da el primer paso hoy. Después, haz algo por ella todos los días. Las metas concretas y desafiantes funcionan mejor que «dar lo mejor de ti», y nombrar de antemano el obstáculo te ayuda a no abandonar.',
    intro: [
      'Escribes tus metas en enero con ilusión, y en marzo ya no recuerdas dónde las anotaste. No es falta de voluntad: la mayoría de las metas fallan porque son vagas, no tienen fecha o no se convierten en algo que hagas cada día.',
      'Aquí tienes un método probado para definir metas personales y, sobre todo, para cumplirlas.',
    ],
    eslabon: 'resultado',
    sections: [
      {
        h2: 'Por qué las metas específicas funcionan mejor',
        paragraphs: [
          'Edwin Locke y Gary Latham revisaron cientos de estudios durante décadas y llegaron a una conclusión consistente: las metas **específicas y desafiantes** llevan a mejores resultados que las metas vagas como «dar lo mejor de mí». Una meta clara dirige tu atención, aumenta tu esfuerzo y te ayuda a persistir.',
          'La diferencia se ve en cómo se escribe. «Quiero estar en forma» es un deseo. «Camino 30 minutos cinco días a la semana durante marzo» es una meta.',
        ],
        source: 'Edwin Locke y Gary Latham, teoría del establecimiento de metas (2002)',
      },
      {
        h2: 'El método de 7 pasos de Brian Tracy',
        paragraphs: ['Brian Tracy resume en siete pasos cómo pasar de un deseo a un logro:'],
        list: [
          '**Decide exactamente qué quieres.** Específico y medible.',
          '**Escríbelo.** Una meta que no está escrita es un deseo.',
          '**Ponle fecha límite.** Si es grande, fechas intermedias.',
          '**Haz una lista** de todo lo que necesitas hacer para lograrla.',
          '**Organiza la lista en un plan:** qué va primero y qué después.',
          '**Actúa de inmediato.** Haz algo hoy, aunque sea pequeño.',
          '**Haz algo todos los días** que te acerque a tu meta.',
        ],
        ordered: true,
        source: 'Brian Tracy, «Goals!» (2003)',
      },
      {
        h2: 'Las 10 metas diarias',
        paragraphs: [
          'Brian Tracy recomienda un ejercicio sencillo: cada mañana, escribe 10 metas en presente, como si ya las hubieras logrado («Gano tanto al mes», «Corro 10 kilómetros»). Luego pregúntate: si pudiera lograr solo una de estas en las próximas 24 horas, ¿cuál tendría el mayor impacto en mi vida? Esa es tu meta principal.',
          'Escribirlas a diario las mantiene presentes y te obliga a elegir. Puedes combinarlo con la [rutina de mañana](/rutina-mananas).',
        ],
        source: 'Brian Tracy, «Goals!» (2003)',
      },
      {
        h2: 'Nombra el obstáculo antes de que aparezca',
        paragraphs: [
          'Gabriele Oettingen encontró que imaginar solo el éxito reduce la energía para actuar. Su método, **WOOP**, tiene cuatro pasos: **Deseo** (qué quieres), **Resultado** (cómo se sentirá lograrlo), **Obstáculo** (qué en ti puede frenarte) y **Plan** (si aparece el obstáculo, entonces hago esto).',
          'Ejemplo: «Si llego cansada del trabajo y quiero saltarme la caminata, entonces me pongo los tenis y camino solo 10 minutos.»',
        ],
        source: 'Gabriele Oettingen, «Rethinking Positive Thinking» (2014)',
      },
      {
        h2: 'De la meta a la acción diaria',
        paragraphs: [
          'Una meta anual se cumple con acciones diarias. Divide tu meta en hitos mensuales, cada hito en tareas semanales y cada tarea en un primer paso que puedas hacer hoy. Si te cuesta empezar, usa el [método de microacciones](/procrastinacion).',
          'Y dale un lugar en tu día: una hora fija o un anclaje («después del café, trabajo 20 minutos en mi meta»). Lo que no tiene lugar en tu agenda, no sucede.',
        ],
      },
      {
        h2: 'Revisa tus metas cada semana',
        paragraphs: [
          'Una vez por semana, revisa: ¿qué avancé?, ¿qué me frenó?, ¿qué ajusto? Las metas no son contratos inamovibles. Ajustarlas con lo que aprendes no es fallar, es dirigir. Si todavía no sabes qué metas ponerte, empieza por [encontrar tu propósito](/encontrar-proposito).',
        ],
      },
    ],
    method: {
      name: 'Tu meta en 10 minutos',
      minutes: 10,
      source: 'Brian Tracy, «Goals!»; Gabriele Oettingen, WOOP; Locke y Latham, metas específicas',
      steps: [
        'Escribe 10 metas en presente, como si ya las hubieras logrado.',
        'Elige la que tendría más impacto si la lograras en 24 horas.',
        'Hazla específica: qué, cuánto y para cuándo.',
        'Escribe el obstáculo interior más probable y tu plan si-entonces.',
        'Haz hoy el primer paso, aunque sea de 5 minutos.',
      ],
    },
    moment: {
      title: 'Mi meta principal',
      blocks: [
        { label: '10 metas en presente', minutes: 4 },
        { label: 'Elige tu meta principal', minutes: 1 },
        { label: 'Obstáculo y si-entonces', minutes: 2 },
        { label: 'Tu primer paso de hoy', minutes: 1 },
      ],
    },
    cta: {
      heading: 'Una meta escrita, un paso cada día',
      text: 'Cuéntale a SOI qué quieres lograr. Te ayuda a definir tu meta, la divide en pasos y te acompaña cada día con un Moment para avanzar.',
      button: 'Definir mi meta con SOI',
    },
    agent: 'brian_tracy',
    faq: [
      { q: '¿Cuántas metas personales debo tener?', a: 'Puedes escribir muchas, pero enfócate en pocas a la vez. Brian Tracy sugiere escribir 10 y elegir una principal: la que más impacto tendría en tu vida. Las demás avanzan mejor cuando esa avanza.' },
      { q: '¿Qué son las metas SMART?', a: 'Es un formato para escribir metas: específicas, medibles, alcanzables, relevantes y con tiempo definido. Ayuda a convertir un deseo vago en algo concreto que puedes planear y medir.' },
      { q: '¿Por qué no cumplo mis metas?', a: 'Las razones más comunes: son vagas, no tienen fecha, no están escritas, no se convierten en acciones diarias o no se anticipó el obstáculo. Revisar estos cinco puntos suele mostrar dónde está el problema.' },
      { q: '¿Es mejor tener metas grandes o pequeñas?', a: 'Las metas desafiantes motivan más, según la investigación de Locke y Latham. Pero para cumplirlas hay que dividirlas en pasos pequeños: la meta grande da dirección; el paso pequeño da movimiento.' },
    ],
    related: ['encontrar-proposito', 'disciplina-personal', 'visualizacion'],
    emotions: ['falta-de-enfoque', 'sentirse-estancado'],
    posts: ['visualizacion-para-objetivos-reales', 'por-que-consumes-motivacion-pero-no-cambias'],
  },
];
