import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder-momo.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured =
  supabaseUrl !== 'https://placeholder-momo.supabase.co' &&
  Boolean(supabaseAnonKey && supabaseAnonKey !== 'placeholder-anon-key');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
};

export type Moment = {
  id: string;
  owner_id: string;
  caption: string | null;
  media_url: string;
  created_at: string;
  group_id?: string | null;
  group_name?: string | null;
  reactions?: Record<string, number>;
  user_reaction?: string | null;
  owner?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
};

export type Friend = {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  friend?: Profile;
};

export type FriendRequest = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  sender?: Profile;
  receiver?: Profile;
};

export type Group = {
  id: string;
  name: string;
  avatar_url: string | null;
  owner_id: string;
  created_at: string;
  member_count?: number;
};
