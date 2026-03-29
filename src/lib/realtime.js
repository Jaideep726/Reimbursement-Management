import { supabase } from './supabase'

export const subscribeToManagerQueue = (managerId, onUpdate) => {
  const channel = supabase
    .channel('manager-queue')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'approval_actions',
        filter: `approver_id=eq.${managerId}`
      },
      (payload) => {
        onUpdate(payload.new)
      }
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}