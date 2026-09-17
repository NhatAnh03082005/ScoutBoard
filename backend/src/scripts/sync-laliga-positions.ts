import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DB_HOST = process.env.POSTGRES_HOST || 'localhost';
const DB_PORT = parseInt(process.env.POSTGRES_PORT || '5432', 10);
const DB_USER = process.env.POSTGRES_USER || 'postgres';
const DB_PASSWORD = process.env.POSTGRES_PASSWORD || 'postgres123';
const DB_NAME = process.env.POSTGRES_DB || 'scoutboard_db';

// Real-world 2024-2025 La Liga Tactical Profiling Map (Transfermarkt & LaLiga Official)
const LALIGA_TACTICAL_MAP: Record<
  string,
  { primary: string; secondary?: string[]; raw: string }
> = {
  // === REAL MADRID ===
  'Thibaut Courtois': { primary: 'GK', raw: 'Goalkeeper' },
  'T. Courtois': { primary: 'GK', raw: 'Goalkeeper' },
  'A. Lunin': { primary: 'GK', raw: 'Goalkeeper' },
  'Andriy Lunin': { primary: 'GK', raw: 'Goalkeeper' },
  'Dani Carvajal': { primary: 'RB', raw: 'Defender' },
  'D. Carvajal': { primary: 'RB', raw: 'Defender' },
  'Lucas Vázquez': { primary: 'RB', secondary: ['RW'], raw: 'Defender' },
  'Lucas Vazquez': { primary: 'RB', secondary: ['RW'], raw: 'Defender' },
  'L. Vázquez': { primary: 'RB', secondary: ['RW'], raw: 'Defender' },
  'Antonio Rüdiger': { primary: 'CB', raw: 'Defender' },
  'Antonio Rudiger': { primary: 'CB', raw: 'Defender' },
  'A. Rüdiger': { primary: 'CB', raw: 'Defender' },
  'Éder Militão': { primary: 'CB', secondary: ['RB'], raw: 'Defender' },
  'Eder Militao': { primary: 'CB', secondary: ['RB'], raw: 'Defender' },
  'É. Militão': { primary: 'CB', secondary: ['RB'], raw: 'Defender' },
  'David Alaba': { primary: 'CB', secondary: ['LB', 'CDM'], raw: 'Defender' },
  'D. Alaba': { primary: 'CB', secondary: ['LB', 'CDM'], raw: 'Defender' },
  'Jesús Vallejo': { primary: 'CB', raw: 'Defender' },
  'J. Vallejo': { primary: 'CB', raw: 'Defender' },
  'Raúl Asencio': { primary: 'CB', raw: 'Defender' },
  'R. Asencio': { primary: 'CB', raw: 'Defender' },
  'Ferland Mendy': { primary: 'LB', raw: 'Defender' },
  'F. Mendy': { primary: 'LB', raw: 'Defender' },
  'Fran García': { primary: 'LB', raw: 'Defender' },
  'Fran Garcia': { primary: 'LB', raw: 'Defender' },
  'F. García': { primary: 'LB', raw: 'Defender' },
  'Aurélien Tchouaméni': {
    primary: 'CDM',
    secondary: ['CB'],
    raw: 'Midfielder',
  },
  'Aurelien Tchouameni': {
    primary: 'CDM',
    secondary: ['CB'],
    raw: 'Midfielder',
  },
  'A. Tchouaméni': { primary: 'CDM', secondary: ['CB'], raw: 'Midfielder' },
  'Eduardo Camavinga': {
    primary: 'CM',
    secondary: ['CDM', 'LB'],
    raw: 'Midfielder',
  },
  'E. Camavinga': {
    primary: 'CM',
    secondary: ['CDM', 'LB'],
    raw: 'Midfielder',
  },
  'Federico Valverde': {
    primary: 'CM',
    secondary: ['RM', 'RB'],
    raw: 'Midfielder',
  },
  'F. Valverde': { primary: 'CM', secondary: ['RM', 'RB'], raw: 'Midfielder' },
  'Luka Modrić': { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  'Luka Modric': { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  'L. Modrić': { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  'Dani Ceballos': { primary: 'CM', raw: 'Midfielder' },
  'D. Ceballos': { primary: 'CM', raw: 'Midfielder' },
  'Jude Bellingham': { primary: 'CAM', secondary: ['CM'], raw: 'Midfielder' },
  'J. Bellingham': { primary: 'CAM', secondary: ['CM'], raw: 'Midfielder' },
  'Arda Güler': { primary: 'CAM', secondary: ['RW'], raw: 'Midfielder' },
  'Arda Guler': { primary: 'CAM', secondary: ['RW'], raw: 'Midfielder' },
  'A. Güler': { primary: 'CAM', secondary: ['RW'], raw: 'Midfielder' },
  'Brahim Díaz': { primary: 'CAM', secondary: ['RW', 'LW'], raw: 'Midfielder' },
  'Brahim Diaz': { primary: 'CAM', secondary: ['RW', 'LW'], raw: 'Midfielder' },
  'B. Díaz': { primary: 'CAM', secondary: ['RW', 'LW'], raw: 'Midfielder' },
  'Vinícius Júnior': { primary: 'LW', secondary: ['ST'], raw: 'Attacker' },
  'Vinicius Junior': { primary: 'LW', secondary: ['ST'], raw: 'Attacker' },
  'Vinicius Jr.': { primary: 'LW', secondary: ['ST'], raw: 'Attacker' },
  'Vinícius Jr.': { primary: 'LW', secondary: ['ST'], raw: 'Attacker' },
  Rodrygo: { primary: 'RW', secondary: ['LW', 'ST'], raw: 'Attacker' },
  'Kylian Mbappé': { primary: 'ST', secondary: ['LW'], raw: 'Attacker' },
  'Kylian Mbappe': { primary: 'ST', secondary: ['LW'], raw: 'Attacker' },
  'K. Mbappé': { primary: 'ST', secondary: ['LW'], raw: 'Attacker' },
  Endrick: { primary: 'ST', raw: 'Attacker' },

  // === BARCELONA ===
  'Marc-André ter Stegen': { primary: 'GK', raw: 'Goalkeeper' },
  'M. ter Stegen': { primary: 'GK', raw: 'Goalkeeper' },
  'Iñaki Peña': { primary: 'GK', raw: 'Goalkeeper' },
  'Inaki Pena': { primary: 'GK', raw: 'Goalkeeper' },
  'I. Peña': { primary: 'GK', raw: 'Goalkeeper' },
  'W. Szczęsny': { primary: 'GK', raw: 'Goalkeeper' },
  'Wojciech Szczesny': { primary: 'GK', raw: 'Goalkeeper' },
  'Jules Koundé': { primary: 'RB', secondary: ['CB'], raw: 'Defender' },
  'Jules Kounde': { primary: 'RB', secondary: ['CB'], raw: 'Defender' },
  'J. Koundé': { primary: 'RB', secondary: ['CB'], raw: 'Defender' },
  'Héctor Fort': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'H. Fort': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'Pau Cubarsí': { primary: 'CB', raw: 'Defender' },
  'Pau Cubarsí Paredes': { primary: 'CB', raw: 'Defender' },
  'P. Cubarsí': { primary: 'CB', raw: 'Defender' },
  'Iñigo Martínez': { primary: 'CB', raw: 'Defender' },
  'Inigo Martinez': { primary: 'CB', raw: 'Defender' },
  'I. Martínez': { primary: 'CB', raw: 'Defender' },
  'Andreas Christensen': { primary: 'CB', secondary: ['CDM'], raw: 'Defender' },
  'A. Christensen': { primary: 'CB', secondary: ['CDM'], raw: 'Defender' },
  'Ronald Araújo': { primary: 'CB', secondary: ['RB'], raw: 'Defender' },
  'Ronald Araujo': { primary: 'CB', secondary: ['RB'], raw: 'Defender' },
  'R. Araújo': { primary: 'CB', secondary: ['RB'], raw: 'Defender' },
  'Eric García': { primary: 'CB', secondary: ['RB', 'CDM'], raw: 'Defender' },
  'Eric Garcia': { primary: 'CB', secondary: ['RB', 'CDM'], raw: 'Defender' },
  'E. García': { primary: 'CB', secondary: ['RB', 'CDM'], raw: 'Defender' },
  'Alejandro Balde': { primary: 'LB', raw: 'Defender' },
  'A. Balde': { primary: 'LB', raw: 'Defender' },
  'Gerard Martín': { primary: 'LB', secondary: ['CB'], raw: 'Defender' },
  'G. Martín': { primary: 'LB', secondary: ['CB'], raw: 'Defender' },
  'Marc Casadó': { primary: 'CDM', secondary: ['RB', 'CM'], raw: 'Midfielder' },
  'Marc Casado': { primary: 'CDM', secondary: ['RB', 'CM'], raw: 'Midfielder' },
  'M. Casadó': { primary: 'CDM', secondary: ['RB', 'CM'], raw: 'Midfielder' },
  'Marc Bernal': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'M. Bernal': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  Pedri: { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  Gavi: { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  'Frenkie de Jong': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'F. de Jong': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'Dani Olmo': { primary: 'CAM', secondary: ['LW', 'CM'], raw: 'Midfielder' },
  'D. Olmo': { primary: 'CAM', secondary: ['LW', 'CM'], raw: 'Midfielder' },
  'Fermín López': {
    primary: 'CAM',
    secondary: ['CM', 'LW'],
    raw: 'Midfielder',
  },
  'Fermin Lopez': {
    primary: 'CAM',
    secondary: ['CM', 'LW'],
    raw: 'Midfielder',
  },
  Fermín: { primary: 'CAM', secondary: ['CM', 'LW'], raw: 'Midfielder' },
  'Pablo Torre': { primary: 'CAM', secondary: ['CM'], raw: 'Midfielder' },
  'P. Torre': { primary: 'CAM', secondary: ['CM'], raw: 'Midfielder' },
  'Lamine Yamal': { primary: 'RW', secondary: ['RM'], raw: 'Attacker' },
  'L. Yamal': { primary: 'RW', secondary: ['RM'], raw: 'Attacker' },
  Raphinha: { primary: 'LW', secondary: ['RW', 'CAM'], raw: 'Attacker' },
  'Ferran Torres': { primary: 'LW', secondary: ['ST', 'RW'], raw: 'Attacker' },
  'F. Torres': { primary: 'LW', secondary: ['ST', 'RW'], raw: 'Attacker' },
  'Ansu Fati': { primary: 'LW', secondary: ['ST'], raw: 'Attacker' },
  'A. Fati': { primary: 'LW', secondary: ['ST'], raw: 'Attacker' },
  'Robert Lewandowski': { primary: 'ST', raw: 'Attacker' },
  'R. Lewandowski': { primary: 'ST', raw: 'Attacker' },
  'Pau Víctor': { primary: 'ST', secondary: ['LW'], raw: 'Attacker' },
  'Pau Victor': { primary: 'ST', secondary: ['LW'], raw: 'Attacker' },

  // === ATLETICO MADRID ===
  'Jan Oblak': { primary: 'GK', raw: 'Goalkeeper' },
  'J. Oblak': { primary: 'GK', raw: 'Goalkeeper' },
  'J. Musso': { primary: 'GK', raw: 'Goalkeeper' },
  'Nahuel Molina': { primary: 'RB', secondary: ['RWB'], raw: 'Defender' },
  'N. Molina': { primary: 'RB', secondary: ['RWB'], raw: 'Defender' },
  'Robin Le Normand': { primary: 'CB', raw: 'Defender' },
  'R. Le Normand': { primary: 'CB', raw: 'Defender' },
  'José María Giménez': { primary: 'CB', raw: 'Defender' },
  'Jose Maria Gimenez': { primary: 'CB', raw: 'Defender' },
  'J. Giménez': { primary: 'CB', raw: 'Defender' },
  'Axel Witsel': { primary: 'CB', secondary: ['CDM'], raw: 'Defender' },
  'A. Witsel': { primary: 'CB', secondary: ['CDM'], raw: 'Defender' },
  'Clément Lenglet': { primary: 'CB', raw: 'Defender' },
  'C. Lenglet': { primary: 'CB', raw: 'Defender' },
  'César Azpilicueta': {
    primary: 'CB',
    secondary: ['RB', 'LB'],
    raw: 'Defender',
  },
  'C. Azpilicueta': { primary: 'CB', secondary: ['RB', 'LB'], raw: 'Defender' },
  'Reinildo Mandava': { primary: 'LB', secondary: ['CB'], raw: 'Defender' },
  Reinildo: { primary: 'LB', secondary: ['CB'], raw: 'Defender' },
  'Javi Galán': { primary: 'LB', raw: 'Defender' },
  'J. Galán': { primary: 'LB', raw: 'Defender' },
  Koke: { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'Rodrigo De Paul': { primary: 'CM', secondary: ['RM'], raw: 'Midfielder' },
  'R. De Paul': { primary: 'CM', secondary: ['RM'], raw: 'Midfielder' },
  'Conor Gallagher': {
    primary: 'CM',
    secondary: ['CAM', 'LM'],
    raw: 'Midfielder',
  },
  'C. Gallagher': {
    primary: 'CM',
    secondary: ['CAM', 'LM'],
    raw: 'Midfielder',
  },
  'Pablo Barrios': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'P. Barrios': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'Samuel Lino': { primary: 'LM', secondary: ['LW', 'LWB'], raw: 'Midfielder' },
  'S. Lino': { primary: 'LM', secondary: ['LW', 'LWB'], raw: 'Midfielder' },
  'Rodrigo Riquelme': {
    primary: 'LM',
    secondary: ['LW', 'CAM'],
    raw: 'Midfielder',
  },
  'R. Riquelme': { primary: 'LM', secondary: ['LW', 'CAM'], raw: 'Midfielder' },
  'Antoine Griezmann': {
    primary: 'CF',
    secondary: ['CAM', 'ST'],
    raw: 'Attacker',
  },
  'A. Griezmann': { primary: 'CF', secondary: ['CAM', 'ST'], raw: 'Attacker' },
  'Julián Álvarez': {
    primary: 'ST',
    secondary: ['LW', 'CAM', 'CF'],
    raw: 'Attacker',
  },
  'Julian Alvarez': {
    primary: 'ST',
    secondary: ['LW', 'CAM', 'CF'],
    raw: 'Attacker',
  },
  'J. Álvarez': {
    primary: 'ST',
    secondary: ['LW', 'CAM', 'CF'],
    raw: 'Attacker',
  },
  'Alexander Sørloth': { primary: 'ST', raw: 'Attacker' },
  'Alexander Sorloth': { primary: 'ST', raw: 'Attacker' },
  'A. Sørloth': { primary: 'ST', raw: 'Attacker' },
  'Ángel Correa': { primary: 'ST', secondary: ['RW', 'CF'], raw: 'Attacker' },
  'Angel Correa': { primary: 'ST', secondary: ['RW', 'CF'], raw: 'Attacker' },
  'Á. Correa': { primary: 'ST', secondary: ['RW', 'CF'], raw: 'Attacker' },

  // === ATHLETIC CLUB ===
  'Unai Simón': { primary: 'GK', raw: 'Goalkeeper' },
  'U. Simón': { primary: 'GK', raw: 'Goalkeeper' },
  'J. Agirrezabala': { primary: 'GK', raw: 'Goalkeeper' },
  'Dani Vivian': { primary: 'CB', raw: 'Defender' },
  'D. Vivian': { primary: 'CB', raw: 'Defender' },
  'Yeray Álvarez': { primary: 'CB', raw: 'Defender' },
  Yeray: { primary: 'CB', raw: 'Defender' },
  'A. Paredes': { primary: 'CB', raw: 'Defender' },
  'Yuri Berchiche': { primary: 'LB', raw: 'Defender' },
  'Y. Berchiche': { primary: 'LB', raw: 'Defender' },
  'Óscar de Marcos': { primary: 'RB', raw: 'Defender' },
  'De Marcos': { primary: 'RB', raw: 'Defender' },
  'I. Lekue': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'A. Gorosabel': { primary: 'RB', raw: 'Defender' },
  'Iñigo Ruiz de Galarreta': {
    primary: 'CM',
    secondary: ['CDM'],
    raw: 'Midfielder',
  },
  'Ruiz de Galarreta': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'Beñat Prados': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'B. Prados': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'Mikel Vesga': { primary: 'CDM', raw: 'Midfielder' },
  'M. Vesga': { primary: 'CDM', raw: 'Midfielder' },
  'Ander Herrera': { primary: 'CM', raw: 'Midfielder' },
  'A. Herrera': { primary: 'CM', raw: 'Midfielder' },
  'Oihan Sancet': { primary: 'CAM', secondary: ['CM'], raw: 'Midfielder' },
  'O. Sancet': { primary: 'CAM', secondary: ['CM'], raw: 'Midfielder' },
  'Nico Williams': { primary: 'LW', secondary: ['RW'], raw: 'Attacker' },
  'N. Williams': { primary: 'LW', secondary: ['RW'], raw: 'Attacker' },
  'Iñaki Williams': { primary: 'RW', secondary: ['ST'], raw: 'Attacker' },
  'Inaki Williams': { primary: 'RW', secondary: ['ST'], raw: 'Attacker' },
  'I. Williams': { primary: 'RW', secondary: ['ST'], raw: 'Attacker' },
  'Alex Berenguer': {
    primary: 'LW',
    secondary: ['RW', 'CAM'],
    raw: 'Attacker',
  },
  'A. Berenguer': { primary: 'LW', secondary: ['RW', 'CAM'], raw: 'Attacker' },
  'Gorka Guruzeta': { primary: 'ST', raw: 'Attacker' },
  'G. Guruzeta': { primary: 'ST', raw: 'Attacker' },
  'Álvaro Djaló': { primary: 'LW', secondary: ['ST', 'RW'], raw: 'Attacker' },
  'A. Djaló': { primary: 'LW', secondary: ['ST', 'RW'], raw: 'Attacker' },

  // === REAL SOCIEDAD ===
  'Álex Remiro': { primary: 'GK', raw: 'Goalkeeper' },
  'A. Remiro': { primary: 'GK', raw: 'Goalkeeper' },
  'Igor Zubeldia': { primary: 'CB', secondary: ['CDM'], raw: 'Defender' },
  'I. Zubeldia': { primary: 'CB', secondary: ['CDM'], raw: 'Defender' },
  'Nayef Aguerd': { primary: 'CB', raw: 'Defender' },
  'N. Aguerd': { primary: 'CB', raw: 'Defender' },
  'Jon Pacheco': { primary: 'CB', raw: 'Defender' },
  'J. Pacheco': { primary: 'CB', raw: 'Defender' },
  'Hamari Traoré': { primary: 'RB', raw: 'Defender' },
  'H. Traoré': { primary: 'RB', raw: 'Defender' },
  'Jon Aramburu': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'J. Aramburu': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'Javi López': { primary: 'LB', raw: 'Defender' },
  'J. López': { primary: 'LB', raw: 'Defender' },
  'Aihen Muñoz': { primary: 'LB', raw: 'Defender' },
  'A. Muñoz': { primary: 'LB', raw: 'Defender' },
  'Martín Zubimendi': { primary: 'CDM', raw: 'Midfielder' },
  'M. Zubimendi': { primary: 'CDM', raw: 'Midfielder' },
  'Luka Sučić': { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  'L. Sučić': { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  'Brais Méndez': {
    primary: 'CAM',
    secondary: ['CM', 'RW'],
    raw: 'Midfielder',
  },
  'B. Méndez': { primary: 'CAM', secondary: ['CM', 'RW'], raw: 'Midfielder' },
  'Takefusa Kubo': { primary: 'RW', secondary: ['CAM'], raw: 'Attacker' },
  'T. Kubo': { primary: 'RW', secondary: ['CAM'], raw: 'Attacker' },
  'Ander Barrenetxea': { primary: 'LW', raw: 'Attacker' },
  'A. Barrenetxea': { primary: 'LW', raw: 'Attacker' },
  'Sergio Gómez': { primary: 'LW', secondary: ['LB', 'CAM'], raw: 'Attacker' },
  'S. Gómez': { primary: 'LW', secondary: ['LB', 'CAM'], raw: 'Attacker' },
  'Mikel Oyarzabal': {
    primary: 'ST',
    secondary: ['LW', 'CF'],
    raw: 'Attacker',
  },
  'M. Oyarzabal': { primary: 'ST', secondary: ['LW', 'CF'], raw: 'Attacker' },
  'Orri Óskarsson': { primary: 'ST', raw: 'Attacker' },
  'O. Óskarsson': { primary: 'ST', raw: 'Attacker' },

  // === VILLARREAL ===
  'Diego Conde': { primary: 'GK', raw: 'Goalkeeper' },
  'D. Conde': { primary: 'GK', raw: 'Goalkeeper' },
  'Raúl Albiol': { primary: 'CB', raw: 'Defender' },
  'R. Albiol': { primary: 'CB', raw: 'Defender' },
  'Eric Bailly': { primary: 'CB', raw: 'Defender' },
  'E. Bailly': { primary: 'CB', raw: 'Defender' },
  'Logan Costa': { primary: 'CB', raw: 'Defender' },
  'L. Costa': { primary: 'CB', raw: 'Defender' },
  'Kiko Femenía': { primary: 'RB', raw: 'Defender' },
  'K. Femenía': { primary: 'RB', raw: 'Defender' },
  'Sergi Cardona': { primary: 'LB', raw: 'Defender' },
  'S. Cardona': { primary: 'LB', raw: 'Defender' },
  'Alfonso Pedraza': { primary: 'LB', secondary: ['LM'], raw: 'Defender' },
  'A. Pedraza': { primary: 'LB', secondary: ['LM'], raw: 'Defender' },
  'Dani Parejo': { primary: 'CM', raw: 'Midfielder' },
  'D. Parejo': { primary: 'CM', raw: 'Midfielder' },
  'Santi Comesaña': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'S. Comesaña': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'Pape Gueye': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'P. Gueye': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'Álex Baena': { primary: 'CAM', secondary: ['LW', 'CM'], raw: 'Midfielder' },
  'Alex Baena': { primary: 'CAM', secondary: ['LW', 'CM'], raw: 'Midfielder' },
  'A. Baena': { primary: 'CAM', secondary: ['LW', 'CM'], raw: 'Midfielder' },
  'Yeremy Pino': { primary: 'RW', secondary: ['LW'], raw: 'Attacker' },
  'Y. Pino': { primary: 'RW', secondary: ['LW'], raw: 'Attacker' },
  'Ilias Akhomach': { primary: 'RW', raw: 'Attacker' },
  'I. Akhomach': { primary: 'RW', raw: 'Attacker' },
  'Ayoze Pérez': { primary: 'ST', secondary: ['LW', 'CF'], raw: 'Attacker' },
  'Ayoze Perez': { primary: 'ST', secondary: ['LW', 'CF'], raw: 'Attacker' },
  'A. Pérez': { primary: 'ST', secondary: ['LW', 'CF'], raw: 'Attacker' },
  'Thierno Barry': { primary: 'ST', raw: 'Attacker' },
  'T. Barry': { primary: 'ST', raw: 'Attacker' },
  'Gerard Moreno': { primary: 'ST', secondary: ['RW', 'CF'], raw: 'Attacker' },
  'G. Moreno': { primary: 'ST', secondary: ['RW', 'CF'], raw: 'Attacker' },

  // === GIRONA ===
  'Paulo Gazzaniga': { primary: 'GK', raw: 'Goalkeeper' },
  'P. Gazzaniga': { primary: 'GK', raw: 'Goalkeeper' },
  'Daley Blind': { primary: 'CB', secondary: ['LB'], raw: 'Defender' },
  'D. Blind': { primary: 'CB', secondary: ['LB'], raw: 'Defender' },
  'David López': { primary: 'CB', secondary: ['CDM'], raw: 'Defender' },
  'D. López': { primary: 'CB', secondary: ['CDM'], raw: 'Defender' },
  'Ladislav Krejčí': { primary: 'CB', secondary: ['CDM'], raw: 'Defender' },
  'L. Krejčí': { primary: 'CB', secondary: ['CDM'], raw: 'Defender' },
  'Arnau Martínez': { primary: 'RB', secondary: ['CB'], raw: 'Defender' },
  'A. Martínez': { primary: 'RB', secondary: ['CB'], raw: 'Defender' },
  'Miguel Gutiérrez': { primary: 'LB', secondary: ['LM'], raw: 'Defender' },
  'M. Gutiérrez': { primary: 'LB', secondary: ['LM'], raw: 'Defender' },
  'Oriol Romeu': { primary: 'CDM', raw: 'Midfielder' },
  'O. Romeu': { primary: 'CDM', raw: 'Midfielder' },
  'Yangel Herrera': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'Y. Herrera': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'Iván Martín': { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  'I. Martín': { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  'Viktor Tsygankov': { primary: 'RW', secondary: ['CAM'], raw: 'Attacker' },
  'V. Tsygankov': { primary: 'RW', secondary: ['CAM'], raw: 'Attacker' },
  'Bryan Gil': { primary: 'LW', secondary: ['RW'], raw: 'Attacker' },
  'B. Gil': { primary: 'LW', secondary: ['RW'], raw: 'Attacker' },
  Portu: { primary: 'RW', secondary: ['ST'], raw: 'Attacker' },
  'Abel Ruiz': { primary: 'ST', raw: 'Attacker' },
  'A. Ruiz': { primary: 'ST', raw: 'Attacker' },
  'Bojan Miovski': { primary: 'ST', raw: 'Attacker' },
  'B. Miovski': { primary: 'ST', raw: 'Attacker' },
  'Cristhian Stuani': { primary: 'ST', raw: 'Attacker' },
  'C. Stuani': { primary: 'ST', raw: 'Attacker' },

  // === REAL BETIS ===
  'Rui Silva': { primary: 'GK', raw: 'Goalkeeper' },
  'R. Silva': { primary: 'GK', raw: 'Goalkeeper' },
  'Marc Bartra': { primary: 'CB', raw: 'Defender' },
  'M. Bartra': { primary: 'CB', raw: 'Defender' },
  'Diego Llorente': { primary: 'CB', raw: 'Defender' },
  'D. Llorente': { primary: 'CB', raw: 'Defender' },
  Natan: { primary: 'CB', raw: 'Defender' },
  'Héctor Bellerín': { primary: 'RB', raw: 'Defender' },
  'H. Bellerín': { primary: 'RB', raw: 'Defender' },
  'Youssouf Sabaly': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'Y. Sabaly': { primary: 'RB', secondary: ['LB'], raw: 'Defender' },
  'Romain Perraud': { primary: 'LB', raw: 'Defender' },
  'R. Perraud': { primary: 'LB', raw: 'Defender' },
  'Johnny Cardoso': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'J. Cardoso': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'Marc Roca': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'M. Roca': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'Pablo Fornals': {
    primary: 'CAM',
    secondary: ['RW', 'CM'],
    raw: 'Midfielder',
  },
  'P. Fornals': { primary: 'CAM', secondary: ['RW', 'CM'], raw: 'Midfielder' },
  'Giovani Lo Celso': { primary: 'CAM', secondary: ['CM'], raw: 'Midfielder' },
  'G. Lo Celso': { primary: 'CAM', secondary: ['CM'], raw: 'Midfielder' },
  Isco: { primary: 'CAM', secondary: ['CM'], raw: 'Midfielder' },
  'Abde Ezzalzouli': { primary: 'LW', secondary: ['RW'], raw: 'Attacker' },
  'A. Ezzalzouli': { primary: 'LW', secondary: ['RW'], raw: 'Attacker' },
  'Chimy Ávila': { primary: 'RW', secondary: ['ST'], raw: 'Attacker' },
  'Chimy Avila': { primary: 'RW', secondary: ['ST'], raw: 'Attacker' },
  'Vitor Roque': { primary: 'ST', secondary: ['LW'], raw: 'Attacker' },
  'Cédric Bakambu': { primary: 'ST', raw: 'Attacker' },
  'C. Bakambu': { primary: 'ST', raw: 'Attacker' },

  // === SEVILLA ===
  'Ørjan Nyland': { primary: 'GK', raw: 'Goalkeeper' },
  'Ø. Nyland': { primary: 'GK', raw: 'Goalkeeper' },
  'Loïc Badé': { primary: 'CB', raw: 'Defender' },
  'L. Badé': { primary: 'CB', raw: 'Defender' },
  'Nemanja Gudelj': { primary: 'CB', secondary: ['CDM'], raw: 'Defender' },
  'N. Gudelj': { primary: 'CB', secondary: ['CDM'], raw: 'Defender' },
  'José Ángel Carmona': { primary: 'RB', secondary: ['CB'], raw: 'Defender' },
  'J. Carmona': { primary: 'RB', secondary: ['CB'], raw: 'Defender' },
  'Juanlu Sánchez': { primary: 'RB', secondary: ['CM', 'RM'], raw: 'Defender' },
  Juanlu: { primary: 'RB', secondary: ['CM', 'RM'], raw: 'Defender' },
  'Adrià Pedrosa': { primary: 'LB', raw: 'Defender' },
  'A. Pedrosa': { primary: 'LB', raw: 'Defender' },
  'Lucien Agoumé': { primary: 'CDM', raw: 'Midfielder' },
  'L. Agoumé': { primary: 'CDM', raw: 'Midfielder' },
  'Albert Sambi Lokonga': {
    primary: 'CM',
    secondary: ['CDM'],
    raw: 'Midfielder',
  },
  'Sambi Lokonga': { primary: 'CM', secondary: ['CDM'], raw: 'Midfielder' },
  'Djibril Sow': { primary: 'CM', raw: 'Midfielder' },
  'D. Sow': { primary: 'CM', raw: 'Midfielder' },
  'Saúl Ñíguez': { primary: 'CM', secondary: ['CAM', 'LM'], raw: 'Midfielder' },
  'Saul Niguez': { primary: 'CM', secondary: ['CAM', 'LM'], raw: 'Midfielder' },
  Saúl: { primary: 'CM', secondary: ['CAM', 'LM'], raw: 'Midfielder' },
  'Dodi Lukebakio': { primary: 'RW', secondary: ['ST'], raw: 'Attacker' },
  'D. Lukébakio': { primary: 'RW', secondary: ['ST'], raw: 'Attacker' },
  'Chidera Ejuke': { primary: 'LW', raw: 'Attacker' },
  'C. Ejuke': { primary: 'LW', raw: 'Attacker' },
  'Isaac Romero': { primary: 'ST', secondary: ['LW'], raw: 'Attacker' },
  'I. Romero': { primary: 'ST', secondary: ['LW'], raw: 'Attacker' },
  'Kelechi Iheanacho': { primary: 'ST', raw: 'Attacker' },
  'K. Iheanacho': { primary: 'ST', raw: 'Attacker' },

  // === VALENCIA ===
  'Giorgi Mamardashvili': { primary: 'GK', raw: 'Goalkeeper' },
  'G. Mamardashvili': { primary: 'GK', raw: 'Goalkeeper' },
  'Cristhian Mosquera': { primary: 'CB', raw: 'Defender' },
  'C. Mosquera': { primary: 'CB', raw: 'Defender' },
  'César Tárrega': { primary: 'CB', raw: 'Defender' },
  'C. Tárrega': { primary: 'CB', raw: 'Defender' },
  'Thierry Correia': { primary: 'RB', secondary: ['RWB'], raw: 'Defender' },
  'T. Correia': { primary: 'RB', secondary: ['RWB'], raw: 'Defender' },
  'Dimitri Foulquier': { primary: 'RB', secondary: ['RWB'], raw: 'Defender' },
  'D. Foulquier': { primary: 'RB', secondary: ['RWB'], raw: 'Defender' },
  'José Gayà': { primary: 'LB', raw: 'Defender' },
  'Jose Gaya': { primary: 'LB', raw: 'Defender' },
  'J. Gayà': { primary: 'LB', raw: 'Defender' },
  'Jesús Vázquez': { primary: 'LB', raw: 'Defender' },
  'J. Vázquez': { primary: 'LB', raw: 'Defender' },
  Pepelu: { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'Javi Guerra': { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  'J. Guerra': { primary: 'CM', secondary: ['CAM'], raw: 'Midfielder' },
  'Enzo Barrenechea': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'E. Barrenechea': { primary: 'CDM', secondary: ['CM'], raw: 'Midfielder' },
  'Diego López': { primary: 'RW', secondary: ['LW', 'ST'], raw: 'Attacker' },
  'Luis Rioja': { primary: 'LW', secondary: ['RW'], raw: 'Attacker' },
  'L. Rioja': { primary: 'LW', secondary: ['RW'], raw: 'Attacker' },
  'Hugo Duro': { primary: 'ST', raw: 'Attacker' },
  'H. Duro': { primary: 'ST', raw: 'Attacker' },
};

async function syncLaLigaPositions() {
  console.log(
    '======================================================================',
  );
  console.log(
    '=== SCOUTBOARD: TACTICAL POSITION MAPPING FOR LA LIGA (0 REQS)     ===',
  );
  console.log(
    '======================================================================\n',
  );

  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });
  await client.connect();

  // 1. Get all players belonging to La Liga
  const laligaPlayers = await client.query(`
    SELECT p.id, p.name, p.short_name, p.primary_position, p.raw_position, t.name as team_name
    FROM players p
    JOIN teams t ON p.current_team_id = t.id
    WHERE p.current_team_id IN (
      SELECT st.team_id FROM season_teams st 
      JOIN seasons s ON st.season_id = s.id 
      JOIN competitions c ON s.competition_id = c.id 
      WHERE c.name = 'La Liga'
    )
    ORDER BY t.name, p.name;
  `);

  console.log(
    `Found ${laligaPlayers.rows.length} La Liga players in database.\n`,
  );

  let updatedCount = 0;
  let dictionaryMatches = 0;
  let fallbackCount = 0;

  for (const p of laligaPlayers.rows) {
    const fullName = (p.name || '').trim();
    const shortName = (p.short_name || '').trim();

    // Check mapping in tactical dictionary
    const match =
      LALIGA_TACTICAL_MAP[fullName] || LALIGA_TACTICAL_MAP[shortName];

    let targetPrimary: string;
    let targetRaw: string;
    let secondaryList: string[] = [];

    if (match) {
      targetPrimary = match.primary;
      targetRaw = match.raw;
      secondaryList = match.secondary || [];
      dictionaryMatches++;
    } else {
      // Fallback normalization based on raw_position or current position
      const currentPos = (p.primary_position || '').toUpperCase();
      const currentRaw = (p.raw_position || '').toUpperCase();

      if (currentPos === 'GK' || currentRaw.includes('GOAL')) {
        targetPrimary = 'GK';
        targetRaw = 'Goalkeeper';
      } else if (currentPos === 'DEF' || currentRaw.includes('DEF')) {
        targetPrimary = 'CB'; // Default defender fallback
        targetRaw = 'Defender';
      } else if (currentPos === 'MID' || currentRaw.includes('MID')) {
        targetPrimary = 'CM'; // Default midfielder fallback
        targetRaw = 'Midfielder';
      } else if (
        currentPos === 'FWD' ||
        currentRaw.includes('ATT') ||
        currentRaw.includes('FORW')
      ) {
        targetPrimary = 'ST'; // Default attacker fallback
        targetRaw = 'Attacker';
      } else {
        targetPrimary = currentPos || 'CM';
        targetRaw = p.raw_position || 'Midfielder';
      }
      fallbackCount++;
    }

    // A. Update players table
    await client.query(
      `
      UPDATE players
      SET primary_position = $1, raw_position = $2, data_updated_at = NOW()
      WHERE id = $3;
    `,
      [targetPrimary, targetRaw, p.id],
    );

    // B. Maintain player_positions table integrity
    // Ensure all previous primary records for this player are demoted
    await client.query(
      `
      UPDATE player_positions
      SET is_primary = false
      WHERE player_id = $1 AND position_code != $2;
    `,
      [p.id, targetPrimary],
    );

    // Upsert primary position record
    const existingPrimary = await client.query(
      `SELECT id FROM player_positions WHERE player_id = $1 AND position_code = $2`,
      [p.id, targetPrimary],
    );

    if (existingPrimary.rows.length > 0) {
      await client.query(
        `UPDATE player_positions SET is_primary = true WHERE id = $1`,
        [existingPrimary.rows[0].id],
      );
    } else {
      await client.query(
        `
        INSERT INTO player_positions (id, player_id, position_code, is_primary)
        VALUES (gen_random_uuid(), $1, $2, true);
      `,
        [p.id, targetPrimary],
      );
    }

    // Insert secondary positions if any
    for (const sec of secondaryList) {
      const existsSec = await client.query(
        `SELECT id FROM player_positions WHERE player_id = $1 AND position_code = $2`,
        [p.id, sec],
      );
      if (existsSec.rows.length === 0) {
        await client.query(
          `
          INSERT INTO player_positions (id, player_id, position_code, is_primary)
          VALUES (gen_random_uuid(), $1, $2, false);
        `,
          [p.id, sec],
        );
      }
    }

    updatedCount++;
  }

  console.log(
    '----------------------------------------------------------------------',
  );
  console.log(`✓ Successfully updated ${updatedCount} La Liga players!`);
  console.log(`  - Direct Tactical Dictionary matches: ${dictionaryMatches}`);
  console.log(`  - Standardized Fallbacks (CB/CM/ST): ${fallbackCount}`);
  console.log(
    '----------------------------------------------------------------------\n',
  );

  // 2. Post-sync position distribution
  console.log('=== NEW LA LIGA PRIMARY POSITION DISTRIBUTION ===');
  const distRes = await client.query(`
    SELECT p.primary_position, COUNT(*) as player_count
    FROM players p
    JOIN teams t ON p.current_team_id = t.id
    WHERE p.current_team_id IN (
      SELECT st.team_id FROM season_teams st 
      JOIN seasons s ON st.season_id = s.id 
      JOIN competitions c ON s.competition_id = c.id 
      WHERE c.name = 'La Liga'
    )
    GROUP BY p.primary_position
    ORDER BY player_count DESC;
  `);
  console.table(distRes.rows);

  // 3. Sample Star Verification
  console.log('\n=== SAMPLE LA LIGA STAR VERIFICATION ===');
  const sampleStars = await client.query(`
    SELECT p.name, t.name as team, p.primary_position,
           (SELECT string_agg(pp.position_code, ', ') FROM player_positions pp WHERE pp.player_id = p.id) as all_positions
    FROM players p
    JOIN teams t ON p.current_team_id = t.id
    WHERE p.name IN ('Kylian Mbappé', 'Kylian Mbappe', 'Vinícius Júnior', 'Vinicius Junior', 'Lamine Yamal', 'Robert Lewandowski', 'Jude Bellingham', 'Federico Valverde', 'Pau Cubarsí', 'Antonio Rüdiger', 'Dani Carvajal', 'Alejandro Balde', 'Pedri', 'Antoine Griezmann', 'Dani Olmo')
       OR p.short_name IN ('K. Mbappé', 'Vinícius Jr.', 'L. Yamal', 'R. Lewandowski', 'J. Bellingham', 'F. Valverde', 'P. Cubarsí', 'A. Rüdiger', 'D. Carvajal', 'A. Balde', 'A. Griezmann')
    ORDER BY t.name, p.name;
  `);
  console.table(sampleStars.rows);

  await client.end();
}

syncLaLigaPositions().catch((err) => {
  console.error('Fatal error syncing La Liga positions:', err);
  process.exit(1);
});
