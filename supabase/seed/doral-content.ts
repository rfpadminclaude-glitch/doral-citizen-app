/**
 * Hand-curated Doral seed content for the PoC.
 *
 * Each entry is one topic, written in BOTH English and Spanish so the RAG
 * pipeline can answer in either language with grounded citations. Numbers
 * and addresses are realistic-looking placeholders aligned with publicly
 * known City of Doral facts — confirm with cityofdoral.com before relying
 * on these in production.
 */
export type SeedDoc = {
  slug: string;
  source_url: string;
  source_domain: string;
  title_en: string;
  title_es: string;
  body_en: string;
  body_es: string;
};

export const SEED_DOCS: SeedDoc[] = [
  // ---------------------------------------------------------- permits
  {
    slug: 'business-permit-renewal',
    source_url: 'https://www.cityofdoral.com/services/permits/business-renewal',
    source_domain: 'cityofdoral.com',
    title_en: 'Business permit renewal',
    title_es: 'Renovación de permiso de negocio',
    body_en: `Doral business owners must renew their Business Tax Receipt (BTR) every year on or before September 30. After that date a 25% late penalty applies, increasing each month it remains unpaid.

How to renew:
1. Log in to the Doral self-service portal at services.cityofdoral.com.
2. Locate the BTR for your business and click "Renew".
3. Pay the renewal fee online with a credit card or ACH. Typical fees range from $45 to $325 depending on business category.
4. Once payment clears, download your renewed BTR PDF or wait 7-10 business days for the mailed copy.

In-person renewals are accepted at City Hall (8401 NW 53rd Terrace) Monday-Friday 8:00 AM to 4:00 PM. Bring your prior BTR and a valid ID.

Renewals are not automatic. If you do not renew, the City may suspend your right to operate within Doral city limits.`,
    body_es: `Los dueños de negocios en Doral deben renovar su Recibo de Impuestos de Negocio (BTR) cada año antes del 30 de septiembre. Después de esa fecha se aplica una multa por mora del 25%, que aumenta cada mes que permanece sin pagar.

Cómo renovar:
1. Inicia sesión en el portal de autoservicio de Doral en services.cityofdoral.com.
2. Localiza el BTR de tu negocio y haz clic en "Renovar".
3. Paga la tarifa de renovación en línea con tarjeta de crédito o ACH. Las tarifas típicas van de $45 a $325 según la categoría del negocio.
4. Una vez procesado el pago, descarga el PDF de tu BTR renovado o espera 7-10 días hábiles para recibir la copia por correo.

Las renovaciones en persona se aceptan en el Ayuntamiento (8401 NW 53rd Terrace) de lunes a viernes, de 8:00 AM a 4:00 PM. Trae tu BTR anterior y una identificación válida.

Las renovaciones no son automáticas. Si no renuevas, la Ciudad puede suspender tu derecho a operar dentro de los límites de Doral.`
  },
  {
    slug: 'building-permit',
    source_url: 'https://www.cityofdoral.com/services/permits/building',
    source_domain: 'cityofdoral.com',
    title_en: 'Building permits',
    title_es: 'Permisos de construcción',
    body_en: `A building permit is required before starting most construction, alteration, demolition, or significant repair work on residential and commercial properties in Doral.

Common projects that require a permit:
- New construction or additions
- Roof replacement
- Electrical, plumbing, or HVAC work
- Pool installation
- Fences taller than 6 feet
- Detached structures larger than 100 sq ft

Apply online at services.cityofdoral.com/permits or in person at the Permits Counter inside City Hall. Required documents include signed and sealed plans, a property survey, and the Notice of Commencement for projects over $2,500.

Most residential permits are reviewed within 7-10 business days. Plan corrections, if any, are returned through the same portal. Inspection requests are scheduled at least 24 hours in advance via the portal or by calling 305-593-6700.`,
    body_es: `Se requiere un permiso de construcción antes de iniciar la mayoría de los trabajos de construcción, modificación, demolición o reparación significativa en propiedades residenciales y comerciales en Doral.

Proyectos comunes que requieren permiso:
- Construcción nueva o ampliaciones
- Reemplazo de techo
- Trabajos eléctricos, de plomería o HVAC
- Instalación de piscina
- Cercas de más de 6 pies de altura
- Estructuras independientes mayores a 100 pies cuadrados

Solicita en línea en services.cityofdoral.com/permits o en persona en el Mostrador de Permisos dentro del Ayuntamiento. Los documentos requeridos incluyen planos firmados y sellados, un estudio topográfico de la propiedad y la Notificación de Inicio para proyectos mayores a $2,500.

La mayoría de los permisos residenciales se revisan en 7-10 días hábiles. Las correcciones de planos, si las hay, se devuelven por el mismo portal. Las solicitudes de inspección se programan con al menos 24 horas de anticipación a través del portal o llamando al 305-593-6700.`
  },
  {
    slug: 'permit-fees',
    source_url: 'https://www.cityofdoral.com/services/permits/fees',
    source_domain: 'cityofdoral.com',
    title_en: 'Permit fees and payment options',
    title_es: 'Tarifas de permisos y opciones de pago',
    body_en: `Permit fees in Doral are based on the type of permit, the construction valuation, and any applicable plan-review surcharges.

Typical fee ranges:
- Business Tax Receipt renewal: $45 - $325
- Residential remodel building permit: $150 - $1,200 depending on valuation
- Roof permit (single-family home): around $200 - $400
- Pool installation permit: $350 - $750
- Re-inspection fee (per missed or failed inspection): $75

Accepted payment methods: Visa, Mastercard, American Express, Discover, ACH e-check, money order, and cashier's check. Personal checks are NOT accepted for permit fees. The City does not accept cash for transactions over $500.

Fees are non-refundable once a plan review has begun.`,
    body_es: `Las tarifas de permisos en Doral se basan en el tipo de permiso, la valoración de la construcción y cualquier sobrecargo aplicable por revisión de planos.

Rangos típicos de tarifas:
- Renovación del Recibo de Impuestos de Negocio: $45 - $325
- Permiso de remodelación residencial: $150 - $1,200 según la valoración
- Permiso de techado (vivienda unifamiliar): aproximadamente $200 - $400
- Permiso de instalación de piscina: $350 - $750
- Tarifa por reinspección (por cada inspección perdida o reprobada): $75

Métodos de pago aceptados: Visa, Mastercard, American Express, Discover, e-check ACH, giro postal y cheque de caja. Los cheques personales NO se aceptan para tarifas de permisos. La Ciudad no acepta efectivo para transacciones de más de $500.

Las tarifas no son reembolsables una vez iniciada la revisión de planos.`
  },

  // ---------------------------------------------------------- city hall
  {
    slug: 'city-hall-hours',
    source_url: 'https://www.cityofdoral.com/about/city-hall',
    source_domain: 'cityofdoral.com',
    title_en: 'City Hall hours and location',
    title_es: 'Horario y ubicación del Ayuntamiento',
    body_en: `Doral City Hall is located at 8401 NW 53rd Terrace, Doral, FL 33166.

Standard hours:
- Monday through Friday: 8:00 AM to 4:00 PM
- Closed Saturdays, Sundays, and most federal holidays (New Year's Day, MLK Day, Memorial Day, Independence Day, Labor Day, Thanksgiving and the day after, Christmas Eve and Christmas Day)

Parking is free in the City Hall lot for visitors. The main entrance is on the west side of the building. Accessible entrances and an elevator are available; service animals are welcome.

For general inquiries call 305-593-6725 or email info@cityofdoral.com.`,
    body_es: `El Ayuntamiento de Doral está ubicado en 8401 NW 53rd Terrace, Doral, FL 33166.

Horario habitual:
- Lunes a viernes: 8:00 AM a 4:00 PM
- Cerrado los sábados, domingos y la mayoría de los feriados federales (Año Nuevo, Día de MLK, Memorial Day, Día de la Independencia, Día del Trabajo, Acción de Gracias y el día siguiente, Nochebuena y Navidad)

El estacionamiento es gratuito para visitantes en el lote del Ayuntamiento. La entrada principal está en el lado oeste del edificio. Hay entradas accesibles y ascensor disponibles; los animales de servicio son bienvenidos.

Para consultas generales llama al 305-593-6725 o envía un correo a info@cityofdoral.com.`
  },
  {
    slug: 'city-departments',
    source_url: 'https://www.cityofdoral.com/about/departments',
    source_domain: 'cityofdoral.com',
    title_en: 'Departments and key contacts',
    title_es: 'Departamentos y contactos principales',
    body_en: `Main departments at the City of Doral:

- Building & Permits: 305-593-6700, building@cityofdoral.com
- Code Enforcement: 305-593-6736, code@cityofdoral.com
- Finance / Business Tax: 305-593-6725
- Parks & Recreation: 305-593-6803, parks@cityofdoral.com
- Planning & Zoning: 305-593-6730
- Public Works: 305-593-6740, publicworks@cityofdoral.com
- Doral Police (non-emergency): 305-593-6699
- Police Records: 305-593-6699 ext 2

For emergencies dial 911. For non-emergency city services and general questions, dial 311 from any phone within Miami-Dade County.`,
    body_es: `Departamentos principales de la Ciudad de Doral:

- Construcción y Permisos: 305-593-6700, building@cityofdoral.com
- Cumplimiento de Códigos: 305-593-6736, code@cityofdoral.com
- Finanzas / Impuestos de Negocio: 305-593-6725
- Parques y Recreación: 305-593-6803, parks@cityofdoral.com
- Planificación y Zonificación: 305-593-6730
- Obras Públicas: 305-593-6740, publicworks@cityofdoral.com
- Policía de Doral (no emergencias): 305-593-6699
- Registros Policiales: 305-593-6699 ext 2

Para emergencias marca 911. Para servicios municipales no urgentes y preguntas generales, marca 311 desde cualquier teléfono dentro del Condado de Miami-Dade.`
  },

  // ---------------------------------------------------------- trash & recycling
  {
    slug: 'trash-pickup',
    source_url: 'https://www.cityofdoral.com/services/public-works/trash',
    source_domain: 'cityofdoral.com',
    title_en: 'Garbage and recycling pickup',
    title_es: 'Recolección de basura y reciclaje',
    body_en: `Residential garbage is collected twice per week. Pickup days are assigned by route:

- Route A (homes north of NW 41st Street): Mondays and Thursdays
- Route B (homes south of NW 41st Street): Tuesdays and Fridays

Recycling (blue cart) is picked up once a week on Wednesdays.

Place carts at the curb by 7:00 AM on your collection day, with at least three feet of clearance on all sides. Bags placed outside the cart are not collected.

Bulky waste (furniture, mattresses, appliances) is picked up by appointment only. Schedule at services.cityofdoral.com/bulk or call 305-593-6740 at least 48 hours in advance.

Yard waste (branches, palm fronds, leaves) must be bagged or bundled and placed separately from regular trash on your second weekly pickup day.`,
    body_es: `La basura residencial se recoge dos veces por semana. Los días de recolección se asignan por ruta:

- Ruta A (viviendas al norte de NW 41st Street): lunes y jueves
- Ruta B (viviendas al sur de NW 41st Street): martes y viernes

El reciclaje (carrito azul) se recoge una vez por semana los miércoles.

Coloca los carritos en la acera antes de las 7:00 AM en tu día de recolección, con al menos tres pies de espacio libre a cada lado. Las bolsas colocadas fuera del carrito no se recogen.

Los desechos voluminosos (muebles, colchones, electrodomésticos) se recogen solo con cita. Programa en services.cityofdoral.com/bulk o llama al 305-593-6740 con al menos 48 horas de anticipación.

Los desechos de jardín (ramas, hojas de palma, hojas) deben estar embolsados o atados y colocados separados de la basura regular en tu segundo día de recolección semanal.`
  },
  {
    slug: 'hurricane-prep',
    source_url: 'https://www.cityofdoral.com/services/emergency/hurricane',
    source_domain: 'cityofdoral.com',
    title_en: 'Hurricane preparedness',
    title_es: 'Preparación para huracanes',
    body_en: `Hurricane season in South Florida runs from June 1 to November 30. Doral residents should prepare a kit and a plan well before the first storm advisory.

Recommended supplies (per person, 7 days):
- 1 gallon of water per day
- Non-perishable food, manual can opener
- Flashlight, battery-powered radio, extra batteries
- First-aid kit, prescription medications
- Important documents in a waterproof bag
- Cash in small bills
- Cell phone chargers and a backup power bank

Sandbags are typically distributed at Doral Central Park (3000 NW 87th Avenue) starting 72 hours before a forecast hurricane landfall, while supplies last. Bring ID showing a Doral address. Limit 10 bags per household.

Sign up for emergency alerts at cityofdoral.com/alerts. The City uses CodeRED to send phone, SMS, and email notifications for evacuations, curfews, and shelter openings.`,
    body_es: `La temporada de huracanes en el sur de Florida va del 1 de junio al 30 de noviembre. Los residentes de Doral deben preparar un kit y un plan mucho antes del primer aviso de tormenta.

Suministros recomendados (por persona, 7 días):
- 1 galón de agua por día
- Alimentos no perecederos, abrelatas manual
- Linterna, radio a batería, baterías adicionales
- Botiquín de primeros auxilios, medicamentos recetados
- Documentos importantes en una bolsa impermeable
- Efectivo en billetes pequeños
- Cargadores de celular y una batería externa

Las bolsas de arena generalmente se distribuyen en Doral Central Park (3000 NW 87th Avenue) a partir de 72 horas antes del impacto previsto del huracán, mientras duren las existencias. Trae una identificación con dirección de Doral. Límite de 10 bolsas por hogar.

Regístrate para alertas de emergencia en cityofdoral.com/alerts. La Ciudad usa CodeRED para enviar notificaciones por teléfono, SMS y correo electrónico sobre evacuaciones, toques de queda y aperturas de refugios.`
  },

  // ---------------------------------------------------------- parks & events
  {
    slug: 'parks-list',
    source_url: 'https://www.cityofdoral.com/parks',
    source_domain: 'cityofdoral.com',
    title_en: 'Doral parks and recreation centers',
    title_es: 'Parques y centros de recreación de Doral',
    body_en: `Doral operates more than a dozen public parks and recreation centers. Highlights:

- Doral Central Park (3000 NW 87th Ave): the City's flagship park with multipurpose fields, splash pad, playground, dog park, and walking paths.
- Doral Meadow Park (11555 NW 58th St): community center, large playground, picnic shelters.
- Veterans Park (8851 NW 102nd Ave): memorial garden, skate park, basketball courts.
- J.C. Bermudez Park (3000 NW 87th Ave): adjacent to Central Park, baseball and softball fields.
- Trails & Tails Dog Park (within Doral Central Park): two separate enclosures for small and large dogs.

Park hours: most parks open daily from 7:00 AM to 10:00 PM. Recreation centers follow program schedules; check cityofdoral.com/parks for class registration. Park rentals (shelters, fields) require an online reservation and a deposit.`,
    body_es: `Doral opera más de una docena de parques y centros de recreación públicos. Destacados:

- Doral Central Park (3000 NW 87th Ave): el parque insignia de la Ciudad con canchas multipropósito, splash pad, parque infantil, parque para perros y senderos.
- Doral Meadow Park (11555 NW 58th St): centro comunitario, parque infantil grande, áreas de picnic.
- Veterans Park (8851 NW 102nd Ave): jardín conmemorativo, parque de patinaje, canchas de baloncesto.
- J.C. Bermudez Park (3000 NW 87th Ave): adyacente a Central Park, campos de béisbol y softbol.
- Trails & Tails Dog Park (dentro de Doral Central Park): dos áreas separadas para perros pequeños y grandes.

Horario de parques: la mayoría de los parques abren diariamente de 7:00 AM a 10:00 PM. Los centros de recreación siguen los horarios de los programas; consulta cityofdoral.com/parks para inscripciones a clases. Las reservas de parques (áreas de picnic, campos) requieren reserva en línea y un depósito.`
  },
  {
    slug: 'community-events',
    source_url: 'https://www.cityofdoral.com/events',
    source_domain: 'cityofdoral.com',
    title_en: 'City-sponsored community events',
    title_es: 'Eventos comunitarios patrocinados por la Ciudad',
    body_en: `The City of Doral hosts free community events throughout the year. Signature events include:

- Doral Food & Wine Festival (early spring)
- Doral Family Picnic at Doral Meadow Park (Memorial Day weekend)
- Fourth of July fireworks at Doral Central Park
- Concerts under the Stars (monthly, May through October, Friday evenings)
- Trick-or-Treat on Main Street (October 31)
- Doral Tree Lighting and Holiday Festival (first Friday of December)
- Three Kings Day Celebration (early January)

Check cityofdoral.com/events for dates, times, and any required RSVPs. Some events offer free parking shuttles from outlying lots.`,
    body_es: `La Ciudad de Doral organiza eventos comunitarios gratuitos durante todo el año. Los eventos destacados incluyen:

- Festival de Comida y Vino de Doral (principios de primavera)
- Picnic Familiar de Doral en Doral Meadow Park (fin de semana de Memorial Day)
- Fuegos artificiales del 4 de julio en Doral Central Park
- Conciertos bajo las Estrellas (mensuales, de mayo a octubre, viernes por la noche)
- Trick-or-Treat en Main Street (31 de octubre)
- Encendido del Árbol de Doral y Festival Navideño (primer viernes de diciembre)
- Celebración del Día de Reyes (principios de enero)

Consulta cityofdoral.com/events para fechas, horarios y RSVPs requeridos. Algunos eventos ofrecen transporte gratuito desde lotes de estacionamiento periféricos.`
  },

  // ---------------------------------------------------------- code, contact
  {
    slug: 'code-violations',
    source_url: 'https://www.cityofdoral.com/services/code-enforcement',
    source_domain: 'cityofdoral.com',
    title_en: 'Reporting code violations',
    title_es: 'Reportar infracciones del código municipal',
    body_en: `Common code violations residents can report include: tall grass and weeds, illegal dumping, abandoned vehicles, unpermitted construction, signs in the right-of-way, and short-term rental nuisances.

How to report:
- Online: cityofdoral.com/code-report (no account required)
- Phone: 305-593-6736 weekdays 8 AM - 4 PM
- 311 from any Miami-Dade phone (24/7)

Reports may be submitted anonymously. Provide the property address, a description, and a photo if possible. An officer typically responds within 3 business days. Complainants who provide contact info receive a follow-up confirmation and case number.

Fines for repeat or severe violations can reach $500 per day. The City prioritizes safety-related cases (structural hazards, blocked accessibility, exposed electrical, illegal occupancy).`,
    body_es: `Infracciones comunes del código que los residentes pueden reportar: pasto y maleza altos, vertido ilegal, vehículos abandonados, construcción sin permiso, letreros en la vía pública y molestias por alquileres a corto plazo.

Cómo reportar:
- En línea: cityofdoral.com/code-report (no requiere cuenta)
- Teléfono: 305-593-6736 días hábiles de 8 AM a 4 PM
- 311 desde cualquier teléfono de Miami-Dade (24/7)

Los reportes pueden enviarse de forma anónima. Proporciona la dirección de la propiedad, una descripción y una foto si es posible. Un oficial generalmente responde dentro de 3 días hábiles. Los denunciantes que proporcionan información de contacto reciben una confirmación de seguimiento y un número de caso.

Las multas por infracciones repetidas o graves pueden llegar a $500 por día. La Ciudad prioriza los casos relacionados con la seguridad (peligros estructurales, accesibilidad bloqueada, instalaciones eléctricas expuestas, ocupación ilegal).`
  },
  {
    slug: 'new-business-registration',
    source_url: 'https://www.cityofdoral.com/services/business/register',
    source_domain: 'cityofdoral.com',
    title_en: 'Registering a new business',
    title_es: 'Registrar un nuevo negocio',
    body_en: `If you plan to operate a business in Doral you need a Business Tax Receipt (BTR) from both Miami-Dade County and the City of Doral.

Step-by-step:
1. Form your business entity with the Florida Department of State (sunbiz.org).
2. Apply for an EIN with the IRS.
3. Confirm the zoning at your proposed location supports your business type. Contact Planning & Zoning at 305-593-6730 for a zoning verification letter.
4. Get a Miami-Dade County BTR.
5. Apply for a City of Doral BTR online at services.cityofdoral.com.

Home-based businesses are permitted in many residential zones but cannot have customer foot traffic, large signage, or employees on-site. A signed Home Occupation Affidavit is required.

Some industries (food service, child care, contractors, beauty services) require additional state or county licenses. The City of Doral cannot issue a BTR for those until those prerequisites are confirmed.`,
    body_es: `Si planeas operar un negocio en Doral, necesitas un Recibo de Impuestos de Negocio (BTR) tanto del Condado de Miami-Dade como de la Ciudad de Doral.

Paso a paso:
1. Constituye tu entidad comercial con el Departamento de Estado de Florida (sunbiz.org).
2. Solicita un EIN con el IRS.
3. Confirma que la zonificación de tu ubicación propuesta admite tu tipo de negocio. Contacta a Planificación y Zonificación al 305-593-6730 para una carta de verificación de zonificación.
4. Obtén un BTR del Condado de Miami-Dade.
5. Solicita un BTR de la Ciudad de Doral en línea en services.cityofdoral.com.

Los negocios desde casa están permitidos en muchas zonas residenciales pero no pueden tener tráfico de clientes, letreros grandes ni empleados en el sitio. Se requiere una Declaración Jurada de Ocupación en el Hogar firmada.

Algunas industrias (servicios de alimentos, cuidado infantil, contratistas, servicios de belleza) requieren licencias adicionales del estado o del condado. La Ciudad de Doral no puede emitir un BTR para esos hasta que se confirmen esos requisitos previos.`
  },

  // ---------------------------------------------------------- 311
  {
    slug: 'contact-311',
    source_url: 'https://www.cityofdoral.com/services/311',
    source_domain: 'cityofdoral.com',
    title_en: 'Contacting 311',
    title_es: 'Cómo contactar al 311',
    body_en: `311 is Miami-Dade County's non-emergency hotline for residents in Doral and the rest of the county. Use 311 to:

- Report a pothole, broken streetlight, or downed sign
- Schedule a bulky waste or large-item pickup
- Ask about water service, taxes, or transit
- File a general complaint about city or county services

Hours: live agents are available Monday-Friday 7:00 AM - 8:00 PM and Saturday 8:00 AM - 5:00 PM. Outside those hours you can leave a message or use the 311 self-service portal at 311direct.miamidade.gov.

Reach 311:
- Dial 311 from any landline or mobile phone within Miami-Dade
- From outside the county: 305-468-5900
- Online: 311direct.miamidade.gov

Always call 911 for emergencies that involve a threat to life, safety, or property.`,
    body_es: `El 311 es la línea directa no urgente del Condado de Miami-Dade para los residentes de Doral y el resto del condado. Usa el 311 para:

- Reportar un bache, una farola rota o un letrero caído
- Programar la recolección de desechos voluminosos o artículos grandes
- Preguntar sobre el servicio de agua, impuestos o transporte
- Presentar una queja general sobre los servicios municipales o del condado

Horario: agentes en vivo disponibles de lunes a viernes de 7:00 AM a 8:00 PM y sábados de 8:00 AM a 5:00 PM. Fuera de esas horas puedes dejar un mensaje o usar el portal de autoservicio del 311 en 311direct.miamidade.gov.

Contacta al 311:
- Marca 311 desde cualquier teléfono fijo o móvil dentro de Miami-Dade
- Desde fuera del condado: 305-468-5900
- En línea: 311direct.miamidade.gov

Siempre llama al 911 para emergencias que involucren una amenaza a la vida, seguridad o propiedad.`
  }
];
