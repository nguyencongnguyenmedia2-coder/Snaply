import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured, Profile } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    username: string,
    displayName: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const DEMO_USER: User = {
  id: 'demo-user-1234',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'momo.lover@example.com',
  phone: '',
  role: 'authenticated',
  updated_at: new Date().toISOString(),
};

const DEMO_PROFILE: Profile = {
  id: 'demo-user-1234',
  username: 'momo_friend',
  display_name: 'Momo Lover',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  bio: 'Living for little moments ✨',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const LOCAL_SESSION_KEY = '@momo_active_session';
const LOCAL_PROFILE_KEY = '@momo_active_profile';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (data && !error) {
          setProfile(data as Profile);
        }
      } else {
        const stored = await AsyncStorage.getItem(LOCAL_PROFILE_KEY);
        if (stored) {
          setProfile(JSON.parse(stored));
        }
      }
    } catch (err) {
      console.warn('Failed to fetch profile:', err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        if (isSupabaseConfigured) {
          const { data } = await supabase.auth.getSession();
          if (mounted && data.session) {
            setSession(data.session);
            setUser(data.session.user);
            await fetchProfile(data.session.user.id);
          }
        } else {
          // Check local stored session
          const localSession = await AsyncStorage.getItem(LOCAL_SESSION_KEY);
          const localProfile = await AsyncStorage.getItem(LOCAL_PROFILE_KEY);
          if (localSession && mounted) {
            setUser(JSON.parse(localSession));
            setProfile(localProfile ? JSON.parse(localProfile) : DEMO_PROFILE);
          } else if (mounted) {
            // Pre-seed demo user so user immediately enjoys the app
            setUser(DEMO_USER);
            setProfile(DEMO_PROFILE);
            await AsyncStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(DEMO_USER));
            await AsyncStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(DEMO_PROFILE));
          }
        }
      } catch (err) {
        console.warn('Auth init failed:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    if (isSupabaseConfigured) {
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (_event, newSession) => {
          if (!mounted) return;
          setSession(newSession);
          setUser(newSession?.user ?? null);
          if (newSession?.user) {
            await fetchProfile(newSession.user.id);
          } else {
            setProfile(null);
          }
        }
      );

      return () => {
        mounted = false;
        authListener?.subscription.unsubscribe();
      };
    }

    return () => {
      mounted = false;
    };
  }, [fetchProfile]);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
          await fetchProfile(data.session.user.id);
        }
        return { error: null };
      } else {
        const dummyUser: User = {
          ...DEMO_USER,
          email,
        };
        const dummyProf: Profile = {
          ...DEMO_PROFILE,
          username: email.split('@')[0],
          display_name: email.split('@')[0],
        };
        setUser(dummyUser);
        setProfile(dummyProf);
        await AsyncStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(dummyUser));
        await AsyncStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(dummyProf));
        return { error: null };
      }
    } catch (err: any) {
      return { error: err };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    username: string,
    displayName: string
  ) => {
    try {
      setIsLoading(true);
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
              display_name: displayName,
            },
          },
        });
        if (error) throw error;

        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            username,
            display_name: displayName,
            avatar_url: null,
            bio: null,
            updated_at: new Date().toISOString(),
          });
          setUser(data.user);
          await fetchProfile(data.user.id);
        }
        return { error: null };
      } else {
        const newUser: User = {
          ...DEMO_USER,
          id: `user_${Date.now()}`,
          email,
        };
        const newProf: Profile = {
          id: newUser.id,
          username,
          display_name: displayName,
          avatar_url: null,
          bio: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setUser(newUser);
        setProfile(newProf);
        await AsyncStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(newUser));
        await AsyncStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(newProf));
        return { error: null };
      }
    } catch (err: any) {
      return { error: err };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
      await AsyncStorage.removeItem(LOCAL_SESSION_KEY);
      await AsyncStorage.removeItem(LOCAL_PROFILE_KEY);
      setUser(null);
      setProfile(null);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Not authenticated') };
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id);
        if (error) throw error;
      }
      setProfile((prev) => {
        const updated = prev ? { ...prev, ...updates } : null;
        if (updated) {
          AsyncStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updated));
        }
        return updated;
      });
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        isConfigured: isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        updateProfile,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
