/**
 * Fictional citizen master records for the GIS demo.
 *
 * Coordinates are hand-picked to fall inside the matching polygon in
 * public/geo/doral-neighborhoods.json. neighborhood_slug is hard-coded
 * here (rather than computed via tagNeighborhood) so the seed has zero
 * runtime dependencies — the script just upserts.
 *
 * All names, phones, emails, and addresses are synthetic.
 */
export type SeedCitizen = {
  name: string;
  phone: string | null;
  email: string | null;
  address_line: string;
  lat: number;
  lng: number;
  neighborhood_slug: string;
};

export const SEED_CITIZENS: SeedCitizen[] = [
  // ---- Doral Isles (NW, 25.830-25.860, -80.400 to -80.360) ----
  { name: 'Maria Hernandez', phone: '+13055550101', email: 'maria.h@demo.doral', address_line: '11400 NW 58th St, Doral, FL', lat: 25.847, lng: -80.392, neighborhood_slug: 'doral-isles' },
  { name: 'Jose Ramirez',    phone: '+13055550102', email: 'jose.r@demo.doral',  address_line: '11250 NW 55th Ln, Doral, FL', lat: 25.843, lng: -80.387, neighborhood_slug: 'doral-isles' },
  { name: 'Lin Chen',        phone: '+13055550103', email: null,                  address_line: '11100 NW 60th Ter, Doral, FL', lat: 25.850, lng: -80.382, neighborhood_slug: 'doral-isles' },
  { name: 'Ahmed Khalil',    phone: '+13055550104', email: 'ahmed.k@demo.doral', address_line: '10950 NW 56th St, Doral, FL', lat: 25.845, lng: -80.376, neighborhood_slug: 'doral-isles' },
  { name: 'Priya Patel',     phone: null,           email: 'priya.p@demo.doral', address_line: '11700 NW 62nd St, Doral, FL', lat: 25.852, lng: -80.397, neighborhood_slug: 'doral-isles' },
  { name: 'Diego Morales',   phone: '+13055550106', email: 'diego.m@demo.doral', address_line: '10800 NW 53rd Ter, Doral, FL', lat: 25.838, lng: -80.371, neighborhood_slug: 'doral-isles' },
  { name: 'Sofia Vargas',    phone: '+13055550107', email: 'sofia.v@demo.doral', address_line: '11550 NW 57th St, Doral, FL', lat: 25.846, lng: -80.394, neighborhood_slug: 'doral-isles' },

  // ---- Trails of Doral (NE, 25.830-25.860, -80.360 to -80.300) ----
  { name: 'Carlos Mendez',   phone: '+13055550108', email: 'carlos.m@demo.doral', address_line: '10200 NW 74th St, Doral, FL', lat: 25.853, lng: -80.351, neighborhood_slug: 'trails-of-doral' },
  { name: 'Aisha Brown',     phone: '+13055550109', email: null,                   address_line: '9700 NW 68th Ter, Doral, FL',  lat: 25.847, lng: -80.336, neighborhood_slug: 'trails-of-doral' },
  { name: 'Marcus Lee',      phone: '+13055550110', email: 'marcus.l@demo.doral', address_line: '9300 NW 72nd St, Doral, FL',   lat: 25.851, lng: -80.323, neighborhood_slug: 'trails-of-doral' },
  { name: 'Elena Castro',    phone: '+13055550111', email: 'elena.c@demo.doral', address_line: '8800 NW 66th Ter, Doral, FL',  lat: 25.843, lng: -80.309, neighborhood_slug: 'trails-of-doral' },
  { name: 'Hiro Tanaka',     phone: null,           email: 'hiro.t@demo.doral',  address_line: '10500 NW 80th St, Doral, FL',  lat: 25.857, lng: -80.357, neighborhood_slug: 'trails-of-doral' },
  { name: 'Beatriz Soto',    phone: '+13055550113', email: 'beatriz.s@demo.doral', address_line: '9500 NW 70th St, Doral, FL',  lat: 25.849, lng: -80.328, neighborhood_slug: 'trails-of-doral' },
  { name: 'Luca Romano',     phone: '+13055550114', email: 'luca.r@demo.doral',  address_line: '9000 NW 78th St, Doral, FL',   lat: 25.855, lng: -80.316, neighborhood_slug: 'trails-of-doral' },

  // ---- Doral Cay (mid-west, 25.810-25.830, -80.400 to -80.370) ----
  { name: 'Tomas Silva',     phone: '+13055550115', email: 'tomas.s@demo.doral', address_line: '11900 NW 30th St, Doral, FL',  lat: 25.815, lng: -80.396, neighborhood_slug: 'doral-cay' },
  { name: 'Nadia Volkov',    phone: '+13055550116', email: null,                  address_line: '11600 NW 33rd Ter, Doral, FL', lat: 25.821, lng: -80.388, neighborhood_slug: 'doral-cay' },
  { name: 'Felipe Garcia',   phone: null,           email: 'felipe.g@demo.doral', address_line: '11200 NW 36th St, Doral, FL',  lat: 25.825, lng: -80.378, neighborhood_slug: 'doral-cay' },
  { name: 'Olivia Clark',    phone: '+13055550118', email: 'olivia.c@demo.doral', address_line: '11750 NW 32nd Ter, Doral, FL', lat: 25.818, lng: -80.391, neighborhood_slug: 'doral-cay' },
  { name: 'Rafael Ortiz',    phone: '+13055550119', email: 'rafael.o@demo.doral', address_line: '11050 NW 28th Ave, Doral, FL', lat: 25.812, lng: -80.374, neighborhood_slug: 'doral-cay' },
  { name: 'Yara Khan',       phone: '+13055550120', email: 'yara.k@demo.doral',  address_line: '11400 NW 34th St, Doral, FL',  lat: 25.823, lng: -80.383, neighborhood_slug: 'doral-cay' },

  // ---- Doral Park (center, 25.810-25.830, -80.370 to -80.340) ----
  { name: 'Pedro Vargas',    phone: '+13055550121', email: 'pedro.v@demo.doral', address_line: '10100 NW 45th St, Doral, FL',  lat: 25.819, lng: -80.347, neighborhood_slug: 'doral-park' },
  { name: 'Camila Diaz',     phone: null,           email: 'camila.d@demo.doral', address_line: '10500 NW 41st St, Doral, FL', lat: 25.813, lng: -80.358, neighborhood_slug: 'doral-park' },
  { name: 'Niko Petrov',     phone: '+13055550123', email: null,                   address_line: '10700 NW 50th St, Doral, FL', lat: 25.825, lng: -80.364, neighborhood_slug: 'doral-park' },
  { name: 'Sandra Wu',       phone: '+13055550124', email: 'sandra.w@demo.doral', address_line: '10300 NW 43rd Ter, Doral, FL', lat: 25.816, lng: -80.353, neighborhood_slug: 'doral-park' },
  { name: 'Bashir Ali',      phone: '+13055550125', email: 'bashir.a@demo.doral', address_line: '10900 NW 48th St, Doral, FL', lat: 25.823, lng: -80.367, neighborhood_slug: 'doral-park' },
  { name: 'Renata Pinto',    phone: '+13055550126', email: 'renata.p@demo.doral', address_line: '10150 NW 46th St, Doral, FL', lat: 25.820, lng: -80.348, neighborhood_slug: 'doral-park' },
  { name: 'Igor Mendes',     phone: '+13055550127', email: 'igor.m@demo.doral',  address_line: '10650 NW 44th St, Doral, FL',  lat: 25.817, lng: -80.361, neighborhood_slug: 'doral-park' },

  // ---- Costa del Sol (mid-east, 25.810-25.830, -80.340 to -80.300) ----
  { name: 'Valeria Suarez',  phone: '+13055550128', email: 'valeria.s@demo.doral', address_line: '9200 NW 41st St, Doral, FL',  lat: 25.813, lng: -80.318, neighborhood_slug: 'costa-del-sol' },
  { name: 'Dimitri Ivanov',  phone: '+13055550129', email: null,                    address_line: '8800 NW 46th Ter, Doral, FL', lat: 25.820, lng: -80.307, neighborhood_slug: 'costa-del-sol' },
  { name: 'Mia Johnson',     phone: null,           email: 'mia.j@demo.doral',     address_line: '9500 NW 49th St, Doral, FL',  lat: 25.824, lng: -80.327, neighborhood_slug: 'costa-del-sol' },
  { name: 'Rafa Castellanos', phone: '+13055550131', email: 'rafa.c@demo.doral',  address_line: '9000 NW 43rd Ter, Doral, FL', lat: 25.815, lng: -80.312, neighborhood_slug: 'costa-del-sol' },
  { name: 'Asha Thomas',     phone: '+13055550132', email: 'asha.t@demo.doral',   address_line: '9300 NW 47th St, Doral, FL',  lat: 25.821, lng: -80.321, neighborhood_slug: 'costa-del-sol' },
  { name: 'Bruno Costa',     phone: '+13055550133', email: 'bruno.c@demo.doral',  address_line: '8700 NW 42nd St, Doral, FL',  lat: 25.814, lng: -80.305, neighborhood_slug: 'costa-del-sol' },
  { name: 'Lara Novak',      phone: '+13055550134', email: 'lara.n@demo.doral',   address_line: '9100 NW 50th St, Doral, FL',  lat: 25.825, lng: -80.315, neighborhood_slug: 'costa-del-sol' },

  // ---- Doral West (SW, 25.780-25.810, -80.400 to -80.360) ----
  { name: 'Estela Ramos',    phone: '+13055550135', email: 'estela.r@demo.doral', address_line: '11200 NW 12th St, Doral, FL', lat: 25.792, lng: -80.378, neighborhood_slug: 'doral-west' },
  { name: 'Omar Diallo',     phone: '+13055550136', email: 'omar.d@demo.doral',  address_line: '11600 NW 19th Ter, Doral, FL', lat: 25.800, lng: -80.388, neighborhood_slug: 'doral-west' },
  { name: 'Ines Vega',       phone: null,           email: 'ines.v@demo.doral',  address_line: '10900 NW 8th St, Doral, FL',  lat: 25.785, lng: -80.371, neighborhood_slug: 'doral-west' },
  { name: 'Kevin Tran',      phone: '+13055550138', email: null,                  address_line: '11800 NW 22nd St, Doral, FL', lat: 25.804, lng: -80.394, neighborhood_slug: 'doral-west' },
  { name: 'Daniela Reyes',   phone: '+13055550139', email: 'daniela.r@demo.doral', address_line: '11050 NW 16th St, Doral, FL', lat: 25.797, lng: -80.374, neighborhood_slug: 'doral-west' },
  { name: 'Samir Rao',       phone: '+13055550140', email: 'samir.r@demo.doral', address_line: '11500 NW 10th St, Doral, FL', lat: 25.789, lng: -80.385, neighborhood_slug: 'doral-west' },
  { name: 'Joaquin Tapia',   phone: '+13055550141', email: 'joaquin.t@demo.doral', address_line: '11700 NW 25th St, Doral, FL', lat: 25.807, lng: -80.391, neighborhood_slug: 'doral-west' },

  // ---- Downtown Doral (S-center/east, 25.780-25.810, -80.360 to -80.300) ----
  { name: 'Isabela Marin',   phone: '+13055550142', email: 'isabela.m@demo.doral', address_line: '8401 NW 53rd Ter, Doral, FL', lat: 25.808, lng: -80.355, neighborhood_slug: 'downtown-doral' },
  { name: 'Hugo Belmont',    phone: '+13055550143', email: 'hugo.b@demo.doral',  address_line: '9100 NW 25th St, Doral, FL',  lat: 25.795, lng: -80.317, neighborhood_slug: 'downtown-doral' },
  { name: 'Anika Sharma',    phone: null,           email: 'anika.s@demo.doral', address_line: '8500 NW 18th St, Doral, FL',  lat: 25.788, lng: -80.349, neighborhood_slug: 'downtown-doral' },
  { name: 'Mateo Fernandez', phone: '+13055550145', email: 'mateo.f@demo.doral', address_line: '8900 NW 22nd Ter, Doral, FL', lat: 25.802, lng: -80.329, neighborhood_slug: 'downtown-doral' },
  { name: 'Chloe Pham',      phone: '+13055550146', email: 'chloe.p@demo.doral', address_line: '8200 NW 14th St, Doral, FL',  lat: 25.785, lng: -80.339, neighborhood_slug: 'downtown-doral' },
  { name: 'Rohan Banerjee',  phone: '+13055550147', email: 'rohan.b@demo.doral', address_line: '8700 NW 30th St, Doral, FL',  lat: 25.806, lng: -80.345, neighborhood_slug: 'downtown-doral' },
  { name: 'Lucia Pacheco',   phone: '+13055550148', email: 'lucia.p@demo.doral', address_line: '8000 NW 20th Ter, Doral, FL', lat: 25.792, lng: -80.331, neighborhood_slug: 'downtown-doral' }
];
