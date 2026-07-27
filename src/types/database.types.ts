// Generated from the live Supabase schema. Do not hand-edit.
// Regenerate after any migration with:
//   npx supabase gen types typescript --project-id <ref> --schema public > src/types/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      capital_entries: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          entry_date: string
          entry_type: Database['public']['Enums']['capital_entry_type']
          id: string
          note: string | null
          org_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          entry_date?: string
          entry_type: Database['public']['Enums']['capital_entry_type']
          id?: string
          note?: string | null
          org_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          entry_date?: string
          entry_type?: Database['public']['Enums']['capital_entry_type']
          id?: string
          note?: string | null
          org_id?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          archived_at: string | null
          category: Database['public']['Enums']['product_category']
          contract_start_date: string
          created_at: string
          created_by: string | null
          customer_id: string
          down_payment: number
          id: string
          monthly_installment: number
          note: string | null
          org_id: string
          payment_window: Database['public']['Enums']['payment_window']
          remaining_amount: number
          total_amount: number
          trust_receipt: boolean
        }
        Insert: {
          archived_at?: string | null
          category: Database['public']['Enums']['product_category']
          contract_start_date: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          down_payment?: number
          id?: string
          monthly_installment: number
          note?: string | null
          org_id?: string
          payment_window?: Database['public']['Enums']['payment_window']
          remaining_amount?: number
          total_amount: number
          trust_receipt?: boolean
        }
        Update: {
          archived_at?: string | null
          category?: Database['public']['Enums']['product_category']
          contract_start_date?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          down_payment?: number
          id?: string
          monthly_installment?: number
          note?: string | null
          org_id?: string
          payment_window?: Database['public']['Enums']['payment_window']
          remaining_amount?: number
          total_amount?: number
          trust_receipt?: boolean
        }
        Relationships: []
      }
      customer_payments: {
        Row: {
          amount: number
          collected_by: string | null
          contract_id: string
          created_at: string
          id: string
          note: string | null
          org_id: string
          payment_date: string
        }
        Insert: {
          amount: number
          collected_by?: string | null
          contract_id: string
          created_at?: string
          id?: string
          note?: string | null
          org_id?: string
          payment_date?: string
        }
        Update: {
          amount?: number
          collected_by?: string | null
          contract_id?: string
          created_at?: string
          id?: string
          note?: string | null
          org_id?: string
          payment_date?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string
          alt_phone: string | null
          archived_at: string | null
          created_at: string
          created_by: string | null
          full_name: string
          guarantor_address: string | null
          guarantor_name: string | null
          guarantor_phone: string | null
          guarantor_relation: string | null
          id: string
          known_as: string
          legal_status: Database['public']['Enums']['legal_status']
          national_id: string
          national_id_photo: string | null
          org_id: string
          phone: string
        }
        Insert: {
          address: string
          alt_phone?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          full_name: string
          guarantor_address?: string | null
          guarantor_name?: string | null
          guarantor_phone?: string | null
          guarantor_relation?: string | null
          id?: string
          known_as: string
          legal_status?: Database['public']['Enums']['legal_status']
          national_id: string
          national_id_photo?: string | null
          org_id?: string
          phone: string
        }
        Update: {
          address?: string
          alt_phone?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          full_name?: string
          guarantor_address?: string | null
          guarantor_name?: string | null
          guarantor_phone?: string | null
          guarantor_relation?: string | null
          id?: string
          known_as?: string
          legal_status?: Database['public']['Enums']['legal_status']
          national_id?: string
          national_id_photo?: string | null
          org_id?: string
          phone?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          address: string | null
          created_at: string
          id: string
          max_collectors: number
          name: string
          owner_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          max_collectors?: number
          name: string
          owner_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          max_collectors?: number
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          full_name: string
          id: string
          org_id: string
          phone: string | null
          role: Database['public']['Enums']['user_role']
        }
        Insert: {
          active?: boolean
          created_at?: string
          full_name?: string
          id: string
          org_id: string
          phone?: string | null
          role?: Database['public']['Enums']['user_role']
        }
        Update: {
          active?: boolean
          created_at?: string
          full_name?: string
          id?: string
          org_id?: string
          phone?: string | null
          role?: Database['public']['Enums']['user_role']
        }
        Relationships: []
      }
      supplier_invoices: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          file_path: string | null
          id: string
          invoice_date: string
          invoice_number: string
          note: string | null
          org_id: string
          supplier_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          file_path?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          note?: string | null
          org_id?: string
          supplier_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          file_path?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          note?: string | null
          org_id?: string
          supplier_id?: string
        }
        Relationships: []
      }
      supplier_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          org_id: string
          payment_date: string
          supplier_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          org_id?: string
          payment_date?: string
          supplier_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          org_id?: string
          payment_date?: string
          supplier_id?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          monthly_payment: number
          name: string
          org_id: string
          phone_1: string | null
          phone_2: string | null
          remaining_amount: number
          total_owed: number
          trade_type: Database['public']['Enums']['product_category']
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          monthly_payment?: number
          name: string
          org_id?: string
          phone_1?: string | null
          phone_2?: string | null
          remaining_amount?: number
          total_owed?: number
          trade_type: Database['public']['Enums']['product_category']
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          monthly_payment?: number
          name?: string
          org_id?: string
          phone_1?: string | null
          phone_2?: string | null
          remaining_amount?: number
          total_owed?: number
          trade_type?: Database['public']['Enums']['product_category']
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      collections_by_category: {
        Args: Record<string, never>
        Returns: {
          category: Database['public']['Enums']['product_category']
          total: number
        }[]
      }
      customer_performance: {
        Args: { p_customer_id: string }
        Returns: {
          expected: number
          month_start: string
          paid: number
          status: string
        }[]
      }
      daily_collections: {
        Args: { p_days?: number }
        Returns: {
          day: string
          total: number
        }[]
      }
      dashboard_summary: {
        Args: Record<string, never>
        Returns: {
          collected_this_month: number
          collected_today: number
          total_capital: number
          total_collected: number
          total_outstanding: number
          total_owed_suppliers: number
        }[]
      }
      today_payments: {
        Args: Record<string, never>
        Returns: {
          amount: number
          collector_name: string
          created_at: string
          customer_id: string
          customer_name: string
          id: string
        }[]
      }
    }
    Enums: {
      capital_entry_type: 'deposit' | 'withdrawal'
      legal_status: 'clean' | 'in_litigation'
      payment_window: 'early' | 'mid' | 'late'
      product_category: 'household' | 'appliances' | 'furniture'
      user_role: 'owner' | 'collector'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      capital_entry_type: ['deposit', 'withdrawal'],
      legal_status: ['clean', 'in_litigation'],
      payment_window: ['early', 'mid', 'late'],
      product_category: ['household', 'appliances', 'furniture'],
      user_role: ['owner', 'collector'],
    },
  },
} as const
