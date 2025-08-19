import type { Enums, Tables, Database } from '$lib/supabaseTypes';

export type User = Tables<'users'>;
export type Setup = Tables<'setups'>;
export type SetupVariant = Tables<'setup_variants'>;
export type SetupOQBPath = Tables<'setup_oqb_paths'>;
export type SetupTranslations = Tables<'setup_translations'>;
export type Statistic = Tables<'statistics'>;
export type SaveData = Tables<'save_data'>;
export type Save = Tables<'saves'>;
export type SaveTranslation = Tables<'save_translations'>;
export type SetupSet = Tables<'setup_sets'>;
export type SSet = Tables<'sets'>;
export type SetTranslation = Tables<'set_translations'>;
export type SetPath = Tables<'set_paths'>;

export type Kicktable = Enums<'kicktable'>;
export type HoldType = Enums<'hold_type'>;
export type Status = Enums<'status'>;
export type SetupType = Enums<'setup_type'>;

export type SetupData = Setup &
  Statistic & {
    variants: Database['public']['CompositeTypes']['setup_variants_data'][];
    saves: Database['public']['CompositeTypes']['setup_saves_data'][];
    cover_description: string;
  };

export type Result<T> = Promise<{ data: T; error: null } | { data: null; error: Error }>;

type RegexMatchedString<Pattern extends string> = `${string & { __brand: Pattern }}`;

export type SetupID = RegexMatchedString<'^[1-9][0-9a-f]{11}$'>;
export type Piece = RegexMatchedString<'^[TILJSZO]$'>;
export type Queue = RegexMatchedString<'^[TILJSZO]+$'>;
export type Fumen = RegexMatchedString<'^v115@[A-Za-z0-9+/?]+$'>;
