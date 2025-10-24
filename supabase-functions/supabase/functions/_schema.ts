export type UUID = string;

export interface AppConfig {
  id: UUID;
  minVersionIos: string;
  minVersionAndroid: string;
  appStoreUrlIos: string;
  appStoreUrlAndroid: string;
}

export interface Athlete {
  id: UUID;
  phone_number: string | null;
  first_name: string;
  last_name: string;
  twitter: string | null;
  ncaa_id: string | null;
  grad_year: number | null;
  transfer_status: TransferStatus | null;
  years_eligibility: number | null;
  position: Position | null;
  team_id: UUID | null;
  college_id: UUID | null;
  height: number | null;
  weight: number | null;
  high_school_rating: number | null;
  city: string | null;
  state: State | null;
  portal_entry_date: Date | null;
  scholarship: number | null;
  bio: string | null;
  communication_method: CommunicationMethod;
  enrichment_source: EnrichmentSource[];
  jersey_number: number | null;
  user_id: UUID | null;
  priorities?: any;
  metadata?: any;
  high_school: string | null;
  photo_url: string | null;
  create_timestamp: Date | null;
  is_receiving_athletic_aid: boolean | null;
  is_transfer_graduate_student: boolean | null;
  update_timestamp: Date | null;
  ncaa_stats_id: string | null;
  school_roster_url: string | null;
  sport_radar_id: string | null;
  hudl_link: string | null;
  personal_statement: string | null;
  viewed_new_feature_modal: boolean | null;
  instagram: string | null;
  multi_transfer_status: boolean;
  ok_to_contact: boolean;
  college: College | null;
  team: Team | null;
  user: User | null;
  drills: AthleteDrill[];
  lifts: AthleteLift[];
  references: AthleteReference[];
  statistics: AthleteStatistic[];
  seasons: AthleteTeamSeason[];
  participants: ChannelParticipant[];
  files: File[];
  highlights: Highlight[];
  notes: Note[];
  profileViews: ProfileView[];
  statuses: RecruitStatus[];
  savedSearchExclusions: SavedSearchExclusion[];
  savedSearchInclusions: SavedSearchInclusion[];
  ScrapedActivity: ScrapedActivity[];
}

export interface AthleteDrill {
  id: UUID;
  created_at: Date;
  athlete_id: UUID;
  drill: DrillType;
  time: number | null;
  inches: number | null;
  athlete: Athlete;
  highlight: Highlight[];
}

export interface AthleteLift {
  id: UUID;
  created_at: Date;
  athlete_id: UUID;
  lift: LiftType;
  weight: number;
  reps: number;
  athlete: Athlete;
  highlight: Highlight[];
}

export interface AthleteReference {
  id: UUID;
  first_name: string;
  last_name: string;
  position: string;
  email: string;
  phone: string;
  athlete_id: UUID;
  athlete: Athlete;
}

export interface AthleteStatistic {
  id: UUID;
  created_at: Date;
  athlete_id: UUID;
  season_id: UUID;
  games_played: number;
  games_started: number;
  Athlete: Athlete;
  Season: Season;
  ConversionStatistic: ConversionStatistic[];
  DefenseStatistic: DefenseStatistic[];
  ExtraPointStatistic: ExtraPointStatistic[];
  FieldGoalStatistic: FieldGoalStatistic[];
  FumbleStatistic: FumbleStatistic[];
  InterceptionReturnStatistic: InterceptionReturnStatistic[];
  KickReturnStatistic: KickReturnStatistic[];
  KickoffStatistic: KickoffStatistic[];
  PassingStatistic: PassingStatistic[];
  PenaltyStatistic: PenaltyStatistic[];
  PuntReturnStatistic: PuntReturnStatistic[];
  PuntStatistic: PuntStatistic[];
  ReceivingStatistic: ReceivingStatistic[];
  RushingStatistic: RushingStatistic[];
}

export interface AthleteTeamSeason {
  id: UUID;
  created_at: Date;
  updated_at: Date;
  athlete_id: UUID;
  team_id: UUID;
  season_id: UUID;
  athlete: Athlete;
  season: Season;
  team: Team;
}

export interface Channel {
  slug: string;
  created_at: Date;
  id: UUID;
  is_archived: boolean;
  participants: ChannelParticipant[];
  messages: Message[];
}

export interface ChannelParticipant {
  user_id: UUID | null;
  last_viewed: Date;
  channel_id: UUID;
  id: UUID;
  athlete_id: UUID | null;
  is_favorite: boolean;
  athlete: Athlete | null;
  channel: Channel;
  user: User | null;
  readReceipts: MessageRead[];
}

export interface Coach {
  id: UUID;
  phone_number: string | null;
  first_name: string;
  last_name: string;
  college_id: UUID | null;
  team_id: UUID;
  title: string;
  user_id: UUID | null;
  coach_statistic_id: UUID | null;
  digest_frequency: EmailFrequency;
  twitter: string | null;
  viewed_new_feature_modal: boolean | null;
  college: College | null;
  team: Team;
  user: User | null;
  coachStatistics: CoachStatistic[];
  notes: Note[];
  profileViews: ProfileView[];
  statuses: RecruitStatus[];
  savedSearches: SavedSearch[];
  columnCustomizations: ColumnCustomization[];
}

export interface CoachStatistic {
  id: string;
  created_at: Date;
  wins: number;
  losses: number;
  coach_id: UUID | null;
  coach: Coach | null;
}

export interface College {
  id: UUID;
  created_at: Date;
  updated_at: Date;
  division: Division;
  conference: string | null;
  domains: string[];
  name: string;
  alternate_names: string[];
  city: string | null;
  state: State | null;
  country: string | null;
  logo_path: string | null;
  photo_url: string | null;
  conference_id: number | null;
  org_id: number | null;
  wins: number | null;
  losses: number | null;
  wl_pct: number | null;
  tier: Tier | null;
  sub_division: SubDivision | null;
  athletes: Athlete[];
  coaches: Coach[];
  teams: Team[];
}

export interface ConversionStatistic {
  id: string;
  created_at: Date;
  defense_attempts: number | null;
  defense_successes: number | null;
  pass_attempts: number | null;
  pass_successes: number | null;
  receiving_attempts: number | null;
  receiving_successes: number | null;
  rush_attempts: number | null;
  rush_successes: number | null;
  athlete_statistic_id: UUID | null;
  AthleteStatistic: AthleteStatistic | null;
}

export interface DefenseStatistic {
  id: string;
  created_at: Date;
  assists: number | null;
  combined: number | null;
  forced_fumbles: number | null;
  fumble_recoveries: number | null;
  interceptions: number | null;
  misc_assists: number | null;
  misc_forced_fumbles: number | null;
  misc_fumble_recoveries: number | null;
  misc_tackles: number | null;
  passes_defended: number | null;
  qb_hits: number | null;
  sack_yards: number | null;
  sacks: number | null;
  safeties: number | null;
  sp_assists: number | null;
  sp_blocks: number | null;
  sp_forced_fumbles: number | null;
  sp_fumble_recoveries: number | null;
  sp_opp_fumble_recoveries: number | null;
  sp_own_fumble_recoveries: number | null;
  sp_tackles: number | null;
  tackles: number | null;
  tloss: number | null;
  tloss_yards: number | null;
  athlete_statistic_id: UUID | null;
  AthleteStatistic: AthleteStatistic | null;
}

export interface ExtraPointStatistic {
  id: string;
  created_at: Date;
  attempts: number | null;
  blocked: number | null;
  made: number | null;
  missed: number | null;
  percent: number | null;
  athlete_statistic_id: UUID | null;
  pct: number | null;
  AthleteStatistic: AthleteStatistic | null;
}

export interface FieldGoalStatistic {
  id: string;
  created_at: Date;
  attempts: number | null;
  attempts_19: number | null;
  attempts_29: number | null;
  attempts_39: number | null;
  attempts_49: number | null;
  attempts_50: number | null;
  avg_yards: number | null;
  blocked: number | null;
  longest: number | null;
  made: number | null;
  made_19: number | null;
  made_29: number | null;
  made_39: number | null;
  made_49: number | null;
  made_50: number | null;
  missed: number | null;
  pct: number | null;
  yards: number | null;
  athlete_statistic_id: UUID | null;
  AthleteStatistic: AthleteStatistic | null;
}

export interface File {
  id: UUID;
  storage_url: string;
  title: string;
  description: string;
  created_at: Date;
  updated_at: Date;
  athlete_id: UUID;
  athlete: Athlete;
}

export interface FumbleStatistic {
  id: string;
  created_at: Date;
  ez_rec_tds: number | null;
  forced_fumbles: number | null;
  fumbles: number | null;
  lost_fumbles: number | null;
  opp_rec: number | null;
  opp_rec_tds: number | null;
  opp_rec_yards: number | null;
  out_of_bounds: number | null;
  own_rec: number | null;
  own_rec_tds: number | null;
  own_rec_yards: number | null;
  athlete_statistic_id: UUID | null;
  AthleteStatistic: AthleteStatistic | null;
}

export interface Highlight {
  id: UUID;
  mux_id: string;
  mux_playback_id: string | null;
  title: string;
  description: string;
  status: VideoStatus;
  created_at: Date;
  updated_at: Date;
  athlete_id: UUID;
  in_message_video: boolean;
  drill_id: UUID | null;
  lift_id: UUID | null;
  athlete: Athlete;
  drill: AthleteDrill | null;
  lift: AthleteLift | null;
}

export interface InterceptionReturnStatistic {
  id: string;
  created_at: Date;
  avg_yards: number | null;
  longest: number | null;
  returns: number | null;
  touchdowns: number | null;
  yards: number | null;
  athlete_statistic_id: UUID | null;
  AthleteStatistic: AthleteStatistic | null;
}

export interface InviteLink {
  id: UUID;
  token: string;
  created_at: Date;
  expires_at: Date;
  email: string;
  is_used: boolean;
  permissions?: any;
  team_id: UUID;
  team: Team;
}

export interface KickReturnStatistic {
  id: string;
  created_at: Date;
  avg_yards: number | null;
  faircatches: number | null;
  longest: number | null;
  returns: number | null;
  touchdowns: number | null;
  yards: number | null;
  athlete_statistic_id: UUID | null;
  longest_touchdown: number | null;
  AthleteStatistic: AthleteStatistic | null;
}

export interface KickoffStatistic {
  id: string;
  created_at: Date;
  endzone: number | null;
  inside_20: number | null;
  kickoffs: number | null;
  out_of_bounds: number | null;
  return_yards: number | null;
  touchbacks: number | null;
  yards: number | null;
  athlete_statistic_id: UUID | null;
  AthleteStatistic: AthleteStatistic | null;
}

export interface Message {
  content: string;
  created_at: Date;
  user_id: UUID;
  id: UUID;
  channel_id: UUID;
  images: string[];
  videos: string[];
  files: string[];
  channel: Channel;
  user: User;
  readBy: MessageRead[];
}

export interface MessageRead {
  id: UUID;
  message_id: UUID;
  channel_participant_id: UUID;
  read_at: Date;
  channelParticipant: ChannelParticipant;
  message: Message;
}

export interface Note {
  id: UUID;
  content: string;
  created_at: Date;
  updated_at: Date;
  athlete_id: UUID;
  team_id: UUID;
  coach_id: UUID;
  is_archived: boolean;
  athlete: Athlete;
  coach: Coach;
  team: Team;
}

export interface NotificationTokens {
  id: UUID;
  device: string | null;
  token: string;
  token_type: string | null;
  user_id: UUID;
  user: User;
}

export interface PassingStatistic {
  id: string;
  created_at: Date;
  yards: number | null;
  avg_yards: number | null;
  sacks: number | null;
  sack_yards: number | null;
  touchdowns: number | null;
  interceptions: number | null;
  athlete_statistic_id: UUID | null;
  attempts: number | null;
  cmp_pct: number | null;
  completions: number | null;
  first_downs: number | null;
  gross_yards: number | null;
  int_touchdowns: number | null;
  longest: number | null;
  longest_touchdown: number | null;
  net_yards: number | null;
  rating: number | null;
  redzone_attempts: number | null;
  air_yards: number | null;
  athleteStatistic: AthleteStatistic | null;
}

export interface PenaltyStatistic {
  id: string;
  created_at: Date;
  yards: number | null;
  first_downs: number | null;
  athlete_statistic_id: UUID | null;
  penalties: number | null;
  athleteStatistic: AthleteStatistic | null;
}

export interface Player {
  id: UUID;
  created_at: Date;
  transfer_id: number;
  ncaa_id: string;
  first_name: string;
  last_name: string;
  division: number | null;
  institution_name: string | null;
  conference_name: string | null;
  status_code: string | null;
  academic_year: number | null;
  org_id: number | null;
  conf_id: number | null;
  ok_to_contact: boolean | null;
  is_transfer_graduate_student: boolean | null;
  is_receiving_athletic_aid: boolean | null;
  sa_transfer_status_id: number | null;
  sa_transfer_status_code: string | null;
  sa_transfer_status_description: string | null;
  tracer_status: string | null;
  from_institution_name: string | null;
  multiple_transfers: boolean | null;
  favorite_id: number | null;
  academic_year_string: string | null;
  sa_transfer_sports: any;
}

export interface PortalPayload {
  id: UUID;
  hash_id: string;
  received_at: Date;
  processed_at: Date;
  fn_version_number: number;
  athlete_metadata: any;
  college_metadata: any;
}

export interface Preferences {
  id: UUID;
  user_id: UUID;
  user: User;
}

export interface ProfileView {
  id: UUID;
  created_at: Date;
  coach_id: UUID;
  athlete_id: UUID;
  athlete: Athlete;
  coach: Coach;
}

export interface PuntReturnStatistic {
  id: string;
  created_at: Date;
  avg_yards: number | null;
  faircatches: number | null;
  longest: number | null;
  returns: number | null;
  touchdowns: number | null;
  yards: number | null;
  athlete_statistic_id: UUID | null;
  longest_touchdown: number | null;
  athleteStatistic: AthleteStatistic | null;
}

export interface PuntStatistic {
  id: string;
  created_at: Date;
  attempts: number | null;
  avg_net_yards: number | null;
  avg_yards: number | null;
  blocked: number | null;
  inside_20: number | null;
  longest: number | null;
  net_yards: number | null;
  return_yards: number | null;
  touchbacks: number | null;
  yards: number | null;
  athlete_statistic_id: UUID | null;
  athleteStatistic: AthleteStatistic | null;
}

export interface ReceivingStatistic {
  id: string;
  created_at: Date;
  avg_yards: number | null;
  receptions: number | null;
  targets: number | null;
  yards: number | null;
  touchdowns: number | null;
  athlete_statistic_id: UUID | null;
  first_downs: number | null;
  longest: number | null;
  longest_touchdown: number | null;
  redzone_targets: number | null;
  yards_after_catch: number | null;
  air_yards: number | null;
  athleteStatistic: AthleteStatistic | null;
}

export interface RecruitStatus {
  id: UUID;
  status: RecruitStatusType;
  athlete_id: UUID;
  created_at: Date;
  team_id: UUID;
  coach_id: UUID | null;
  athlete: Athlete;
  coach: Coach | null;
  team: Team;
}

export interface RushingStatistic {
  id: string;
  created_at: Date;
  avg_yards: number | null;
  touchdowns: number | null;
  athlete_statistic_id: UUID | null;
  attempts: number | null;
  first_downs: number | null;
  longest: number | null;
  longest_touchdown: number | null;
  redzone_attempts: number | null;
  tlost: number | null;
  tlost_yards: number | null;
  yards: number | null;
  athleteStatistic: AthleteStatistic | null;
}

export interface SavedSearch {
  id: UUID;
  filters?: any | null;
  title: string;
  coach_id: UUID;
  created_at: Date;
  type: SavedSearchType;
  team_id: UUID;
  coach: Coach;
  team: Team;
  exclusions: SavedSearchExclusion[];
  inclusions: SavedSearchInclusion[];
}

export interface SavedSearchInclusion {
  id: UUID;
  saved_search_id: UUID;
  athlete_id: UUID;
  created_at: Date;
  athlete: Athlete;
  saved_search: SavedSearch;
}

export interface SavedSearchExclusion {
  id: UUID;
  saved_search_id: UUID;
  athlete_id: UUID;
  created_at: Date;
  athlete: Athlete;
  saved_search: SavedSearch;
}

export interface ScrapedActivity {
  id: UUID;
  created_at: Date;
  athlete_id: UUID | null;
  content: string;
  posted_at: Date;
  athleteId: UUID | null;
  image_url: string | null;
  tweet_id: string;
  Athlete: Athlete | null;
}

export interface ColumnCustomization {
  id: UUID;
  coach_id: UUID;
  column_selection: ColumnType[];
  created_at: Date;
  updated_at: Date;
  coach: Coach;
  list_id: UUID | null;
  list: SavedSearch | null;
  is_default: boolean;
}

export interface NewScrapedActivity {
  id: UUID;
  created_at: Date;
  name: string | null;
  ref_id: string | null;
  content: string | null;
  posted_at: Date;
  position: Position | null;
  status: PortalActivityType | null;
  entry_date: Date | null;
  grad_year: number | null;
  height: number | null;
  weight: number | null;
  school: string | null;
  hometown: string | null;
  last_team: string | null;
  last_team_logo_url: string | null;
  new_team: string | null;
  new_team_logo_url: string | null;
  rating: number | null;
}

export interface Season {
  id: UUID;
  created_at: Date;
  year: number | null;
  type: string | null;
  name: string | null;
  statistics: AthleteStatistic[];
  seasons: AthleteTeamSeason[];
}

export interface Sport {
  id: UUID;
  name: string;
  teams: Team[];
}

export interface Team {
  id: UUID;
  created_at: Date;
  college_id: UUID | null;
  sport_id: UUID;
  name: string;
  alias: string | null;
  photo_url: string | null;
  ncaa_stats_id: string | null;
  school_roster_type: SchoolRosterType | null;
  school_roster_url: string | null;
  sport_radar_id: string | null;
  athletes: Athlete[];
  seasons: AthleteTeamSeason[];
  coaches: Coach[];
  inviteLinks: InviteLink[];
  notes: Note[];
  statueses: RecruitStatus[];
  savedSearches: SavedSearch[];
  college: College | null;
  sport: Sport;
}

export interface User {
  email: string;
  id: UUID;
  created_at: Date;
  user_type: UserType;
  profile_picture: string;
  is_archived: boolean;
  athlete: Athlete | null;
  participants: ChannelParticipant[];
  coach: Coach | null;
  messages: Message[];
  NotificationTokens: NotificationTokens[];
  preferences: Preferences | null;
}

export enum EmailFrequency {
  NEVER = "NEVER",
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  REALTIME = "REALTIME",
}

export enum EnrichmentSource {
  ON3 = "ON3",
  SPORTRADAR = "SPORTRADAR",
  SIDEARM = "SIDEARM",
  NCAA_STATS = "NCAA_STATS",
  PRESTO = "PRESTO",
  WMT = "WMT",
}

export enum PortalActivityType {
  ENTERED = "ENTERED",
  WITHDRAWN = "WITHDRAWN",
  OFFERED = "OFFERED",
  COMMITTED = "COMMITTED",
}

export enum ColumnType {
  player = "player",
  portalEntry = "portalEntry",
  eligibility = "eligibility",
  team = "team",
  position = "position",
  height = "height",
  weight = "weight",
  location = "location",
  recruitStatus = "recruitStatus",
  transferStatus = "transferStatus",
  twitter = "twitter",
  ncaaId = "ncaaId",
  gradYear = "gradYear",
  highSchool = "highSchool",
  division = "division",
  conference = "conference",
  fbsOrFcs = "fbsOrFcs",
  gamesPlayed = "gamesPlayed",
  gamesStarted = "gamesStarted",
  notes = "notes",
  instagram = "instagram",
  ok_to_contact = "ok_to_contact",
}

export enum CommunicationMethod {
  EMAIL = "EMAIL",
  PHONE = "PHONE",
  TWITTER = "TWITTER",
}

export enum Division {
  D1 = "D1",
  D2 = "D2",
  D3 = "D3",
  NAIA = "NAIA",
  JUCO = "JUCO",
}

export enum DrillType {
  FORTY = "FORTY",
  FIVE_TEN_FIVE = "FIVE_TEN_FIVE",
  THREE_CONE = "THREE_CONE",
  BROAD_JUMP = "BROAD_JUMP",
  VERTICAL_JUMP = "VERTICAL_JUMP",
  SHUTTLE = "SHUTTLE",
}

export enum LiftType {
  SQUAT = "SQUAT",
  BENCH = "BENCH",
  DEADLIFT = "DEADLIFT",
  CLEAN = "CLEAN",
  SNATCH = "SNATCH",
  JERK = "JERK",
  CURL = "CURL",
  PRESS = "PRESS",
  ROW = "ROW",
  PULLUP = "PULLUP",
  DIP = "DIP",
  BACK_SQUAT = "BACK_SQUAT",
  POWERCLEAN = "POWERCLEAN",
}

export enum Position {
  QB = "QB",
  RB = "RB",
  WR = "WR",
  TE = "TE",
  OL = "OL",
  DL = "DL",
  LB = "LB",
  DB = "DB",
  K = "K",
  P = "P",
  LS = "LS",
  CB = "CB",
  OT = "OT",
  DE = "DE",
  DT = "DT",
  S = "S",
  FB = "FB",
  OG = "OG",
  C = "C",
  LG = "LG",
  WS = "WS",
  ILB = "ILB",
  NG = "NG",
  RT = "RT",
}

export enum RecruitStatusType {
  IGNORE = "IGNORE",
  EVAL_NEEDED = "EVAL_NEEDED",
  NEEDS_OUTREACH = "NEEDS_OUTREACH",
  OFFER_PROSPECT = "OFFER_PROSPECT",
  OFFERED = "OFFERED",
  COMMIT = "COMMIT",
}

export enum SavedSearchType {
  SMART = "SMART",
  STANDARD = "STANDARD",
}

export enum SchoolRosterType {
  SIDEARM = "SIDEARM",
  PRESTO = "PRESTO",
}

export enum State {
  AL = "AL",
  AK = "AK",
  AZ = "AZ",
  AR = "AR",
  CA = "CA",
  CO = "CO",
  CT = "CT",
  DE = "DE",
  FL = "FL",
  GA = "GA",
  HI = "HI",
  ID = "ID",
  IL = "IL",
  IN = "IN",
  IA = "IA",
  KS = "KS",
  KY = "KY",
  LA = "LA",
  ME = "ME",
  MD = "MD",
  MA = "MA",
  MI = "MI",
  MN = "MN",
  MS = "MS",
  MO = "MO",
  MT = "MT",
  NE = "NE",
  NV = "NV",
  NH = "NH",
  NJ = "NJ",
  NM = "NM",
  NY = "NY",
  NC = "NC",
  ND = "ND",
  OH = "OH",
  OK = "OK",
  OR = "OR",
  PA = "PA",
  RI = "RI",
  SC = "SC",
  SD = "SD",
  TN = "TN",
  TX = "TX",
  UT = "UT",
  VT = "VT",
  VA = "VA",
  WA = "WA",
  WV = "WV",
  WI = "WI",
  WY = "WY",
  DC = "DC",
  AS = "AS",
  GU = "GU",
  MP = "MP",
  PR = "PR",
  VI = "VI",
  AA = "AA",
  AE = "AE",
  AP = "AP",
  CHINA = "CHINA",
  AUSTRALIA = "AUSTRALIA",
  CANADA = "CANADA",
  GERMANY = "GERMANY",
  DENMARK = "DENMARK",
  ENGLAND = "ENGLAND",
  NIGERIA = "NIGERIA",
  LIBERIA = "LIBERIA",
  UNITED_KINGDOM = "UNITED_KINGDOM",
  AMERICAN_SAMOA = "AMERICAN_SAMOA",
  FINLAND = "FINLAND",
  TONGA = "TONGA",
  SWEDEN = "SWEDEN",
  GHANA = "GHANA",
  SOUTH_AFRICA = "SOUTH_AFRICA",
  FRANCE = "FRANCE",
  SWITZERLAND = "SWITZERLAND",
  MEXICO = "MEXICO",
}

export enum SubDivision {
  FBS = "FBS",
  FCS = "FCS",
}

export enum Tier {
  P4 = "P4",
  G5 = "G5",
}

export enum TransferStatus {
  ACTIVE = "ACTIVE",
  TRANSFERRED = "TRANSFERRED",
  RETRACTED = "RETRACTED",
}

export enum UserType {
  COACH = "COACH",
  ATHLETE = "ATHLETE",
}

export enum VideoStatus {
  CREATE = "CREATE",
  ERROR = "ERROR",
  READY = "READY",
}
