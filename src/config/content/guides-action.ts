import type { Guide } from './types';

/** Guías: ansiedad y pensamientos negativos, procrastinación, hábitos y disciplina. */
export const GUIDES_ACTION: Guide[] = [
  {
    slug: 'ansiedad',
    name: 'Ansiedad y pensamientos negativos',
    keyword: 'cómo controlar la ansiedad y los pensamientos negativos',
    title: 'Cómo controlar la ansiedad y pensamientos negativos',
    description: 'Por qué tu mente repite lo peor, cómo separar un pensamiento de un hecho y un método de 7 minutos para bajar la ansiedad hoy. Con fuentes, en español.',
    h1: 'Cómo controlar la ansiedad y los pensamientos negativos',
    answer: 'Para controlar la ansiedad no necesitas apagar tus pensamientos, sino cambiar tu relación con ellos. Primero calma el cuerpo alargando la exhalación. Después escribe el pensamiento exacto, revisa la evidencia a favor y en contra y formula uno más justo. Termina con una acción pequeña que sí dependa de ti: eso le demuestra a tu mente que no estás en peligro.',
    intro: [
      'Hay días en los que la cabeza no se calla. Repasas una conversación, imaginas lo que puede salir mal, te adelantas a problemas que todavía no existen. Y mientras más intentas no pensar en eso, más vuelve.',
      'La ansiedad no es un defecto de carácter. Es un sistema de alarma que se quedó encendido, alimentado por pensamientos que se sienten como verdades. Esta guía te explica por qué pasa y te da un método concreto, basado en la terapia cognitiva, para que esos pensamientos dejen de decidir tu día.',
    ],
    eslabon: 'pensamiento',
    sections: [
      {
        h2: 'Por qué tu mente se va al peor escenario',
        paragraphs: [
          'Tu cerebro está diseñado para sobrevivir, no para que estés tranquilo. Durante miles de años, el que detectaba antes el peligro vivía más. Por eso lo negativo pesa más que lo positivo: una crítica se queda contigo más tiempo que diez elogios. Los psicólogos lo llaman **sesgo de negatividad**.',
          'Cuando estás bajo presión, ese sesgo se dispara. La mente produce **pensamientos automáticos**: frases rápidas como «no voy a poder» o «van a pensar que soy un fraude» que aparecen solas y se sienten como hechos. No las eliges, pero sí puedes decidir qué hacer con ellas.',
        ],
        source: 'Baumeister, Bratslavsky, Finkenauer y Vohs, «Bad Is Stronger Than Good» (2001); Aaron Beck, terapia cognitiva',
      },
      {
        h2: 'Un pensamiento no es un hecho',
        paragraphs: [
          'Aaron Beck, el psiquiatra que creó la terapia cognitiva, observó que la ansiedad casi siempre viaja con los mismos errores de pensamiento. Reconocerlos es el primer paso para que pierdan fuerza:',
        ],
        list: [
          '**Catastrofizar:** «Si me equivoco en la reunión, me van a despedir.»',
          '**Leer la mente:** «Seguro piensa que soy aburrida.»',
          '**Adivinar el futuro:** «Esto va a salir mal, lo sé.»',
          '**Todo o nada:** «Si no lo hago perfecto, fracasé.»',
          '**Filtro mental:** ver solo lo que salió mal y descartar todo lo demás.',
        ],
      },
      {
        h2: 'Toma distancia de lo que piensas',
        paragraphs: [
          'Un truco de la terapia de aceptación y compromiso (ACT) es agregar una frase antes del pensamiento: en vez de «no soy capaz», di «estoy teniendo el pensamiento de que no soy capaz». Suena simple, pero cambia tu posición: ya no estás dentro del pensamiento, lo estás mirando.',
          'Esto no busca convencerte de lo contrario, sino quitarle autoridad. Un pensamiento puede estar ahí sin que tengas que obedecerlo. Desde esa distancia es más fácil decidir qué hacer.',
        ],
        source: 'Steven C. Hayes, terapia de aceptación y compromiso (defusión cognitiva)',
      },
      {
        h2: 'Primero el cuerpo, después la mente',
        paragraphs: [
          'Con el corazón acelerado es muy difícil razonar. Por eso el orden importa: antes de discutir con tus pensamientos, baja la activación del cuerpo. La forma más rápida es alargar la exhalación: inhala contando 4 y exhala contando 6 durante dos minutos. La exhalación prolongada activa el sistema nervioso parasimpático, el que le indica al cuerpo que puede bajar la guardia.',
          'Si la ansiedad llega fuerte y de golpe, en [ansiedad: cómo calmarla en 5 minutos](/emociones/ansiedad) tienes una práctica de respiración y anclaje para ese momento.',
        ],
      },
      {
        h2: 'Dale una hora a la preocupación',
        paragraphs: [
          'Intentar no preocuparte rara vez funciona. Lo que sí ayuda es darle un lugar: elige 15 minutos al día, siempre a la misma hora y no antes de dormir, para pensar en lo que te preocupa y escribirlo. Cuando una preocupación aparezca fuera de ese horario, anótala en una línea y dile «a las 6 te atiendo».',
          'Muchas veces, cuando llega la hora, esa preocupación ya perdió fuerza. Y las que siguen ahí las puedes mirar con calma y separar en dos columnas: lo que depende de ti y lo que no.',
        ],
        source: 'Thomas Borkovec y colegas, control de estímulos para la preocupación (1983)',
      },
      {
        h2: 'La dieta mental: cuida lo que repites',
        paragraphs: [
          'Neville Goddard proponía una «dieta mental»: observar cada pensamiento y cada palabra que te dices durante el día, como cuidarías lo que comes. No se trata de prohibirte pensar algo, sino de notar qué frases repites y cuáles quieres que se vuelvan tu nueva normalidad.',
          'En SOI esto se vuelve práctica diaria: identificas el pensamiento que te frena, lo reencuadras y lo cambias por una [afirmación](/afirmaciones) que puedas creer hoy.',
        ],
        source: 'Neville Goddard, «The Power of Awareness» (1952)',
      },
      {
        h2: 'Cuándo pedir ayuda profesional',
        paragraphs: [
          'Estas herramientas ayudan con la ansiedad del día a día, pero no sustituyen la atención de un profesional. Busca a un psicólogo o médico si la ansiedad te impide trabajar, estudiar o dormir durante semanas, si tienes ataques de pánico, si evitas lugares o personas por miedo o si sientes que no puedes más. Pedir ayuda no es rendirse: es tomarte en serio.',
        ],
      },
    ],
    method: {
      name: 'Atrapa, revisa, cambia (7 minutos)',
      minutes: 7,
      source: 'Registro de pensamientos de la terapia cognitiva de Aaron Beck, respiración con exhalación prolongada y la «dieta mental» de Neville Goddard',
      steps: [
        'Respira 2 minutos: inhala contando 4 y exhala contando 6.',
        'Atrapa el pensamiento: escríbelo exacto, entre comillas, como te lo dice tu mente.',
        'Nómbralo: ¿es catastrofizar, leer la mente, adivinar el futuro o todo o nada?',
        'Revisa la evidencia: ¿qué hechos lo apoyan y qué hechos lo contradicen?',
        'Cambia: escribe un pensamiento más justo. No tiene que ser positivo, solo más cierto.',
        'Actúa: elige una acción de 5 minutos que sí dependa de ti y hazla hoy.',
      ],
    },
    moment: {
      title: 'Soltar el pensamiento que no me deja',
      blocks: [
        { label: 'Respiración 4-6', minutes: 2 },
        { label: 'Reencuadre de tu pensamiento', minutes: 3 },
        { label: 'Una acción que sí depende de ti', minutes: 1 },
        { label: 'Cómo te sientes ahora', minutes: 1 },
      ],
    },
    cta: {
      heading: 'Que tus pensamientos no decidan tu día',
      text: 'Cuéntale a SOI qué te está dando vueltas. Te escucha, entiende qué pensamiento te frena y te guía con voz, paso a paso, para calmarte y actuar.',
      button: 'Calmar mi mente con SOI',
    },
    agent: 'meditacion',
    faq: [
      { q: '¿Cómo dejar de pensar en algo que me angustia?', a: 'Intentar no pensar en algo suele hacer que vuelva más. Funciona mejor escribirlo, darle un horario a la preocupación y tomar distancia del pensamiento («estoy teniendo el pensamiento de que…»). Después, dirige tu atención a una acción pequeña y concreta.' },
      { q: '¿Los pensamientos negativos causan ansiedad?', a: 'Pensamientos y emociones se alimentan entre sí: un pensamiento como «va a salir mal» activa la alarma del cuerpo, y el cuerpo en alerta produce más pensamientos de peligro. Por eso conviene intervenir en las dos puntas: calmar el cuerpo y revisar el pensamiento.' },
      { q: '¿Qué es un registro de pensamientos?', a: 'Es una herramienta de la terapia cognitiva: escribes la situación, el pensamiento automático, la emoción y su intensidad, la evidencia a favor y en contra y un pensamiento alternativo. Hacerlo por escrito ayuda a ver el pensamiento desde afuera.' },
      { q: '¿SOI reemplaza la terapia?', a: 'No. SOI te acompaña con prácticas breves y con fuente, pero no sustituye la atención psicológica ni médica. Si la ansiedad no te deja funcionar en tu día a día, busca a un profesional.' },
    ],
    related: ['mejorar-autoestima', 'afirmaciones', 'mentalidad-ganadora'],
    emotions: ['ansiedad', 'estres'],
    posts: ['pensamientos-que-bloquean-tu-crecimiento', 'como-reprogramar-tu-identidad'],
  },

  {
    slug: 'procrastinacion',
    name: 'Dejar de procrastinar',
    keyword: 'cómo dejar de procrastinar',
    title: 'Cómo dejar de procrastinar y empezar a actuar',
    description: 'Por qué sabes qué hacer pero no lo haces, la diferencia entre motivación y sistema y el método de microacciones para empezar hoy en 5 minutos.',
    h1: 'Cómo dejar de procrastinar y empezar a actuar',
    answer: 'Para dejar de procrastinar no necesitas más motivación, sino un sistema que haga fácil empezar. Elige la tarea que más evitas, nombra la emoción que te frena, divídela hasta encontrar un primer paso de 5 minutos y decide cuándo y dónde lo harás con un plan «si-entonces». Empezar baja la emoción; la acción trae la motivación.',
    intro: [
      'Sabes exactamente qué tienes que hacer. Lo tienes en la lista desde hace días. Y aun así, haces cualquier otra cosa: ordenas el escritorio, revisas el teléfono, empiezas algo menos importante. Al final del día aparece la culpa, y mañana se repite.',
      'Si te pasa, no eres flojo ni te falta fuerza de voluntad. La procrastinación tiene una explicación clara y, sobre todo, una salida práctica. Aquí la tienes, paso a paso.',
    ],
    eslabon: 'accion',
    sections: [
      {
        h2: '¿Por qué sabes qué hacer pero no lo haces?',
        paragraphs: [
          'La procrastinación casi nunca es un problema de información ni de tiempo. Es un problema de **emoción**. El psicólogo Tim Pychyl, que lleva décadas estudiándola, la describe como una forma de regular el ánimo a corto plazo: postergas para no sentir algo incómodo ahora mismo.',
          'Ese algo puede ser miedo a hacerlo mal, aburrimiento, frustración o no saber por dónde empezar. Postergar te da un alivio inmediato… y una deuda para después: la tarea crece, la culpa también, y la próxima vez es aún más difícil empezar.',
        ],
        source: 'Fuschia Sirois y Timothy Pychyl, «Procrastination and the Priority of Short-Term Mood Regulation» (2013)',
      },
      {
        h2: 'La diferencia entre motivación y sistema',
        paragraphs: [
          'Esperar a tener ganas es la trampa más común. La motivación sube y baja: un video te enciende hoy y mañana ya no está. Si tu acción depende de ella, tu progreso también va a subir y bajar.',
          'Un **sistema** es distinto: decide de antemano qué haces, cuándo y cómo, para que no tengas que negociar contigo cada vez. La motivación es el combustible; el sistema es el camino. Y algo que pocos explican: la motivación suele llegar **después** de empezar, no antes. Por eso leer más consejos no te cambia; [actuar sí](/blog/por-que-consumes-motivacion-pero-no-cambias).',
        ],
      },
      {
        h2: 'El método de microacciones de SOI',
        paragraphs: [
          'Una microacción es un primer paso tan pequeño que tu emoción no alcanza a frenarte. No «escribir la tesis», sino «abrir el documento y escribir el título». No «ir al gimnasio», sino «ponerme los tenis». BJ Fogg, investigador de Stanford, lo explica así: una conducta ocurre cuando coinciden motivación, capacidad y un detonante. Si haces la acción muy fácil, ya no necesitas tanta motivación.',
          'El método tiene cuatro pasos:',
        ],
        list: [
          '**Elige tu sapo.** Brian Tracy llama así a la tarea más importante y que más evitas. Hazla primero.',
          '**Nombra la emoción.** ¿Qué estás evitando sentir: miedo, aburrimiento, incertidumbre? Nombrarla le quita fuerza.',
          '**Encógela.** Divide la tarea hasta que el primer paso se pueda hacer en 5 minutos o menos.',
          '**Ponle un si-entonces.** «Si son las 9:00 y me siento en el escritorio, entonces abro el documento.»',
        ],
        ordered: true,
        source: 'Brian Tracy, «Eat That Frog!» (2001); BJ Fogg, «Tiny Habits» (2019)',
      },
      {
        h2: 'Por qué funciona el plan si-entonces',
        paragraphs: [
          'El psicólogo Peter Gollwitzer estudió lo que llamó **intenciones de implementación**: planes con la forma «si pasa X, entonces hago Y». Un metaanálisis de 94 estudios encontró que decidir de antemano cuándo y dónde vas a actuar aumenta de forma importante la probabilidad de hacerlo.',
          'La razón es sencilla: cuando llega el momento, ya no tienes que decidir. La decisión ya está tomada, y el detonante (la hora, el lugar, terminar otra cosa) dispara la acción casi sola.',
        ],
        source: 'Peter Gollwitzer y Paschal Sheeran, metaanálisis sobre intenciones de implementación (2006)',
      },
      {
        h2: 'Perdónate el retraso (en serio)',
        paragraphs: [
          'Parece al revés, pero castigarte por haber postergado aumenta la probabilidad de volver a hacerlo. En un estudio con universitarios, quienes se perdonaron por haber postergado el estudio de un examen procrastinaron menos en el siguiente.',
          'La culpa es una emoción incómoda más, y la procrastinación existe justamente para huir de emociones incómodas. Reconoce lo que pasó, sin drama, y vuelve al primer paso de 5 minutos.',
        ],
        source: 'Michael Wohl, Timothy Pychyl y Shannon Bennett (2010)',
      },
      {
        h2: 'Crea tu primer Moment de acción',
        paragraphs: [
          'En SOI no recibes una lista de consejos: diseñas un **Moment**, una práctica corta con inicio y final. Para la procrastinación, un Moment típico suelta la culpa con un minuto de respiración, divide tu sapo, te acompaña 5 minutos mientras empiezas y deja listo tu si-entonces para mañana.',
          'Lo vives guiado por voz, y al terminar queda como evidencia de que sí empezaste. Con los días, esas evidencias construyen algo más importante que un hábito: la identidad de alguien que actúa. Si quieres ir más lejos, mira cómo [crear hábitos que duran](/crear-habitos).',
        ],
      },
    ],
    method: {
      name: 'Microacción de 5 minutos',
      minutes: 5,
      source: 'Brian Tracy, «Eat That Frog!»; Peter Gollwitzer, intenciones de implementación; BJ Fogg, «Tiny Habits»',
      steps: [
        'Escribe la tarea que más estás evitando. Esa es tu sapo.',
        'Escribe qué emoción estás evitando: miedo, aburrimiento, frustración o no saber por dónde empezar.',
        'Divide la tarea hasta encontrar un primer paso que se haga en 5 minutos.',
        'Escribe tu si-entonces: «Si es [hora] y estoy en [lugar], entonces [primer paso].»',
        'Pon un temporizador de 5 minutos y empieza ahora. Si quieres seguir al terminar, sigue.',
      ],
    },
    moment: {
      title: 'Cinco minutos con mi sapo',
      blocks: [
        { label: 'Suelta la culpa', minutes: 1 },
        { label: 'Divide tu sapo', minutes: 2 },
        { label: 'Empieza: 5 minutos', minutes: 5 },
        { label: 'Si-entonces para mañana', minutes: 1 },
      ],
    },
    cta: {
      heading: 'Convierte una idea en una acción diaria con SOI',
      text: 'Cuéntale a SOI qué estás postergando. Te ayuda a encontrar el primer paso, te acompaña con voz mientras lo haces y te recuerda volver mañana.',
      button: 'Empezar mi primera acción',
    },
    agent: 'brian_tracy',
    faq: [
      { q: '¿Por qué procrastino si sé lo que tengo que hacer?', a: 'Porque procrastinar casi nunca es un problema de información, sino de emoción: evitas el miedo, el aburrimiento o la incertidumbre que te provoca la tarea. Reducir el primer paso a 5 minutos baja esa emoción lo suficiente para empezar.' },
      { q: '¿La procrastinación es pereza?', a: 'No. La pereza es no querer hacer nada; quien procrastina suele estar ocupado haciendo otras cosas mientras evita una en particular. Es una forma de evitar una emoción incómoda.' },
      { q: '¿Qué es «comerse el sapo»?', a: 'Es la idea de Brian Tracy de hacer primero, a primera hora, la tarea más importante y que más te cuesta. Así el resto del día se siente más ligero y la tarea deja de crecer en tu cabeza.' },
      { q: '¿Cuánto tarda en funcionar este método?', a: 'El primer efecto es inmediato: empezar 5 minutos hoy. Convertirlo en costumbre lleva más tiempo; la investigación sobre hábitos muestra que varía mucho entre personas, de semanas a meses. Lo importante es no romper la cadena dos días seguidos.' },
    ],
    related: ['crear-habitos', 'disciplina-personal', 'metas-personales'],
    emotions: ['procrastinacion', 'falta-de-enfoque'],
    posts: ['por-que-consumes-motivacion-pero-no-cambias', 'crear-un-habito-en-5-minutos-al-dia'],
  },

  {
    slug: 'crear-habitos',
    name: 'Crear hábitos',
    keyword: 'cómo crear hábitos',
    title: 'Cómo crear hábitos que sí duran: guía práctica',
    description: 'Cuánto tarda en formarse un hábito, por qué fallan los propósitos y cómo crear uno nuevo empezando con 2 minutos al día. Con estudios y ejemplos.',
    h1: 'Cómo crear hábitos que sí duran',
    answer: 'Para crear un hábito, hazlo tan pequeño que no puedas fallar, engánchalo a algo que ya haces todos los días («después de servir el café, escribo una línea») y celebra al terminar. Repite en el mismo lugar y a la misma hora. Un hábito tarda en promedio unos dos meses en volverse automático, y faltar un día no lo rompe.',
    intro: [
      'Enero, lunes, cumpleaños: cada fecha especial es una nueva oportunidad para empezar. Y cada vez, a las pocas semanas, el propósito se desvanece. No porque no quieras, sino porque nadie te enseñó cómo se construye un hábito.',
      'La buena noticia es que hoy se sabe bastante sobre cómo funcionan. Aquí tienes lo esencial, sin teoría de más, y un método para empezar hoy.',
    ],
    eslabon: 'accion',
    sections: [
      {
        h2: 'Qué es un hábito (y por qué tu fuerza de voluntad no basta)',
        paragraphs: [
          'Un hábito es una conducta que se dispara sola ante una señal, sin que tengas que pensarlo. La psicóloga Wendy Wood encontró que cerca del 43 % de lo que hacemos cada día lo hacemos por costumbre, casi en automático, mientras pensamos en otra cosa.',
          'Esa es la clave: un hábito no se sostiene con fuerza de voluntad, sino con **repetición en el mismo contexto**. La fuerza de voluntad sirve para empezar; el contexto es lo que lo mantiene.',
        ],
        source: 'Wendy Wood, «Good Habits, Bad Habits» (2019); Wood, Quinn y Kashy (2002)',
      },
      {
        h2: '¿Cuánto tarda en formarse un hábito?',
        paragraphs: [
          'Seguramente escuchaste que son 21 días. No hay evidencia de eso. En el estudio más citado, de la University College London, las personas tardaron en promedio **66 días** en que una conducta nueva se volviera automática, con un rango enorme: de 18 a 254 días según la persona y el hábito.',
          'El mismo estudio trae una noticia tranquilizadora: faltar un día no afectó la formación del hábito. Lo que importa es la repetición a lo largo del tiempo, no la perfección.',
        ],
        source: 'Phillippa Lally y colegas, European Journal of Social Psychology (2010)',
      },
      {
        h2: 'Las 4 leyes para crear un hábito',
        paragraphs: ['James Clear resumió la ciencia de los hábitos en cuatro preguntas que puedes aplicar a cualquier conducta que quieras construir:'],
        list: [
          '**Hazlo obvio.** Deja la señal a la vista: el libro sobre la almohada, la botella de agua en el escritorio.',
          '**Hazlo atractivo.** Júntalo con algo que disfrutes: tu podcast favorito solo mientras caminas.',
          '**Hazlo fácil.** Reduce la fricción. Empieza con la versión de 2 minutos.',
          '**Hazlo satisfactorio.** Celebra al terminar o márcalo: el cerebro repite lo que se siente bien.',
        ],
        ordered: true,
        source: 'James Clear, «Atomic Habits» (2018)',
      },
      {
        h2: 'Empieza con 2 minutos',
        paragraphs: [
          'El error más común es empezar en grande: correr 5 kilómetros el primer día, meditar 30 minutos, leer un libro por semana. La regla de los 2 minutos dice que todo hábito nuevo debe empezar con una versión que se haga en 2 minutos: «leer una página», «meditar un minuto», «ponerte la ropa de ejercicio».',
          'Parece demasiado poco, y esa es la idea. Primero construyes el hábito de **aparecer**; después lo haces crecer. Un hábito que no existe no se puede mejorar. Lo desarrollamos en [cómo crear un hábito en 5 minutos al día](/blog/crear-un-habito-en-5-minutos-al-dia).',
        ],
      },
      {
        h2: 'La fórmula del anclaje',
        paragraphs: [
          'BJ Fogg propone enganchar el hábito nuevo a uno que ya tienes, con una fórmula simple: «**Después de** [algo que ya hago], **voy a** [hábito diminuto]». Por ejemplo: «Después de servir mi café, escribo mi meta del día.» «Después de lavarme los dientes en la noche, agradezco tres cosas.»',
          'Tu rutina actual ya está llena de detonantes confiables. Usarlos es mucho más efectivo que poner alarmas o confiar en que te vas a acordar. Y al terminar, celebra en el momento: una sonrisa, un «¡bien!». Esa emoción le dice a tu cerebro que vale la pena repetirlo.',
        ],
        source: 'BJ Fogg, «Tiny Habits» (2019)',
      },
      {
        h2: 'Hábitos de identidad: el cambio que sí dura',
        paragraphs: [
          'La forma más profunda de cambiar no es enfocarte en lo que quieres lograr, sino en **quién quieres ser**. No «quiero correr un maratón», sino «soy una persona que se mueve todos los días». Cada vez que haces el hábito, es un voto a favor de esa identidad.',
          'Por eso en SOI no contamos tareas: acumulamos evidencia de quién te estás volviendo. Lo explicamos en [cómo reprogramar tu identidad](/blog/como-reprogramar-tu-identidad).',
        ],
        source: 'James Clear, «Atomic Habits» (2018)',
      },
    ],
    method: {
      name: 'Tu primer hábito en 3 pasos',
      minutes: 5,
      source: 'BJ Fogg, «Tiny Habits»; James Clear, «Atomic Habits»',
      steps: [
        'Elige el hábito y redúcelo a su versión de 2 minutos.',
        'Escribe tu anclaje: «Después de [algo que ya haces], voy a [hábito diminuto].»',
        'Prepara el entorno esta noche: deja a la vista lo que vas a necesitar.',
        'Mañana, al hacerlo, celebra en el momento y márcalo como hecho.',
        'Si un día fallas, no pasa nada. La regla es una sola: nunca faltes dos días seguidos.',
      ],
    },
    moment: {
      title: 'Mi hábito de 2 minutos',
      blocks: [
        { label: 'Elige quién quieres ser', minutes: 1 },
        { label: 'Tu anclaje: después de…', minutes: 1 },
        { label: 'Hazlo ahora: 2 minutos', minutes: 2 },
        { label: 'Celebra', minutes: 1 },
      ],
    },
    cta: {
      heading: 'Tu hábito, diseñado para tu día real',
      text: 'Cuéntale a SOI qué hábito quieres construir y cuánto tiempo tienes. Te arma la versión pequeña, te la pone en Mi día y te recuerda volver.',
      button: 'Crear mi hábito con SOI',
    },
    agent: 'rutinas',
    faq: [
      { q: '¿Es verdad que un hábito se forma en 21 días?', a: 'No hay evidencia para los 21 días. En el estudio de Phillippa Lally (2010) el promedio fue de 66 días, con un rango de 18 a 254 días según la persona y la complejidad del hábito.' },
      { q: '¿Qué pasa si fallo un día?', a: 'Faltar un día no rompe el hábito: en el estudio de Lally no afectó su formación. Lo importante es retomarlo al día siguiente. La regla práctica es no faltar dos días seguidos.' },
      { q: '¿Cuántos hábitos puedo crear al mismo tiempo?', a: 'Lo más efectivo es empezar con uno, como máximo dos, y agregar otro cuando el primero ya se sienta automático. Varios hábitos nuevos a la vez compiten por tu atención y suelen caerse juntos.' },
      { q: '¿Cuál es el mejor hábito para empezar?', a: 'Uno que te dé una victoria visible y que dependa solo de ti: tender la cama, escribir tu meta del día, caminar 10 minutos o una respiración de un minuto. Lo pequeño que se repite vale más que lo grande que se abandona.' },
    ],
    related: ['disciplina-personal', 'rutina-mananas', 'procrastinacion'],
    emotions: ['desmotivacion', 'sentirse-estancado'],
    posts: ['crear-un-habito-en-5-minutos-al-dia', 'como-recuperar-la-disciplina'],
  },

  {
    slug: 'disciplina-personal',
    name: 'Disciplina personal',
    keyword: 'cómo tener disciplina',
    title: 'Cómo tener disciplina personal sin depender de ganas',
    description: 'Qué es la disciplina de verdad, por qué no es fuerza de voluntad y cómo construirla con decisiones previas, entorno e identidad. Guía con fuentes.',
    h1: 'Cómo tener disciplina personal (sin depender de las ganas)',
    answer: 'La disciplina no es aguantar a fuerza de voluntad, sino diseñar tu día para que hacer lo importante sea lo más fácil. Decide de antemano qué harás y cuándo, quita tentaciones del entorno, empieza con una versión pequeña y cumple una promesa diaria contigo. Cada promesa cumplida construye la identidad de alguien disciplinado.',
    intro: [
      'Admiras a las personas disciplinadas: se levantan temprano, entrenan, cumplen lo que dicen. Y piensas que tienen algo que tú no: una fuerza de voluntad especial.',
      'La investigación dice algo distinto, y mucho más esperanzador. Las personas que parecen más disciplinadas no resisten mejor las tentaciones: se enfrentan a menos. La disciplina se diseña. Aquí te explicamos cómo.',
    ],
    eslabon: 'accion',
    sections: [
      {
        h2: 'Qué es la disciplina (y qué no es)',
        paragraphs: [
          'La disciplina es la capacidad de hacer lo que decidiste aunque en el momento no tengas ganas. No es castigo, no es rigidez y no es ser duro contigo. Es una forma de respeto hacia la persona que tomó la decisión: tú.',
          'Brian Tracy la considera la cualidad que más predice el éxito, y retoma una definición clásica: la capacidad de hacer lo que debes hacer, cuando debes hacerlo, te guste o no. La pregunta es cómo lograrlo sin vivir peleando contigo.',
        ],
        source: 'Brian Tracy, «No Excuses! The Power of Self-Discipline» (2010)',
      },
      {
        h2: 'Las personas disciplinadas no resisten más: se exponen menos',
        paragraphs: [
          'En un estudio que siguió a cientos de personas durante su día, quienes tenían más autocontrol reportaron **menos tentaciones**, no más resistencia. Habían organizado su vida para no tener que pelear contra sí mismas a cada rato.',
          'Además, la idea de que la fuerza de voluntad es un tanque que se vacía está en duda: un gran experimento con 23 laboratorios no logró reproducir el famoso efecto de «agotamiento del ego». Lo que sí funciona de forma consistente es cambiar el entorno y automatizar decisiones.',
        ],
        source: 'Hofmann, Baumeister, Förster y Vohs (2012); Hagger y colegas, réplica multilaboratorio (2016)',
      },
      {
        h2: 'Diseña tu entorno a tu favor',
        paragraphs: ['Si quieres algo, hazlo visible y fácil. Si no lo quieres, escóndelo y complícalo. Algunos ejemplos:'],
        list: [
          'Deja el teléfono en otro cuarto mientras trabajas o antes de dormir.',
          'Prepara la ropa de ejercicio la noche anterior, junto a la cama.',
          'Ten a la mano la versión saludable (fruta lavada, agua) y lejos la otra.',
          'Bloquea en tu calendario el tiempo de lo importante, como una cita que no se cancela.',
        ],
        source: 'Wendy Wood, «Good Habits, Bad Habits» (2019); James Clear, «Atomic Habits» (2018)',
      },
      {
        h2: 'Decide antes, no en el momento',
        paragraphs: [
          'La disciplina se rompe en el instante en que te preguntas «¿lo hago o no?». Por eso conviene tomar la decisión antes, en frío, con un plan si-entonces: «Si son las 7:00, entonces salgo a caminar.» «Si me dan ganas de revisar el teléfono mientras estudio, entonces respiro tres veces y vuelvo a la página.»',
          'Cuando llega el momento, ya no hay negociación: solo ejecutas lo que tu versión tranquila ya decidió. Si sueles postergar, la [guía para dejar de procrastinar](/procrastinacion) te ayuda a encontrar el primer paso.',
        ],
        source: 'Peter Gollwitzer, intenciones de implementación (1999)',
      },
      {
        h2: 'La disciplina se construye con promesas pequeñas',
        paragraphs: [
          'Cada vez que dices «mañana empiezo» y no lo haces, le enseñas a tu mente que tus promesas no valen. Y cada vez que cumples una, aunque sea pequeña, recuperas confianza en ti. Por eso es mejor prometerte 10 minutos y cumplirlos que prometerte una hora y fallar.',
          'Angela Duckworth, que estudió la perseverancia en cadetes, estudiantes y vendedores, encontró que la constancia a largo plazo hacia una meta importa más que el talento. Esa constancia se construye un día a la vez.',
        ],
        source: 'Angela Duckworth, «Grit» (2016)',
      },
      {
        h2: 'Disciplina e identidad: el último paso',
        paragraphs: [
          'Al principio la disciplina se siente como esfuerzo. Con el tiempo, se vuelve parte de quién eres: ya no «te obligas» a entrenar, eres alguien que entrena. Ese cambio ocurre cuando juntas suficiente evidencia de que sí cumples.',
          'Y si perdiste el rumbo, no empiezas de cero: lee [cómo recuperar la disciplina cuando la perdiste](/blog/como-recuperar-la-disciplina).',
        ],
      },
    ],
    method: {
      name: 'La promesa diaria (5 minutos)',
      minutes: 5,
      source: 'Peter Gollwitzer, intenciones de implementación; Wendy Wood, diseño del entorno; Brian Tracy, autodisciplina',
      steps: [
        'Elige una sola promesa para mañana. Pequeña y concreta: «caminar 15 minutos».',
        'Escribe cuándo y dónde: «Si son las 7:00 y termino el café, salgo a caminar.»',
        'Quita un obstáculo del entorno esta noche (prepara la ropa, deja el teléfono lejos).',
        'Mañana, cumple. Aunque sea la versión mínima.',
        'Antes de dormir, anótalo como evidencia: «Hoy cumplí lo que me prometí.»',
      ],
    },
    moment: {
      title: 'Cumplir lo que me prometo',
      blocks: [
        { label: 'Una promesa para hoy', minutes: 1 },
        { label: 'Si-entonces', minutes: 1 },
        { label: 'Hazlo: 10 minutos', minutes: 10 },
        { label: 'Anota tu evidencia', minutes: 1 },
      ],
    },
    cta: {
      heading: 'Disciplina que se siente como avanzar, no como castigo',
      text: 'Cuéntale a SOI qué quieres sostener. Te ayuda a decidir la promesa de hoy, te acompaña al cumplirla y guarda cada evidencia de quién te estás volviendo.',
      button: 'Construir mi disciplina con SOI',
    },
    agent: 'brian_tracy',
    faq: [
      { q: '¿La disciplina se nace o se hace?', a: 'Se hace. Hay diferencias entre personas, pero la mayor parte de lo que vemos como disciplina es diseño: entornos con menos tentaciones, decisiones tomadas de antemano y hábitos que ya no requieren esfuerzo.' },
      { q: '¿Qué es mejor, motivación o disciplina?', a: 'Se complementan. La motivación te ayuda a empezar, pero sube y baja. La disciplina, entendida como un sistema de decisiones previas y hábitos, es lo que te sostiene los días en que no tienes ganas.' },
      { q: '¿Cómo ser disciplinado si siempre abandono?', a: 'Empieza con promesas mucho más pequeñas de las que crees que necesitas, cúmplelas varios días seguidos y súbelas poco a poco. Abandonar suele ser señal de que el plan era demasiado grande, no de que tú falles.' },
      { q: '¿Cuánto tiempo tarda en construirse la disciplina?', a: 'Depende de la persona y de lo que quieras sostener. Lo que sí sabemos es que los hábitos tardan en promedio unos dos meses en volverse automáticos, y que faltar un día no rompe el proceso.' },
    ],
    related: ['crear-habitos', 'procrastinacion', 'mentalidad-ganadora'],
    emotions: ['desmotivacion', 'falta-de-enfoque'],
    posts: ['como-recuperar-la-disciplina', 'por-que-consumes-motivacion-pero-no-cambias'],
  },
];
