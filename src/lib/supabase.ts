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
  media_urls?: string[];
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

export type Photo = {
  id: string;
  owner_id: string;
  object_path: string;
  thumbnail_path: string;
  caption?: string | null;
  mime_type: string;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  thumbnail_size_bytes: number | null;
  created_at: string;
  deleted_at: string | null;
  owner?: Profile;
  thumbnail_url?: string;
  main_url?: string;
};

export type Friendship = {
  id: string;
  user_low: string;
  user_high: string;
  requested_by: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  created_at: string;
  updated_at: string;
  other_profile?: Profile;
};

export type PhotoDeletionJob = {
  id: string;
  photo_id: string;
  owner_id: string;
  object_path: string;
  thumbnail_path: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  sender_id: string;
  receiver_id?: string | null;
  group_id?: string | null;
  content: string | null;
  media_url?: string | null;
  reply_to_id?: string | null;
  reply_to?: Message | null;
  reactions?: Record<string, number>;
  user_reaction?: string | null;
  created_at: string;
  sender?: Profile;
  status?: 'sending' | 'sent' | 'error';
};

export type GroupMember = {
  id: string;
  group_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
  profile?: Profile;
};
