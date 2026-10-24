export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      account_data: {
        Row: { user_id: string; revision: number; data: Json; updated_at: string };
        Insert: { user_id: string; revision?: number; data: Json; updated_at?: string };
        Update: { revision?: number; data?: Json; updated_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      sync_account_data: {
        Args: { p_data: Json; p_expected_revision: number };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
