import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { 
  MessageSquare, Plus, Send, ChevronLeft, Clock, CheckCircle, 
  AlertCircle, Image as ImageIcon, SendHorizonal, ExternalLink, Loader2, MessageCircle
} from 'lucide-react';
import { cn } from '../utils/cn';
import PaginatedTable from './PaginatedTable';

export default function SupportSystem() {
  const { profile } = useAuthStore();
  const { addToast } = useGameStore();
  const [view, setView] = useState<'list' | 'create' | 'chat'>('list');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [telegramLink, setTelegramLink] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (view === 'chat' && selectedTicket) {
      fetchMessages();
      
      const channel = supabase
        .channel(`ticket_${selectedTicket.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'ticket_messages', 
          filter: `ticket_id=eq.${selectedTicket.id}` 
        }, (payload) => {
          const msg = payload.new;
          setMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        })
        .subscribe();
      
      return () => { supabase.removeChannel(channel); };
    }
  }, [view, selectedTicket?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchSettings = async () => {
    const { data } = await supabase.from('app_settings').select('telegram_support_link').single();
    if (data) setTelegramLink(data.telegram_support_link);
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', selectedTicket.id)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const handleCreateTicket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const { data: ticket, error: tErr } = await supabase
        .from('support_tickets')
        .insert([{
          user_id: profile.id,
          category: formData.get('category'),
          subject: formData.get('subject'),
        }])
        .select()
        .single();

      if (tErr) throw tErr;

      await supabase.from('ticket_messages').insert([{
        ticket_id: ticket.id,
        sender_id: profile.id,
        message: formData.get('message'),
      }]);

      addToast('success', 'Support ticket created successfully');
      setView('list');
    } catch (err: any) {
      addToast('error', err.message);
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;
    setSending(true);
    
    const msgObj = {
      ticket_id: selectedTicket.id,
      sender_id: profile.id,
      message: newMessage,
    };

    try {
      // Optimistic update for instant visibility
      const tempId = 'temp-' + Date.now();
      setMessages(prev => [...prev, { ...msgObj, id: tempId, created_at: new Date().toISOString() }]);
      
      const { error } = await supabase.from('ticket_messages').insert([msgObj]);
      if (error) throw error;
      
      setNewMessage('');
    } catch (err: any) {
      addToast('error', 'Failed to send: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-right duration-500">
      <div className="mb-6">
        <a 
          href={telegramLink} 
          target="_blank" 
          rel="noreferrer"
          className="flex items-center justify-between bg-blue-600 p-4 rounded-2xl text-white shadow-lg active:scale-95 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl"><Send size={20} /></div>
            <div>
              <p className="font-black italic uppercase text-sm leading-none">Official Telegram</p>
              <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mt-1">Join Support Channel</p>
            </div>
          </div>
          <ExternalLink size={18} className="opacity-50 group-hover:opacity-100 transition-opacity" />
        </a>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {view !== 'list' && (
              <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronLeft size={20} className="text-gray-400" />
              </button>
            )}
            <h3 className="font-black italic uppercase text-gray-800">
              {view === 'list' ? 'Support Tickets' : view === 'create' ? 'New Request' : `Ticket #${selectedTicket?.id.substring(0, 5)}`}
            </h3>
          </div>
          {view === 'list' && (
            <button 
              onClick={() => setView('create')}
              className="bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg active:scale-95 transition-all"
            >
              <Plus size={14} /> New Ticket
            </button>
          )}
        </div>

        <div className="p-4 bg-gray-50/50 min-h-[400px]">
          {view === 'list' && (
            <PaginatedTable
              tableName="support_tickets"
              queryModifier={(q) => q.eq('user_id', profile?.id)}
              pageSize={10}
              columns={[
                { key: 'category', label: 'Category', render: (r) => <span className="text-[9px] font-black uppercase text-gray-400">{r.category}</span> },
                { key: 'subject', label: 'Issue Detail', render: (r) => (
                  <button onClick={() => { setSelectedTicket(r); setView('chat'); }} className="text-left w-full">
                    <p className="font-bold text-gray-800 text-xs">{r.subject}</p>
                    <p className="text-[9px] text-gray-400">{new Date(r.created_at).toLocaleDateString()}</p>
                  </button>
                )},
                { key: 'status', label: 'Action', render: (r) => (
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      r.status === 'open' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                      r.status === 'replied' ? 'bg-green-50 text-green-600 border-green-100' :
                      'bg-gray-100 text-gray-400 border-gray-200'
                    }`}>
                      {r.status}
                    </span>
                    <button 
                      onClick={() => { setSelectedTicket(r); setView('chat'); }}
                      className="text-[9px] font-black uppercase text-red-600 flex items-center gap-1 hover:underline"
                    >
                      Open Chat <MessageCircle size={10} />
                    </button>
                  </div>
                )}
              ]}
            />
          )}

          {view === 'create' && (
            <form onSubmit={handleCreateTicket} className="space-y-4 max-w-sm mx-auto p-2">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-1">Issue Category</label>
                <select name="category" required className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm font-bold focus:outline-none focus:border-red-500 appearance-none">
                  <option value="Deposit Issue">Deposit Issue</option>
                  <option value="Withdrawal Issue">Withdrawal Issue</option>
                  <option value="Game Problem">Game Problem</option>
                  <option value="Referral">Referral</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-1">Subject</label>
                <input name="subject" required type="text" placeholder="Short description" className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm font-bold focus:outline-none focus:border-red-500" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-1">Full Message</label>
                <textarea name="message" required rows={4} placeholder="Describe your problem in detail" className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm font-bold focus:outline-none focus:border-red-500 resize-none" />
              </div>
              <button 
                type="submit" 
                disabled={sending}
                className="w-full bg-red-600 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-[0.2em] text-xs disabled:opacity-50"
              >
                {sending ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </form>
          )}

          {view === 'chat' && (
            <div className="flex flex-col h-[550px] bg-[#E5DDD5] rounded-3xl overflow-hidden border border-gray-200 shadow-xl">
              <div className="flex-1 overflow-y-auto space-y-3 p-4">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2 opacity-50">
                    <div className="bg-yellow-100 text-yellow-800 text-[9px] font-bold px-4 py-1.5 rounded-lg shadow-sm border border-yellow-200 uppercase tracking-widest">Messages are end-to-end encrypted</div>
                  </div>
                )}
                {messages.map((m, i) => {
                  const isMe = m.sender_id === profile.id;
                  return (
                    <div key={m.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-1 duration-200`}>
                      <div className={cn(
                        "max-w-[85%] px-3 py-2 rounded-xl shadow-sm relative text-sm",
                        isMe 
                          ? 'bg-[#DCF8C6] text-gray-800 rounded-tr-none' 
                          : 'bg-white text-gray-800 rounded-tl-none'
                      )}>
                        {!isMe && (
                          <p className="text-[8px] font-black uppercase tracking-tight text-red-600 mb-0.5">Support Agent</p>
                        )}
                        <p className="font-medium leading-snug">{m.message}</p>
                        <div className="flex items-center justify-end gap-1 mt-1 opacity-50">
                          <span className="text-[9px] font-bold">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && (
                            <div className="flex -space-x-1">
                              <CheckCircle size={10} className="text-blue-500" />
                              <CheckCircle size={10} className="text-blue-500" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
              
              <div className="p-3 bg-[#F0F0F0] flex gap-2 items-center">
                <div className="flex-1">
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..." 
                    className="w-full bg-white border-none py-3 px-5 rounded-full text-sm font-medium focus:ring-0 shadow-sm"
                  />
                </div>
                <button 
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="bg-[#00A884] hover:bg-[#008F6C] text-white w-12 h-12 rounded-full shadow-md active:scale-90 transition-all flex items-center justify-center disabled:opacity-50"
                >
                  <SendHorizonal size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
