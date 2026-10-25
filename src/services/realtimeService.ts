import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, Moment } from '@/lib/supabase';

export type RealtimeCallback<T> = (payload: T) => void;

class MOMORealtimeManager {
  private momentsChannel: RealtimeChannel | null = null;
  private reactionsChannel: RealtimeChannel | null = null;
  private friendsChannel: RealtimeChannel | null = null;

  public subscribeToMoments(
    userId: string,
    onNewMoment: RealtimeCallback<any>,
    onDeleteMoment?: RealtimeCallback<string>
  ) {
    if (!isSupabaseConfigured) return () => {};

    // Unsubscribe existing if any
    this.unsubscribeMoments();

    this.momentsChannel = supabase
      .channel(`public:moments:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'moments',
        },
        (payload) => {
          onNewMoment(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'moments',
        },
        (payload) => {
          if (onDeleteMoment && payload.old?.id) {
            onDeleteMoment(payload.old.id);
          }
        }
      )
      .subscribe();

    return () => this.unsubscribeMoments();
  }

  public subscribeToReactions(
    onReactionChange: (momentId: string, emoji: string, userId: string, isAdded: boolean) => void
  ) {
    if (!isSupabaseConfigured) return () => {};

    this.unsubscribeReactions();

    this.reactionsChannel = supabase
      .channel('public:reactions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reactions',
        },
        (payload) => {
          const item = payload.new;
          onReactionChange(item.moment_id, item.emoji, item.user_id, true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'reactions',
        },
        (payload) => {
          const item = payload.old;
          if (item?.moment_id) {
            onReactionChange(item.moment_id, item.emoji, item.user_id, false);
          }
        }
      )
      .subscribe();

    return () => this.unsubscribeReactions();
  }

  public subscribeToFriendRequests(
    userId: string,
    onNewRequest: RealtimeCallback<any>
  ) {
    if (!isSupabaseConfigured) return () => {};

    this.unsubscribeFriends();

    this.friendsChannel = supabase
      .channel(`public:friend_requests:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_requests',
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          onNewRequest(payload.new);
        }
      )
      .subscribe();

    return () => this.unsubscribeFriends();
  }

  public unsubscribeMoments() {
    if (this.momentsChannel) {
      supabase.removeChannel(this.momentsChannel);
      this.momentsChannel = null;
    }
  }

  public unsubscribeReactions() {
    if (this.reactionsChannel) {
      supabase.removeChannel(this.reactionsChannel);
      this.reactionsChannel = null;
    }
  }

  public unsubscribeFriends() {
    if (this.friendsChannel) {
      supabase.removeChannel(this.friendsChannel);
      this.friendsChannel = null;
    }
  }

  public unsubscribeAll() {
    this.unsubscribeMoments();
    this.unsubscribeReactions();
    this.unsubscribeFriends();
  }
}

export const realtimeManager = new MOMORealtimeManager();
