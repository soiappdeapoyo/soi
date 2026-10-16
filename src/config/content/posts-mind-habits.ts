import type { Post } from './types';

/** Blog: Mentalidad y Hábitos. */
export const POSTS_MIND_HABITS: Post[] = [
  {
    slug: 'pensamientos-que-bloquean-tu-crecimiento',
    category: 'Mentalidad',
    title: '7 pensamientos que están bloqueando tu crecimiento',
    description: 'Los 7 errores de pensamiento más comunes según la terapia cognitiva, cómo reconocerlos en tu día y qué decirte en su lugar. Con ejemplos reales.',
    h1: '7 pensamientos que están bloqueando tu crecimiento',
    intro: [
      'No todo lo que piensas es verdad. Algunos pensamientos aparecen tan rápido y tan seguido que dejan de parecer pensamientos y se vuelven «la realidad». Y desde ahí deciden lo que intentas, lo que evitas y lo que crees que mereces.',
      'Aaron Beck y David Burns describieron estos patrones como **distorsiones cognitivas**: errores de pensamiento que todos tenemos y que se pueden aprender a detectar. Estos son los siete que más frenan el crecimiento personal.',
    ],
    takeaways: [
      'Los pensamientos automáticos se sienten como hechos, pero son interpretaciones.',
      'Nombrar la distorsión le quita fuerza al pensamiento.',
      'La meta no es pensar positivo, sino pensar de forma más justa.',
      'Cada pensamiento revisado y cada acción distinta construyen una nueva identidad.',
    ],
    sections: [
      {
        h2: '1. «Si no es perfecto, es un fracaso» (todo o nada)',
        paragraphs: [
          'Ves las cosas en blanco o negro: o lo haces perfecto o no sirve. Un día sin ir al gimnasio y «ya arruinaste la semana». Este pensamiento te hace abandonar justo cuando un pequeño ajuste bastaría.',
          '**Dite en su lugar:** «Lo que hice cuenta. ¿Qué es lo mínimo que puedo hacer hoy para seguir?»',
        ],
      },
      {
        h2: '2. «Siempre me pasa lo mismo» (sobregeneralización)',
        paragraphs: [
          'Un evento negativo se vuelve una regla: «nunca me sale nada», «siempre elijo mal». Las palabras «siempre» y «nunca» son la pista.',
          '**Dite en su lugar:** «Esta vez no salió. ¿Recuerdo alguna vez en que sí?»',
        ],
      },
      {
        h2: '3. «Seguro piensan que soy un fraude» (leer la mente)',
        paragraphs: [
          'Supones lo que otros piensan de ti, casi siempre lo peor, sin pruebas. Esto te frena para hablar, proponer o mostrarte.',
          '**Dite en su lugar:** «No sé lo que piensan. ¿Qué evidencia real tengo?»',
        ],
      },
      {
        h2: '4. «Esto va a salir terrible» (catastrofizar)',
        paragraphs: [
          'Te adelantas al peor escenario posible y lo vives como si ya hubiera pasado. Es uno de los motores de la ansiedad, y lo explicamos en la [guía para controlar los pensamientos negativos](/ansiedad).',
          '**Dite en su lugar:** «¿Qué es lo más probable que pase? Si pasa lo peor, ¿qué haría?»',
        ],
      },
      {
        h2: '5. «Debería ser más…» (los deberías)',
        paragraphs: [
          'Te exiges con reglas rígidas: «debería estar más avanzada», «no debería sentirme así». Los «deberías» no te motivan: te llenan de culpa, y la culpa paraliza.',
          '**Dite en su lugar:** «Me gustaría… ¿Qué paso pequeño me acerca?»',
        ],
      },
      {
        h2: '6. «Soy un desastre» (etiquetarte)',
        paragraphs: [
          'Conviertes un error en una identidad. No «me equivoqué en el informe», sino «soy un inútil». Las etiquetas son peligrosas porque tu mente actúa de forma coherente con ellas.',
          '**Dite en su lugar:** «Cometí un error. No soy el error.» Si este patrón es frecuente, la [guía de autoestima](/mejorar-autoestima) te puede ayudar.',
        ],
      },
      {
        h2: '7. «No soy bueno para esto» (mentalidad fija)',
        paragraphs: [
          'Carol Dweck mostró que creer que tus capacidades son fijas te lleva a evitar retos y a rendirte rápido. Es quizás el pensamiento que más bloquea el crecimiento, porque te impide practicar lo que te haría mejorar.',
          '**Dite en su lugar:** «No soy bueno para esto **todavía**.» Lo explicamos en la [guía de mentalidad ganadora](/mentalidad-ganadora).',
        ],
        source: 'Carol Dweck, «Mindset» (2006)',
      },
      {
        h2: 'Cómo dejar de creerle a estos pensamientos',
        paragraphs: [
          'Reconocer la distorsión es el primer paso. El segundo es escribirla, porque en papel pierde fuerza. La terapia cognitiva usa un **registro de pensamientos**: la situación, el pensamiento exacto, la emoción, la evidencia a favor y en contra y un pensamiento alternativo más justo.',
          'El tercer paso es actuar distinto. Si tu mente dice «no puedo», haz una versión pequeña de lo que dice que no puedes. Cada acción es una prueba en contra. Así, poco a poco, [reprogramas tu identidad](/blog/como-reprogramar-tu-identidad).',
        ],
        source: 'Aaron Beck, terapia cognitiva; David Burns, «Feeling Good» (1980)',
      },
    ],
    faq: [
      { q: '¿Qué son las distorsiones cognitivas?', a: 'Son errores habituales de pensamiento, descritos por Aaron Beck y David Burns, que hacen que interpretes las situaciones de forma más negativa de lo que son: todo o nada, sobregeneralizar, leer la mente, catastrofizar, entre otros.' },
      { q: '¿Se pueden eliminar los pensamientos negativos?', a: 'No del todo, y no hace falta. El objetivo es reconocerlos, tomar distancia y no obedecerlos automáticamente. Con práctica, aparecen con menos frecuencia y menos fuerza.' },
    ],
    guides: ['ansiedad', 'mentalidad-ganadora', 'mejorar-autoestima'],
    published: '2026-10-16',
  },

  {
    slug: 'como-reprogramar-tu-identidad',
    category: 'Mentalidad',
    title: 'Cómo reprogramar tu identidad (y por qué funciona)',
    description: 'Por qué los cambios que empiezan por la identidad duran más, qué dicen James Clear, Joe Dispenza y Neville Goddard y cómo empezar a ser quien quieres ser.',
    h1: 'Cómo reprogramar tu identidad',
    intro: [
      'Has intentado cambiar muchas veces: una dieta, una rutina, un propósito. Funciona unas semanas y luego vuelves a lo de siempre. No es falta de voluntad. Es que intentaste cambiar lo que haces sin cambiar quién crees que eres.',
      'Reprogramar tu identidad suena complicado, pero la idea es sencilla: tu conducta tiende a ser coherente con la imagen que tienes de ti. Si cambias esa imagen, y la respaldas con pruebas, la conducta cambia con ella.',
    ],
    takeaways: [
      'Los cambios basados en identidad duran más que los basados en resultados.',
      'Cada acción es un voto por la persona que quieres ser.',
      'La identidad se cambia con evidencia, no solo con intención.',
      'Empieza por decidir quién quieres ser, no qué quieres lograr.',
    ],
    sections: [
      {
        h2: 'Tres niveles de cambio',
        paragraphs: [
          'James Clear describe tres capas: los **resultados** (lo que obtienes), los **procesos** (lo que haces) y la **identidad** (lo que crees sobre ti). La mayoría intenta cambiar de afuera hacia adentro: «quiero bajar 10 kilos». El cambio que dura va de adentro hacia afuera: «soy una persona que cuida su cuerpo».',
          'La diferencia se ve en una situación concreta. Te ofrecen un cigarro. Una persona dice «no, gracias, estoy tratando de dejarlo». Otra dice «no, gracias, no fumo». La segunda ya no está peleando contra un deseo: está siendo quien es.',
        ],
        source: 'James Clear, «Atomic Habits» (2018)',
      },
      {
        h2: 'Cada acción es un voto',
        paragraphs: [
          'Tu identidad no cambia porque lo decidas una mañana. Cambia porque acumulas evidencia. Cada vez que escribes, votas por ser alguien que escribe. Cada vez que cumples una promesa contigo, votas por ser alguien que cumple. No necesitas ganar todas las votaciones: solo la mayoría.',
          'Por eso las acciones pequeñas importan tanto. No por el resultado de un día, sino porque le enseñan a tu mente quién eres. Lo vemos en detalle en [cómo crear hábitos que duran](/crear-habitos).',
        ],
      },
      {
        h2: 'Lo que proponen Neville Goddard y Joe Dispenza',
        paragraphs: [
          'Neville Goddard hablaba de **asumir el estado**: vivir, pensar y sentir como la persona que ya tiene lo que deseas. Para él, el cambio empieza por la imaginación y el sentimiento, y se expresa luego en lo que haces.',
          'Joe Dispenza, en «Breaking the Habit of Being Yourself», propone algo parecido desde otro lenguaje: si piensas los mismos pensamientos, sientes las mismas emociones y haces lo mismo, vas a obtener la misma vida. Su práctica de la mañana invita a empezar el día eligiendo, antes del teléfono, quién quieres ser hoy.',
        ],
        source: 'Neville Goddard, «The Power of Awareness» (1952); Joe Dispenza, «Breaking the Habit of Being Yourself» (2012)',
      },
      {
        h2: 'Cómo reprogramar tu identidad en 4 pasos',
        paragraphs: [],
        list: [
          '**Decide quién quieres ser.** Escríbelo como identidad, no como meta: «soy alguien que…».',
          '**Elige la prueba más pequeña.** ¿Qué haría hoy esa persona en 2 minutos?',
          '**Hazla y regístrala.** Anota la evidencia: «Hoy fui alguien que…».',
          '**Revisa la historia que te cuentas.** Cuando aparezca «yo no soy así», responde con tus pruebas.',
        ],
        ordered: true,
      },
      {
        h2: 'Cuidado con las identidades que te limitan',
        paragraphs: [
          'Así como puedes construir una identidad nueva, también cargas con identidades viejas: «soy desordenada», «soy malo con el dinero», «yo no soy de mañanas». Muchas no las elegiste; te las dijeron o se formaron con experiencias de hace años.',
          'No necesitas pelearte con ellas. Basta con dejar de alimentarlas y empezar a juntar pruebas de lo contrario. Si te cuesta identificarlas, empieza por los [7 pensamientos que bloquean tu crecimiento](/blog/pensamientos-que-bloquean-tu-crecimiento).',
        ],
      },
      {
        h2: 'Así funciona Mi Nuevo Yo en SOI',
        paragraphs: [
          'En SOI no acumulas tareas terminadas: acumulas **evidencia de identidad**. Eliges quién quieres ser (por ejemplo, «alguien que cuida su calma»), cada Moment que vives y cada reflexión que escribes se conecta con esa identidad, y SOI te muestra cómo crece. No en un porcentaje, sino en un retrato: «Ya eres alguien que…».',
        ],
      },
    ],
    faq: [
      { q: '¿Se puede cambiar la identidad de una persona adulta?', a: 'Sí. La identidad no es fija: se va formando con lo que haces y lo que te cuentas sobre ti. Cambia a medida que acumulas experiencias y evidencias nuevas, a cualquier edad.' },
      { q: '¿Cuánto tiempo tarda en cambiar la identidad?', a: 'No hay un plazo. Cada acción coherente suma. Lo importante es la repetición: pequeñas pruebas diarias durante semanas y meses van cambiando cómo te ves.' },
    ],
    guides: ['crear-habitos', 'mentalidad-ganadora', 'manifestacion'],
    published: '2026-10-16',
  },

  {
    slug: 'por-que-consumes-motivacion-pero-no-cambias',
    category: 'Mentalidad',
    title: 'Por qué consumes motivación pero no cambias',
    description: 'Videos, libros, frases: por qué la motivación que consumes no te cambia la vida, qué dice la psicología y cómo pasar de inspirarte a actuar hoy.',
    h1: 'Por qué consumes motivación pero no cambias',
    intro: [
      'Ves un video que te enciende. Guardas la frase, compartes la publicación, te prometes que mañana empiezas. Y mañana todo sigue igual. Al mes, otro video, otro libro, otra frase.',
      'Si te reconoces, no estás sola ni solo. Consumir motivación se siente como avanzar, pero no lo es. Aquí te explicamos por qué pasa y cómo salir del círculo.',
    ],
    takeaways: [
      'Consumir motivación da una sensación de progreso sin el progreso.',
      'La motivación suele llegar después de actuar, no antes.',
      'Lo que te cambia es convertir una idea en una acción concreta, hoy.',
      'Una idea aplicada vale más que cien guardadas.',
    ],
    sections: [
      {
        h2: 'La trampa de sentir que avanzas',
        paragraphs: [
          'Cuando ves un video motivacional o lees sobre alguien que lo logró, tu mente experimenta una pequeña versión del éxito: imaginas, te emocionas, sientes que «ya estás en eso». Es agradable y no cuesta nada.',
          'Gabriele Oettingen estudió esto durante años: las fantasías positivas sobre el futuro dan una sensación de logro que **reduce la energía** para actuar. Tu mente siente que ya llegó, y deja de empujar.',
        ],
        source: 'Gabriele Oettingen, «Rethinking Positive Thinking» (2014)',
      },
      {
        h2: 'Consumir también es una forma de postergar',
        paragraphs: [
          'Leer un libro más sobre productividad, ver otro curso, investigar «la mejor forma» de empezar… todo eso se siente responsable. Pero muchas veces es una forma elegante de no empezar. Te mantiene cerca de tu meta sin el riesgo de intentarlo y fallar.',
          'Si te pasa, mira la [guía para dejar de procrastinar](/procrastinacion): el problema rara vez es la información.',
        ],
      },
      {
        h2: 'La motivación llega después de actuar',
        paragraphs: [
          'Esperamos tener ganas para empezar. Pero en la práctica suele ser al revés: empiezas, aunque sea un poco, y las ganas aparecen. La **activación conductual**, un enfoque de la psicología clínica, se basa justamente en esto: actuar primero, aunque no tengas ganas, porque la acción cambia el ánimo.',
          'Por eso esperar el momento de máxima motivación es una mala estrategia. Ese momento llega y se va. Lo que se queda es lo que hiciste mientras duró.',
        ],
        source: 'Neil Jacobson, Christopher Martell y colegas, activación conductual',
      },
      {
        h2: 'De la inspiración a la acción: la regla de la idea única',
        paragraphs: ['La próxima vez que algo te inspire, haz esto antes de seguir consumiendo:'],
        list: [
          '**Pausa.** No pases al siguiente video ni a la siguiente página.',
          '**Extrae una sola idea.** ¿Qué es lo que más te sirve de esto?',
          '**Tradúcela a una acción de 5 minutos.** Algo que puedas hacer hoy.',
          '**Ponle cuándo y dónde.** «Hoy a las 7, después de cenar.»',
          '**Hazla antes de consumir algo nuevo.**',
        ],
        ordered: true,
      },
      {
        h2: 'Menos contenido, más práctica',
        paragraphs: [
          'Una idea aplicada durante 30 días te cambia más que 30 libros leídos. Elige un solo libro, un solo autor o una sola práctica, y vívela hasta que se vuelva parte de ti. Después, la siguiente.',
          'Así funciona SOI: cuando ves un video dentro de la app, al terminar te pregunta qué te quedó y lo convierte en un Moment de 3 minutos. La inspiración se vuelve práctica en el mismo momento, antes de que se enfríe. Si quieres que esa práctica se sostenga, sigue con [cómo crear hábitos](/crear-habitos).',
        ],
      },
      {
        h2: 'Un ejemplo real del ciclo',
        paragraphs: [
          'Imagina a alguien que quiere empezar a correr. Ve tres videos de corredores, lee un artículo sobre los mejores tenis, guarda un plan de 12 semanas y se une a un grupo en redes. Pasan dos semanas y no ha corrido ni un kilómetro, pero siente que «está en eso».',
          'Ahora imagina que, después del primer video, hace una sola cosa: se pone los tenis y camina 10 minutos alrededor de la cuadra. No es correr, no es el plan de 12 semanas. Pero al día siguiente ya tiene algo que repetir, y una prueba de que es alguien que se mueve. Esa es toda la diferencia entre consumir y practicar.',
        ],
      },
    ],
    faq: [
      { q: '¿Es malo ver videos de motivación?', a: 'No. Pueden darte dirección e inspiración. El problema es usarlos en lugar de actuar. Úsalos como chispa: extrae una idea y conviértela en una acción hoy.' },
      { q: '¿Cómo mantener la motivación?', a: 'No intentes mantenerla: diseña un sistema que no dependa de ella. Hábitos pequeños, decisiones tomadas de antemano y un registro de tu progreso te sostienen los días sin ganas.' },
    ],
    guides: ['procrastinacion', 'disciplina-personal', 'crear-habitos'],
    published: '2026-10-16',
  },

  {
    slug: 'crear-un-habito-en-5-minutos-al-dia',
    category: 'Hábitos',
    title: 'Cómo crear un hábito en 5 minutos al día',
    description: 'Por qué los hábitos pequeños funcionan mejor, la regla de los 2 minutos, la fórmula del anclaje y ejemplos de hábitos de 5 minutos para empezar hoy.',
    h1: 'Cómo crear un hábito en 5 minutos al día',
    intro: [
      '«No tengo tiempo» es la razón más común para no empezar un hábito. Y es comprensible: si piensas en una hora de ejercicio o media hora de meditación, tu agenda no da.',
      'Pero los hábitos que duran casi nunca empiezan grandes. Empiezan con 5 minutos, o menos. Aquí te explicamos por qué funciona y cómo hacerlo.',
    ],
    takeaways: [
      'Lo pequeño se repite; lo grande se abandona.',
      'Primero construyes el hábito de aparecer, después lo haces crecer.',
      'Engancha el hábito nuevo a algo que ya haces todos los días.',
      'Celebrar al terminar le enseña a tu cerebro a repetirlo.',
    ],
    sections: [
      {
        h2: 'Por qué 5 minutos funcionan mejor que una hora',
        paragraphs: [
          'BJ Fogg, investigador de Stanford, explica que una conducta ocurre cuando coinciden tres cosas: motivación, capacidad y un detonante. Cuando la acción es muy fácil, necesitas muy poca motivación. Y como la motivación sube y baja, los hábitos fáciles sobreviven los días malos.',
          'Además, un hábito se forma por repetición, no por intensidad. Cinco minutos diarios durante dos meses construyen más que una hora los lunes durante tres semanas.',
        ],
        source: 'BJ Fogg, «Tiny Habits» (2019)',
      },
      {
        h2: 'La regla de los 2 minutos',
        paragraphs: [
          'James Clear propone que todo hábito nuevo empiece con una versión de 2 minutos: «leer antes de dormir» se vuelve «leer una página»; «hacer yoga» se vuelve «sacar el tapete». La idea es dominar el arte de aparecer antes de preocuparte por el resultado.',
          'Una vez que la versión mínima se vuelve automática, la haces crecer poco a poco. De una página a cinco, de un minuto de meditación a cinco.',
        ],
        source: 'James Clear, «Atomic Habits» (2018)',
      },
      {
        h2: 'La fórmula del anclaje',
        paragraphs: [
          'En lugar de confiar en tu memoria, engancha el hábito a algo que ya haces todos los días: «**Después de** [algo que ya hago], **voy a** [hábito de 5 minutos].»',
        ],
        list: [
          'Después de servir mi café, escribo mi meta del día.',
          'Después de lavarme los dientes en la mañana, hago 2 minutos de respiración.',
          'Después de sentarme en el transporte, leo 5 páginas.',
          'Después de apagar la computadora, camino 5 minutos.',
          'Después de acostarme, agradezco tres cosas del día.',
        ],
        source: 'BJ Fogg, «Tiny Habits» (2019)',
      },
      {
        h2: '10 hábitos de 5 minutos que cambian tu día',
        paragraphs: [],
        list: [
          'El ritual de Brian Tracy al despertar: escribir cómo será tu día. Lo explicamos en la [guía de rutina de mañana](/rutina-mananas).',
          'Respiración 4-6 durante 2 minutos.',
          'Leer tus afirmaciones en voz alta.',
          'Escribir tu tarea más importante del día.',
          'Caminar 5 minutos después de comer.',
          'Estirar el cuello y la espalda.',
          'Leer 5 páginas de un libro.',
          'Ordenar tu espacio de trabajo antes de terminar el día.',
          'Escribir tres cosas que salieron bien.',
          'Visualizar 3 minutos el día de mañana.',
        ],
        ordered: true,
      },
      {
        h2: 'Celebra para que se quede',
        paragraphs: [
          'Fogg insiste en un paso que casi todos se saltan: **celebrar** justo después de hacer el hábito. Una sonrisa, un «¡bien!», un gesto. Esa emoción positiva es la que le dice a tu cerebro que vale la pena repetirlo.',
          'Suena raro al principio. Hazlo de todos modos: es la parte que convierte una acción en hábito.',
        ],
      },
      {
        h2: 'Y si fallas un día',
        paragraphs: [
          'En el estudio de Phillippa Lally sobre la formación de hábitos, faltar un día no afectó el proceso. Lo que importa es volver. La regla práctica: nunca faltes dos días seguidos. Si ya perdiste el ritmo, lee [cómo recuperar la disciplina](/blog/como-recuperar-la-disciplina).',
        ],
        source: 'Phillippa Lally y colegas (2010)',
      },
      {
        h2: 'Cómo hacer crecer el hábito (sin romperlo)',
        paragraphs: [
          'Cuando tu versión de 5 minutos lleve un par de semanas sintiéndose automática, súbela poco a poco: de 5 a 7 minutos, de una página a tres. La regla es que nunca debe sentirse como una lucha. Si un día cuesta mucho, vuelve a la versión mínima: aparecer sigue contando.',
          'Y agrega un hábito nuevo solo cuando el anterior ya no requiera esfuerzo. Puedes encadenarlos: «después de escribir mi meta del día, hago 2 minutos de respiración». Así, de un hábito pequeño nace una rutina completa, como la que proponemos en la [guía de rutina de mañana](/rutina-mananas).',
        ],
        source: 'James Clear, «Atomic Habits» (2018); BJ Fogg, «Tiny Habits» (2019)',
      },
    ],
    faq: [
      { q: '¿Sirve un hábito de solo 5 minutos?', a: 'Sí. Los hábitos pequeños son más fáciles de repetir, y la repetición es lo que forma el hábito. Además, una vez que el hábito existe, es fácil hacerlo crecer.' },
      { q: '¿A qué hora es mejor hacer un hábito nuevo?', a: 'A la hora en que tengas un anclaje confiable: algo que ya haces todos los días a esa hora (despertar, el café, comer, lavarte los dientes). La consistencia del contexto importa más que la hora exacta.' },
    ],
    guides: ['crear-habitos', 'rutina-mananas', 'disciplina-personal'],
    published: '2026-10-16',
  },

  {
    slug: 'rutina-de-manana-de-personas-exitosas',
    category: 'Hábitos',
    title: 'La rutina de mañana de personas exitosas',
    description: 'Qué tienen en común las rutinas de mañana que funcionan: Benjamin Franklin, Hal Elrod, Robin Sharma y Brian Tracy. Y cómo crear la tuya sin madrugar de más.',
    h1: 'La rutina de mañana de personas exitosas (y cómo crear la tuya)',
    intro: [
      'En internet abundan listas de lo que hacen los millonarios al despertar. Muchas son exageradas o inventadas. Pero hay rutinas documentadas, escritas por quienes las vivieron, y tienen mucho en común.',
      'No necesitas copiar la mañana de nadie. Necesitas entender qué tienen en común las rutinas que funcionan y adaptarlo a tu vida real.',
    ],
    takeaways: [
      'Las rutinas que funcionan empiezan antes del teléfono.',
      'Casi todas combinan calma, dirección y movimiento.',
      'La hora importa menos que la constancia.',
      'Empieza con 5 minutos y crece desde ahí.',
    ],
    sections: [
      {
        h2: 'Benjamin Franklin: una pregunta para empezar el día',
        paragraphs: [
          'En su autobiografía, Franklin dejó escrito su horario. Se levantaba a las 5 y dedicaba las primeras horas a asearse, planear el día, tomar «la resolución del día» y estudiar. En su agenda, junto a la mañana, había una pregunta: «¿Qué bien haré hoy?». Y en la noche, otra: «¿Qué bien he hecho hoy?».',
          'Es una de las rutinas de mañana documentadas más antiguas, y contiene lo esencial: intención, planeación y revisión.',
        ],
        source: 'Benjamin Franklin, «Autobiografía»',
      },
      {
        h2: 'Hal Elrod: la Miracle Morning',
        paragraphs: [
          'Después de un accidente grave y una crisis económica, Hal Elrod creó una rutina de seis prácticas que llamó S.A.V.E.R.S.: silencio, afirmaciones, visualización, ejercicio, lectura y escritura. Propone 6 minutos para cada una (36 en total) o 10 minutos (una hora).',
          'Su aporte más útil: la rutina se puede comprimir. En días difíciles, un minuto por práctica es mejor que nada.',
        ],
        source: 'Hal Elrod, «The Miracle Morning» (2012)',
      },
      {
        h2: 'Robin Sharma: el Club de las 5 AM',
        paragraphs: [
          'Robin Sharma propone la fórmula 20/20/20 para la primera hora del día: 20 minutos de movimiento intenso, 20 de reflexión (meditar, escribir, planear) y 20 de crecimiento (leer, aprender).',
          'Su argumento: antes de que el mundo despierte, tienes una hora sin interrupciones. No tiene que ser a las 5; tiene que ser antes de las demandas del día.',
        ],
        source: 'Robin Sharma, «The 5AM Club» (2018)',
      },
      {
        h2: 'Brian Tracy: el ritual de 5 minutos',
        paragraphs: [
          'Para quien tiene poco tiempo, Brian Tracy propone algo muy breve: al despertar, sin tocar el teléfono, escribir «Hoy va a ser el mejor día de todos», describir cómo se desarrollará el día y terminar con «Gracias». Además, recomienda escribir 10 metas en presente cada mañana.',
        ],
        source: 'Brian Tracy, «Goals!» (2003)',
      },
      {
        h2: 'Lo que tienen en común',
        paragraphs: ['Si miras las cuatro rutinas juntas, aparecen los mismos ingredientes:'],
        list: [
          '**Antes del teléfono.** Tu mañana empieza con tu agenda, no con la de otros.',
          '**Calma.** Silencio, respiración, meditación u oración.',
          '**Dirección.** Escribir, planear o visualizar el día y las metas.',
          '**Movimiento.** Despertar el cuerpo, aunque sea unos minutos.',
          '**Crecimiento.** Leer o aprender algo.',
        ],
      },
      {
        h2: 'Cómo crear la tuya (sin sacrificar sueño)',
        paragraphs: [
          'Empieza con los minutos que tienes, no con los que te gustaría tener. Elige un ingrediente de cada grupo en su versión mínima: un minuto de respiración, tu meta del día escrita y un estiramiento. Cuando sea costumbre, agrega.',
          'Y no le robes horas al sueño: si quieres despertar antes, duerme antes. La [guía de rutina de mañana](/rutina-mananas) tiene versiones de 5, 15, 36 y 60 minutos para elegir.',
        ],
      },
      {
        h2: 'Una rutina de 15 minutos para empezar',
        paragraphs: [
          'Si quieres un punto medio entre los 5 minutos de Brian Tracy y la hora de Robin Sharma, prueba esta combinación. Junta un ingrediente de cada rutina en su versión corta:',
        ],
        list: [
          '**2 minutos — Silencio.** Respiración lenta, antes de tocar el teléfono (Hal Elrod).',
          '**3 minutos — Escritura.** «Hoy va a ser el mejor día de todos» y cómo será tu día (Brian Tracy).',
          '**3 minutos — Afirmaciones.** Léelas en voz alta. Mira [cómo escribirlas](/afirmaciones).',
          '**3 minutos — Visualización.** Tu día y tu meta principal.',
          '**4 minutos — Movimiento.** Estiramientos o una caminata corta (Robin Sharma).',
        ],
      },
    ],
    faq: [
      { q: '¿Qué hacen las personas exitosas al despertar?', a: 'Las rutinas documentadas de autores como Benjamin Franklin, Hal Elrod, Robin Sharma y Brian Tracy comparten ingredientes: empiezan antes del teléfono e incluyen calma, dirección (metas o planeación), movimiento y aprendizaje.' },
      { q: '¿Cuánto debe durar una rutina de mañana?', a: 'Desde 5 minutos. Lo importante es que puedas sostenerla. Muchas personas empiezan con 5 o 15 minutos y van creciendo hacia 36 o 60.' },
    ],
    guides: ['rutina-mananas', 'crear-habitos', 'metas-personales'],
    published: '2026-10-16',
  },

  {
    slug: 'como-recuperar-la-disciplina',
    category: 'Hábitos',
    title: 'Cómo recuperar la disciplina cuando perdiste el rumbo',
    description: 'Dejaste tu rutina y no sabes cómo volver. Por qué culparte empeora todo, el efecto del nuevo comienzo y un plan de 3 días para retomar sin empezar de cero.',
    h1: 'Cómo recuperar la disciplina cuando perdiste el rumbo',
    intro: [
      'Ibas bien. Tenías tu rutina, tus hábitos, tu ritmo. Y luego algo pasó: un viaje, una enfermedad, una semana pesada en el trabajo. Un día se volvió una semana, y la semana, un mes.',
      'Ahora miras atrás y sientes que perdiste todo. No es así. Recuperar la disciplina es más fácil que construirla desde cero, si lo haces de la forma correcta.',
    ],
    takeaways: [
      'Perder el ritmo es parte del proceso, no un fracaso.',
      'Culparte aumenta la probabilidad de seguir sin actuar.',
      'Retoma con una versión más pequeña que la que tenías.',
      'Aprovecha un nuevo comienzo: un lunes, un inicio de mes.',
    ],
    sections: [
      {
        h2: 'No empiezas de cero',
        paragraphs: [
          'Lo que construiste antes no desaparece. Tu cuerpo, tu mente y tu experiencia recuerdan cómo era tener ese hábito. Por eso volver suele ser más rápido que la primera vez.',
          'El problema no es la pausa, es la historia que te cuentas sobre ella: «nunca termino nada», «no tengo disciplina». Esa historia es más dañina que los días perdidos. Revisa si estás cayendo en alguno de los [pensamientos que bloquean tu crecimiento](/blog/pensamientos-que-bloquean-tu-crecimiento).',
        ],
      },
      {
        h2: 'Por qué la culpa te mantiene atascada',
        paragraphs: [
          'Parece que castigarte te va a motivar. La investigación dice lo contrario: en un estudio con universitarios, quienes se perdonaron por haber postergado procrastinaron menos la siguiente vez. La culpa es una emoción incómoda, y tu mente la evita… evitando también lo que te la provoca.',
          'Kristin Neff, que estudia la autocompasión, encontró que tratarte con amabilidad después de fallar te hace más propenso a intentarlo otra vez, no menos.',
        ],
        source: 'Wohl, Pychyl y Bennett (2010); Kristin Neff, «Self-Compassion» (2011)',
      },
      {
        h2: 'Aprovecha el efecto del nuevo comienzo',
        paragraphs: [
          'Investigadores de Wharton encontraron que las personas son más propensas a empezar conductas deseables después de «fechas de nuevo comienzo»: un lunes, el inicio de mes, un cumpleaños. Esas fechas crean una sensación de página en blanco que separa a tu «yo de antes» del «yo de ahora».',
          'Úsalo a tu favor, pero sin esperar demasiado: el próximo lunes sirve. El próximo enero, no.',
        ],
        source: 'Hengchen Dai, Katherine Milkman y Jason Riis, «The Fresh Start Effect» (2014)',
      },
      {
        h2: 'Un plan de 3 días para volver',
        paragraphs: [],
        list: [
          '**Día 1: la versión mínima.** Elige un solo hábito y hazlo en su versión más pequeña (2 a 5 minutos). Nada más.',
          '**Día 2: repite.** Mismo hábito, misma versión mínima, misma hora. La meta es encadenar dos días.',
          '**Día 3: registra y celebra.** Hazlo de nuevo y anótalo como evidencia: «Volví.» A partir de aquí, crece poco a poco.',
        ],
        ordered: true,
      },
      {
        h2: 'Nunca faltes dos veces',
        paragraphs: [
          'James Clear propone una regla sencilla para el futuro: puedes faltar un día, pero nunca dos seguidos. Un día perdido es un accidente; dos empiezan a ser un nuevo hábito. Esta regla te quita la presión de la perfección y te da un límite claro.',
          'Para construir una disciplina más sólida, con entorno y decisiones previas, sigue con la [guía de disciplina personal](/disciplina-personal).',
        ],
        source: 'James Clear, «Atomic Habits» (2018)',
      },
      {
        h2: 'La racha sin castigo de SOI',
        paragraphs: [
          'En SOI, un día sin practicar no rompe tu racha. Si faltas dos, usas un escudo, y ganas escudos nuevos al llegar a 7, 21, 40 y 90 días. Y cuando vuelves después de unos días, SOI no te reclama: te dice «Ayer no te vimos, pero aquí seguimos. ¿Retomamos?».',
        ],
      },
      {
        h2: 'Qué hacer distinto esta vez',
        paragraphs: [
          'Antes de retomar, pregúntate qué hizo que lo dejaras. Casi siempre es una de tres cosas: el plan era demasiado grande, dependía de un horario o lugar que cambió, o no tenías un plan para los días difíciles.',
          'Ajusta según la respuesta. Si era muy grande, empieza con la mitad. Si cambió tu contexto, busca un anclaje nuevo y estable («después del café»). Si te faltaba plan para los días malos, define tu versión mínima desde hoy: lo que harás aunque no tengas ganas ni tiempo. Así la próxima pausa, si llega, será más corta.',
        ],
      },
    ],
    faq: [
      { q: '¿Por qué pierdo la disciplina tan fácil?', a: 'Suele pasar cuando el hábito dependía mucho de la motivación o de un contexto que cambió (un horario, un lugar). Al retomarlo, conviene hacerlo más pequeño y anclarlo a algo estable de tu día.' },
      { q: '¿Cuánto tarda en volver un hábito perdido?', a: 'Suele ser más rápido que la primera vez. Empieza con la versión mínima y busca encadenar unos días seguidos; la sensación de ritmo vuelve antes de lo que crees.' },
    ],
    guides: ['disciplina-personal', 'crear-habitos', 'procrastinacion'],
    published: '2026-10-16',
  },
];
