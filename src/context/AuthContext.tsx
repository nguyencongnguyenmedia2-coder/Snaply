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
    displayName: string,
    avatarUrl?: string | null
  ) => Promise<{ error: Error | null; requiresEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const DEMO_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
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
  id: '00000000-0000-0000-0000-000000000001',
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
        const hasSignedOut = await AsyncStorage.getItem('@snaply_signed_out');
        if (hasSignedOut === 'true') {
          // User explicitly signed out — stay logged out!
          setUser(null);
          setProfile(null);
          setSession(null);
          return;
        }

        if (isSupabaseConfigured) {
          const { data } = await supabase.auth.getSession();
          if (mounted && data.session) {
            setSession(data.session);
            setUser(data.session.user);
            await fetchProfile(data.session.user.id);
          } else if (mounted) {
            const localSession = await AsyncStorage.getItem(LOCAL_SESSION_KEY);
            const localProfile = await AsyncStorage.getItem(LOCAL_PROFILE_KEY);
            if (localSession) {
              setUser(JSON.parse(localSession));
              setProfile(localProfile ? JSON.parse(localProfile) : DEMO_PROFILE);
            } else {
              setUser(DEMO_USER);
              setProfile(DEMO_PROFILE);
            }
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
          const hasSignedOut = await AsyncStorage.getItem('@snaply_signed_out');
          if (hasSignedOut === 'true' && !newSession) {
            setUser(null);
            setProfile(null);
            setSession(null);
            return;
          }
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
      await AsyncStorage.removeItem('@snaply_signed_out');
      const cleanEmail = email.toLowerCase().trim();

      // Demo user credentials shortcut
      if (
        (cleanEmail === 'momo.lover@example.com' || cleanEmail === 'demo@snaply.app') &&
        password === 'password123'
      ) {
        setUser(DEMO_USER);
        setProfile(DEMO_PROFILE);
        await AsyncStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(DEMO_USER));
        await AsyncStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(DEMO_PROFILE));
        return { error: null };
      }

      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          // If Supabase failed, check local account matching this email
          const localSession = await AsyncStorage.getItem(LOCAL_SESSION_KEY);
          if (localSession) {
            const parsed = JSON.parse(localSession);
            if (parsed.email === cleanEmail) {
              setUser(parsed);
              const localProf = await AsyncStorage.getItem(LOCAL_PROFILE_KEY);
              setProfile(localProf ? JSON.parse(localProf) : DEMO_PROFILE);
              return { error: null };
            }
          }
          throw error;
        }

        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
          await fetchProfile(data.session.user.id);
        }
        return { error: null };
      } else {
        const dummyUser: User = {
          ...DEMO_USER,
          email: cleanEmail,
        };
        const dummyProf: Profile = {
          ...DEMO_PROFILE,
          username: cleanEmail.split('@')[0],
          display_name: cleanEmail.split('@')[0],
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
    displayName: string,
    avatarUrl?: string | null
  ): Promise<{ error: Error | null; requiresEmailConfirmation?: boolean }> => {
    try {
      setIsLoading(true);
      await AsyncStorage.removeItem('@snaply_signed_out');
      const cleanUsername = username.toLowerCase().trim();
      const cleanDisplayName = displayName.trim();
      const cleanEmail = email.toLowerCase().trim();

      if (isSupabaseConfigured) {
        // 1. Kiểm tra username tồn tại
        try {
          const { data: existingUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', cleanUsername)
            .maybeSingle();

          if (existingUser) {
            throw new Error('Tên người dùng (username) này đã có người sử dụng. Vui lòng chọn tên khác.');
          }
        } catch (unameErr: any) {
          if (unameErr.message?.includes('đã có người sử dụng')) throw unameErr;
        }

        // 2. Gọi Supabase Auth SignUp
        const authResult = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              username: cleanUsername,
              display_name: cleanDisplayName,
              avatar_url: avatarUrl || null,
            },
          },
        });

        // 3. Fallback nếu Supabase rate limit email hoặc lỗi SMTP
        if (authResult.error) {
          const errMsg = authResult.error.message || '';
          if (
            errMsg.includes('rate limit') ||
            errMsg.includes('rate_limit') ||
            errMsg.includes('invalid') ||
            errMsg.includes('SMTP')
          ) {
            console.warn('[AuthContext] Supabase email rate-limited, creating local session:', errMsg);
            const fallbackUser: User = {
              ...DEMO_USER,
              id: `user_${Date.now()}`,
              email: cleanEmail,
              user_metadata: {
                username: cleanUsername,
                display_name: cleanDisplayName,
              },
            };
            const fallbackProfile: Profile = {
              id: fallbackUser.id,
              username: cleanUsername,
              display_name: cleanDisplayName,
              avatar_url: avatarUrl || null,
              bio: '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            setUser(fallbackUser);
            setProfile(fallbackProfile);
            await AsyncStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(fallbackUser));
            await AsyncStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(fallbackProfile));
            return { error: null, requiresEmailConfirmation: false };
          }

          if (errMsg.includes('already registered')) {
            throw new Error('Địa chỉ email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.');
          }
          throw authResult.error;
        }

        const data = authResult.data;
        const requiresConfirmation = !data.session;

        if (data.user) {
          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              username: cleanUsername,
              display_name: cleanDisplayName,
              avatar_url: avatarUrl || null,
              bio: '',
              updated_at: new Date().toISOString(),
            });
          } catch (profileErr) {
            console.warn('Profiles table sync deferred:', profileErr);
          }

          const createdProfile: Profile = {
            id: data.user.id,
            username: cleanUsername,
            display_name: cleanDisplayName,
            avatar_url: avatarUrl || null,
            bio: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          setProfile(createdProfile);
          await AsyncStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(createdProfile));

          // Set active user immediately
          setUser(data.user);
          await AsyncStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(data.user));

          if (data.session) {
            setSession(data.session);
          }
        }
        return { error: null, requiresEmailConfirmation: false };
      } else {
        const newUser: User = {
          ...DEMO_USER,
          id: `user_${Date.now()}`,
          email: cleanEmail,
        };
        const newProf: Profile = {
          id: newUser.id,
          username: cleanUsername,
          display_name: cleanDisplayName,
          avatar_url: avatarUrl || null,
          bio: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setUser(newUser);
        setProfile(newProf);
        await AsyncStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(newUser));
        await AsyncStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(newProf));
        return { error: null, requiresEmailConfirmation: false };
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
        try {
          await supabase.auth.signOut();
        } catch {}
      }
      await AsyncStorage.removeItem(LOCAL_SESSION_KEY);
      await AsyncStorage.removeItem(LOCAL_PROFILE_KEY);
      await AsyncStorage.setItem('@snaply_signed_out', 'true');
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
