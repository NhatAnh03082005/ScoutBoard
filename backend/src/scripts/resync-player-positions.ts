import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const client = new Client({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres123',
  database: process.env.POSTGRES_DB || 'scoutboard_db',
});

// Comprehensive Premier League Tactical Mapping
// Canonical Tactical Positions: GK, CB, LB, RB, LWB, RWB, CDM, CM, CAM, LM, RM, LW, RW, CF, ST
const PLAYER_TACTICAL_MAP: Record<
  string,
  { primary: string; secondary?: string[]; raw: string }
> = {
  // --- MANCHESTER UNITED ---
  'A. Onana': { primary: 'GK', raw: 'Goalkeeper' },
  'Andre Onana': { primary: 'GK', raw: 'Goalkeeper' },
  'A. Bayindir': { primary: 'GK', raw: 'Goalkeeper' },
  'T. Heaton': { primary: 'GK', raw: 'Goalkeeper' },
  'S. Lammens': { primary: 'GK', raw: 'Goalkeeper' },
  'Dermot William Mee': { primary: 'GK', raw: 'Goalkeeper' },

  'H. Maguire': { primary: 'CB', raw: 'Defender' },
  'Harry Maguire': { primary: 'CB', raw: 'Defender' },
  'Lisandro Martínez': { primary: 'CB', secondary: ['LB'], raw: 'Defender' },
  'M. de Ligt': { primary: 'CB', raw: 'Defender' },
  'Matthijs de Ligt': { primary: 'CB', raw: 'Defender' },
  'V. Lindelöf': { primary: 'CB', raw: 'Defender' },
  'J. Evans': { primary: 'CB', raw: 'Defender' },
  'L. Yoro': { primary: 'CB', raw: 'Defender' },
  'A. Heaven': { primary: 'CB', raw: 'Defender' },
  'G. Kukonki': { primary: 'CB', raw: 'Defender' },
  'W. Kambwala': { primary: 'CB', raw: 'Defender' },
  'H. Amass': { primary: 'LB', raw: 'Defender' },
  'D. Armer': { primary: 'LB', raw: 'Defender' },
  'L. Shaw': { primary: 'LB', secondary: ['CB'], raw: 'Defender' },
  'Luke Shaw': { primary: 'LB', secondary: ['CB'], raw: 'Defender' },
  'T. Malacia': { primary: 'LB', raw: 'Defender' },
  'Diogo Dalot': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'N. Mazraoui': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'Noussair Mazraoui': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'P. Dorgu': { primary: 'LB', raw: 'Defender' },
  'J. Kamason': { primary: 'RB', raw: 'Defender' },

  Casemiro: { primary: 'CDM', raw: 'Midfielder' },
  'M. Ugarte': { primary: 'CDM', raw: 'Midfielder' },
  'Manuel Ugarte': { primary: 'CDM', raw: 'Midfielder' },
  'T. Collyer': { primary: 'CDM', raw: 'Midfielder' },
  'K. Mainoo': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'Kobbie Mainoo': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'C. Eriksen': { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  'Christian Eriksen': { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  'D. Fletcher': { primary: 'CM', raw: 'Midfielder' },
  'J. Fletcher': { primary: 'CM', raw: 'Midfielder' },
  'T. Rowe': { primary: 'CM', raw: 'Midfielder' },
  'J. Devaney': { primary: 'CM', raw: 'Midfielder' },
  'Bruno Fernandes': {
    primary: 'CAM',
    secondary: ['CM', 'RW'],
    raw: 'Midfielder',
  },
  'M. Mount': { primary: 'CAM', secondary: ['CM'], raw: 'Midfielder' },
  'Mason Mount': { primary: 'CAM', secondary: ['CM'], raw: 'Midfielder' },

  'M. Rashford': { primary: 'LW', secondary: ['ST'], raw: 'Attacker' },
  'Marcus Rashford': { primary: 'LW', secondary: ['ST'], raw: 'Attacker' },
  'A. Garnacho': { primary: 'LW', secondary: ['RW'], raw: 'Attacker' },
  'Alejandro Garnacho': { primary: 'LW', secondary: ['RW'], raw: 'Attacker' },
  Antony: { primary: 'RW', raw: 'Attacker' },
  'A. Diallo': { primary: 'RW', secondary: ['CAM'], raw: 'Attacker' },
  'Amad Diallo': { primary: 'RW', secondary: ['CAM'], raw: 'Attacker' },
  'S. Mather': { primary: 'LW', raw: 'Attacker' },
  'E. Wheatley': { primary: 'ST', raw: 'Attacker' },
  'R. Højlund': { primary: 'ST', raw: 'Attacker' },
  'Rasmus Højlund': { primary: 'ST', raw: 'Attacker' },
  'J. Zirkzee': { primary: 'ST', secondary: ['CF'], raw: 'Attacker' },
  'Joshua Zirkzee': { primary: 'ST', secondary: ['CF'], raw: 'Attacker' },
  'J. Sancho': { primary: 'LW', secondary: ['RW'], raw: 'Attacker' },

  // --- ARSENAL ---
  'David Raya': { primary: 'GK', raw: 'Goalkeeper' },
  'D. Raya': { primary: 'GK', raw: 'Goalkeeper' },
  Neto: { primary: 'GK', raw: 'Goalkeeper' },
  'A. Ramsdale': { primary: 'GK', raw: 'Goalkeeper' },
  'K. Hein': { primary: 'GK', raw: 'Goalkeeper' },

  'W. Saliba': { primary: 'CB', raw: 'Defender' },
  'William Saliba': { primary: 'CB', raw: 'Defender' },
  'Gabriel Magalhães': { primary: 'CB', raw: 'Defender' },
  Gabriel: { primary: 'CB', raw: 'Defender' },
  'J. Kiwior': { primary: 'CB', secondary: ['LB'], raw: 'Defender' },
  'B. White': { primary: 'RB', secondary: ['CB'], raw: 'Defender' },
  'Ben White': { primary: 'RB', secondary: ['CB'], raw: 'Defender' },
  'J. Timber': { primary: 'RB', secondary: ['LB', 'CB'], raw: 'Defender' },
  'Jurriën Timber': { primary: 'RB', secondary: ['LB', 'CB'], raw: 'Defender' },
  'T. Tomiyasu': { primary: 'RB', secondary: ['LB', 'CB'], raw: 'Defender' },
  'Takehiro Tomiyasu': {
    primary: 'RB',
    secondary: ['LB', 'CB'],
    raw: 'Defender',
  },
  'R. Calafiori': { primary: 'LB', secondary: ['CB'], raw: 'Defender' },
  'Riccardo Calafiori': { primary: 'LB', secondary: ['CB'], raw: 'Defender' },
  'O. Zinchenko': { primary: 'LB', secondary: ['CM'], raw: 'Defender' },
  'Oleksandr Zinchenko': { primary: 'LB', secondary: ['CM'], raw: 'Defender' },
  'K. Tierney': { primary: 'LB', raw: 'Defender' },
  'M. Lewis-Skelly': { primary: 'LB', secondary: ['CDM'], raw: 'Defender' },
  'J. Nichols': { primary: 'RB', raw: 'Defender' },

  'D. Rice': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'Declan Rice': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'T. Partey': { primary: 'CDM', secondary: ['RB'], raw: 'Midfielder' },
  'Thomas Partey': { primary: 'CDM', secondary: ['RB'], raw: 'Midfielder' },
  Jorginho: { primary: 'CDM', raw: 'Midfielder' },
  'M. Merino': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'Mikel Merino': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'M. Ødegaard': { primary: 'CAM', raw: 'Midfielder' },
  'Martin Ødegaard': { primary: 'CAM', raw: 'Midfielder' },
  'E. Nwaneri': { primary: 'CAM', secondary: ['RW'], raw: 'Midfielder' },
  'F. Vieira': { primary: 'CAM', secondary: ['RW'], raw: 'Midfielder' },

  'B. Saka': { primary: 'RW', raw: 'Attacker' },
  'Bukayo Saka': { primary: 'RW', raw: 'Attacker' },
  'G. Martinelli': { primary: 'LW', raw: 'Attacker' },
  'Gabriel Martinelli': { primary: 'LW', raw: 'Attacker' },
  'L. Trossard': { primary: 'LW', secondary: ['CF', 'CAM'], raw: 'Attacker' },
  'Leandro Trossard': {
    primary: 'LW',
    secondary: ['CF', 'CAM'],
    raw: 'Attacker',
  },
  'R. Sterling': { primary: 'LW', secondary: ['RW'], raw: 'Attacker' },
  'Raheem Sterling': { primary: 'LW', secondary: ['RW'], raw: 'Attacker' },
  'K. Havertz': { primary: 'ST', secondary: ['CAM'], raw: 'Attacker' },
  'Kai Havertz': { primary: 'ST', secondary: ['CAM'], raw: 'Attacker' },
  'Gabriel Jesus': { primary: 'ST', secondary: ['RW'], raw: 'Attacker' },
  'E. Nketiah': { primary: 'ST', raw: 'Attacker' },

  // --- MANCHESTER CITY ---
  Ederson: { primary: 'GK', raw: 'Goalkeeper' },
  'S. Ortega': { primary: 'GK', raw: 'Goalkeeper' },
  'S. Carson': { primary: 'GK', raw: 'Goalkeeper' },

  'Rúben Dias': { primary: 'CB', raw: 'Defender' },
  'M. Akanji': { primary: 'CB', secondary: ['RB', 'LB'], raw: 'Defender' },
  'J. Stones': { primary: 'CB', secondary: ['CDM'], raw: 'Defender' },
  'N. Aké': { primary: 'CB', secondary: ['LB'], raw: 'Defender' },
  'K. Walker': { primary: 'RB', raw: 'Defender' },
  'Kyle Walker': { primary: 'RB', raw: 'Defender' },
  'R. Lewis': { primary: 'RB', secondary: ['CDM', 'LB'], raw: 'Defender' },
  'J. Gvardiol': { primary: 'LB', secondary: ['CB'], raw: 'Defender' },
  'Joško Gvardiol': { primary: 'LB', secondary: ['CB'], raw: 'Defender' },

  Rodri: { primary: 'CDM', raw: 'Midfielder' },
  'M. Kovačić': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'Mateo Kovačić': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'İ. Gündoğan': { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  'Ilkay Gündogan': { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  'Matheus Nunes': { primary: 'CM', secondary: ['LW'], raw: 'Midfielder' },
  'K. De Bruyne': { primary: 'CAM', raw: 'Midfielder' },
  'Kevin De Bruyne': { primary: 'CAM', raw: 'Midfielder' },
  'Bernardo Silva': {
    primary: 'CAM',
    secondary: ['RW', 'CM'],
    raw: 'Midfielder',
  },
  'P. Foden': { primary: 'CAM', secondary: ['RW', 'LW'], raw: 'Midfielder' },
  'Phil Foden': { primary: 'CAM', secondary: ['RW', 'LW'], raw: 'Midfielder' },
  'J. McAtee': { primary: 'CAM', raw: 'Midfielder' },

  'J. Grealish': { primary: 'LW', raw: 'Attacker' },
  'J. Doku': { primary: 'LW', secondary: ['RW'], raw: 'Attacker' },
  'Jérémy Doku': { primary: 'LW', secondary: ['RW'], raw: 'Attacker' },
  Savinho: { primary: 'RW', secondary: ['LW'], raw: 'Attacker' },
  'Oscar Bobb': { primary: 'RW', raw: 'Attacker' },
  'E. Haaland': { primary: 'ST', raw: 'Attacker' },
  'Erling Haaland': { primary: 'ST', raw: 'Attacker' },

  // --- LIVERPOOL ---
  Alisson: { primary: 'GK', raw: 'Goalkeeper' },
  'C. Kelleher': { primary: 'GK', raw: 'Goalkeeper' },
  'V. Jaroš': { primary: 'GK', raw: 'Goalkeeper' },

  'V. van Dijk': { primary: 'CB', raw: 'Defender' },
  'Virgil van Dijk': { primary: 'CB', raw: 'Defender' },
  'I. Konaté': { primary: 'CB', raw: 'Defender' },
  'Ibrahima Konaté': { primary: 'CB', raw: 'Defender' },
  'J. Quansah': { primary: 'CB', raw: 'Defender' },
  'J. Gomez': { primary: 'CB', secondary: ['RB', 'LB'], raw: 'Defender' },
  'T. Alexander-Arnold': { primary: 'RB', secondary: ['CM'], raw: 'Defender' },
  'Trent Alexander-Arnold': {
    primary: 'RB',
    secondary: ['CM'],
    raw: 'Defender',
  },
  'C. Bradley': { primary: 'RB', raw: 'Defender' },
  'A. Robertson': { primary: 'LB', raw: 'Defender' },
  'Andy Robertson': { primary: 'LB', raw: 'Defender' },
  'K. Tsimikas': { primary: 'LB', raw: 'Defender' },

  'R. Gravenberch': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'Ryan Gravenberch': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'W. Endo': { primary: 'CDM', raw: 'Midfielder' },
  'A. Mac Allister': {
    primary: 'CM',
    secondary: ['CDM', 'CAM'],
    raw: 'Midfielder',
  },
  'Alexis Mac Allister': {
    primary: 'CM',
    secondary: ['CDM', 'CAM'],
    raw: 'Midfielder',
  },
  'C. Jones': { primary: 'CM', raw: 'Midfielder' },
  'H. Elliott': { primary: 'CAM', secondary: ['RW'], raw: 'Midfielder' },
  'D. Szoboszlai': { primary: 'CAM', secondary: ['CM'], raw: 'Midfielder' },
  'Dominik Szoboszlai': {
    primary: 'CAM',
    secondary: ['CM'],
    raw: 'Midfielder',
  },

  'M. Salah': { primary: 'RW', raw: 'Attacker' },
  'Mohamed Salah': { primary: 'RW', raw: 'Attacker' },
  'F. Chiesa': { primary: 'RW', secondary: ['LW'], raw: 'Attacker' },
  'L. Díaz': { primary: 'LW', raw: 'Attacker' },
  'Luis Díaz': { primary: 'LW', raw: 'Attacker' },
  'C. Gakpo': { primary: 'LW', secondary: ['ST'], raw: 'Attacker' },
  'Cody Gakpo': { primary: 'LW', secondary: ['ST'], raw: 'Attacker' },
  'D. Núñez': { primary: 'ST', raw: 'Attacker' },
  'Darwin Núñez': { primary: 'ST', raw: 'Attacker' },
  'Diogo Jota': { primary: 'ST', secondary: ['LW'], raw: 'Attacker' },

  // --- CHELSEA ---
  'Robert Sánchez': { primary: 'GK', raw: 'Goalkeeper' },
  'F. Jörgensen': { primary: 'GK', raw: 'Goalkeeper' },
  'M. Bettinelli': { primary: 'GK', raw: 'Goalkeeper' },

  'L. Colwill': { primary: 'CB', secondary: ['LB'], raw: 'Defender' },
  'W. Fofana': { primary: 'CB', raw: 'Defender' },
  'A. Disasi': { primary: 'CB', secondary: ['RB'], raw: 'Defender' },
  'B. Badiashile': { primary: 'CB', raw: 'Defender' },
  'T. Adarabioyo': { primary: 'CB', raw: 'Defender' },
  'R. James': { primary: 'RB', raw: 'Defender' },
  'Reece James': { primary: 'RB', raw: 'Defender' },
  'M. Gusto': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'Malo Gusto': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'M. Cucurella': { primary: 'LB', raw: 'Defender' },
  'Marc Cucurella': { primary: 'LB', raw: 'Defender' },
  'R. Veiga': { primary: 'LB', secondary: ['CDM', 'CB'], raw: 'Defender' },
  'B. Chilwell': { primary: 'LB', raw: 'Defender' },

  'M. Caicedo': { primary: 'CDM', secondary: ['RB'], raw: 'Midfielder' },
  'Moisés Caicedo': { primary: 'CDM', secondary: ['RB'], raw: 'Midfielder' },
  'R. Lavia': { primary: 'CDM', raw: 'Midfielder' },
  'Enzo Fernández': { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  'K. Dewsbury-Hall': { primary: 'CM', raw: 'Midfielder' },
  'C. Chukwuemeka': { primary: 'CAM', raw: 'Midfielder' },
  'C. Palmer': { primary: 'CAM', secondary: ['RW'], raw: 'Midfielder' },
  'Cole Palmer': { primary: 'CAM', secondary: ['RW'], raw: 'Midfielder' },

  'P. Neto': { primary: 'RW', secondary: ['LW'], raw: 'Attacker' },
  'Pedro Neto': { primary: 'RW', secondary: ['LW'], raw: 'Attacker' },
  'N. Madueke': { primary: 'RW', raw: 'Attacker' },
  'Noni Madueke': { primary: 'RW', raw: 'Attacker' },
  'M. Mudryk': { primary: 'LW', raw: 'Attacker' },
  'J. Félix': { primary: 'CF', secondary: ['LW', 'CAM'], raw: 'Attacker' },
  'João Félix': { primary: 'CF', secondary: ['LW', 'CAM'], raw: 'Attacker' },
  'C. Nkunku': { primary: 'CF', secondary: ['CAM', 'LW'], raw: 'Attacker' },
  'N. Jackson': { primary: 'ST', raw: 'Attacker' },
  'Nicolas Jackson': { primary: 'ST', raw: 'Attacker' },
  'M. Guiu': { primary: 'ST', raw: 'Attacker' },

  // --- TOTTENHAM ---
  'G. Vicario': { primary: 'GK', raw: 'Goalkeeper' },
  'Guglielmo Vicario': { primary: 'GK', raw: 'Goalkeeper' },
  'F. Forster': { primary: 'GK', raw: 'Goalkeeper' },
  'A. Whiteman': { primary: 'GK', raw: 'Goalkeeper' },
  'C. Romero': { primary: 'CB', raw: 'Defender' },
  'Cristian Romero': { primary: 'CB', raw: 'Defender' },
  'M. van de Ven': { primary: 'CB', secondary: ['LB'], raw: 'Defender' },
  'Micky van de Ven': { primary: 'CB', secondary: ['LB'], raw: 'Defender' },
  'R. Drăgușin': { primary: 'CB', raw: 'Defender' },
  'B. Davies': { primary: 'CB', secondary: ['LB'], raw: 'Defender' },
  'P. Porro': { primary: 'RB', raw: 'Defender' },
  'Pedro Porro': { primary: 'RB', raw: 'Defender' },
  'D. Spence': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'D. Udogie': { primary: 'LB', raw: 'Defender' },
  'Destiny Udogie': { primary: 'LB', raw: 'Defender' },
  'S. Reguilón': { primary: 'LB', raw: 'Defender' },

  'Y. Bissouma': { primary: 'CDM', raw: 'Midfielder' },
  'P. Sarr': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'R. Bentancur': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'A. Gray': { primary: 'CM', secondary: ['RB', 'CB'], raw: 'Midfielder' },
  'L. Bergvall': { primary: 'CAM', secondary: ['CM'], raw: 'Midfielder' },
  'J. Maddison': { primary: 'CAM', raw: 'Midfielder' },
  'James Maddison': { primary: 'CAM', raw: 'Midfielder' },

  'Son Heung-Min': { primary: 'LW', secondary: ['ST'], raw: 'Attacker' },
  'Heung-min Son': { primary: 'LW', secondary: ['ST'], raw: 'Attacker' },
  'T. Werner': { primary: 'LW', raw: 'Attacker' },
  'W. Odobert': { primary: 'LW', secondary: ['RW'], raw: 'Attacker' },
  'B. Johnson': { primary: 'RW', raw: 'Attacker' },
  'Brennan Johnson': { primary: 'RW', raw: 'Attacker' },
  'D. Kulusevski': { primary: 'RW', secondary: ['CAM'], raw: 'Attacker' },
  'Dejan Kulusevski': { primary: 'RW', secondary: ['CAM'], raw: 'Attacker' },
  'D. Solanke': { primary: 'ST', raw: 'Attacker' },
  'Dominic Solanke': { primary: 'ST', raw: 'Attacker' },
  Richarlison: { primary: 'ST', secondary: ['LW'], raw: 'Attacker' },

  // --- ASTON VILLA ---
  'E. Martínez': { primary: 'GK', raw: 'Goalkeeper' },
  'Emiliano Martínez': { primary: 'GK', raw: 'Goalkeeper' },
  'R. Olsen': { primary: 'GK', raw: 'Goalkeeper' },
  'J. Gauci': { primary: 'GK', raw: 'Goalkeeper' },

  'E. Konsa': { primary: 'CB', secondary: ['RB'], raw: 'Defender' },
  'Ezri Konsa': { primary: 'CB', secondary: ['RB'], raw: 'Defender' },
  'Pau Torres': { primary: 'CB', raw: 'Defender' },
  'Diego Carlos': { primary: 'CB', raw: 'Defender' },
  'T. Mings': { primary: 'CB', raw: 'Defender' },
  'M. Cash': { primary: 'RB', raw: 'Defender' },
  'Matty Cash': { primary: 'RB', raw: 'Defender' },
  'K. Nedeljković': { primary: 'RB', raw: 'Defender' },
  'L. Digne': { primary: 'LB', raw: 'Defender' },
  'Lucas Digne': { primary: 'LB', raw: 'Defender' },
  'I. Maatsen': { primary: 'LB', secondary: ['LWB'], raw: 'Defender' },
  'Ian Maatsen': { primary: 'LB', secondary: ['LWB'], raw: 'Defender' },

  'B. Kamara': { primary: 'CDM', raw: 'Midfielder' },
  'Amadou Onana': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'Y. Tielemans': { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  'Youri Tielemans': { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  'J. McGinn': { primary: 'CM', secondary: ['LM', 'CAM'], raw: 'Midfielder' },
  'John McGinn': { primary: 'CM', secondary: ['LM', 'CAM'], raw: 'Midfielder' },
  'R. Barkley': { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  'E. Buendía': { primary: 'CAM', secondary: ['RW'], raw: 'Midfielder' },
  'J. Ramsey': { primary: 'LM', secondary: ['LW', 'CM'], raw: 'Midfielder' },
  'M. Rogers': { primary: 'CAM', secondary: ['LW', 'ST'], raw: 'Midfielder' },
  'Morgan Rogers': {
    primary: 'CAM',
    secondary: ['LW', 'ST'],
    raw: 'Midfielder',
  },

  'L. Bailey': { primary: 'RW', raw: 'Attacker' },
  'Leon Bailey': { primary: 'RW', raw: 'Attacker' },
  'J. Philogene': { primary: 'LW', secondary: ['RW'], raw: 'Attacker' },
  'O. Watkins': { primary: 'ST', raw: 'Attacker' },
  'Ollie Watkins': { primary: 'ST', raw: 'Attacker' },
  'J. Durán': { primary: 'ST', raw: 'Attacker' },
  'Jhon Durán': { primary: 'ST', raw: 'Attacker' },

  // --- FULHAM ---
  'B. Leno': { primary: 'GK', raw: 'Goalkeeper' },
  'Bernd Leno': { primary: 'GK', raw: 'Goalkeeper' },
  'S. Benda': { primary: 'GK', raw: 'Goalkeeper' },
  'C. Bassey': { primary: 'CB', secondary: ['LB'], raw: 'Defender' },
  'Calvin Bassey': { primary: 'CB', secondary: ['LB'], raw: 'Defender' },
  'J. Andersen': { primary: 'CB', raw: 'Defender' },
  'Joachim Andersen': { primary: 'CB', raw: 'Defender' },
  'Issa Diop': { primary: 'CB', raw: 'Defender' },
  'Jorge Cuenca': { primary: 'CB', secondary: ['LB'], raw: 'Defender' },
  'K. Tete': { primary: 'RB', raw: 'Defender' },
  'Kenny Tete': { primary: 'RB', raw: 'Defender' },
  'Timothy Castagne': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'T. Castagne': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'A. Robinson': { primary: 'LB', raw: 'Defender' },
  'Antonee Robinson': { primary: 'LB', raw: 'Defender' },

  'S. Lukić': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'Saša Lukić': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'Sander Berge': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'H. Reed': { primary: 'CDM', raw: 'Midfielder' },
  'Andreas Pereira': { primary: 'CAM', secondary: ['CM'], raw: 'Midfielder' },
  'E. Smith Rowe': { primary: 'CAM', secondary: ['LW'], raw: 'Midfielder' },
  'Emile Smith Rowe': { primary: 'CAM', secondary: ['LW'], raw: 'Midfielder' },
  'Tom Cairney': { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },

  'A. Iwobi': { primary: 'LW', secondary: ['RW', 'CAM'], raw: 'Attacker' },
  'Alex Iwobi': { primary: 'LW', secondary: ['RW', 'CAM'], raw: 'Attacker' },
  'Adama Traoré': { primary: 'RW', raw: 'Attacker' },
  'H. Wilson': { primary: 'RW', secondary: ['CAM'], raw: 'Attacker' },
  'Harry Wilson': { primary: 'RW', secondary: ['CAM'], raw: 'Attacker' },
  'R. Muniz': { primary: 'ST', raw: 'Attacker' },
  'Rodrigo Muniz': { primary: 'ST', raw: 'Attacker' },
  'Raúl Jiménez': { primary: 'ST', raw: 'Attacker' },
  'R. Jiménez': { primary: 'ST', raw: 'Attacker' },
  'Carlos Vinícius': { primary: 'ST', raw: 'Attacker' },

  // --- NEWCASTLE ---
  'N. Pope': { primary: 'GK', raw: 'Goalkeeper' },
  'Nick Pope': { primary: 'GK', raw: 'Goalkeeper' },
  'M. Dúbravka': { primary: 'GK', raw: 'Goalkeeper' },
  'O. Vlachodimos': { primary: 'GK', raw: 'Goalkeeper' },
  'J. Ruddy': { primary: 'GK', raw: 'Goalkeeper' },
  'F. Schär': { primary: 'CB', raw: 'Defender' },
  'Fabian Schär': { primary: 'CB', raw: 'Defender' },
  'S. Botman': { primary: 'CB', raw: 'Defender' },
  'D. Burn': { primary: 'CB', secondary: ['LB'], raw: 'Defender' },
  'Dan Burn': { primary: 'CB', secondary: ['LB'], raw: 'Defender' },
  'J. Lascelles': { primary: 'CB', raw: 'Defender' },
  'E. Krafth': { primary: 'RB', secondary: ['CB'], raw: 'Defender' },
  'K. Trippier': { primary: 'RB', raw: 'Defender' },
  'Kieran Trippier': { primary: 'RB', raw: 'Defender' },
  'T. Livramento': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'Tino Livramento': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'L. Hall': { primary: 'LB', raw: 'Defender' },
  'Lewis Hall': { primary: 'LB', raw: 'Defender' },
  'M. Targett': { primary: 'LB', raw: 'Defender' },

  'Bruno Guimarães': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'S. Tonali': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'Sandro Tonali': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  Joelinton: { primary: 'CM', secondary: ['LW'], raw: 'Midfielder' },
  'S. Longstaff': { primary: 'CM', raw: 'Midfielder' },
  'J. Willock': { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  'L. Miley': { primary: 'CM', raw: 'Midfielder' },

  'A. Gordon': { primary: 'LW', secondary: ['RW', 'ST'], raw: 'Attacker' },
  'Anthony Gordon': { primary: 'LW', secondary: ['RW', 'ST'], raw: 'Attacker' },
  'H. Barnes': { primary: 'LW', raw: 'Attacker' },
  'Harvey Barnes': { primary: 'LW', raw: 'Attacker' },
  'M. Almirón': { primary: 'RW', raw: 'Attacker' },
  'J. Murphy': { primary: 'RW', raw: 'Attacker' },
  'Jacob Murphy': { primary: 'RW', raw: 'Attacker' },
  'A. Isak': { primary: 'ST', secondary: ['LW'], raw: 'Attacker' },
  'Alexander Isak': { primary: 'ST', secondary: ['LW'], raw: 'Attacker' },
  'C. Wilson': { primary: 'ST', raw: 'Attacker' },
  'Callum Wilson': { primary: 'ST', raw: 'Attacker' },
  'W. Osula': { primary: 'ST', raw: 'Attacker' },

  // --- CRYSTAL PALACE ---
  'D. Henderson': { primary: 'GK', raw: 'Goalkeeper' },
  'Dean Henderson': { primary: 'GK', raw: 'Goalkeeper' },
  'S. Johnstone': { primary: 'GK', raw: 'Goalkeeper' },
  'M. Guéhi': { primary: 'CB', raw: 'Defender' },
  'Marc Guéhi': { primary: 'CB', raw: 'Defender' },
  'M. Lacroix': { primary: 'CB', raw: 'Defender' },
  'C. Richards': { primary: 'CB', secondary: ['RB'], raw: 'Defender' },
  'C. Riad': { primary: 'CB', raw: 'Defender' },
  'R. Holding': { primary: 'CB', raw: 'Defender' },
  'D. Muñoz': { primary: 'RB', secondary: ['RWB'], raw: 'Defender' },
  'Daniel Muñoz': { primary: 'RB', secondary: ['RWB'], raw: 'Defender' },
  'N. Clyne': { primary: 'RB', raw: 'Defender' },
  'T. Mitchell': { primary: 'LB', secondary: ['LWB'], raw: 'Defender' },
  'Tyrick Mitchell': { primary: 'LB', secondary: ['LWB'], raw: 'Defender' },
  'A. Wharton': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'Adam Wharton': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'C. Doucouré': { primary: 'CDM', raw: 'Midfielder' },
  'W. Hughes': { primary: 'CM', raw: 'Midfielder' },
  'J. Lerma': { primary: 'CM', secondary: ['CB', 'CDM'], raw: 'Midfielder' },
  'D. Kamada': { primary: 'CAM', secondary: ['CM'], raw: 'Midfielder' },
  'Daichi Kamada': { primary: 'CAM', secondary: ['CM'], raw: 'Midfielder' },
  'E. Eze': { primary: 'CAM', secondary: ['LW'], raw: 'Midfielder' },
  'Eberechi Eze': { primary: 'CAM', secondary: ['LW'], raw: 'Midfielder' },
  'I. Sarr': { primary: 'RW', secondary: ['ST'], raw: 'Attacker' },
  'Ismaïla Sarr': { primary: 'RW', secondary: ['ST'], raw: 'Attacker' },
  'J. Mateta': { primary: 'ST', raw: 'Attacker' },
  'Jean-Philippe Mateta': { primary: 'ST', raw: 'Attacker' },
  'Eddie Nketiah': { primary: 'ST', raw: 'Attacker' },

  // --- EVERTON ---
  'J. Pickford': { primary: 'GK', raw: 'Goalkeeper' },
  'Jordan Pickford': { primary: 'GK', raw: 'Goalkeeper' },
  'João Virgínia': { primary: 'GK', raw: 'Goalkeeper' },
  'J. Tarkowski': { primary: 'CB', raw: 'Defender' },
  'James Tarkowski': { primary: 'CB', raw: 'Defender' },
  'J. Branthwaite': { primary: 'CB', raw: 'Defender' },
  'Jarrad Branthwaite': { primary: 'CB', raw: 'Defender' },
  'M. Keane': { primary: 'CB', raw: 'Defender' },
  "J. O'Brien": { primary: 'CB', raw: 'Defender' },
  'V. Mykolenko': { primary: 'LB', raw: 'Defender' },
  'Vitaliy Mykolenko': { primary: 'LB', raw: 'Defender' },
  'A. Young': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'Ashley Young': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'S. Coleman': { primary: 'RB', raw: 'Defender' },
  'N. Patterson': { primary: 'RB', raw: 'Defender' },
  'I. Gueye': { primary: 'CDM', raw: 'Midfielder' },
  'Idrissa Gueye': { primary: 'CDM', raw: 'Midfielder' },
  'J. Garner': { primary: 'CM', secondary: ['RB', 'CDM'], raw: 'Midfielder' },
  'James Garner': {
    primary: 'CM',
    secondary: ['RB', 'CDM'],
    raw: 'Midfielder',
  },
  'T. Iroegbunam': { primary: 'CM', raw: 'Midfielder' },
  'A. Doucouré': { primary: 'CAM', secondary: ['CM'], raw: 'Midfielder' },
  'Abdoulaye Doucouré': {
    primary: 'CAM',
    secondary: ['CM'],
    raw: 'Midfielder',
  },
  'D. McNeil': { primary: 'LW', secondary: ['CAM'], raw: 'Attacker' },
  'Dwight McNeil': { primary: 'LW', secondary: ['CAM'], raw: 'Attacker' },
  'J. Harrison': { primary: 'RW', secondary: ['LW'], raw: 'Attacker' },
  'Jack Harrison': { primary: 'RW', secondary: ['LW'], raw: 'Attacker' },
  'J. Lindstrøm': { primary: 'RW', secondary: ['CAM'], raw: 'Attacker' },
  'I. Ndiaye': { primary: 'LW', secondary: ['ST'], raw: 'Attacker' },
  'Iliman Ndiaye': { primary: 'LW', secondary: ['ST'], raw: 'Attacker' },
  'D. Calvert-Lewin': { primary: 'ST', raw: 'Attacker' },
  'Dominic Calvert-Lewin': { primary: 'ST', raw: 'Attacker' },
  Beto: { primary: 'ST', raw: 'Attacker' },
  'Y. Chermiti': { primary: 'ST', raw: 'Attacker' },

  // --- WEST HAM ---
  'A. Aréola': { primary: 'GK', raw: 'Goalkeeper' },
  'Alphonse Areola': { primary: 'GK', raw: 'Goalkeeper' },
  'Ł. Fabiański': { primary: 'GK', raw: 'Goalkeeper' },
  'M. Kilman': { primary: 'CB', raw: 'Defender' },
  'Max Kilman': { primary: 'CB', raw: 'Defender' },
  'J. Todibo': { primary: 'CB', raw: 'Defender' },
  'Jean-Clair Todibo': { primary: 'CB', raw: 'Defender' },
  'K. Mavropanos': { primary: 'CB', raw: 'Defender' },
  'A. Wan-Bissaka': { primary: 'RB', raw: 'Defender' },
  'Aaron Wan-Bissaka': { primary: 'RB', raw: 'Defender' },
  'V. Coufal': { primary: 'RB', raw: 'Defender' },
  'Vladimír Coufal': { primary: 'RB', raw: 'Defender' },
  Emerson: { primary: 'LB', raw: 'Defender' },
  'Emerson Palmieri': { primary: 'LB', raw: 'Defender' },
  'A. Cresswell': { primary: 'LB', raw: 'Defender' },
  'G. Rodríguez': { primary: 'CDM', raw: 'Midfielder' },
  'Guido Rodríguez': { primary: 'CDM', raw: 'Midfielder' },
  'E. Álvarez': { primary: 'CDM', secondary: ['CB'], raw: 'Midfielder' },
  'Edson Álvarez': { primary: 'CDM', secondary: ['CB'], raw: 'Midfielder' },
  'T. Souček': { primary: 'CM', raw: 'Midfielder' },
  'Tomáš Souček': { primary: 'CM', raw: 'Midfielder' },
  'J. Ward-Prowse': { primary: 'CM', raw: 'Midfielder' },
  'C. Soler': { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  'Carlos Soler': { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  'Lucas Paquetá': { primary: 'CAM', secondary: ['CM'], raw: 'Midfielder' },
  'M. Kudus': { primary: 'RW', secondary: ['CAM'], raw: 'Attacker' },
  'Mohammed Kudus': { primary: 'RW', secondary: ['CAM'], raw: 'Attacker' },
  'J. Bowen': { primary: 'RW', secondary: ['ST'], raw: 'Attacker' },
  'Jarrod Bowen': { primary: 'RW', secondary: ['ST'], raw: 'Attacker' },
  'C. Summerville': { primary: 'LW', raw: 'Attacker' },
  'Crysencio Summerville': { primary: 'LW', raw: 'Attacker' },
  'M. Antonio': { primary: 'ST', raw: 'Attacker' },
  'Michail Antonio': { primary: 'ST', raw: 'Attacker' },
  'N. Füllkrug': { primary: 'ST', raw: 'Attacker' },
  'Niclas Füllkrug': { primary: 'ST', raw: 'Attacker' },
  'D. Ings': { primary: 'ST', raw: 'Attacker' },

  // --- BRIGHTON ---
  'B. Verbruggen': { primary: 'GK', raw: 'Goalkeeper' },
  'Bart Verbruggen': { primary: 'GK', raw: 'Goalkeeper' },
  'J. Steele': { primary: 'GK', raw: 'Goalkeeper' },
  'L. Dunk': { primary: 'CB', raw: 'Defender' },
  'Lewis Dunk': { primary: 'CB', raw: 'Defender' },
  'J. van Hecke': { primary: 'CB', raw: 'Defender' },
  'Jan Paul van Hecke': { primary: 'CB', raw: 'Defender' },
  'Igor Julio': { primary: 'CB', secondary: ['LB'], raw: 'Defender' },
  'A. Webster': { primary: 'CB', raw: 'Defender' },
  'J. Veltman': { primary: 'RB', secondary: ['CB'], raw: 'Defender' },
  'Joël Veltman': { primary: 'RB', secondary: ['CB'], raw: 'Defender' },
  'T. Lamptey': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'P. Estupiñán': { primary: 'LB', raw: 'Defender' },
  'Pervis Estupiñán': { primary: 'LB', raw: 'Defender' },
  'F. Kadıoğlu': { primary: 'LB', secondary: ['RB'], raw: 'Defender' },
  'Ferdi Kadioglu': { primary: 'LB', secondary: ['RB'], raw: 'Defender' },
  'C. Baleba': { primary: 'CDM', raw: 'Midfielder' },
  'Carlos Baleba': { primary: 'CDM', raw: 'Midfielder' },
  'M. Wieffer': { primary: 'CDM', raw: 'Midfielder' },
  'Mats Wieffer': { primary: 'CDM', raw: 'Midfielder' },
  'Y. Ayari': { primary: 'CM', raw: 'Midfielder' },
  'B. Gilmour': { primary: 'CM', raw: 'Midfielder' },
  "M. O'Riley": { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  "Matt O'Riley": { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  'J. Enciso': { primary: 'CAM', secondary: ['LW'], raw: 'Midfielder' },
  'Julio Enciso': { primary: 'CAM', secondary: ['LW'], raw: 'Midfielder' },
  'K. Mitoma': { primary: 'LW', raw: 'Attacker' },
  'Kaoru Mitoma': { primary: 'LW', raw: 'Attacker' },
  'S. Adingra': { primary: 'RW', secondary: ['LW'], raw: 'Attacker' },
  'Simon Adingra': { primary: 'RW', secondary: ['LW'], raw: 'Attacker' },
  'Y. Minteh': { primary: 'RW', raw: 'Attacker' },
  'Yankuba Minteh': { primary: 'RW', raw: 'Attacker' },
  'S. March': { primary: 'RW', raw: 'Attacker' },
  'B. Gruda': { primary: 'RW', raw: 'Attacker' },
  'João Pedro': { primary: 'ST', secondary: ['CAM'], raw: 'Attacker' },
  'D. Welbeck': { primary: 'ST', raw: 'Attacker' },
  'Danny Welbeck': { primary: 'ST', raw: 'Attacker' },
  'E. Ferguson': { primary: 'ST', raw: 'Attacker' },
  'Evan Ferguson': { primary: 'ST', raw: 'Attacker' },
  'G. Rutter': { primary: 'ST', secondary: ['CAM'], raw: 'Attacker' },
  'Georginio Rutter': { primary: 'ST', secondary: ['CAM'], raw: 'Attacker' },

  // --- BRENTFORD ---
  'M. Flekken': { primary: 'GK', raw: 'Goalkeeper' },
  'Mark Flekken': { primary: 'GK', raw: 'Goalkeeper' },
  'H. Valdimarsson': { primary: 'GK', raw: 'Goalkeeper' },
  'E. Pinnock': { primary: 'CB', raw: 'Defender' },
  'Ethan Pinnock': { primary: 'CB', raw: 'Defender' },
  'N. Collins': { primary: 'CB', raw: 'Defender' },
  'Nathan Collins': { primary: 'CB', raw: 'Defender' },
  'B. Mee': { primary: 'CB', raw: 'Defender' },
  'S. van den Berg': { primary: 'CB', secondary: ['RB'], raw: 'Defender' },
  'Sepp van den Berg': { primary: 'CB', secondary: ['RB'], raw: 'Defender' },
  'M. Roerslev': { primary: 'RB', raw: 'Defender' },
  'A. Hickey': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'R. Henry': { primary: 'LB', raw: 'Defender' },
  'K. Ajer': { primary: 'RB', secondary: ['CB'], raw: 'Defender' },
  'Kristoffer Ajer': { primary: 'RB', secondary: ['CB'], raw: 'Defender' },
  'C. Nørgaard': { primary: 'CDM', raw: 'Midfielder' },
  'Christian Nørgaard': { primary: 'CDM', raw: 'Midfielder' },
  'V. Janelt': { primary: 'CDM', secondary: ['CM', 'LB'], raw: 'Midfielder' },
  'Vitaly Janelt': {
    primary: 'CDM',
    secondary: ['CM', 'LB'],
    raw: 'Midfielder',
  },
  'M. Jensen': { primary: 'CM', raw: 'Midfielder' },
  'Mathias Jensen': { primary: 'CM', raw: 'Midfielder' },
  'M. Damsgaard': {
    primary: 'CAM',
    secondary: ['CM', 'LW'],
    raw: 'Midfielder',
  },
  'Mikkel Damsgaard': {
    primary: 'CAM',
    secondary: ['CM', 'LW'],
    raw: 'Midfielder',
  },
  'F. Carvalho': { primary: 'CAM', secondary: ['LW'], raw: 'Midfielder' },
  'Fábio Carvalho': { primary: 'CAM', secondary: ['LW'], raw: 'Midfielder' },
  'B. Mbeumo': { primary: 'RW', secondary: ['ST'], raw: 'Attacker' },
  'Bryan Mbeumo': { primary: 'RW', secondary: ['ST'], raw: 'Attacker' },
  'K. Schade': { primary: 'LW', secondary: ['ST'], raw: 'Attacker' },
  'K. Lewis-Potter': { primary: 'LW', secondary: ['LWB'], raw: 'Attacker' },
  'Y. Wissa': { primary: 'ST', secondary: ['LW'], raw: 'Attacker' },
  'Yoane Wissa': { primary: 'ST', secondary: ['LW'], raw: 'Attacker' },
  'Igor Thiago': { primary: 'ST', raw: 'Attacker' },

  // --- WOLVES ---
  'José Sá': { primary: 'GK', raw: 'Goalkeeper' },
  'D. Bentley': { primary: 'GK', raw: 'Goalkeeper' },
  'Toti Gomes': { primary: 'CB', secondary: ['LB'], raw: 'Defender' },
  'S. Bueno': { primary: 'CB', raw: 'Defender' },
  'Y. Mosquera': { primary: 'CB', raw: 'Defender' },
  'C. Dawson': { primary: 'CB', raw: 'Defender' },
  'N. Semedo': { primary: 'RB', secondary: ['RWB'], raw: 'Defender' },
  'Nélson Semedo': { primary: 'RB', secondary: ['RWB'], raw: 'Defender' },
  'M. Doherty': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'R. Aït-Nouri': { primary: 'LB', secondary: ['LWB', 'LM'], raw: 'Defender' },
  'Rayan Aït-Nouri': {
    primary: 'LB',
    secondary: ['LWB', 'LM'],
    raw: 'Defender',
  },
  'M. Lemina': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'Mario Lemina': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'João Gomes': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'A. Gomes': { primary: 'CM', raw: 'Midfielder' },
  'T. Doyle': { primary: 'CM', raw: 'Midfielder' },
  'J. Bellegarde': { primary: 'CAM', secondary: ['CM'], raw: 'Midfielder' },
  'P. Sarabia': { primary: 'RW', secondary: ['CAM'], raw: 'Attacker' },
  'Pablo Sarabia': { primary: 'RW', secondary: ['CAM'], raw: 'Attacker' },
  'Gonçalo Guedes': { primary: 'LW', secondary: ['ST'], raw: 'Attacker' },
  'Carlos Forbs': { primary: 'RW', secondary: ['LW'], raw: 'Attacker' },
  'Hee-Chan Hwang': { primary: 'ST', secondary: ['LW'], raw: 'Attacker' },
  'Hwang Hee-chan': { primary: 'ST', secondary: ['LW'], raw: 'Attacker' },
  'J. Strand Larsen': { primary: 'ST', raw: 'Attacker' },
  'Jørgen Strand Larsen': { primary: 'ST', raw: 'Attacker' },

  // --- BOURNEMOUTH ---
  Kepa: { primary: 'GK', raw: 'Goalkeeper' },
  'Kepa Arrizabalaga': { primary: 'GK', raw: 'Goalkeeper' },
  'M. Travers': { primary: 'GK', raw: 'Goalkeeper' },
  'I. Zabarnyi': { primary: 'CB', raw: 'Defender' },
  'Illia Zabarnyi': { primary: 'CB', raw: 'Defender' },
  'M. Senesi': { primary: 'CB', raw: 'Defender' },
  'Marcos Senesi': { primary: 'CB', raw: 'Defender' },
  'D. Huijsen': { primary: 'CB', raw: 'Defender' },
  'Dean Huijsen': { primary: 'CB', raw: 'Defender' },
  'J. Araujo': { primary: 'RB', raw: 'Defender' },
  'A. Smith': { primary: 'RB', raw: 'Defender' },
  'M. Kerkez': { primary: 'LB', raw: 'Defender' },
  'Milos Kerkez': { primary: 'LB', raw: 'Defender' },
  'T. Adams': { primary: 'CDM', raw: 'Midfielder' },
  'Tyler Adams': { primary: 'CDM', raw: 'Midfielder' },
  'L. Cook': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'Lewis Cook': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'R. Christie': { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  'Ryan Christie': { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  'A. Scott': { primary: 'CAM', secondary: ['CM'], raw: 'Midfielder' },
  'M. Tavernier': {
    primary: 'LW',
    secondary: ['CAM', 'RW'],
    raw: 'Midfielder',
  },
  'J. Kluivert': { primary: 'CAM', secondary: ['LW'], raw: 'Attacker' },
  'Justin Kluivert': { primary: 'CAM', secondary: ['LW'], raw: 'Attacker' },
  'A. Semenyo': { primary: 'RW', secondary: ['ST'], raw: 'Attacker' },
  'Antoine Semenyo': { primary: 'RW', secondary: ['ST'], raw: 'Attacker' },
  'L. Sinisterra': { primary: 'LW', raw: 'Attacker' },
  'D. Ouattara': { primary: 'RW', secondary: ['LB'], raw: 'Attacker' },
  Evanilson: { primary: 'ST', raw: 'Attacker' },
  'E. Ünal': { primary: 'ST', raw: 'Attacker' },
  'Enes Ünal': { primary: 'ST', raw: 'Attacker' },

  // --- NOTTINGHAM FOREST ---
  'M. Sels': { primary: 'GK', raw: 'Goalkeeper' },
  'Matz Sels': { primary: 'GK', raw: 'Goalkeeper' },
  'Carlos Miguel': { primary: 'GK', raw: 'Goalkeeper' },
  Murillo: { primary: 'CB', raw: 'Defender' },
  'N. Milenković': { primary: 'CB', raw: 'Defender' },
  'Nikola Milenković': { primary: 'CB', raw: 'Defender' },
  'W. Boly': { primary: 'CB', raw: 'Defender' },
  Morato: { primary: 'CB', raw: 'Defender' },
  'N. Williams': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'Neco Williams': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'O. Aina': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'Ola Aina': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'Alex Moreno': { primary: 'LB', raw: 'Defender' },
  'Álex Moreno': { primary: 'LB', raw: 'Defender' },
  'I. Sangaré': { primary: 'CDM', raw: 'Midfielder' },
  'Ibrahim Sangaré': { primary: 'CDM', raw: 'Midfielder' },
  Danilo: { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'R. Yates': { primary: 'CM', raw: 'Midfielder' },
  'Ryan Yates': { primary: 'CM', raw: 'Midfielder' },
  'E. Anderson': { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  'Elliot Anderson': { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  'N. Domínguez': { primary: 'CM', raw: 'Midfielder' },
  'M. Gibbs-White': { primary: 'CAM', secondary: ['RW'], raw: 'Midfielder' },
  'Morgan Gibbs-White': {
    primary: 'CAM',
    secondary: ['RW'],
    raw: 'Midfielder',
  },
  'C. Hudson-Odoi': { primary: 'LW', raw: 'Attacker' },
  'Callum Hudson-Odoi': { primary: 'LW', raw: 'Attacker' },
  'A. Elanga': { primary: 'RW', secondary: ['LW'], raw: 'Attacker' },
  'Anthony Elanga': { primary: 'RW', secondary: ['LW'], raw: 'Attacker' },
  'R. Sosa': { primary: 'RW', raw: 'Attacker' },
  'C. Wood': { primary: 'ST', raw: 'Attacker' },
  'Chris Wood': { primary: 'ST', raw: 'Attacker' },
  'T. Awoniyi': { primary: 'ST', raw: 'Attacker' },
  'Taiwo Awoniyi': { primary: 'ST', raw: 'Attacker' },

  // --- LEICESTER CITY ---
  'M. Hermansen': { primary: 'GK', raw: 'Goalkeeper' },
  'Mads Hermansen': { primary: 'GK', raw: 'Goalkeeper' },
  'D. Ward': { primary: 'GK', raw: 'Goalkeeper' },
  'W. Faes': { primary: 'CB', raw: 'Defender' },
  'Wout Faes': { primary: 'CB', raw: 'Defender' },
  'J. Vestergaard': { primary: 'CB', raw: 'Defender' },
  'Jannik Vestergaard': { primary: 'CB', raw: 'Defender' },
  'C. Okoli': { primary: 'CB', raw: 'Defender' },
  'Caleb Okoli': { primary: 'CB', raw: 'Defender' },
  'C. Coady': { primary: 'CB', raw: 'Defender' },
  'J. Justin': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'James Justin': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'Ricardo Pereira': { primary: 'RB', secondary: ['CDM'], raw: 'Defender' },
  'V. Kristiansen': { primary: 'LB', raw: 'Defender' },
  'Victor Kristiansen': { primary: 'LB', raw: 'Defender' },
  'W. Ndidi': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'Wilfred Ndidi': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'O. Skipp': { primary: 'CDM', raw: 'Midfielder' },
  'Oliver Skipp': { primary: 'CDM', raw: 'Midfielder' },
  'H. Winks': { primary: 'CM', raw: 'Midfielder' },
  'Harry Winks': { primary: 'CM', raw: 'Midfielder' },
  'B. Soumaré': { primary: 'CM', raw: 'Midfielder' },
  'B. El Khannouss': { primary: 'CAM', raw: 'Midfielder' },
  'F. Buonanotte': { primary: 'CAM', secondary: ['RW'], raw: 'Midfielder' },
  'Facundo Buonanotte': {
    primary: 'CAM',
    secondary: ['RW'],
    raw: 'Midfielder',
  },
  'S. Mavididi': { primary: 'LW', raw: 'Attacker' },
  'Stephy Mavididi': { primary: 'LW', raw: 'Attacker' },
  'A. Fatawu': { primary: 'RW', raw: 'Attacker' },
  'Abdul Fatawu': { primary: 'RW', raw: 'Attacker' },
  'B. De Cordova-Reid': { primary: 'RW', secondary: ['CAM'], raw: 'Attacker' },
  'J. Ayew': { primary: 'ST', secondary: ['RW'], raw: 'Attacker' },
  'Jordan Ayew': { primary: 'ST', secondary: ['RW'], raw: 'Attacker' },
  'J. Vardy': { primary: 'ST', raw: 'Attacker' },
  'Jamie Vardy': { primary: 'ST', raw: 'Attacker' },
  'P. Daka': { primary: 'ST', raw: 'Attacker' },
  'Patson Daka': { primary: 'ST', raw: 'Attacker' },

  // --- SOUTHAMPTON ---
  'A. McCarthy': { primary: 'GK', raw: 'Goalkeeper' },
  'J. Lumley': { primary: 'GK', raw: 'Goalkeeper' },
  'J. Bednarek': { primary: 'CB', raw: 'Defender' },
  'Jan Bednarek': { primary: 'CB', raw: 'Defender' },
  'T. Harwood-Bellis': { primary: 'CB', raw: 'Defender' },
  'Taylor Harwood-Bellis': { primary: 'CB', raw: 'Defender' },
  'J. Stephens': { primary: 'CB', secondary: ['LB'], raw: 'Defender' },
  'N. Wood': { primary: 'CB', raw: 'Defender' },
  'K. Walker-Peters': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'Kyle Walker-Peters': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'Y. Sugawara': { primary: 'RB', raw: 'Defender' },
  'Yukinari Sugawara': { primary: 'RB', raw: 'Defender' },
  'J. Bree': { primary: 'RB', raw: 'Defender' },
  'C. Taylor': { primary: 'LB', raw: 'Defender' },
  'Charlie Taylor': { primary: 'LB', raw: 'Defender' },
  'F. Downes': { primary: 'CDM', raw: 'Midfielder' },
  'Flynn Downes': { primary: 'CDM', raw: 'Midfielder' },
  'L. Ugochukwu': { primary: 'CDM', raw: 'Midfielder' },
  'W. Smallbone': { primary: 'CM', raw: 'Midfielder' },
  'Will Smallbone': { primary: 'CM', raw: 'Midfielder' },
  'J. Aribo': { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  'Joe Aribo': { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  'A. Lallana': { primary: 'CAM', raw: 'Midfielder' },
  'Adam Lallana': { primary: 'CAM', raw: 'Midfielder' },
  'Mateus Fernandes': { primary: 'CM', raw: 'Midfielder' },
  'K. Sulemana': { primary: 'LW', raw: 'Attacker' },
  'Kamaldeen Sulemana': { primary: 'LW', raw: 'Attacker' },
  'R. Fraser': { primary: 'LW', raw: 'Attacker' },
  'A. Armstrong': { primary: 'ST', secondary: ['RW'], raw: 'Attacker' },
  'Adam Armstrong': { primary: 'ST', secondary: ['RW'], raw: 'Attacker' },
  'C. Archer': { primary: 'ST', raw: 'Attacker' },
  'Cameron Archer': { primary: 'ST', raw: 'Attacker' },
  'R. Stewart': { primary: 'ST', raw: 'Attacker' },
  'B. Brereton Díaz': { primary: 'ST', secondary: ['LW'], raw: 'Attacker' },
  'P. Onuachu': { primary: 'ST', raw: 'Attacker' },
  'Paul Onuachu': { primary: 'ST', raw: 'Attacker' },

  // --- IPSWICH TOWN ---
  'A. Murić': { primary: 'GK', raw: 'Goalkeeper' },
  'Arijanet Murić': { primary: 'GK', raw: 'Goalkeeper' },
  'C. Walton': { primary: 'GK', raw: 'Goalkeeper' },
  "D. O'Shea": { primary: 'CB', secondary: ['RB'], raw: 'Defender' },
  "Dara O'Shea": { primary: 'CB', secondary: ['RB'], raw: 'Defender' },
  'J. Greaves': { primary: 'CB', raw: 'Defender' },
  'Jacob Greaves': { primary: 'CB', raw: 'Defender' },
  'C. Burgess': { primary: 'CB', raw: 'Defender' },
  'L. Woolfenden': { primary: 'CB', raw: 'Defender' },
  'A. Tuanzebe': { primary: 'RB', secondary: ['CB'], raw: 'Defender' },
  'Axel Tuanzebe': { primary: 'RB', secondary: ['CB'], raw: 'Defender' },
  'H. Clarke': { primary: 'RB', raw: 'Defender' },
  'L. Davis': { primary: 'LB', raw: 'Defender' },
  'Leif Davis': { primary: 'LB', raw: 'Defender' },
  'C. Townsend': { primary: 'LB', raw: 'Defender' },
  'S. Morsy': { primary: 'CDM', raw: 'Midfielder' },
  'Sam Morsy': { primary: 'CDM', raw: 'Midfielder' },
  'K. Phillips': { primary: 'CDM', raw: 'Midfielder' },
  'Kalvin Phillips': { primary: 'CDM', raw: 'Midfielder' },
  'J. Cajuste': { primary: 'CM', raw: 'Midfielder' },
  'Jens Cajuste': { primary: 'CM', raw: 'Midfielder' },
  'M. Luongo': { primary: 'CM', raw: 'Midfielder' },
  'J. Taylor': { primary: 'CM', raw: 'Midfielder' },
  'C. Chaplin': { primary: 'CAM', raw: 'Midfielder' },
  'Conor Chaplin': { primary: 'CAM', raw: 'Midfielder' },
  'S. Szmodics': { primary: 'CAM', secondary: ['LW'], raw: 'Midfielder' },
  'Sammie Szmodics': { primary: 'CAM', secondary: ['LW'], raw: 'Midfielder' },
  'O. Hutchinson': { primary: 'RW', secondary: ['CAM'], raw: 'Attacker' },
  'Omari Hutchinson': { primary: 'RW', secondary: ['CAM'], raw: 'Attacker' },
  'W. Burns': { primary: 'RW', raw: 'Attacker' },
  'Wes Burns': { primary: 'RW', raw: 'Attacker' },
  'N. Broadhead': { primary: 'LW', raw: 'Attacker' },
  'J. Clarke': { primary: 'LW', raw: 'Attacker' },
  'Jack Clarke': { primary: 'LW', raw: 'Attacker' },
  'L. Delap': { primary: 'ST', raw: 'Attacker' },
  'Liam Delap': { primary: 'ST', raw: 'Attacker' },
  'G. Hirst': { primary: 'ST', raw: 'Attacker' },
  'A. Al-Hamadi': { primary: 'ST', raw: 'Attacker' },
};

async function resync() {
  console.log('Connecting to PostgreSQL database...');
  await client.connect();

  // 1. Ensure raw_position column
  await client.query(
    'ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "raw_position" VARCHAR(50) DEFAULT NULL;',
  );
  console.log('Ensured raw_position column exists on players table.');

  // 2. Query all players
  const { rows: players } = await client.query(`
    SELECT id, external_id, name, short_name, primary_position, raw_position
    FROM players
    ORDER BY name ASC
  `);

  console.log(`Found ${players.length} players in database.`);

  let updatedCount = 0;
  let positionsUpdated = 0;

  for (const p of players) {
    const name = p.name ? p.name.trim() : '';
    const shortName = p.short_name ? p.short_name.trim() : '';

    // Check mapping
    const match = PLAYER_TACTICAL_MAP[name] || PLAYER_TACTICAL_MAP[shortName];

    let targetRaw: string;
    let targetPrimary: string;
    let secondaryPositions: string[] = [];

    if (match) {
      targetRaw = match.raw;
      targetPrimary = match.primary;
      secondaryPositions = match.secondary || [];
    } else {
      // Fallback based on existing primary_position and name patterns
      const currentPos = (p.primary_position || '').toUpperCase();
      if (currentPos === 'GK') {
        targetRaw = 'Goalkeeper';
        targetPrimary = 'GK';
      } else if (currentPos === 'CB') {
        targetRaw = 'Defender';
        targetPrimary = 'CB';
      } else if (currentPos === 'CM') {
        targetRaw = 'Midfielder';
        targetPrimary = 'CM';
      } else if (currentPos === 'ST') {
        targetRaw = 'Attacker';
        targetPrimary = 'ST';
      } else {
        targetRaw = 'Midfielder';
        targetPrimary = 'CM';
      }
    }

    // Update player record
    await client.query(
      `UPDATE players
       SET raw_position = $1, primary_position = $2, data_updated_at = NOW()
       WHERE id = $3`,
      [targetRaw, targetPrimary, p.id],
    );
    updatedCount++;

    // Update player_positions
    // First, check if primary position exists
    const existingPrimaryPos = await client.query(
      `SELECT id FROM player_positions WHERE player_id = $1 AND is_primary = true`,
      [p.id],
    );

    if (existingPrimaryPos.rows.length > 0) {
      await client.query(
        `UPDATE player_positions
         SET position_code = $1
         WHERE player_id = $2 AND is_primary = true`,
        [targetPrimary, p.id],
      );
    } else {
      await client.query(
        `INSERT INTO player_positions (id, player_id, position_code, is_primary)
         VALUES (uuid_generate_v4(), $1, $2, true)`,
        [p.id, targetPrimary],
      );
    }
    positionsUpdated++;

    // Add secondary positions if any
    for (const sec of secondaryPositions) {
      const existsSec = await client.query(
        `SELECT id FROM player_positions WHERE player_id = $1 AND position_code = $2`,
        [p.id, sec],
      );
      if (existsSec.rows.length === 0) {
        await client.query(
          `INSERT INTO player_positions (id, player_id, position_code, is_primary)
           VALUES (uuid_generate_v4(), $1, $2, false)`,
          [p.id, sec],
        );
      }
    }
  }

  console.log(`\nSuccessfully resynced ${updatedCount} players!`);

  // 3. Output position distributions
  console.log('\n--- NEW PLAYERS PRIMARY_POSITION DISTRIBUTION ---');
  const primaryDist = await client.query(`
    SELECT primary_position, COUNT(*) as count
    FROM players
    GROUP BY primary_position
    ORDER BY COUNT(*) DESC;
  `);
  console.table(primaryDist.rows);

  console.log('\n--- NEW PLAYERS RAW_POSITION DISTRIBUTION ---');
  const rawDist = await client.query(`
    SELECT raw_position, COUNT(*) as count
    FROM players
    GROUP BY raw_position
    ORDER BY COUNT(*) DESC;
  `);
  console.table(rawDist.rows);

  console.log('\n--- PLAYER_POSITIONS POSITION_CODE DISTRIBUTION ---');
  const posCodeDist = await client.query(`
    SELECT position_code, COUNT(*) as count
    FROM player_positions
    GROUP BY position_code
    ORDER BY COUNT(*) DESC;
  `);
  console.table(posCodeDist.rows);

  // 4. Verify 10 Sample Players
  console.log('\n--- SAMPLE PLAYERS VERIFICATION ---');
  const sampleNames = [
    'A. Onana', // 1 GK
    'H. Maguire', // 1 CB
    'William Saliba', // 2 CB
    'A. Robinson', // 1 LB
    'Diogo Dalot', // 1 RB (or Mazraoui)
    'Casemiro', // 1 DM/CDM
    'K. Mainoo', // 1 CM
    'Bruno Fernandes', // 1 AM/CAM
    'M. Rashford', // 1 LW
    'B. Saka', // 1 RW
    'E. Haaland', // 1 ST
  ];

  const sampleRes = await client.query(
    `
    SELECT p.id, p.external_id, p.name, p.raw_position, p.primary_position, t.name as team
    FROM players p
    LEFT JOIN teams t ON t.id = p.current_team_id
    WHERE p.name = ANY($1) OR p.short_name = ANY($1)
    ORDER BY p.name ASC;
  `,
    [sampleNames],
  );

  console.table(sampleRes.rows);

  await client.end();
}

resync().catch(console.error);
