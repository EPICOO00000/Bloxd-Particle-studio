// Words and short sentences for the Words tab, written with the stroke letters
// of shapes-text.js: what a map maker hangs in the air. A new word is one more
// word in a list here. In the lists a "_" is a space, and a "|" says where a
// long word may break under its picture (see BREAKS in shapes.js); a long word
// without one breaks where breakAt() finds a place.
//
// The words of other languages name their meaning after "=", for the search:
// typing "welcome" finds BIENVENUE, WILLKOMMEN and BENVENUTO as well.

import { drawnShape } from './shape-kit.js';
import { CAPITALS, DIGITS, MARKS } from './shapes-text.js';
import { wordDrawing, WORD_TEXTS } from './shapes-words.js';
import { SMALL_DIGITS } from './shapes-count.js';

// ---------------------------------------------------------------- writing

const BAR = 'M0,0 L0,10'; // an I between letters has no bars: they read as dots
const BARE_I = { '\u00CC': 'grave', '\u00CD': 'acute', '\u00CE': 'circ', '\u00CF': 'uml' };
const MARKS_OF_TEXT = {
  '!': 'M0,10 L0,3.2 D0,0.5', '?': 'A3,7.2 2.8 160 -50 Q3,3.8 3,3 D3,0.5', '\u00A1': 'M0,0 L0,6.8 D0,9.5', '\u00BF': 'A3,2.8 2.8 340 130 Q3,6.2 3,7 D3,9.5',
  '\'': 'M0,10 L0,7.4', '-': 'M0,5 L3.2,5', '.': 'D0,0.3', '+': 'M0,5 L6,5 M3,2 L3,8',
  '&': 'M7,0 L2.2,6.2 C1,7.8 1.6,10 3.2,10 C4.8,10 5.2,8 3.8,6.6 L1.6,4.6 C-0.6,2.8 0.4,0 3,0 C5,0 6.4,1.8 7,4.6',
};
// In a word the letters are small. The two bowls of the B meet at a point, at an angle (two round bowls that only
// touch put particles side by side there), and 3, 6, 8 and 9 are the ones for small numbers (see SMALL_DIGITS in
// shapes-count.js).
const SMALL_B = 'M0,0 L0,10 L3,10 C6.2,10 6.2,6.6 3,5 L0,5 M3,5 C6.6,3.4 6.6,0 3,0 L0,0';
const glyphOf = (ch) => (ch === 'I' ? BAR : ch === 'B' ? SMALL_B : BARE_I[ch] ? `${BAR} N ${MARKS[BARE_I[ch]](0, 11)}`
  : CAPITALS[ch] || SMALL_DIGITS[ch] || DIGITS[ch] || MARKS_OF_TEXT[ch]);

/** A word or a few words in capital letters as one drawing: accents, numbers and ! ? ' - . + & are there too. */
export const phrase = (text) => wordDrawing(text, glyphOf);

/** Can this be written with phrase()? */
export const writable = (text) => [...text].every((ch) => ch === ' ' || glyphOf(ch));

/** The part of an id a text gives: "JOYEUX NOËL" -> "joyeux-noel", "GO!" -> "go-x", "READY?" -> "ready-q" (an apostrophe leaves no trace). */
export const slug = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u00C6/g, 'AE').replace(/\u0152/g, 'OE').replace(/\u00D8/g, 'O')
  .replace(/!/g, ' x').replace(/\?/g, ' q').replace(/'/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// ---------------------------------------------------------------- where a long word breaks

const VOWELS = 'AEIOUY\u00C0\u00C1\u00C2\u00C3\u00C4\u00C5\u00C8\u00C9\u00CA\u00CB\u00CC\u00CD\u00CE\u00CF\u00D2\u00D3\u00D4\u00D5\u00D6\u00D9\u00DA\u00DB\u00DC\u00C6\u0152\u00D8';
const TOGETHER = new Set(['CH', 'SH', 'TH', 'PH', 'CK', 'GH', 'WH', 'QU', 'GN', 'SC', 'TR', 'BR', 'CR', 'DR', 'FR', 'GR', 'PR', 'BL', 'CL', 'FL', 'GL', 'PL']);
/**
 * Where a word of nine letters or more breaks under its picture: near the
 * middle, between two syllables as well as a simple rule can tell (between two
 * consonants, or before a consonant that a vowel follows). Each part has three
 * to nine letters. -1: there is no such place.
 */
export function breakAt(word) {
  const letters = [...word.toUpperCase()];
  const n = letters.length;
  let best = -1;
  let least = Infinity;
  for (let i = 3; i <= n - 3; i++) {
    if (i > 9 || n - i > 9) continue;
    const a = letters[i - 1];
    const b = letters[i];
    const va = VOWELS.includes(a);
    const vb = VOWELS.includes(b);
    let cost = Math.abs(i - n / 2);
    if (!va && !vb) cost += TOGETHER.has(a + b) ? 3 : 0;
    else if (va && !vb) cost += VOWELS.includes(letters[i + 1] || '') ? 0.6 : 1.6;
    else if (!va && vb) cost += 4;
    else cost += 2.5;
    if (cost < least) {
      least = cost;
      best = i;
    }
  }
  return best;
}

const breaks = new Map();
/** The words of a text, each with its place to break noted when it is long. Returns the text without the marks. */
function noteBreaks(marked) {
  for (const word of marked.split(/[\s'-]+/)) {
    const plain = word.replace('|', '');
    if ([...plain.replace(/[^\p{L}]/gu, '')].length < 9) continue;
    const at = word.includes('|') ? word.indexOf('|') : breakAt(plain.replace(/[^\p{L}]/gu, ''));
    if (at > 0) breaks.set(plain.replace(/[^\p{L}]/gu, '').toLowerCase(), at);
  }
  return marked.replace(/\|/g, '');
}

// ---------------------------------------------------------------- the lists

const list = (text) => text.trim().split(/\s+/).map((entry) => entry.replace(/_/g, ' '));

const GAME = list(`
  SHOP MENU BACK NEXT SKIP RETRY RESET RESTART RESUME CONTINUE LOADING SAVE SAVED LOAD QUIT OPTIONS SETTINGS CREDITS RULES INFO GUIDE
  TUTORIAL HINT TIP WARNING CAUTION ALERT ERROR LOCKED UNLOCKED WAIT HURRY FASTER SLOW FAST EASY MEDIUM HARD EXPERT INSANE EXTREME
  IMPOS|SIBLE NORMAL CASUAL RANKED PRACTICE TRAINING CHAL|LENGE MISSION OBJEC|TIVE TARGET CHECK|POINT RESPAWN TELEPORT PORTAL WARP
  CHEST LOOT REWARD PRIZE DAILY WEEKLY EVENT SEASON UPDATE BETA DEMO LIVE ONLINE OFFLINE SERVER WORLD MAP ROUND MATCH TIME TIMER
  COUNT|DOWN LIVES HEALTH MANA ENERGY POWER SPEED ARMOR DAMAGE ATTACK DEFENSE DEFEND COMBO STREAK KILLS DEATHS ASSIST WINS LOSSES
  RECORD BEST FIRST LAST RANK XP COINS GOLD GEMS CASH MONEY TOKENS POINTS TICKET KEYS ITEMS GEAR TOOLS WEAPONS SKINS PETS KITS
  UPGRADE UPGRADES BOOST PERK SKILLS CLASS VICTORY DEFEAT DRAW TIE CHAM|PION LEGEND HERO MASTER ROOKIE ELITE RARE COMMON MYTHIC
  LEGEN|DARY SPECIAL LIMITED PREMIUM DELUXE PERFECT AMAZING AWESOME GREAT SUPER MEGA ULTRA HYPER BRAVO TURBO NITRO JACKPOT LUCKY
  UNLUCKY FAIL OOPS OUCH YAY HOORAY WOOHOO PHEW ARGH HAHA HMM SHH PSST BOO EEK YIKES OOF YUM ZZZ ALMOST SAFE STATS SHOP_HERE
  LEVEL_UP GAME_OVER YOU_WIN YOU_LOSE YOU_DIED TRY_AGAIN PLAY_AGAIN NEW_GAME NEW_RECORD HIGH_SCORE BEST_TIME TIME_UP GET_READY GET_SET
  PRESS_START ROUND_OVER FINAL_ROUND FINAL_BOSS BOSS_FIGHT SUDDEN_DEATH GAME_ON WELL_DONE GOOD_JOB GOOD_LUCK HAVE_FUN WELL_PLAYED
  NICE_TRY SO_CLOSE NOT_BAD TOO_SLOW TOO_EASY COMING_SOON STAY_TUNED LAST_CHANCE ONE_MORE EXTRA_LIFE POWER_UP SPEED_UP MAX_LEVEL
  DOUBLE_XP DOUBLE_COINS FIRST_PLACE LAST_PLACE YOUR_TURN MY_TURN NEXT_ROUND NEXT_LEVEL BONUS_ROUND BONUS_STAGE SAVE_POINT SPAWN_POINT
  SAFE_ZONE DANGER_ZONE WAR_ZONE RED_ZONE NO_PVP PVP_ON PVP_OFF PVP_ZONE BOSS_ROOM LOOT_ROOM SECRET_ROOM HIDDEN_ROOM THE_END TO_BE_CONTINUED
  READY? READY! GO! WIN! WOW! YES! NO! GG! HELP! STOP! RUN! JUMP! BOOM! OOPS! SURPRISE! LET'S_GO LET'S_PLAY 1_VS_1 2_VS_2 3_VS_3 4_VS_4
`);

const SIGNS = list(`
  CLIMB SWIM FLY DIG BUILD CRAFT TRADE SELL BUY PUSH PULL CLICK TAP PRESS HOLD DROP THROW CATCH SHOOT AIM HIT DODGE DUCK CROUCH SPRINT
  WALK HIDE SEEK FIND SEARCH EXPLORE ESCAPE SURVIVE COLLECT GATHER HARVEST PLANT GROW FEED EAT DRINK COOK SLEEP REST FOLLOW LEAD JOIN
  LEAVE INVITE VOTE CHOOSE PICK SPIN ROLL FLIP TURN SLIDE RIDE DRIVE RACE DANCE SING CLAP WAVE SMILE LAUGH THINK LOOK LISTEN READ WRITE
  PAINT COUNT SOLVE GUESS REMEMBER BREAK FIX REPAIR CLEAN CLOSE LOCK UNLOCK ACTI|VATE USE EQUIP ENCHANT SUMMON HEAL REVIVE PROTECT RESCUE
  CAPTURE DESTROY EXPLODE BURN FREEZE MELT FLOAT SINK FALL RISE BOUNCE STAY MOVE COME GO_BACK GO_LEFT GO_RIGHT GO_UP GO_DOWN TURN_LEFT
  TURN_RIGHT TURN_BACK KEEP_GOING KEEP_LEFT KEEP_RIGHT DON'T_LOOK DON'T_FALL DON'T_STOP DON'T_MOVE DON'T_PANIC DON'T_TOUCH WATCH_OUT LOOK_UP
  LOOK_DOWN LOOK_BEHIND STAND_HERE WAIT_HERE CLICK_HERE PRESS_HERE PUSH_ME PULL_ME TOUCH_ME FOLLOW_ME FIND_ME CATCH_ME HELP_ME JUMP_HERE
  START_HERE ENTER_HERE EXIT_HERE THIS_WAY THAT_WAY WRONG_WAY RIGHT_WAY ONE_WAY NO_WAY WAY_OUT WAY_IN DEAD_END KEEP_OUT STAY_OUT STAY_BACK
  NO_ENTRY DO_NOT_ENTER STAFF_ONLY VIP_ONLY MEMBERS_ONLY ADMIN_ONLY PRIVATE PUBLIC FOR_SALE SOLD SOLD_OUT FOR_RENT NO_BUILD BUILD_HERE
  FREE_ITEMS FREE_FOOD FREE_HUGS FREE_GIFT LOST_AND_FOUND BEWARE TAKE_CARE BE_CAREFUL MIND_THE_GAP WET_FLOOR HOT CAUTION_LAVA DEEP_WATER
  NO_SWIMMING NO_RUNNING NO_FLYING NO_FIGHTING NO_CHEATING NO_GRIEFING BE_NICE BE_KIND HAVE_A_NICE_DAY PLEASE_WAIT ONE_AT_A_TIME LINE_UP
  QUEUE_HERE TICKETS INFOR|MATION RECEPTION TOILETS PARKING PUSH_TO_OPEN PULL_TO_OPEN OPEN_ME READ_ME CLICK_ME PRESS_ME TRY_ME PICK_ME
  LOOK_HERE OVER_HERE UP_HERE DOWN_HERE IN_HERE NOT_HERE YOU_ARE_HERE ALMOST_THERE HALFWAY KEEP_IT_UP NEVER_GIVE_UP YOU_CAN_DO_IT
`);

const PLACES = list(`
  MARKET BANK MINE CAVE FARM FOREST DESERT JUNGLE OCEAN BEACH ISLAND MOUNTAIN VOLCANO CASTLE TOWER DUNGEON TEMPLE RUINS VILLAGE TOWN
  CITY PORT HARBOR DOCKS BRIDGE GATE WALL FORT CAMP HUT HOUSE HOTEL SCHOOL LIBRARY MUSEUM HOSPITAL STATION AIRPORT PARK GARDEN POOL
  STADIUM ARCADE CINEMA THEATER CAFE BAKERY RESTAU|RANT KITCHEN BEDROOM OFFICE LAB FACTORY WARE|HOUSE GARAGE PRISON JAIL COURT CHURCH
  GRAVE|YARD SWAMP LAKE RIVER WATER|FALL HEAVEN SPACE MARS EARTH SKY UNDER|GROUND UNDER|WATER NORTH SOUTH EAST WEST CENTER MIDDLE INSIDE
  OUTSIDE UPSTAIRS DOWN|STAIRS ENTRANCE PLAY|GROUND TREE|HOUSE HUB PLAZA STREET ROAD PATH TRAIL TUNNEL MAZE LABY|RINTH TRACK COURSE FIELD
  RING CAGE PIT VAULT ARMORY FORGE STABLE BARN MILL WELL INN TAVERN GUILD THRONE PALACE KINGDOM EMPIRE CABIN LODGE TENT IGLOO PYRAMID
  LIGHT|HOUSE WINDMILL SAWMILL QUARRY OASIS CANYON VALLEY HILL CLIFF MEADOW GLACIER REEF BAY COAST SHORE POND WOODS GROVE ORCHARD
  VINEYARD RANCH ZOO AQUARIUM CIRCUS FAIR CARNIVAL MALL SUPER|MARKET PHARMACY CLINIC GYM SPA SALON STUDIO GALLERY WORKSHOP ATTIC CELLAR
  BASEMENT ROOF BALCONY HALL HALLWAY CORRIDOR LOUNGE CLASS|ROOM CAFE|TERIA DORM BUNKER SHELTER HIDEOUT LAIR NEST DEN BURROW HIVE
  TREE_FARM MOB_FARM WHEAT_FARM FISH_POND SKY_ISLAND SKY_BASE MOON_BASE SPACE_STATION PIRATE_SHIP GHOST_TOWN LOST_CITY HAUNTED_HOUSE
  MAIN_HALL MAIN_STREET TOWN_HALL TOWN_SQUARE FOOD_COURT GIFT_SHOP PET_SHOP TOY_SHOP ICE_RINK SKATE_PARK WATER_PARK THEME_PARK
`);

const PEOPLE = list(`
  ADMIN MOD OWNER STAFF BUILDER HELPER MEMBER GUEST PLAYER PLAYERS FRIEND FRIENDS ENEMY RIVAL ALLY LEADER CAPTAIN CHIEF GUARD KNIGHT
  WIZARD WITCH MAGE ARCHER WARRIOR NINJA PIRATE ROBOT ZOMBIE GHOST DRAGON MONSTER ALIEN HUNTER MINER FARMER TRADER MERCHANT DOCTOR
  TEACHER STUDENT CHEF PILOT POLICE THIEF SPY AGENT JUDGE PRINCE PRINCESS EMPEROR LORD LADY MINION VILLAIN SUPER|HERO BANDIT VIKING
  SAMURAI GLADI|ATOR PALADIN ROGUE DRUID HEALER TANK SNIPER SCOUT SOLDIER GENERAL COLONEL SHERIFF DEPUTY MAYOR COWBOY CLOWN GIANT DWARF
  ELF FAIRY GOBLIN TROLL OGRE VAMPIRE WEREWOLF MUMMY SKELETON DEMON ANGEL GENIE MERMAID
  TEAM_RED TEAM_BLUE TEAM_GREEN TEAM_YELLOW RED_TEAM BLUE_TEAM GREEN_TEAM YELLOW_TEAM RED_WINS BLUE_WINS GREEN_WINS YELLOW_WINS
  RED BLUE GREEN YELLOW ORANGE PURPLE PINK BLACK WHITE GRAY BROWN CYAN SILVER BRONZE RAINBOW ATTACKERS DEFENDERS HIDERS SEEKERS RUNNERS
  TAGGERS SURVI|VORS INFECTED HUMANS COPS ROBBERS BOYS GIRLS KIDS EVERYONE SOLO DUO TRIO SQUAD CLAN CREW GANG ARMY P1 P2 P3 P4 YOU ME US
  THEM MVP GOAT BRB GTG IDK TY NP GLHF WP GJ XD IT TAGGED YOU'RE_IT NOT_IT I_WIN WE_WIN WE_LOST MY_BASE OUR_BASE MY_HOUSE MY_SHOP
`);

const GAMES = list(`
  SKYWARS BEDWARS EGGWARS SPLEEF TNT_RUN TNT_TAG HIDE_AND_SEEK TAG FREEZE_TAG OBBY DROPPER CTF DUELS SURVIVAL CREATIVE PEACEFUL ADVEN|TURE
  HARDCORE SKYBLOCK ONEBLOCK FACTIONS KITPVP SUMO BOXING CAPTURE_THE_FLAG KING_OF_THE_HILL BATTLE_ROYALE MURDER_MYSTERY BUILD_BATTLE
  SPEED_RUN TIME_TRIAL BOSS_RUSH TOWER_DEFENSE ZOMBIES INFECTION FLOOR_IS_LAVA MUSICAL_CHAIRS SIMON_SAYS QUIZ TRIVIA BINGO LOTTERY FISHING
  MINING FARMING RACING SOCCER FOOTBALL BASKET|BALL HOCKEY TENNIS GOLF BOWLING DODGE|BALL VOLLEY|BALL PAINT|BALL LASER_TAG ARCHERY
  OBSTACLE_COURSE ESCAPE_ROOM PUZZLE RIDDLE MEMORY TIC_TAC_TOE CHESS CHECKERS BASEBALL RUGBY CRICKET SKATING SKIING SURFING DIVING
  CLIMBING KARATE JUDO WRESTLING FENCING DARTS POOL_TABLE MINI_GOLF GO_KART TREASURE_HUNT SCAVENGER_HUNT EGG_HUNT TALENT_SHOW DANCE_OFF
  SNOWBALL_FIGHT PILLOW_FIGHT WATER_FIGHT FOOD_FIGHT TUG_OF_WAR RELAY_RACE BOAT_RACE HORSE_RACE DRAG_RACE HOT_POTATO DUCK_HUNT WHACK_A_MOLE
  ONE_IN_THE_CHAMBER LAST_ONE_WINS FREE_FOR_ALL TEAM_DEATHMATCH DEATHMATCH KNOCK|BACK ELYTRA_RACE ICE_BOAT PARKOUR_RACE MOB_ARENA
`);

const WISHES = list(`
  HAPPY_BIRTHDAY MERRY_CHRISTMAS HAPPY_NEW_YEAR HAPPY_HALLOWEEN HAPPY_EASTER HAPPY_HOLIDAYS TRICK_OR_TREAT CONGRATS CONGRATU|LATIONS
  GOOD_MORNING GOOD_NIGHT GOODBYE SEE_YOU SEE_YOU_SOON WELCOME_BACK THANK_YOU PLEASE EXCUSE_ME I_LOVE_YOU LOVE_YOU MISS_YOU BEST_FRIENDS
  BFF FRIENDS_FOREVER GET_WELL_SOON GOOD_GAME HAPPY PARTY BIRTHDAY CHRIST|MAS HALLO|WEEN EASTER SUMMER WINTER SPRING AUTUMN MONDAY TUESDAY
  WEDNES|DAY THURSDAY FRIDAY SATURDAY SUNDAY JANUARY FEBRUARY MARCH APRIL MAY JUNE JULY AUGUST SEPTEM|BER OCTOBER NOVEMBER DECEMBER TODAY
  TOMORROW YESTERDAY WEEKEND MORNING NIGHT MIDNIGHT NOON YEAR HAPPY_VALEN|TINES BE_MINE BE_MY_FRIEND XOXO HUGS KISSES SWEET_DREAMS
  SLEEP_WELL WAKE_UP RISE_AND_SHINE HELLO_WORLD HELLO_THERE HI_THERE HEY HOWDY YO SUP WHAT'S_UP NICE_TO_MEET_YOU SEE_YOU_LATER BYE_BYE
  TAKE_IT_EASY CHEERS HOORAY_FOR_YOU YOU_ROCK YOU'RE_THE_BEST BEST_DAY_EVER BEST_MAP_EVER THANKS_FOR_PLAYING THANKS_FOR_COMING COME_AGAIN
  ENJOY ENJOY_YOUR_STAY MADE_BY MADE_WITH_LOVE BUILT_BY CREATED_BY LIKE SUBSCRIBE FOLLOW_US JOIN_US VOTE_HERE RATE_THIS_MAP FIVE_STARS
`);

const THINGS = list(`
  FIRE WATER ICE WIND LAVA STONE WOOD IRON DIAMOND EMERALD RUBY CRYSTAL COAL TNT BOMB SWORD BOW ARROW AXE PICKAXE SHOVEL HAMMER POTION
  MAGIC SPELL CURSE TRAP SPIKES LASER CANNON ROCKET SHIP BOAT CAR TRAIN PLANE BIKE HORSE DOG CAT FISH BIRD BEAR WOLF FOX LION TIGER SHARK
  SNAKE SPIDER BEE COW PIG SHEEP CHICKEN FROG BUNNY PANDA MONKEY PENGUIN UNICORN DINO FOOD PIZZA BURGER CAKE COOKIE CANDY APPLE BANANA
  BREAD CHEESE MILK JUICE SODA TEA COFFEE ICE_CREAM SUN MOON STAR STARS CLOUD RAIN SNOW STORM THUNDER LIGHT|NING TREE FLOWER GRASS ROCK
  SAND DIRT MUSIC DISCO RADIO TV PHONE BOOK FLAG CROWN TREASURE MYSTERY SURPRISE LUCK DREAM NIGHT|MARE HEART SOUL MIND LIFE DEATH DOOM
  CHAOS PEACE WAR HOPE FEAR JOY FUN GLORY HONOR FAME TRUTH LIES DARK LIGHT SHADOW VOID SPIRIT NATURE SCIENCE ART MATH HISTORY FUTURE PAST
  ROSE LILY TULIP CACTUS MUSHROOM PUMPKIN MELON CARROT POTATO WHEAT CORN BERRY CHERRY LEMON GRAPE PEACH COCONUT HONEY SUGAR SALT PEPPER
  EGG BACON SUSHI TACO PASTA NOODLES RICE SOUP SALAD FRIES HOT_DOG DONUT WAFFLE PANCAKE POPCORN CHOCO|LATE JELLY PIE MUFFIN PRETZEL
  OBSIDIAN BEDROCK REDSTONE COPPER QUARTZ AMETHYST SLIME GLASS BRICK CLAY WOOL LEATHER PAPER FEATHER BONE STRING STICK TORCH LANTERN
  LADDER DOOR BED TABLE CHAIR FURNACE ANVIL BARREL BUCKET COMPASS CLOCK SADDLE MINE|CART RAIL ELYTRA TRIDENT TOTEM BEACON NOTE_BLOCK
`);

// Labels with a number: [the word, how many of them]. "LEVEL 1" to "LEVEL 50", "STAGE 1" to "STAGE 20", ...
const NUMBERED = [
  ['LEVEL', 50], ['STAGE', 20], ['ROUND', 10], ['WAVE', 20], ['FLOOR', 20], ['ROOM', 20], ['WORLD', 8], ['ZONE', 10], ['AREA', 10], ['PLAYER', 8],
  ['TEAM', 8], ['DAY', 7], ['LAP', 5], ['GATE', 10], ['LANE', 8], ['COURSE', 10], ['MAP', 10], ['MISSION', 10], ['CHAPTER', 10], ['PART', 5],
  ['TIER', 10], ['RANK', 10], ['PLOT', 20], ['HOUSE', 10], ['ISLAND', 10], ['CHECK|POINT', 20], ['TRIAL', 10], ['PHASE', 5], ['TRACK', 8], ['DOOR', 10],
  ['PUZZLE', 10], ['QUEST', 10], ['BOSS', 5], ['GAME', 5], ['MATCH', 5], ['HOLE', 18], ['TABLE', 10], ['EXIT', 4], ['BASE', 4], ['TOWER', 4],
];
const numbered = NUMBERED.flatMap(([word, most]) => Array.from({ length: most }, (_, i) => `${word} ${i + 1}`));
const TOPS = list('TOP_3 TOP_5 TOP_10 TOP_20 TOP_50 TOP_100 NO_1 NO_2 NO_3 TOP_1');

// Other languages: WORD=its_meaning (the meaning is only for the search).
const FRENCH = list(`
  BONJOUR=hello SALUT=hi BONSOIR=good_evening BIENVENUE=welcome MERCI=thanks AU_REVOIR=goodbye À_BIENTÔT=see_you_soon OUI=yes NON=no
  PARDON=sorry DÉSOLÉ=sorry GAGNÉ=won PERDU=lost VICTOIRE=victory DÉFAITE=defeat DÉPART=start ARRIVÉE=finish JOUER=play JOUEUR=player
  ÉQUIPE=team NIVEAU=level BOUTIQUE=shop MAGASIN=store ENTRÉE=entrance SORTIE=exit OUVERT=open FERMÉ=closed ATTENTION=careful
  INTERDIT=forbidden AIDE=help RÈGLES=rules TRÉSOR=treasure COFFRE=chest CLÉ=key PORTE=door CHÂTEAU=castle MAISON=house VILLE=city
  FORÊT=forest MONTAGNE=mountain PLAGE=beach MER=sea ÎLE=island CIEL=sky SOLEIL=sun LUNE=moon ÉTOILE=star FEU=fire EAU=water GLACE=ice
  VENT=wind TERRE=earth ROUGE=red BLEU=blue VERT=green JAUNE=yellow NOIR=black BLANC=white VIOLET=purple GAUCHE=left DROITE=right HAUT=up
  BAS=down ICI=here LÀ=there VITE=fast LENT=slow FACILE=easy DIFFI|CILE=hard GÉNIAL=great MAGNI|FIQUE=magnificent INCROY|ABLE=incredible
  PARFAIT=perfect HÉROS=hero ROI=king REINE=queen AMI=friend AMIS=friends AMOUR=love CŒUR=heart BISOUS=kisses JE_T'AIME=i_love_you
  JOYEUX_ANNIVER|SAIRE=happy_birthday JOYEUX_NOËL=merry_christmas BONNE_ANNÉE=happy_new_year BONNE_CHANCE=good_luck BON_COURAGE=good_luck
  BONNE_NUIT=good_night BON_APPÉTIT=enjoy_your_meal BONNE_FÊTE=happy_party FÉLICI|TATIONS=congratulations À_GAUCHE=to_the_left
  À_DROITE=to_the_right TOUT_DROIT=straight_on PAR_ICI=this_way FIN=end RECOM|MENCER=restart CONTI|NUER=continue QUITTER=quit SAUTER=jump
  COURIR=run GRIMPER=climb NAGER=swim VOLER=fly CHERCHER=search TROUVER=find ATTRAPER=catch CACHE-CACHE=hide_and_seek COMBAT=fight
  BATAILLE=battle GUERRE=war PAIX=peace JOUR=day NUIT=night MATIN=morning SOIR=evening LUNDI=monday MARDI=tuesday MERCREDI=wednesday
  JEUDI=thursday VENDREDI=friday SAMEDI=saturday DIMANCHE=sunday ÉTÉ=summer HIVER=winter PRIN|TEMPS=spring AUTOMNE=autumn ÉCOLE=school
  BONBON=candy GÂTEAU=cake CHOCOLAT=chocolate FROMAGE=cheese PAIN=bread CROIS|SANT=croissant BAGUETTE=bread CHAT=cat CHIEN=dog
  CHEVAL=horse LAPIN=rabbit OISEAU=bird POISSON=fish LICORNE=unicorn FANTÔME=ghost SORCIÈRE=witch MAGIE=magic ZUT=darn OH_LÀ_LÀ=oh_my
  ALLEZ=come_on ALLONS-Y=lets_go C'EST_PARTI=here_we_go ENCORE=again PRÊT=ready PRÊTS=ready PARTEZ=go À_VOS_MARQUES=on_your_marks
  TERMINÉ=finished BIEN_JOUÉ=well_played DOMMAGE=too_bad ESSAIE_ENCORE=try_again NOUVEAU=new GRATUIT=free SOLDES=sale PRIX=price
  PIÈCES=coins OR=gold ARGENT=silver_money VIES=lives TEMPS=time JEU=game PARTIE=game_round MANCHE=round CARTE=map MONDE=world
  ZONE_SÛRE=safe_zone DÉFENSE_D'ENTRER=no_entry PAR_LÀ=that_way SUIVEZ-MOI=follow_me BONNE_JOURNÉE=have_a_nice_day À_DEMAIN=see_you_tomorrow
`);

const SPANISH = list(`
  HOLA=hello ADIÓS=goodbye BIEN|VENIDO=welcome BIEN|VENIDOS=welcome GRACIAS=thanks POR_FAVOR=please SÍ=yes PERDÓN=sorry LO_SIENTO=sorry
  BUENOS_DÍAS=good_morning BUENAS_NOCHES=good_night HASTA_LUEGO=see_you_later ¡VAMOS!=lets_go VAMOS=lets_go LISTO=ready ¿LISTO?=ready
  YA=now INICIO=start SALIDA=exit_start META=finish_line GANASTE=you_won PERDISTE=you_lost GANADOR=winner VICTORIA=victory
  DERROTA=defeat JUGAR=play JUGADOR=player EQUIPO=team NIVEL=level TIENDA=shop ENTRADA=entrance ABIERTO=open CERRADO=closed
  PELIGRO=danger CUIDADO=careful PROHI|BIDO=forbidden AYUDA=help REGLAS=rules SECRETO=secret TESORO=treasure LLAVE=key PUERTA=door
  CASTILLO=castle CASA=house PUEBLO=village CIUDAD=city BOSQUE=forest MONTAÑA=mountain PLAYA=beach MAR=sea ISLA=island CIELO=sky
  SOL=sun LUNA=moon ESTRELLA=star FUEGO=fire AGUA=water HIELO=ice VIENTO=wind TIERRA=earth ROJO=red AZUL=blue VERDE=green
  AMARILLO=yellow GRIS=grey BLANCO=white ROSA=pink NARANJA=orange MORADO=purple IZQUI|ERDA=left DERECHA=right ARRIBA=up ABAJO=down
  AQUÍ=here RÁPIDO=fast LENTO=slow FÁCIL=easy DIFÍCIL=hard GENIAL=great INCREÍBLE=incredible PERFECTO=perfect CAMPEÓN=champion
  HÉROE=hero REY=king REINA=queen AMIGO=friend AMIGOS=friends AMOR=love CORAZÓN=heart TE_QUIERO=i_love_you TE_AMO=i_love_you
  FELIZ_CUMPLE|AÑOS=happy_birthday FELIZ_NAVIDAD=merry_christmas FELIZ_AÑO_NUEVO=happy_new_year BUENA_SUERTE=good_luck
  FELICI|DADES=congratulations SALTAR=jump CORRER=run NADAR=swim VOLAR=fly BUSCAR=search CARRERA=race BATALLA=battle LUCHA=fight
  GUERRA=war PAZ=peace DÍA=day NOCHE=night LUNES=monday MARTES=tuesday MIÉRCOLES=wednesday JUEVES=thursday VIERNES=friday
  SÁBADO=saturday DOMINGO=sunday VERANO=summer INVIERNO=winter PRIMA|VERA=spring OTOÑO=autumn ESCUELA=school GATO=cat PERRO=dog
  CABALLO=horse CONEJO=rabbit PÁJARO=bird PEZ=fish DRAGÓN=dragon UNI|CORNIO=unicorn FANTASMA=ghost BRUJA=witch MAGIA=magic
  FIESTA=party MÚSICA=music OLÉ=ole BIEN_HECHO=well_done OTRA_VEZ=again NUEVO=new GRATIS=free MONEDAS=coins ORO=gold PLATA=silver
  PUNTOS=points VIDAS=lives TIEMPO=time JUEGO=game MUNDO=world MAPA=map ZONA_SEGURA=safe_zone NO_PASAR=no_entry POR_AQUÍ=this_way
  SÍGUEME=follow_me BUEN_TRABAJO=good_job HASTA_MAÑANA=see_you_tomorrow BUEN_VIAJE=have_a_good_trip
`);

const GERMAN = list(`
  HALLO=hello TSCHÜSS=bye WILL|KOMMEN=welcome DANKE=thanks BITTE=please JA=yes NEIN=no GUTEN_TAG=good_day GUTEN_MORGEN=good_morning
  GUTE_NACHT=good_night AUF_WIEDER|SEHEN=goodbye LOS=go LOS_GEHT'S=lets_go FERTIG=ready_finished ACHTUNG=attention ZIEL=finish
  ENDE=end GEWONNEN=won VERLOREN=lost SIEG=victory SIEGER=winner SPIELEN=play SPIELER=player MANN|SCHAFT=team STUFE=level LADEN=shop
  GESCHÄFT=shop EINGANG=entrance AUSGANG=exit OFFEN=open GESCH|LOSSEN=closed GEFAHR=danger VORSICHT=careful VERBOTEN=forbidden
  HILFE=help REGELN=rules GEHEIM=secret SCHATZ=treasure SCHLÜS|SEL=key TÜR=door SCHLOSS=castle BURG=castle HAUS=house DORF=village
  STADT=city WALD=forest BERG=mountain STRAND=beach MEER=sea INSEL=island HIMMEL=sky SONNE=sun MOND=moon STERN=star FEUER=fire
  WASSER=water EIS=ice ERDE=earth ROT=red BLAU=blue GRÜN=green GELB=yellow SCHWARZ=black WEISS=white LINKS=left RECHTS=right OBEN=up
  UNTEN=down HIER=here SCHNELL=fast LANGSAM=slow LEICHT=easy SCHWER=hard TOLL=great WUNDER|BAR=wonderful PERFEKT=perfect HELD=hero
  KÖNIG=king KÖNIGIN=queen FREUND=friend FREUNDE=friends LIEBE=love HERZ=heart ICH_LIEBE_DICH=i_love_you ALLES_GUTE=all_the_best
  FROHE_WEIH|NACHTEN=merry_christmas FROHES_NEUES_JAHR=happy_new_year VIEL_GLÜCK=good_luck VIEL_SPASS=have_fun GLÜCK|WUNSCH=congratulations
  SPRINGEN=jump LAUFEN=run SCHWIM|MEN=swim FLIEGEN=fly SUCHEN=search RENNEN=race KAMPF=fight KRIEG=war FRIEDEN=peace TAG=day
  NACHT=night MONTAG=monday DIENSTAG=tuesday MITTWOCH=wednesday DONNERS|TAG=thursday FREITAG=friday SAMSTAG=saturday SONNTAG=sunday
  SOMMER=summer FRÜHLING=spring HERBST=autumn SCHULE=school KATZE=cat HUND=dog PFERD=horse HASE=rabbit VOGEL=bird FISCH=fish
  DRACHE=dragon EINHORN=unicorn GEIST=ghost HEXE=witch ZAUBER=magic MUSIK=music PRIMA=great GUT_GEMACHT=well_done NOCHMAL=again NEU=new
  MÜNZEN=coins SILBER=silver PUNKTE=points LEBEN=lives ZEIT=time SPIEL=game WELT=world KARTE=map HIER_ENTLANG=this_way FOLGE_MIR=follow_me
  BIS_BALD=see_you_soon BIS_MORGEN=see_you_tomorrow GUTE_REISE=have_a_good_trip KEIN_ZUTRITT=no_entry SICHERE_ZONE=safe_zone
`);

const ITALIAN = list(`
  CIAO=hello_bye BENVE|NUTO=welcome BENVE|NUTI=welcome GRAZIE=thanks PREGO=you_are_welcome PER_FAVORE=please SÌ=yes SCUSA=sorry
  BUON|GIORNO=good_morning BUONA|NOTTE=good_night ARRIVE|DERCI=goodbye ANDIAMO=lets_go PRONTO=ready PRONTI=ready VIA=go INIZIO=start
  PARTENZA=start ARRIVO=finish FINE=end HAI_VINTO=you_won HAI_PERSO=you_lost VINCI|TORE=winner VITTORIA=victory SCON|FITTA=defeat
  GIOCA=play GIOCA|TORE=player SQUADRA=team LIVELLO=level NEGOZIO=shop ENTRATA=entrance USCITA=exit APERTO=open CHIUSO=closed
  PERICOLO=danger ATTEN|ZIONE=careful VIETATO=forbidden AIUTO=help REGOLE=rules SEGRETO=secret CHIAVE=key PORTA=door CASTELLO=castle
  VILLAG|GIO=village CITTÀ=city FORESTA=forest MONTAGNA=mountain SPIAGGIA=beach MARE=sea ISOLA=island SOLE=sun STELLA=star FUOCO=fire
  ACQUA=water GHIACCIO=ice VENTO=wind TERRA=earth ROSSO=red BLU=blue GIALLO=yellow NERO=black BIANCO=white SINISTRA=left DESTRA=right
  SU=up GIÙ=down QUI=here VELOCE=fast FANTAS|TICO=fantastic PERFETTO=perfect CAMPIONE=champion EROE=hero RE=king REGINA=queen
  AMICO=friend AMICI=friends AMORE=love CUORE=heart TI_AMO=i_love_you BUON_COMPLE|ANNO=happy_birthday BUON_NATALE=merry_christmas
  BUON_ANNO=happy_new_year BUONA_FORTUNA=good_luck AUGURI=best_wishes SALTA=jump CORRI=run NUOTA=swim VOLA=fly CERCA=search GARA=race
  BATTA|GLIA=battle PACE=peace GIORNO=day NOTTE=night LUNEDÌ=monday MARTEDÌ=tuesday MERCOLEDÌ=wednesday GIOVEDÌ=thursday VENERDÌ=friday
  SABATO=saturday DOMENICA=sunday ESTATE=summer INVERNO=winter AUTUNNO=autumn SCUOLA=school GATTO=cat CANE=dog CAVALLO=horse
  CONIGLIO=rabbit UCCELLO=bird PESCE=fish DRAGO=dragon UNICORNO=unicorn STREGA=witch FESTA=party MUSICA=music BRAVIS|SIMO=very_good
  ANCORA=again NUOVO=new MONETE=coins ARGENTO=silver PUNTI=points TEMPO=time GELATO=ice_cream MAMMA_MIA=oh_my GIOCO=game MONDO=world
  DI_QUA=this_way SEGUIMI=follow_me A_PRESTO=see_you_soon A_DOMANI=see_you_tomorrow BEN_FATTO=well_done BUON_VIAGGIO=have_a_good_trip
`);

const PORTUGUESE = list(`
  OLÁ=hello OI=hi TCHAU=bye BEM-VINDO=welcome OBRIGADO=thanks SIM=yes NÃO=no DESCULPA=sorry BOM_DIA=good_morning BOA_NOITE=good_night
  ATÉ_LOGO=see_you_later JÁ=now INÍCIO=start PARTIDA=start CHEGADA=finish FIM=end GANHOU=you_won PERDEU=you_lost VENCEDOR=winner
  VITÓRIA=victory JOGAR=play JOGADOR=player NÍVEL=level LOJA=shop SAÍDA=exit ABERTO=open FECHADO=closed PERIGO=danger PROIBIDO=forbidden
  AJUDA=help REGRAS=rules SEGREDO=secret TESOURO=treasure CHAVE=key CASTELO=castle VILA=village CIDADE=city FLORESTA=forest
  MONTANHA=mountain PRAIA=beach ILHA=island CÉU=sky LUA=moon ESTRELA=star FOGO=fire ÁGUA=water GELO=ice VERMELHO=red AMARELO=yellow
  PRETO=black BRANCO=white ESQUERDA=left DIREITA=right CIMA=up BAIXO=down AQUI=here DEVAGAR=slow LEGAL=cool INCRÍVEL=incredible
  PERFEITO=perfect CAMPEÃO=champion HERÓI=hero REI=king RAINHA=queen CORAÇÃO=heart EU_TE_AMO=i_love_you FELIZ_ANIVER|SÁRIO=happy_birthday
  FELIZ_NATAL=merry_christmas FELIZ_ANO_NOVO=happy_new_year BOA_SORTE=good_luck PARABÉNS=congratulations PULAR=jump VOAR=fly
  PROCURAR=search CORRIDA=race BATALHA=battle LUTA=fight DIA=day NOITE=night SEGUNDA=monday TERÇA=tuesday QUARTA=wednesday
  QUINTA=thursday SEXTA=friday VERÃO=summer OUTONO=autumn ESCOLA=school CACHORRO=dog CAVALO=horse COELHO=rabbit PÁSSARO=bird PEIXE=fish
  DRAGÃO=dragon UNICÓRNIO=unicorn BRUXA=witch MUITO_BEM=very_good DE_NOVO=again NOVO=new GRÁTIS=free MOEDAS=coins OURO=gold PRATA=silver
  PONTOS=points JOGO=game POR_AQUI=this_way SIGA-ME=follow_me ATÉ_AMANHÃ=see_you_tomorrow BOA_VIAGEM=have_a_good_trip BOM_TRABALHO=good_job
`);

// ---------------------------------------------------------------- the shapes

const taken = new Set(WORD_TEXTS); // a text is one shape, whatever list it is in
const ids = new Set(WORD_TEXTS.map((word) => `word-${slug(word)}`));

/** How many particles a text gets when it is added. */
export const countFor = (text) => Math.max(60, Math.min(300, 21 * [...text].filter((ch) => ch !== ' ').length));

function wordsOf(sub, entries, more, tongue = '') {
  const out = [];
  for (const entry of entries) {
    const [marked, meaning] = entry.split('=');
    const text = noteBreaks(marked);
    if (taken.has(text)) continue;
    if (!writable(text)) throw new Error(`"${text}" has a sign the stroke letters do not have`);
    let id = `word-${slug(text)}`;
    if (ids.has(id)) id = `${id}-${tongue || 'two'}`;
    if (ids.has(id)) throw new Error(`Two words want the id ${id}`);
    taken.add(text);
    ids.add(id);
    out.push(drawnShape({
      id, name: `The word${text.includes(' ') ? 's' : ''} ${text}`, cat: 'words', sub, label: text,
      tags: `${text} text writing ${more}${meaning ? ` ${meaning.replace(/_/g, ' ')}` : ''}`, draw: () => phrase(text), count: countFor(text),
    }));
  }
  return out;
}

export const VOCAB_SHAPES = [
  ...wordsOf('Game words', GAME, 'game sign label'),
  ...wordsOf('Signs and orders', SIGNS, 'sign order notice do'),
  ...wordsOf('Places', PLACES, 'place sign where area'),
  ...wordsOf('People and teams', PEOPLE, 'who team role colour'),
  ...wordsOf('Games and sports', GAMES, 'minigame mode play sport'),
  ...wordsOf('Wishes and days', WISHES, 'greeting wish message day month'),
  ...wordsOf('Words for things', THINGS, 'thing noun label'),
  ...wordsOf('Levels and rounds', [...numbered, ...TOPS], 'number label sign'),
  ...wordsOf('French words', FRENCH, 'french fran\u00E7ais france', 'fr'),
  ...wordsOf('Spanish words', SPANISH, 'spanish espa\u00F1ol spain', 'es'),
  ...wordsOf('German words', GERMAN, 'german deutsch germany', 'de'),
  ...wordsOf('Italian words', ITALIAN, 'italian italiano italy', 'it'),
  ...wordsOf('Portuguese words', PORTUGUESE, 'portuguese portugu\u00EAs brazil portugal', 'pt'),
];

/** The lists of English words as they are written above, for the pixel words of shapes-pixel3.js. */
export const VOCAB_LISTS = { GAME, SIGNS, PLACES, PEOPLE, GAMES, WISHES, THINGS };

/** Every text that is a shape now, in capital letters: the names (shapes-names.js) leave these out. */
export const VOCAB_TEXTS = taken;

/** Where the long words of the lists break: [[word in small letters, how many letters stand before the break], ...]. */
export const VOCAB_BREAKS = breaks;

export { noteBreaks };
