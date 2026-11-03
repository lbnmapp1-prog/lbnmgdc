export const MILESTONES = [
  { t:'Integración',      s:'Alpha / MADE'        },
  { t:'Discipulado',      s:'Discipulado completo' },
  { t:'Bautismo',         s:'Bautizado en agua'    },
  { t:'Retiro VEL',       s:'Vida en el Espíritu'  },
  { t:'Retiro CEC',       s:'Creciendo E/C'        },
  { t:'Padre Espiritual', s:'Padre espiritual'     },
  { t:'2 Discípulos',     s:'2 discipulados'       },
  { t:'Perspectiva',      s:'Perspectiva Bíblica'  },
  { t:'L. de Cuidado',    s:'Capacitación GDC'     },
  { t:'Fundamentos',      s:'Fund. del Liderazgo'  },
  { t:'Líder de Grupo',   s:'Multiplicación'       },
];

export const CURSOS = ['Alpha / MADE','Discipulado','Bautizado','Retiro VEL','Padres','2 Discipulados','Retiro Creciendo E/C','Retiro DARTE','Persp. Bíblica','Líder de Cuidado','Fac. Grupos de A.','Líder de Niños','Líder Nueva Gen','Fund. Liderazgo','Pre-Matrimonial','Nuevo Testamento','Antiguo Testamento','Oratoria','Consej. Juvenil','Ayuda P/Padres Adolesc.','Consejería I','Consejería II','Mentoría de Nov.','Arconte','Esc. Plantación'];

export const APOYO = ['Cómo controlar la ira','Sanidad para el corazón herido','Superando el duelo','Celebremos la recuperación','Una vía de escape','Llenando el vacío paternal','Sanando el vínculo materno','Noviazgo con propósito','Pre-matrimonial: una elección','Pre-matrimonial: nuevo comienzo','Matrimonio sobre la roca','Principios p/la crianza','Padres para toda la vida','Ayuda p/padres adolescentes','Victoria financiera','Vida empresarial'];

export const PILARES = [
  { nombre: 'Relación con Dios',      color: '#1e5aa8' },
  { nombre: 'Relación con Otros',     color: '#2f7d6b' },
  { nombre: 'Vida Adulta',            color: '#9a5b2b' },
  { nombre: 'Sana Sexualidad',        color: '#6b4e9a' },
  { nombre: 'Finanzas Saludables',    color: '#2b6f8a' },
];

export const CLASES_POR_PILAR = 5;

export const ESTADOS_SEGUIMIENTO = ['Programada', 'Realizada', 'Cancelada'];

// Rueda de vida: 9 áreas evaluadas del 1 al 10. `key` identifica el área en la app (ver AREA_COL para la columna en la base).
export const AREAS_RUEDA = [
  { key: 'dios',       label: 'Identidad en Cristo' },
  { key: 'ocio',       label: 'Ocio' },
  { key: 'familia',    label: 'Familia de origen' },
  { key: 'vida_adulta',label: 'Vida adulta' },
  { key: 'dinero',     label: 'Finanzas' },
  { key: 'profesion',  label: 'Propósito' },
  { key: 'relaciones', label: 'Integridad' },
  { key: 'amigos',     label: 'Hogar' },
];

// Preguntas guía por área para preparar la cita de seguimiento (el líder puede editarlas).
export const PREGUNTAS_AREA = {
  Dios: [
    '¿Cuántos días de la semana tienes tiempo a solas con Dios? ¿Qué lo facilita o lo impide?',
    '¿Qué has aprendido de la Biblia últimamente?',
    '¿Cómo es tu vida de oración hoy? ¿Sientes que Dios te escucha?',
    '¿Hay algo que te esté alejando de Dios en este momento?',
  ],
  Familia: [
    '¿Cómo es hoy tu relación con tus padres y hermanos?',
    '¿Hay algo sin resolver o algún perdón pendiente en tu familia?',
    '¿Cuánto tiempo de calidad compartes con ellos?',
    '¿Qué pasos pequeños podrías dar esta semana para mejorar esa relación?',
  ],
  Relaciones: [
    '¿Cómo vives hoy tu vida sentimental? ¿Estás en paz con ella?',
    '¿Tus relaciones cercanas te acercan o te alejan de Dios?',
    '¿Qué límites sanos necesitas poner o mantener?',
    '¿Qué heridas del pasado siguen afectando tus relaciones?',
  ],
  Amigos: [
    '¿Quiénes son tus amigos cercanos y qué influencia tienen en ti?',
    '¿Tienes personas con quienes puedas ser honesto?',
    '¿Cómo ayudas tú a tus amigos a crecer?',
    '¿Hay amistades que debas fortalecer o soltar?',
  ],
  Salud: [
    '¿Cómo estás durmiendo, comiendo y haciendo ejercicio?',
    '¿Cómo ha estado tu ánimo y tu manejo del estrés estas semanas?',
    '¿Hay algo emocional que te gustaría trabajar con ayuda de alguien?',
    '¿Qué hábito pequeño podrías cambiar primero?',
  ],
  Dinero: [
    '¿Llevas un control de tus ingresos y gastos?',
    '¿Tienes deudas? ¿Cuál es tu plan para salir de ellas?',
    '¿Estás ahorrando algo, aunque sea poco? ¿Cómo manejas tus diezmos y ofrendas?',
    '¿Qué decisión financiera te preocupa hoy?',
  ],
  Profesion: [
    '¿Cómo vas en tus estudios o trabajo? ¿Qué te gusta y qué no?',
    '¿Qué metas profesionales tienes para este año?',
    '¿Estás usando tus talentos con propósito?',
    '¿Qué obstáculo necesitas superar para avanzar?',
  ],
  VidaAdulta: [
    '¿Qué responsabilidades estás asumiendo con madurez y cuáles evitas?',
    '¿Cómo tomas tus decisiones importantes? ¿A quién consultas?',
    '¿Qué tan independiente eres en lo económico y en lo emocional?',
    '¿Qué área de tu carácter quieres desarrollar este año?',
  ],
  Ocio: [
    '¿Qué haces para descansar y disfrutar?',
    '¿Tu tiempo libre te renueva o te desgasta?',
    '¿Cuánto tiempo dedicas a pantallas y redes sociales?',
    '¿Qué hobby o actividad sana te gustaría retomar?',
  ],
};

// Área de la rueda → columna en la tabla `evaluaciones` (Postgres usa snake_case).
export const AREA_COL = {
  dios: 'dios', ocio: 'ocio', familia: 'familia', vida_adulta: 'vida_adulta',
  dinero: 'dinero', profesion: 'profesion', relaciones: 'relaciones', amigos: 'amigos',
};
