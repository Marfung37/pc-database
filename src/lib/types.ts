import type { Enums, Tables } from '$lib/supabaseTypes';

export type User = Tables<'users'>;
export type Setup = Tables<'setups'>;
export type SetupVariant = Tables<'setup_variants'>;
export type SetupOQBLink = Tables<'setup_oqb_links'>;
export type Statistic = Tables<'statistics'>;
export type SaveData = Tables<'save_data'>;
export type Save = Tables<'saves'>;

export type Kicktable = Enums<'kicktable'>;
export type HoldType = Enums<'hold_type'>;
export type Status = Enums<'status'>;

export type Result<T> = Promise<{ data: T; error: null } | { data: null; error: Error }>;

type RegexMatchedString<Pattern extends string> = `${string & { __brand: Pattern }}`;

export type SetupID = RegexMatchedString<'^[1-9][0-9a-f]{11}$'>;
export type Piece = RegexMatchedString<'^[TILJSZO]$'>;
export type Queue = RegexMatchedString<'^[TILJSZO]+$'>;
export type Fumen = RegexMatchedString<'^v115@[A-Za-z0-9+/?]+$'>;
