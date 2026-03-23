import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, X, Send, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface PegawaiChatListProps {
  clients: { user_id: string; profile?: { full_name: string } }[];
}

export default function PegawaiChatList({ clients }: PegawaiChatListProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0);

  useEffect(() => {
    if (!user) return;
    loadUnreadCounts();

    const channel = supabase
      .channel(`pegawai-chat-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
      }, (payload) => {
        const msg = payload.new as any;
        if (msg.receiver_id === user.id) {
          if (selectedClient === msg.sender_id && open) {
            setMessages(prev => [...prev, msg]);
            supabase.from('chat_messages').update({ is_read: true }).eq('id', msg.id).then(() => {});
          } else {
            setUnreadMap(prev => ({ ...prev, [msg.sender_id]: (prev[msg.sender_id] || 0) + 1 }));
          }
        }
        if (msg.sender_id === user.id && msg.receiver_id === selectedClient) {
          setMessages(prev => [...prev, msg]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, selectedClient, open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadUnreadCounts = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('sender_id')
      .eq('receiver_id', user!.id)
      .eq('is_read', false);
    const counts: Record<string, number> = {};
    (data || []).forEach(m => { counts[m.sender_id] = (counts[m.sender_id] || 0) + 1; });
    setUnreadMap(counts);
  };

  const openChat = async (clientId: string) => {
    setSelectedClient(clientId);
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .or(`and(sender_id.eq.${user!.id},receiver_id.eq.${clientId}),and(sender_id.eq.${clientId},receiver_id.eq.${user!.id})`)
      .order('created_at', { ascending: true });
    setMessages(data || []);

    await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('sender_id', clientId)
      .eq('receiver_id', user!.id)
      .eq('is_read', false);
    setUnreadMap(prev => ({ ...prev, [clientId]: 0 }));
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !selectedClient) return;
    setSending(true);
    await supabase.from('chat_messages').insert({
      sender_id: user!.id,
      receiver_id: selectedClient,
      message: newMessage.trim(),
    });
    setNewMessage('');
    setSending(false);
  };

  const selectedClientName = clients.find(c => c.user_id === selectedClient)?.profile?.full_name || 'Klien';

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full gradient-gold flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
      >
        {open ? <X className="w-6 h-6 text-primary-foreground" /> : <MessageCircle className="w-6 h-6 text-primary-foreground" />}
        {totalUnread > 0 && !open && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold">
            {totalUnread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 h-[28rem] glass-card rounded-2xl border border-border flex flex-col overflow-hidden shadow-2xl">
          {selectedClient ? (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-border gradient-gold flex items-center gap-3">
                <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20 h-7 w-7" onClick={() => setSelectedClient(null)}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <h3 className="font-semibold text-primary-foreground text-sm">Chat dengan {selectedClientName}</h3>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground pt-8">Belum ada pesan.</p>
                )}
                {messages.map(m => (
                  <div key={m.id} className={cn("flex", m.sender_id === user!.id ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[75%] rounded-xl px-3 py-2 text-sm",
                      m.sender_id === user!.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    )}>
                      <p>{m.message}</p>
                      <p className={cn("text-[10px] mt-1", m.sender_id === user!.id ? "text-primary-foreground/60" : "text-muted-foreground")}>
                        {format(new Date(m.created_at), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-border flex gap-2">
                <Input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Ketik pesan..."
                  className="flex-1"
                />
                <Button size="icon" onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Client list header */}
              <div className="px-4 py-3 border-b border-border gradient-gold">
                <h3 className="font-semibold text-primary-foreground text-sm">Chat dengan Klien</h3>
              </div>

              {/* Client list */}
              <div className="flex-1 overflow-y-auto p-2">
                {clients.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground pt-8">Belum ada klien yang terhubung.</p>
                ) : (
                  <div className="space-y-1">
                    {clients.map(c => (
                      <button
                        key={c.user_id}
                        onClick={() => openChat(c.user_id)}
                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors text-left"
                      >
                        <span className="text-sm font-medium">{c.profile?.full_name || 'Klien'}</span>
                        {(unreadMap[c.user_id] || 0) > 0 && (
                          <Badge variant="destructive" className="text-[10px] h-5 min-w-5 flex items-center justify-center">
                            {unreadMap[c.user_id]}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
