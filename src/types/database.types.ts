// Hand-written to match supabase/migrations exactly.
// Regenerate against a live project with:
//   npx supabase gen types typescript --project-id <ref> --schema public > src/types/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          role: Database['public']['Enums']['user_role']
          phone: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string
          role?: Database['public']['Enums']['user_role']
          phone?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          role?: Database['public']['Enums']['user_role']
          phone?: string | null
          active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          id: string
          full_name: string
          known_as: string
          phone: string
          alt_phone: string | null
          national_id: string
          address: string
          category: Database['public']['Enums']['product_category']
          total_amount: number
          down_payment: number
          remaining_amount: number
          monthly_installment: number
          guarantor_name: string | null
          guarantor_relation: string | null
          guarantor_phone: string | null
          guarantor_address: string | null
          trust_receipt: boolean
          legal_status: Database['public']['Enums']['legal_status']
          national_id_photo: string | null
          archived_at: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          full_name: string
          known_as: string
          phone: string
          alt_phone?: string | null
          national_id: string
          address: string
          category: Database['public']['Enums']['product_category']
          total_amount: number
          down_payment?: number
          remaining_amount?: number
          monthly_installment: number
          guarantor_name?: string | null
          guarantor_relation?: string | null
          guarantor_phone?: string | null
          guarantor_address?: string | null
          trust_receipt: boolean
          legal_status?: Database['public']['Enums']['legal_status']
          national_id_photo?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          known_as?: string
          phone?: string
          alt_phone?: string | null
          national_id?: string
          address?: string
          category?: Database['public']['Enums']['product_category']
          total_amount?: number
          down_payment?: number
          remaining_amount?: number
          monthly_installment?: number
          guarantor_name?: string | null
          guarantor_relation?: string | null
          guarantor_phone?: string | null
          guarantor_address?: string | null
          trust_receipt?: boolean
          legal_status?: Database['public']['Enums']['legal_status']
          national_id_photo?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'customers_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      customer_payments: {
        Row: {
          id: string
          customer_id: string
          amount: number
          payment_date: string
          collected_by: string | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          amount: number
          payment_date?: string
          collected_by?: string | null
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          amount?: number
          payment_date?: string
          collected_by?: string | null
          note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'customer_payments_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'customer_payments_collected_by_fkey'
            columns: ['collected_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      suppliers: {
        Row: {
          id: string
          name: string
          trade_type: Database['public']['Enums']['product_category']
          phone_1: string | null
          phone_2: string | null
          total_owed: number
          remaining_amount: number
          monthly_payment: number
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          trade_type: Database['public']['Enums']['product_category']
          phone_1?: string | null
          phone_2?: string | null
          total_owed?: number
          remaining_amount?: number
          monthly_payment?: number
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          trade_type?: Database['public']['Enums']['product_category']
          phone_1?: string | null
          phone_2?: string | null
          total_owed?: number
          remaining_amount?: number
          monthly_payment?: number
          created_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'suppliers_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      supplier_payments: {
        Row: {
          id: string
          supplier_id: string
          amount: number
          payment_date: string
          note: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          supplier_id: string
          amount: number
          payment_date?: string
          note?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          supplier_id?: string
          amount?: number
          payment_date?: string
          note?: string | null
          created_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'supplier_payments_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
        ]
      }
      supplier_invoices: {
        Row: {
          id: string
          supplier_id: string
          invoice_number: string
          amount: number
          invoice_date: string
          file_path: string | null
          note: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          supplier_id: string
          invoice_number: string
          amount: number
          invoice_date?: string
          file_path?: string | null
          note?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          supplier_id?: string
          invoice_number?: string
          amount?: number
          invoice_date?: string
          file_path?: string | null
          note?: string | null
          created_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'supplier_invoices_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
        ]
      }
      capital_entries: {
        Row: {
          id: string
          amount: number
          entry_type: Database['public']['Enums']['capital_entry_type']
          note: string | null
          entry_date: string
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          amount: number
          entry_type: Database['public']['Enums']['capital_entry_type']
          note?: string | null
          entry_date?: string
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          amount?: number
          entry_type?: Database['public']['Enums']['capital_entry_type']
          note?: string | null
          entry_date?: string
          created_at?: string
          created_by?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      dashboard_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_capital: number
          total_collected: number
          collected_today: number
          collected_this_month: number
          total_outstanding: number
          total_owed_suppliers: number
        }[]
      }
      collections_by_category: {
        Args: Record<PropertyKey, never>
        Returns: {
          category: Database['public']['Enums']['product_category']
          total: number
        }[]
      }
      daily_collections: {
        Args: { p_days?: number }
        Returns: {
          day: string
          total: number
        }[]
      }
      customer_performance: {
        Args: { p_customer_id: string }
        Returns: {
          month_start: string
          expected: number
          paid: number
          status: string
        }[]
      }
      today_payments: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          customer_id: string
          customer_name: string
          amount: number
          collector_name: string
          created_at: string
        }[]
      }
    }
    Enums: {
      user_role: 'owner' | 'collector'
      product_category: 'household' | 'appliances' | 'furniture'
      legal_status: 'clean' | 'in_litigation'
      capital_entry_type: 'deposit' | 'withdrawal'
    }
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
export type Functions<T extends keyof Database['public']['Functions']> =
  Database['public']['Functions'][T]['Returns']
