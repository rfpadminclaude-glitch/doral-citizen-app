export type DoralFact = {
  id: string;
  en: { title: string; body: string };
  es: { title: string; body: string };
};

export const DORAL_FACTS: DoralFact[] = [
  {
    id: 'incorporated',
    en: {
      title: 'A young city',
      body: 'Doral was officially incorporated in 2003, making it one of the newest cities in Miami-Dade County.'
    },
    es: {
      title: 'Una ciudad joven',
      body: 'Doral fue incorporada oficialmente en 2003, convirtiéndola en una de las ciudades más nuevas del Condado de Miami-Dade.'
    }
  },
  {
    id: 'name-origin',
    en: {
      title: "What's in the name?",
      body: 'The name "Doral" is a portmanteau of Doris and Alfred Kaskel, founders of the famous Doral Country Club.'
    },
    es: {
      title: '¿De dónde viene el nombre?',
      body: 'El nombre "Doral" es una combinación de Doris y Alfred Kaskel, fundadores del famoso Doral Country Club.'
    }
  },
  {
    id: 'population',
    en: {
      title: 'Growing community',
      body: 'Doral is home to roughly 80,000 residents, with more than 50% speaking Spanish at home.'
    },
    es: {
      title: 'Comunidad en crecimiento',
      body: 'Doral alberga a unos 80,000 residentes y más del 50% habla español en casa.'
    }
  },
  {
    id: 'parks',
    en: {
      title: '15+ public parks',
      body: 'The city operates more than fifteen parks and recreation centers, including the 70-acre Doral Central Park.'
    },
    es: {
      title: 'Más de 15 parques públicos',
      body: 'La ciudad opera más de quince parques y centros de recreación, incluido el Doral Central Park de 70 acres.'
    }
  },
  {
    id: 'business-district',
    en: {
      title: 'A business powerhouse',
      body: 'Doral houses the headquarters of many Fortune 500 Latin American operations, including Carnival Cruise Line.'
    },
    es: {
      title: 'Centro empresarial',
      body: 'Doral aloja las oficinas centrales latinoamericanas de muchas compañías Fortune 500, incluida Carnival Cruise Line.'
    }
  },
  {
    id: 'green-doral',
    en: {
      title: 'Green Doral',
      body: 'The city has planted over 25,000 trees in the past decade as part of its Green Doral initiative.'
    },
    es: {
      title: 'Doral Verde',
      body: 'La ciudad ha plantado más de 25,000 árboles en la última década como parte de su iniciativa Doral Verde.'
    }
  },
  {
    id: 'multicultural',
    en: {
      title: 'Multilingual by design',
      body: "City services and this assistant are offered in English and Spanish to reflect Doral's diverse community."
    },
    es: {
      title: 'Multilingüe por diseño',
      body: 'Los servicios municipales y este asistente se ofrecen en inglés y español para reflejar la diversidad de Doral.'
    }
  }
];
