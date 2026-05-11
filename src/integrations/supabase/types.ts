export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      adoption_posts: {
        Row: {
          adoption_fee: number | null
          adoption_fee_currency: string | null
          age: string | null
          breed: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_spayed_neutered: boolean | null
          is_vaccinated: boolean | null
          latitude: number | null
          location_label: string
          longitude: number | null
          owner_id: string
          pet_name: string
          pet_type: string
          photo_urls: string[]
          reason: string | null
          size: string | null
          status: string
          temperament: string | null
          updated_at: string
        }
        Insert: {
          adoption_fee?: number | null
          adoption_fee_currency?: string | null
          age?: string | null
          breed?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_spayed_neutered?: boolean | null
          is_vaccinated?: boolean | null
          latitude?: number | null
          location_label: string
          longitude?: number | null
          owner_id: string
          pet_name: string
          pet_type?: string
          photo_urls?: string[]
          reason?: string | null
          size?: string | null
          status?: string
          temperament?: string | null
          updated_at?: string
        }
        Update: {
          adoption_fee?: number | null
          adoption_fee_currency?: string | null
          age?: string | null
          breed?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_spayed_neutered?: boolean | null
          is_vaccinated?: boolean | null
          latitude?: number | null
          location_label?: string
          longitude?: number | null
          owner_id?: string
          pet_name?: string
          pet_type?: string
          photo_urls?: string[]
          reason?: string | null
          size?: string | null
          status?: string
          temperament?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      care_applications: {
        Row: {
          applicant_id: string
          availability_text: string
          created_at: string
          id: string
          last_applied_at: string
          message: string
          rate_offered: string | null
          reapplied_count: number
          request_id: string
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          applicant_id: string
          availability_text: string
          created_at?: string
          id?: string
          last_applied_at?: string
          message: string
          rate_offered?: string | null
          reapplied_count?: number
          request_id: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          availability_text?: string
          created_at?: string
          id?: string
          last_applied_at?: string
          message?: string
          rate_offered?: string | null
          reapplied_count?: number
          request_id?: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_applications_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "care_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      care_requests: {
        Row: {
          archived_at: string | null
          assigned_sitter_id: string | null
          care_type: Database["public"]["Enums"]["care_type"]
          created_at: string
          dog_id: string
          dog_ids: string[] | null
          end_time: string | null
          id: string
          latitude: number | null
          location_label: string | null
          location_source: string | null
          location_text: string
          longitude: number | null
          notes: string | null
          owner_id: string
          pay_amount: number | null
          pay_currency: string | null
          pay_offered: string | null
          request_date: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["request_status"]
          time_window: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          assigned_sitter_id?: string | null
          care_type: Database["public"]["Enums"]["care_type"]
          created_at?: string
          dog_id: string
          dog_ids?: string[] | null
          end_time?: string | null
          id?: string
          latitude?: number | null
          location_label?: string | null
          location_source?: string | null
          location_text: string
          longitude?: number | null
          notes?: string | null
          owner_id: string
          pay_amount?: number | null
          pay_currency?: string | null
          pay_offered?: string | null
          request_date?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          time_window: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          assigned_sitter_id?: string | null
          care_type?: Database["public"]["Enums"]["care_type"]
          created_at?: string
          dog_id?: string
          dog_ids?: string[] | null
          end_time?: string | null
          id?: string
          latitude?: number | null
          location_label?: string | null
          location_source?: string | null
          location_text?: string
          longitude?: number | null
          notes?: string | null
          owner_id?: string
          pay_amount?: number | null
          pay_currency?: string | null
          pay_offered?: string | null
          request_date?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          time_window?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_requests_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      community_comments: {
        Row: {
          context_id: string
          context_type: string
          created_at: string
          id: string
          text: string
          user_id: string
        }
        Insert: {
          context_id: string
          context_type: string
          created_at?: string
          id?: string
          text: string
          user_id: string
        }
        Update: {
          context_id?: string
          context_type?: string
          created_at?: string
          id?: string
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      conversation_reads: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_reads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          context_id: string | null
          context_type: string | null
          created_at: string
          id: string
          last_message: string | null
          participant_ids: string[]
          participant_key: string | null
          updated_at: string
        }
        Insert: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          id?: string
          last_message?: string | null
          participant_ids: string[]
          participant_key?: string | null
          updated_at?: string
        }
        Update: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          id?: string
          last_message?: string | null
          participant_ids?: string[]
          participant_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dog_matches: {
        Row: {
          confidence: string
          created_at: string
          found_dog_id: string
          id: string
          lost_alert_id: string
          match_details: Json | null
          match_score: number
          status: string
          updated_at: string
        }
        Insert: {
          confidence: string
          created_at?: string
          found_dog_id: string
          id?: string
          lost_alert_id: string
          match_details?: Json | null
          match_score: number
          status?: string
          updated_at?: string
        }
        Update: {
          confidence?: string
          created_at?: string
          found_dog_id?: string
          id?: string
          lost_alert_id?: string
          match_details?: Json | null
          match_score?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dog_matches_found_dog_id_fkey"
            columns: ["found_dog_id"]
            isOneToOne: false
            referencedRelation: "found_dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dog_matches_lost_alert_id_fkey"
            columns: ["lost_alert_id"]
            isOneToOne: false
            referencedRelation: "lost_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      dog_members: {
        Row: {
          created_at: string
          dog_id: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["dog_member_role"]
          status: Database["public"]["Enums"]["dog_member_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dog_id: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["dog_member_role"]
          status?: Database["public"]["Enums"]["dog_member_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dog_id?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["dog_member_role"]
          status?: Database["public"]["Enums"]["dog_member_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dog_members_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      dogs: {
        Row: {
          age: string | null
          behavior_description: string | null
          breed: string | null
          coat_shade: string | null
          collar_description: string | null
          created_at: string
          date_of_birth: string | null
          id: string
          is_lost: boolean
          markings: string[] | null
          microchip_no: string | null
          name: string
          notes: string | null
          owner_id: string
          pet_type: string
          photo_url: string | null
          photo_urls: string[] | null
          unique_traits: string[] | null
          updated_at: string
          verification_secret: string | null
          visible_conditions: string | null
          weight: string | null
          weight_unit: string | null
        }
        Insert: {
          age?: string | null
          behavior_description?: string | null
          breed?: string | null
          coat_shade?: string | null
          collar_description?: string | null
          created_at?: string
          date_of_birth?: string | null
          id?: string
          is_lost?: boolean
          markings?: string[] | null
          microchip_no?: string | null
          name: string
          notes?: string | null
          owner_id: string
          pet_type?: string
          photo_url?: string | null
          photo_urls?: string[] | null
          unique_traits?: string[] | null
          updated_at?: string
          verification_secret?: string | null
          visible_conditions?: string | null
          weight?: string | null
          weight_unit?: string | null
        }
        Update: {
          age?: string | null
          behavior_description?: string | null
          breed?: string | null
          coat_shade?: string | null
          collar_description?: string | null
          created_at?: string
          date_of_birth?: string | null
          id?: string
          is_lost?: boolean
          markings?: string[] | null
          microchip_no?: string | null
          name?: string
          notes?: string | null
          owner_id?: string
          pet_type?: string
          photo_url?: string | null
          photo_urls?: string[] | null
          unique_traits?: string[] | null
          updated_at?: string
          verification_secret?: string | null
          visible_conditions?: string | null
          weight?: string | null
          weight_unit?: string | null
        }
        Relationships: []
      }
      donation_campaigns: {
        Row: {
          about: string | null
          caption: string
          category: string
          contact_phone: string | null
          created_at: string
          goal_amount: number
          id: string
          latitude: number | null
          location_label: string | null
          longitude: number | null
          owner_id: string
          photo_urls: string[]
          raised_amount: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          about?: string | null
          caption: string
          category?: string
          contact_phone?: string | null
          created_at?: string
          goal_amount: number
          id?: string
          latitude?: number | null
          location_label?: string | null
          longitude?: number | null
          owner_id: string
          photo_urls?: string[]
          raised_amount?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          about?: string | null
          caption?: string
          category?: string
          contact_phone?: string | null
          created_at?: string
          goal_amount?: number
          id?: string
          latitude?: number | null
          location_label?: string | null
          longitude?: number | null
          owner_id?: string
          photo_urls?: string[]
          raised_amount?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      donation_records: {
        Row: {
          amount: number
          campaign_id: string
          created_at: string
          donor_id: string
          id: string
          is_deleted: boolean
          note: string | null
          receipt_url: string
        }
        Insert: {
          amount: number
          campaign_id: string
          created_at?: string
          donor_id: string
          id?: string
          is_deleted?: boolean
          note?: string | null
          receipt_url: string
        }
        Update: {
          amount?: number
          campaign_id?: string
          created_at?: string
          donor_id?: string
          id?: string
          is_deleted?: boolean
          note?: string | null
          receipt_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "donation_records_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "donation_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      found_dog_replies: {
        Row: {
          created_at: string
          id: string
          post_id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "found_dog_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "found_dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      found_dogs: {
        Row: {
          ai_attributes: Json | null
          confidence_level: string | null
          created_at: string
          description: string | null
          finder_observations: Json | null
          found_at: string
          id: string
          image_quality: string | null
          latitude: number | null
          location_label: string
          location_source: string | null
          longitude: number | null
          matched_alert_id: string | null
          pet_type: string
          photo_urls: string[]
          reporter_id: string
          status: Database["public"]["Enums"]["found_dog_status"]
          updated_at: string
        }
        Insert: {
          ai_attributes?: Json | null
          confidence_level?: string | null
          created_at?: string
          description?: string | null
          finder_observations?: Json | null
          found_at: string
          id?: string
          image_quality?: string | null
          latitude?: number | null
          location_label: string
          location_source?: string | null
          longitude?: number | null
          matched_alert_id?: string | null
          pet_type?: string
          photo_urls?: string[]
          reporter_id: string
          status?: Database["public"]["Enums"]["found_dog_status"]
          updated_at?: string
        }
        Update: {
          ai_attributes?: Json | null
          confidence_level?: string | null
          created_at?: string
          description?: string | null
          finder_observations?: Json | null
          found_at?: string
          id?: string
          image_quality?: string | null
          latitude?: number | null
          location_label?: string
          location_source?: string | null
          longitude?: number | null
          matched_alert_id?: string | null
          pet_type?: string
          photo_urls?: string[]
          reporter_id?: string
          status?: Database["public"]["Enums"]["found_dog_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "found_dogs_matched_alert_id_fkey"
            columns: ["matched_alert_id"]
            isOneToOne: false
            referencedRelation: "lost_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      health_logs: {
        Row: {
          created_at: string
          dog_id: string
          id: string
          log_type: Database["public"]["Enums"]["log_type"]
          notes: string | null
          owner_id: string
          value: string | null
        }
        Insert: {
          created_at?: string
          dog_id: string
          id?: string
          log_type: Database["public"]["Enums"]["log_type"]
          notes?: string | null
          owner_id: string
          value?: string | null
        }
        Update: {
          created_at?: string
          dog_id?: string
          id?: string
          log_type?: Database["public"]["Enums"]["log_type"]
          notes?: string | null
          owner_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_logs_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      lost_alerts: {
        Row: {
          created_at: string
          description: string
          dog_id: string
          id: string
          last_seen_location: string
          last_seen_time: string | null
          latitude: number | null
          location_label: string | null
          location_source: string | null
          longitude: number | null
          owner_id: string
          photo_url: string | null
          resolved_at: string | null
          search_radius_km: number | null
          status: Database["public"]["Enums"]["alert_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          dog_id: string
          id?: string
          last_seen_location: string
          last_seen_time?: string | null
          latitude?: number | null
          location_label?: string | null
          location_source?: string | null
          longitude?: number | null
          owner_id: string
          photo_url?: string | null
          resolved_at?: string | null
          search_radius_km?: number | null
          status?: Database["public"]["Enums"]["alert_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          dog_id?: string
          id?: string
          last_seen_location?: string
          last_seen_time?: string | null
          latitude?: number | null
          location_label?: string | null
          location_source?: string | null
          longitude?: number | null
          owner_id?: string
          photo_url?: string | null
          resolved_at?: string | null
          search_radius_km?: number | null
          status?: Database["public"]["Enums"]["alert_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lost_alerts_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      med_records: {
        Row: {
          created_at: string
          date_given: string
          dog_id: string
          duration_unit: Database["public"]["Enums"]["duration_unit"]
          duration_value: number
          expires_on: string
          id: string
          name: string
          notes: string | null
          owner_id: string
          record_type: Database["public"]["Enums"]["med_record_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_given: string
          dog_id: string
          duration_unit: Database["public"]["Enums"]["duration_unit"]
          duration_value: number
          expires_on: string
          id?: string
          name: string
          notes?: string | null
          owner_id: string
          record_type: Database["public"]["Enums"]["med_record_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_given?: string
          dog_id?: string
          duration_unit?: Database["public"]["Enums"]["duration_unit"]
          duration_value?: number
          expires_on?: string
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          record_type?: Database["public"]["Enums"]["med_record_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "med_records_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          image_url: string | null
          sender_id: string
          text: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          sender_id: string
          text: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          sender_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          body_params: Json | null
          created_at: string
          id: string
          is_read: boolean
          link_id: string | null
          link_type: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body: string
          body_params?: Json | null
          created_at?: string
          id?: string
          is_read?: boolean
          link_id?: string | null
          link_type?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string
          body_params?: Json | null
          created_at?: string
          id?: string
          is_read?: boolean
          link_id?: string | null
          link_type?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price: number
          product_id: string
          product_image: string | null
          product_title: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price: number
          product_id: string
          product_image?: string | null
          product_title: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price?: number
          product_id?: string
          product_image?: string | null
          product_title?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          contact_info: string | null
          created_at: string
          currency: string
          id: string
          seller_id: string
          shipping_note: string | null
          status: string
          total_price: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          contact_info?: string | null
          created_at?: string
          currency?: string
          id?: string
          seller_id: string
          shipping_note?: string | null
          status?: string
          total_price?: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          contact_info?: string | null
          created_at?: string
          currency?: string
          id?: string
          seller_id?: string
          shipping_note?: string | null
          status?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      pet_spots: {
        Row: {
          category: Database["public"]["Enums"]["spot_category"]
          contact_phone: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          latitude: number | null
          location_label: string
          longitude: number | null
          name: string
          offers_bookings: boolean
          opening_hours: string | null
          photo_urls: string[]
          status: Database["public"]["Enums"]["spot_status"]
          updated_at: string
          website: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["spot_category"]
          contact_phone?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          latitude?: number | null
          location_label: string
          longitude?: number | null
          name: string
          offers_bookings?: boolean
          opening_hours?: string | null
          photo_urls?: string[]
          status?: Database["public"]["Enums"]["spot_status"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["spot_category"]
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          latitude?: number | null
          location_label?: string
          longitude?: number | null
          name?: string
          offers_bookings?: boolean
          opening_hours?: string | null
          photo_urls?: string[]
          status?: Database["public"]["Enums"]["spot_status"]
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      phone_otps: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          phone_e164: string
          user_id: string
          verified: boolean
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          phone_e164: string
          user_id: string
          verified?: boolean
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone_e164?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          created_at: string
          id: string
          post_id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_product_tags: {
        Row: {
          created_at: string
          id: string
          photo_index: number
          post_id: string
          product_id: string
          tagged_by: string
          x_pct: number
          y_pct: number
        }
        Insert: {
          created_at?: string
          id?: string
          photo_index?: number
          post_id: string
          product_id: string
          tagged_by: string
          x_pct?: number
          y_pct?: number
        }
        Update: {
          created_at?: string
          id?: string
          photo_index?: number
          post_id?: string
          product_id?: string
          tagged_by?: string
          x_pct?: number
          y_pct?: number
        }
        Relationships: []
      }
      posts: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          photo_url: string | null
          photo_urls: string[] | null
          repost_id: string | null
          updated_at: string
          user_id: string
          visibility: Database["public"]["Enums"]["post_visibility"]
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          photo_url?: string | null
          photo_urls?: string[] | null
          repost_id?: string | null
          updated_at?: string
          user_id: string
          visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          photo_url?: string | null
          photo_urls?: string[] | null
          repost_id?: string | null
          updated_at?: string
          user_id?: string
          visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "posts_repost_id_fkey"
            columns: ["repost_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          contact_phone: string | null
          contact_url: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          photo_urls: string[]
          price: number
          seller_id: string
          status: string
          stock: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          contact_phone?: string | null
          contact_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          photo_urls?: string[]
          price: number
          seller_id: string
          status?: string
          stock?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          contact_phone?: string | null
          contact_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          photo_urls?: string[]
          price?: number
          seller_id?: string
          status?: string
          stock?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          display_name: string | null
          first_name: string | null
          id: string
          last_name: string | null
          postal_code: string | null
          preferred_language: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          postal_code?: string | null
          preferred_language?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          postal_code?: string | null
          preferred_language?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      reposts: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reposts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_posts: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_profiles: {
        Row: {
          address_city: string | null
          address_country: string | null
          address_line1: string | null
          address_line2: string | null
          address_postal_code: string | null
          address_state: string | null
          business_name: string | null
          business_type: Database["public"]["Enums"]["business_type"] | null
          contact_info: string | null
          created_at: string
          date_of_birth: string | null
          id: string
          id_number_last4: string | null
          id_type: string | null
          identity_status: Database["public"]["Enums"]["identity_status"]
          is_active: boolean
          legal_first_name: string | null
          legal_last_name: string | null
          phone_e164: string | null
          phone_verified_at: string | null
          policy_accepted_at: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          seller_status: Database["public"]["Enums"]["seller_status"]
          status: string
          store_description: string | null
          store_logo_url: string | null
          store_name: string
          submitted_at: string | null
          suspension_reason: string | null
          tax_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_city?: string | null
          address_country?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_postal_code?: string | null
          address_state?: string | null
          business_name?: string | null
          business_type?: Database["public"]["Enums"]["business_type"] | null
          contact_info?: string | null
          created_at?: string
          date_of_birth?: string | null
          id?: string
          id_number_last4?: string | null
          id_type?: string | null
          identity_status?: Database["public"]["Enums"]["identity_status"]
          is_active?: boolean
          legal_first_name?: string | null
          legal_last_name?: string | null
          phone_e164?: string | null
          phone_verified_at?: string | null
          policy_accepted_at?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seller_status?: Database["public"]["Enums"]["seller_status"]
          status?: string
          store_description?: string | null
          store_logo_url?: string | null
          store_name: string
          submitted_at?: string | null
          suspension_reason?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_city?: string | null
          address_country?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_postal_code?: string | null
          address_state?: string | null
          business_name?: string | null
          business_type?: Database["public"]["Enums"]["business_type"] | null
          contact_info?: string | null
          created_at?: string
          date_of_birth?: string | null
          id?: string
          id_number_last4?: string | null
          id_type?: string | null
          identity_status?: Database["public"]["Enums"]["identity_status"]
          is_active?: boolean
          legal_first_name?: string | null
          legal_last_name?: string | null
          phone_e164?: string | null
          phone_verified_at?: string | null
          policy_accepted_at?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seller_status?: Database["public"]["Enums"]["seller_status"]
          status?: string
          store_description?: string | null
          store_logo_url?: string | null
          store_name?: string
          submitted_at?: string | null
          suspension_reason?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seller_verification_documents: {
        Row: {
          id: string
          kind: Database["public"]["Enums"]["document_kind"]
          seller_profile_id: string
          storage_path: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          id?: string
          kind: Database["public"]["Enums"]["document_kind"]
          seller_profile_id: string
          storage_path: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          id?: string
          kind?: Database["public"]["Enums"]["document_kind"]
          seller_profile_id?: string
          storage_path?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_verification_documents_seller_profile_id_fkey"
            columns: ["seller_profile_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sightings: {
        Row: {
          alert_id: string
          created_at: string
          id: string
          location_text: string | null
          media_urls: string[] | null
          message: string
          reporter_id: string
        }
        Insert: {
          alert_id: string
          created_at?: string
          id?: string
          location_text?: string | null
          media_urls?: string[] | null
          message: string
          reporter_id: string
        }
        Update: {
          alert_id?: string
          created_at?: string
          id?: string
          location_text?: string | null
          media_urls?: string[] | null
          message?: string
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sightings_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "lost_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      sitter_logs: {
        Row: {
          created_at: string
          dog_id: string
          id: string
          log_type: Database["public"]["Enums"]["sitter_log_type"]
          media_urls: string[] | null
          note_text: string | null
          owner_id: string
          request_id: string
          sitter_id: string
        }
        Insert: {
          created_at?: string
          dog_id: string
          id?: string
          log_type: Database["public"]["Enums"]["sitter_log_type"]
          media_urls?: string[] | null
          note_text?: string | null
          owner_id: string
          request_id: string
          sitter_id: string
        }
        Update: {
          created_at?: string
          dog_id?: string
          id?: string
          log_type?: Database["public"]["Enums"]["sitter_log_type"]
          media_urls?: string[] | null
          note_text?: string | null
          owner_id?: string
          request_id?: string
          sitter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sitter_logs_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sitter_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "care_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      spot_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          spot_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          spot_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          spot_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spot_reviews_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "pet_spots"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          display_name: string | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_update_seller_status: {
        Args: {
          p_new_status: Database["public"]["Enums"]["seller_status"]
          p_reason?: string
          p_seller_profile_id: string
        }
        Returns: undefined
      }
      create_mention_notification: {
        Args: {
          p_comment_text: string
          p_mentioned_user_id: string
          p_post_id: string
        }
        Returns: undefined
      }
      generate_participant_key: { Args: { p_ids: string[] }; Returns: string }
      get_adoption_contact_phone: {
        Args: { p_post_id: string }
        Returns: string
      }
      get_dog_microchip: { Args: { p_dog_id: string }; Returns: string }
      get_dog_verification_secret: {
        Args: { p_dog_id: string }
        Returns: string
      }
      get_donation_contact_phone: {
        Args: { p_campaign_id: string }
        Returns: string
      }
      get_mention_suggestions: {
        Args: { p_limit?: number; p_query?: string; p_user_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          match_type: string
          score: number
          user_id: string
          username: string
        }[]
      }
      get_or_create_conversation: {
        Args: {
          p_context_id?: string
          p_context_type?: string
          p_user_id_1: string
          p_user_id_2: string
        }
        Returns: string
      }
      get_profile_location: {
        Args: { target_user_id: string }
        Returns: {
          city: string
          postal_code: string
        }[]
      }
      get_public_profiles: {
        Args: never
        Returns: {
          avatar_url: string
          bio: string
          display_name: string
          user_id: string
          username: string
        }[]
      }
      get_public_seller_profile: {
        Args: { p_user_id: string }
        Returns: {
          contact_info: string
          created_at: string
          id: string
          is_active: boolean
          seller_status: Database["public"]["Enums"]["seller_status"]
          store_description: string
          store_logo_url: string
          store_name: string
          user_id: string
        }[]
      }
      get_share_suggestions: {
        Args: { p_limit?: number; p_query?: string; p_user_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          score: number
          user_id: string
          username: string
        }[]
      }
      get_user_id_by_email: { Args: { lookup_email: string }; Returns: string }
      get_user_id_by_username: { Args: { p_username: string }; Returns: string }
      has_dog_access: {
        Args: { p_dog_id: string; p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_dog_owner: {
        Args: { p_dog_id: string; p_user_id: string }
        Returns: boolean
      }
      is_following: {
        Args: { p_follower_id: string; p_following_id: string }
        Returns: boolean
      }
    }
    Enums: {
      alert_status: "active" | "resolved"
      app_role: "admin" | "moderator" | "user"
      application_status: "pending" | "approved" | "declined" | "withdrawn"
      business_type: "individual" | "business"
      care_type: "walk" | "watch" | "overnight" | "check-in"
      document_kind: "id_front" | "id_back" | "selfie"
      dog_member_role: "owner" | "coparent"
      dog_member_status: "invited" | "active" | "removed"
      duration_unit: "days" | "months" | "years"
      found_dog_status: "active" | "reunited" | "closed"
      identity_status: "not_started" | "pending" | "verified" | "rejected"
      log_type: "walk" | "food" | "meds" | "mood" | "symptom"
      med_record_type: "vaccine" | "medication"
      notification_type:
        | "assigned_job_owner"
        | "assigned_job_sitter"
        | "lost_dog_nearby"
        | "care_request_nearby"
        | "medication_expiring"
        | "sighting_reported"
        | "new_application"
        | "application_withdrawn"
        | "care_reapply"
        | "found_dog_reply"
        | "dog_invite"
        | "dog_invite_accepted"
        | "dog_invite_declined"
        | "post_comment_mention"
        | "new_follower"
        | "post_comment"
        | "post_like"
        | "post_repost"
        | "seller_status_changed"
      post_visibility: "public" | "friends" | "private"
      request_status: "open" | "closed"
      seller_status:
        | "draft"
        | "pending_verification"
        | "approved"
        | "rejected"
        | "suspended"
      sitter_log_type: "walk" | "meal" | "potty" | "play" | "note"
      spot_category:
        | "food_drink"
        | "shops_malls"
        | "outdoor_stays"
        | "pet_services"
      spot_status: "active" | "closed" | "flagged"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alert_status: ["active", "resolved"],
      app_role: ["admin", "moderator", "user"],
      application_status: ["pending", "approved", "declined", "withdrawn"],
      business_type: ["individual", "business"],
      care_type: ["walk", "watch", "overnight", "check-in"],
      document_kind: ["id_front", "id_back", "selfie"],
      dog_member_role: ["owner", "coparent"],
      dog_member_status: ["invited", "active", "removed"],
      duration_unit: ["days", "months", "years"],
      found_dog_status: ["active", "reunited", "closed"],
      identity_status: ["not_started", "pending", "verified", "rejected"],
      log_type: ["walk", "food", "meds", "mood", "symptom"],
      med_record_type: ["vaccine", "medication"],
      notification_type: [
        "assigned_job_owner",
        "assigned_job_sitter",
        "lost_dog_nearby",
        "care_request_nearby",
        "medication_expiring",
        "sighting_reported",
        "new_application",
        "application_withdrawn",
        "care_reapply",
        "found_dog_reply",
        "dog_invite",
        "dog_invite_accepted",
        "dog_invite_declined",
        "post_comment_mention",
        "new_follower",
        "post_comment",
        "post_like",
        "post_repost",
        "seller_status_changed",
      ],
      post_visibility: ["public", "friends", "private"],
      request_status: ["open", "closed"],
      seller_status: [
        "draft",
        "pending_verification",
        "approved",
        "rejected",
        "suspended",
      ],
      sitter_log_type: ["walk", "meal", "potty", "play", "note"],
      spot_category: [
        "food_drink",
        "shops_malls",
        "outdoor_stays",
        "pet_services",
      ],
      spot_status: ["active", "closed", "flagged"],
    },
  },
} as const
