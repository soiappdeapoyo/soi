import type { Post } from './types';

/** Blog: búsquedas de dolor largas y concretas (lo que la persona escribe tal cual en Google). */
export const POSTS_LONGTAIL: Post[] = [
  {
    slug: 'se-lo-que-tengo-que-hacer-pero-no-lo-hago',
    category: 'Mentalidad',
    title: 'Sé lo que tengo que hacer, pero no lo hago: por qué',
    description: 'Por qué sabes lo que tienes que hacer y aun así no lo haces, qué dice la psicología de la brecha entre intención y acción y cómo cerrarla hoy.',
    h1: 'Sé lo que tengo que hacer, pero no lo hago',
    intro: [
      'Sabes que deberías hacer ejercicio, terminar ese proyecto, mandar ese mensaje, acostarte más temprano. No te falta información: podrías dar una clase sobre el tema. Y aun así, llega la noche y no lo hiciste.',
      'Si te pasa, no es que seas floja o flojo, ni que te falte fuerza de voluntad. La psicología tiene un nombre para esto, la **brecha entre intención y acción**, y sabe bastante sobre cómo cerrarla.',
    ],
    takeaways: [
      'Saber qué hacer y hacerlo dependen de partes distintas de tu mente.',
      'Muchas veces no evitas la tarea: evitas cómo te hace sentir.',
      'Decidir cuándo y dónde lo harás duplica tus probabilidades.',
      'El primer paso tiene que ser ridículamente pequeño.',
    ],
    sections: [
      {
        h2: 'La brecha entre intención y acción',
        paragraphs: [
          'Paschal Sheeran revisó decenas de estudios y encontró que la intención de hacer algo explica solo una parte de lo que la gente termina haciendo. Más o menos la mitad de quienes tienen la intención de actuar no lo hace. Es tan común que tiene nombre: «intention-behavior gap».',
          'Esto significa que tu caso no es raro. Saber qué hacer, e incluso querer hacerlo, no es suficiente. Hace falta algo más que conecte la decisión con el momento concreto en que hay que actuar.',
        ],
        source: 'Paschal Sheeran, «Intention-behavior relations» (2002)',
      },
      {
        h2: 'No evitas la tarea: evitas lo que sientes',
        paragraphs: [
          'Timothy Pychyl y Fuschia Sirois estudiaron la procrastinación durante años y llegaron a una conclusión incómoda: casi nunca es un problema de organización. Es una forma de **regular una emoción**. La tarea te genera aburrimiento, miedo a hacerlo mal, inseguridad o confusión, y postergarla te da alivio inmediato.',
          'El problema es que ese alivio dura minutos y la culpa dura días. Por eso, antes de buscar otra técnica de productividad, vale la pena preguntarte: ¿qué siento cuando pienso en hacerlo? Lo trabajamos a fondo en la [guía para dejar de procrastinar](/procrastinacion).',
        ],
        source: 'Sirois y Pychyl, «Procrastination and the priority of short-term mood regulation» (2013)',
      },
      {
        h2: 'Cinco razones por las que no actúas (aunque sepas)',
        paragraphs: [],
        list: [
          '**La tarea es demasiado grande.** «Hacer ejercicio» no es una acción; «ponerme los tenis» sí.',
          '**No decidiste cuándo.** «Esta semana» nunca llega. «Mañana a las 7, después del café» sí.',
          '**Esperas tener ganas.** La motivación suele llegar después de empezar, no antes. Lo explicamos en [por qué consumes motivación pero no cambias](/blog/por-que-consumes-motivacion-pero-no-cambias).',
          '**Quieres hacerlo perfecto.** Si no puedes hacerlo bien, prefieres no hacerlo. El perfeccionismo es procrastinación con buena reputación.',
          '**No es tuyo de verdad.** A veces «lo que tengo que hacer» es lo que otros esperan. Sin un porqué propio, cuesta mucho más.',
        ],
        ordered: true,
      },
      {
        h2: 'La herramienta con más evidencia: «si pasa X, haré Y»',
        paragraphs: [
          'Peter Gollwitzer propuso algo muy simple: en lugar de «quiero leer más», decides **cuándo, dónde y cómo**: «Cuando me acueste, antes de tomar el teléfono, leo dos páginas». Lo llamó intenciones de implementación.',
          'Un metaanálisis de 94 estudios encontró que esta forma de planear tiene un efecto entre mediano y grande sobre cumplir metas. Funciona porque le quita a tu mente la decisión en el momento difícil: la situación dispara la acción.',
        ],
        source: 'Gollwitzer y Sheeran, «Implementation intentions and goal achievement: a meta-analysis» (2006)',
      },
      {
        h2: 'Hazlo ridículamente pequeño',
        paragraphs: [
          'BJ Fogg, de la Universidad de Stanford, explica que una conducta ocurre cuando coinciden tres cosas: motivación, capacidad y un detonante. Cuando la motivación es baja, que es casi siempre, la única forma de que pase es que la acción sea **muy fácil**.',
          'Por eso el primer paso tiene que darte casi risa: abrir el documento, escribir una línea, ponerte la ropa de ejercicio. Si lo haces, ya rompiste la inercia. Lo que sigue suele salir solo. Si te cuesta sostenerlo, mira [por qué no logras crear hábitos](/blog/por-que-no-logro-crear-habitos).',
        ],
        source: 'BJ Fogg, «Tiny Habits» (2019)',
      },
      {
        h2: 'Un método de 5 minutos para hoy',
        paragraphs: [],
        list: [
          '**Escribe la una cosa** que sabes que tienes que hacer y no haces.',
          '**Nombra lo que sientes** al pensar en ella, en una palabra: miedo, aburrimiento, duda.',
          '**Achícala** hasta que el primer paso tome 2 minutos.',
          '**Decide cuándo y dónde**: «Hoy, a las ___, en ___, voy a ___».',
          '**Piensa en el obstáculo** más probable y escribe qué harás si aparece.',
        ],
        ordered: true,
        source: 'Gollwitzer (intenciones de implementación); Gabriele Oettingen, WOOP; BJ Fogg, «Tiny Habits»',
      },
      {
        h2: 'Cuando el problema no es la tarea',
        paragraphs: [
          'Si no actúas en nada, si todo te cuesta igual y llevas semanas así, puede que no sea procrastinación sino agotamiento o ánimo bajo. En ese caso no necesitas más disciplina: necesitas descanso y, si se prolonga, hablar con un profesional de la salud mental.',
          'Si es algo puntual, empieza por cambiar una sola cosa. Cada vez que haces lo que dijiste que harías, por pequeño que sea, le enseñas a tu mente que eres alguien que cumple. Así se construye la [disciplina personal](/disciplina-personal).',
        ],
      },
    ],
    faq: [
      { q: '¿Por qué sé lo que tengo que hacer y no lo hago?', a: 'Porque saber y actuar dependen de cosas distintas. Muchas veces la tarea es demasiado grande, no decidiste cuándo hacerla o te genera una emoción incómoda que evitas posponiéndola.' },
      { q: '¿Es flojera?', a: 'Casi nunca. La investigación sobre procrastinación muestra que suele ser una forma de evitar una emoción (miedo, aburrimiento, inseguridad), no falta de ganas o de carácter.' },
      { q: '¿Qué es una intención de implementación?', a: 'Es un plan con la forma «cuando pase X, haré Y», que define cuándo, dónde y cómo vas a actuar. Es una de las técnicas con más evidencia para cumplir lo que te propones.' },
    ],
    guides: ['procrastinacion', 'disciplina-personal', 'crear-habitos'],
    published: '2026-10-17',
  },

  {
    slug: 'por-que-no-logro-crear-habitos',
    category: 'Hábitos',
    title: 'Por qué no logro crear hábitos: 6 razones reales',
    description: 'Empiezas con ganas y a las dos semanas lo dejas. Las 6 razones por las que no logras crear hábitos, según la investigación, y qué hacer con cada una.',
    h1: 'Por qué no logro crear hábitos (y qué hacer)',
    intro: [
      'Empiezas el lunes con todo: meditar, leer, correr, tomar agua. El miércoles ya fallaste un día y el domingo lo dejaste. No es la primera vez. Y cada intento fallido te deja la idea de que «no eres constante».',
      'La buena noticia es que la investigación sobre hábitos explica muy bien por qué pasa. Casi nunca es un problema de carácter: es un problema de diseño. Estas son las seis razones más comunes.',
    ],
    takeaways: [
      'Un hábito tarda en promedio unos 66 días en volverse automático, no 21.',
      'Fallar un día no rompe un hábito; abandonarlo sí.',
      'El entorno pesa más que la fuerza de voluntad.',
      'Empezar pequeño no es conformarse: es la estrategia.',
    ],
    sections: [
      {
        h2: '1. Creíste que serían 21 días',
        paragraphs: [
          'El famoso «21 días para crear un hábito» no viene de un estudio sobre hábitos. Cuando Phillippa Lally y su equipo midieron cuánto tardaban personas reales en automatizar una conducta nueva, el promedio fue de **66 días**, con un rango enorme: de 18 a 254 días según la persona y el hábito.',
          'Si a las tres semanas todavía te cuesta, no estás fallando: estás en el proceso normal. Cambiar la expectativa cambia la experiencia.',
        ],
        source: 'Lally y otros, «How are habits formed», European Journal of Social Psychology (2010)',
      },
      {
        h2: '2. Un día fallado te hizo abandonar',
        paragraphs: [
          'En ese mismo estudio, saltarse un día no afectó de forma importante la formación del hábito. Lo que sí lo rompe es el pensamiento de todo o nada: «ya fallé, ya no sirve». Ese es el verdadero enemigo.',
          'Una regla sencilla: **nunca fallar dos veces seguidas**. Si un día no pudiste, al siguiente haces la versión mínima. En SOI la racha funciona así, sin castigo: un día sin practicar no la rompe.',
        ],
        source: 'Lally y otros (2010); James Clear, «Atomic Habits» (2018)',
      },
      {
        h2: '3. Empezaste demasiado grande',
        paragraphs: [
          'Una hora de gimnasio, 30 minutos de meditación, un libro por semana. Con la motivación del lunes parece posible; con el cansancio del jueves, no. BJ Fogg propone lo contrario: una versión tan pequeña que puedas hacerla incluso en tu peor día. Dos flexiones. Una respiración. Una página.',
          'El objetivo de las primeras semanas no es el resultado: es **volverte alguien que lo hace**. La intensidad viene después.',
        ],
        source: 'BJ Fogg, «Tiny Habits» (2019)',
      },
      {
        h2: '4. Dependías de acordarte',
        paragraphs: [
          'Un hábito no se sostiene con memoria ni con ganas: se sostiene con un **detonante**. La forma más fácil es anclarlo a algo que ya haces: «Después de servirme el café, escribo mis 3 prioridades». James Clear lo llama apilar hábitos.',
          'Wendy Wood, que estudia hábitos desde hace décadas, calcula que cerca de la mitad de lo que hacemos cada día lo hacemos en automático, disparado por el contexto. Si no le das un contexto fijo a tu hábito nuevo, compite en desventaja.',
        ],
        source: 'Wendy Wood, «Good Habits, Bad Habits» (2019); James Clear, «Atomic Habits» (2018)',
      },
      {
        h2: '5. Tu entorno jugaba en contra',
        paragraphs: [
          'Si el teléfono está en la cama, vas a usarlo antes de dormir. Si los tenis están en el clóset, vas a posponer la caminata. Wood llama a esto **fricción**: cada paso extra que necesita una conducta la hace menos probable.',
          'Reduce la fricción de lo que quieres hacer (deja el libro en la almohada, la ropa de ejercicio lista) y aumenta la de lo que quieres dejar (el teléfono fuera del cuarto). Diseñar tu entorno rinde más que pelear contra él.',
        ],
        source: 'Wendy Wood, «Good Habits, Bad Habits» (2019)',
      },
      {
        h2: '6. Buscabas un resultado, no una identidad',
        paragraphs: [
          '«Quiero correr un maratón» es un resultado. «Soy alguien que corre» es una identidad. Cuando el hábito depende del resultado, en cuanto el resultado tarda, la motivación cae. Cuando depende de quién eres, cada día que lo haces es una prueba a tu favor.',
          'Por eso en SOI cada práctica cuenta como evidencia de la persona que te estás volviendo. Lo explicamos en [cómo reprogramar tu identidad](/blog/como-reprogramar-tu-identidad).',
        ],
        source: 'James Clear, «Atomic Habits» (2018)',
      },
      {
        h2: 'Tu plan para el hábito que sí se queda',
        paragraphs: [],
        list: [
          '**Elige un solo hábito.** No tres. Uno.',
          '**Escribe su versión mínima**: la que harías en tu peor día.',
          '**Ánclalo**: «Después de ___, voy a ___».',
          '**Quita una fricción** hoy mismo.',
          '**Registra cada vez** que lo haces, aunque sea la versión mínima.',
          '**Si fallas un día**, al siguiente haces la mínima. Nunca dos seguidos.',
        ],
        ordered: true,
      },
      {
        h2: 'Si lo has intentado mil veces',
        paragraphs: [
          'Quizá no necesitas más información sobre hábitos, sino algo que te acompañe el día que no tienes ganas. Eso es lo que hace un buen sistema: te recuerda, te guía y te muestra tu avance. La [guía para crear hábitos](/crear-habitos) tiene un plan de 7 días para empezar.',
        ],
      },
    ],
    faq: [
      { q: '¿Cuánto tiempo tarda en formarse un hábito?', a: 'En el estudio de Phillippa Lally (2010), el promedio fue de 66 días, con un rango de 18 a 254 según la persona y la conducta. La idea de los 21 días no tiene respaldo.' },
      { q: '¿Si fallo un día pierdo el hábito?', a: 'No. Saltarse un día no afecta de forma importante la formación del hábito. Lo que lo rompe es abandonar después de fallar. La regla útil es no fallar dos días seguidos.' },
      { q: '¿Por qué soy constante con unas cosas y con otras no?', a: 'Porque los hábitos que sí mantienes probablemente tienen un detonante claro, poca fricción y algo de recompensa. Revisa qué tienen esos que no tenga el hábito nuevo.' },
    ],
    guides: ['crear-habitos', 'disciplina-personal', 'rutina-mananas'],
    published: '2026-10-17',
  },

  {
    slug: 'coach-con-inteligencia-artificial',
    category: 'Mentalidad',
    title: 'Coach con inteligencia artificial: qué sí y qué no',
    description: 'Qué puede hacer un coach con inteligencia artificial por tu desarrollo personal, qué no puede hacer, cómo elegir uno y cuándo necesitas a una persona.',
    h1: 'Coach con inteligencia artificial: qué puede hacer por ti y qué no',
    intro: [
      'Cada vez más personas usan la inteligencia artificial para ordenar sus ideas, preparar una conversación difícil o armar una rutina. Y es lógico preguntarse si puede ser algo más: un coach que te acompañe a cumplir lo que te propones.',
      'La respuesta honesta es que sí puede ayudarte mucho en algunas cosas y que en otras no debería intentarlo. Aquí te explicamos cuáles son, cómo elegir una herramienta y qué hacemos en SOI (que es una de ellas, para que lo sepas desde el principio).',
    ],
    takeaways: [
      'Una IA puede ayudarte a pensar, planear y practicar, a cualquier hora.',
      'No sustituye la terapia ni la atención en una crisis.',
      'La diferencia está en si solo conversa o te lleva a actuar.',
      'Busca una que recuerde tu contexto y cite de dónde salen sus técnicas.',
    ],
    sections: [
      {
        h2: 'Lo que un coach con IA sí puede hacer',
        paragraphs: [
          'Un buen coach no te da respuestas: te hace preguntas, te ayuda a ver con claridad y te sostiene mientras actúas. Una IA bien diseñada puede hacer parte de eso, con ventajas reales:',
        ],
        list: [
          '**Está cuando la necesitas**: a las 11 de la noche, cuando la mente no se calla, o a las 6 de la mañana, antes de empezar el día.',
          '**Te ayuda a ordenar lo que sientes**: escribir y recibir preguntas te da distancia de tus pensamientos.',
          '**Convierte una idea en un paso**: de «quiero cambiar» a «hoy, a las 7, hago esto durante 5 minutos».',
          '**Te guía en una práctica**: una respiración, una visualización, un ritual de la mañana, paso a paso.',
          '**Recuerda lo que le contaste** y te pregunta cómo te fue, si está diseñada para eso.',
        ],
      },
      {
        h2: 'Lo que no puede (ni debe) hacer',
        paragraphs: [
          'Una IA no es psicóloga, ni psiquiatra, ni médica. No puede diagnosticar, ni tratar la depresión o la ansiedad clínica, ni reemplazar un proceso de terapia. Tampoco puede leer tu lenguaje corporal ni tu historia como lo hace una persona que te conoce.',
          'Y lo más importante: si estás en una crisis o piensas en hacerte daño, lo que necesitas es una persona y ayuda inmediata. Al pie de esta página están las líneas de ayuda de México, España y Estados Unidos. Una herramienta responsable las muestra cuando detecta señales de crisis, en lugar de seguir conversando como si nada.',
        ],
      },
      {
        h2: 'Conversar no es lo mismo que cambiar',
        paragraphs: [
          'El riesgo de cualquier chat es quedarse en la conversación: te desahogas, te sientes mejor un rato y al día siguiente todo sigue igual. Es lo mismo que pasa con los videos de motivación, como contamos en [por qué consumes motivación pero no cambias](/blog/por-que-consumes-motivacion-pero-no-cambias).',
          'La diferencia entre un chat y un coach está en lo que pasa después: ¿te propone algo concreto? ¿Te acompaña a hacerlo? ¿Te pregunta cómo te fue? Si no, es una buena conversación, pero no un proceso de cambio.',
        ],
      },
      {
        h2: 'Cómo elegir un coach con inteligencia artificial',
        paragraphs: [],
        list: [
          '**Que te escuche antes de proponer.** Si al primer mensaje ya te da una lista de 10 consejos, no te está escuchando.',
          '**Que cite sus fuentes.** Las técnicas deberían venir de algún lado: un autor, un método, una investigación. Desconfía de «técnicas» que nadie puede rastrear.',
          '**Que te lleve a actuar.** Una práctica con inicio y final vale más que mil consejos.',
          '**Que recuerde tu contexto.** Repetir tu historia cada vez es agotador.',
          '**Que sepa sus límites.** Que no prometa curarte y que te dé recursos reales si estás en crisis.',
          '**Que cuide tus datos.** Lee su aviso de privacidad: qué guarda y para qué.',
        ],
        ordered: true,
      },
      {
        h2: 'Cómo lo hacemos en SOI',
        paragraphs: [
          'SOI parte de una idea: tus pensamientos lideran tus emociones, tus emociones tus acciones y tus acciones tus resultados. Cuando le cuentas lo que te pasa, primero te escucha y te pregunta. Cuando ya entiende, te propone un **Moment**: una práctica de pocos minutos, hecha para ti, con técnicas de autores como Brian Tracy, Neville Goddard, Napoleon Hill, Hal Elrod o Joe Dispenza, cada una con su fuente.',
          'Luego te guía con voz, paso a paso, y al terminar te pregunta cómo te fue. Lo que escribes se vuelve evidencia de la persona en la que te estás convirtiendo. Si quieres conocer a los autores, empieza por [Brian Tracy](/brian-tracy), [Neville Goddard](/neville-goddard) o [Napoleon Hill](/napoleon-hill).',
        ],
      },
      {
        h2: 'Cuándo buscar a una persona',
        paragraphs: [
          'Un coach con IA es un buen acompañante para el día a día. Busca a un profesional de la salud mental si la tristeza, la ansiedad o el insomnio duran semanas, si afectan tu trabajo o tus relaciones, si consumes alcohol u otras sustancias para sentirte mejor o si tienes pensamientos de hacerte daño. Pedir ayuda no es un fracaso: es una decisión inteligente.',
          'Si lo que buscas es ordenar tu mente y pasar a la acción, puedes empezar con la [guía para controlar los pensamientos negativos](/ansiedad) o con [sé lo que tengo que hacer pero no lo hago](/blog/se-lo-que-tengo-que-hacer-pero-no-lo-hago).',
        ],
      },
    ],
    faq: [
      { q: '¿Una IA puede ser mi coach de vida?', a: 'Puede acompañarte en parte del trabajo de un coach: hacerte preguntas, ayudarte a ordenar tus ideas, convertir metas en pasos y guiarte en prácticas cortas. No reemplaza la relación con una persona ni la terapia.' },
      { q: '¿Un coach con IA sustituye a un psicólogo?', a: 'No. Una IA no puede diagnosticar ni tratar problemas de salud mental. Si lo que sientes dura semanas o afecta tu vida diaria, busca a un profesional.' },
      { q: '¿Es seguro contarle mis cosas a una IA?', a: 'Depende de la herramienta. Revisa su aviso de privacidad: qué datos guarda, para qué los usa y si puedes borrarlos. Evita compartir datos que no quieres que se guarden.' },
    ],
    guides: ['ansiedad', 'procrastinacion', 'metas-personales'],
    published: '2026-10-17',
  },

  {
    slug: 'los-6-pasos-de-napoleon-hill',
    category: 'Dinero',
    title: 'Los 6 pasos de Napoleon Hill para lograr un deseo',
    description: 'Los 6 pasos de «Piense y hágase rico» para convertir un deseo en realidad, explicados uno por uno con ejemplos, errores comunes y cómo empezar hoy.',
    h1: 'Los 6 pasos de Napoleon Hill para convertir un deseo en realidad',
    intro: [
      'En el capítulo sobre el deseo de «Piense y hágase rico» (1937), [Napoleon Hill](/napoleon-hill) propone seis pasos para pasar de querer algo a perseguirlo en serio. Los planteó para el dinero, pero sirven para cualquier meta: un negocio, un cambio de trabajo, un proyecto personal.',
      'Aquí los tienes uno por uno, con un ejemplo, el error más común en cada paso y lo que dice la investigación actual sobre metas. Al final, un ejercicio para hacerlo hoy.',
    ],
    takeaways: [
      'Un deseo vago no te mueve; uno con cantidad, fecha y precio sí.',
      'Hill pide decidir qué darás a cambio: no existe algo a cambio de nada.',
      'El plan puede ser imperfecto, pero hay que empezar de inmediato.',
      'La declaración se lee dos veces al día, sintiéndola como ya cumplida.',
    ],
    sections: [
      {
        h2: 'Paso 1: fija exactamente lo que deseas',
        paragraphs: [
          'No «más dinero» ni «un mejor trabajo»: una cantidad o un resultado concreto. Hill insiste en la exactitud porque un deseo vago no da dirección: no sabes si vas bien ni cuándo llegaste.',
          '**Ejemplo:** «Ganar 30,000 pesos al mes con mi negocio de repostería». **Error común:** escribir varias metas a la vez. Elige una.',
        ],
        source: 'Napoleon Hill, «Think and Grow Rich» (1937), cap. 2: Deseo',
      },
      {
        h2: 'Paso 2: decide qué darás a cambio',
        paragraphs: [
          'Hill es claro: no existe algo a cambio de nada. ¿Qué vas a aportar para conseguir lo que deseas? Tiempo, aprendizaje, servicio, esfuerzo, incomodidad. Este paso es el que más se salta quien solo «manifiesta», y es el que convierte el deseo en un compromiso.',
          '**Ejemplo:** «Dos horas diarias de producción y aprender a vender en redes». **Error común:** escribir algo que no estás dispuesta o dispuesto a dar de verdad.',
        ],
        source: 'Napoleon Hill, «Think and Grow Rich» (1937), cap. 2: Deseo',
      },
      {
        h2: 'Paso 3: pon una fecha',
        paragraphs: [
          'Una meta sin fecha es un deseo. La fecha crea urgencia y te permite medir. Tiene que ser retadora pero creíble: si te pones una imposible, la vas a descartar en la primera semana.',
          '**Ejemplo:** «El 30 de junio». **Error común:** no revisarla nunca. Si llega la fecha y no lo lograste, ajustas el plan, no el deseo.',
        ],
        source: 'Napoleon Hill, «Think and Grow Rich» (1937), cap. 2: Deseo',
      },
      {
        h2: 'Paso 4: crea un plan y empieza de inmediato',
        paragraphs: [
          'Hill pide un plan definido y empezar **ya**, estés lista o listo o no. El plan no tiene que ser perfecto: tres pasos bastan para arrancar, y lo vas a corregir en el camino. Lo que no puede pasar es que el plan se quede en papel.',
          '**Ejemplo:** «1) Definir 3 productos y su precio. 2) Publicar uno diario en Instagram. 3) Pedir a 10 conocidos que me recomienden». Hoy: tomar la foto del primero. **Error común:** planear durante semanas para no empezar. Si te pasa, lee [sé lo que tengo que hacer pero no lo hago](/blog/se-lo-que-tengo-que-hacer-pero-no-lo-hago).',
        ],
        source: 'Napoleon Hill, «Think and Grow Rich» (1937), cap. 2: Deseo y cap. 7: Planificación organizada',
      },
      {
        h2: 'Paso 5: escribe tu declaración',
        paragraphs: [
          'Junta todo en un texto breve y claro: lo que deseas, la fecha, lo que darás a cambio y tu plan. Escríbelo en primera persona. Este documento es el centro del método: lo vas a leer todos los días.',
          '**Ejemplo:** «Para el 30 de junio gano 30,000 pesos al mes con mi repostería. A cambio, dedico dos horas diarias a producir y aprendo a vender en redes. Mi plan es…». **Error común:** hacerlo tan largo que da pereza leerlo.',
        ],
        source: 'Napoleon Hill, «Think and Grow Rich» (1937), cap. 2: Deseo',
      },
      {
        h2: 'Paso 6: léela en voz alta dos veces al día',
        paragraphs: [
          'Al despertar y antes de dormir, lee tu declaración en voz alta. Hill pide algo más que leer: **verte, sentirte y creerte** ya en posesión de lo que deseas mientras lo haces. Es su técnica de autosugestión, muy parecida a la asunción de [Neville Goddard](/neville-goddard).',
          '**Error común:** leerla de forma mecánica, pensando en otra cosa. Si no la sientes, mejor léela una vez despacio que dos de prisa.',
        ],
        source: 'Napoleon Hill, «Think and Grow Rich» (1937), cap. 2: Deseo y cap. 4: Autosugestión',
      },
      {
        h2: 'Lo que dice la investigación sobre estos pasos',
        paragraphs: [
          'Varios pasos de Hill coinciden con lo que hoy sabemos sobre metas. Edwin Locke y Gary Latham mostraron en cientos de estudios que las metas **específicas y retadoras** producen mejores resultados que las vagas (pasos 1 y 3). Peter Gollwitzer mostró que decidir cuándo y dónde vas a actuar aumenta mucho las probabilidades de hacerlo (paso 4).',
          'Donde hay que tener cuidado es en el paso 6: imaginar solo el resultado, sin pensar en los obstáculos, puede bajar tu energía para actuar, según la investigación de Gabriele Oettingen. Por eso conviene sumar una pregunta a tu lectura diaria: ¿qué podría frenarme hoy y qué haré si pasa? Lo explicamos en [por qué manifestar sin acción no funciona](/blog/manifestar-sin-accion).',
        ],
        source: 'Locke y Latham (2002); Gollwitzer y Sheeran (2006); Gabriele Oettingen, «Rethinking Positive Thinking» (2014)',
      },
      {
        h2: 'Hazlo hoy en 10 minutos',
        paragraphs: [
          'Toma una hoja y responde: ¿qué deseo, exactamente? ¿Qué daré a cambio? ¿Para cuándo? ¿Cuáles son los tres pasos de mi plan y cuál hago hoy? Con eso, escribe tu declaración en cinco líneas y léela en voz alta esta noche. Si prefieres hacerlo un paso por día, guiado por voz, ese es el reto de 7 días con Napoleon Hill en SOI. Y si el dinero es tu tema, sigue con [cómo cambiar tu relación con el dinero](/blog/cambiar-tu-relacion-con-el-dinero).',
        ],
      },
    ],
    faq: [
      { q: '¿Cuáles son los 6 pasos de Napoleon Hill?', a: 'Fijar exactamente lo que deseas, decidir qué darás a cambio, poner una fecha, crear un plan y empezar de inmediato, escribir una declaración con todo lo anterior y leerla en voz alta dos veces al día, sintiéndola como ya cumplida.' },
      { q: '¿En qué capítulo de «Piense y hágase rico» están?', a: 'En el capítulo dedicado al deseo, el primer paso hacia la riqueza según Hill. La autosugestión, que da fuerza al paso 6, tiene su propio capítulo.' },
      { q: '¿Funcionan si mi meta no es de dinero?', a: 'Sí. Cambia la cantidad por un resultado concreto y medible: un peso, un puesto, un proyecto terminado. El resto de los pasos funciona igual.' },
    ],
    guides: ['metas-personales', 'encontrar-proposito', 'mentalidad-ganadora'],
    published: '2026-10-17',
  },
];
