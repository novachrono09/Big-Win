import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, CheckCircle, Trash2, Plus, CreditCard, QrCode, Smartphone, Loader2 } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

interface WithdrawalMethodsModalProps {
  userId: string;
  onClose: () => void;
}

export default function WithdrawalMethodsModal({ userId, onClose }: WithdrawalMethodsModalProps) {
  const { addToast } = useGameStore();
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [addTab, setAddTab] = useState<'upi' | 'bank' | 'qr'>('upi');
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [upiId, setUpiId] = useState('');
  const [bankDetails, setBankDetails] = useState({ account_no: '', ifsc: '', bank_name: '', holder_name: '' });
  const [qrFile, setQrFile] = useState<File | null>(null);

  useEffect(() => {
    fetchMethods();
  }, [userId]);

  const fetchMethods = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('withdrawal_methods')
      .select('*')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (!error && data) setMethods(data);
    setLoading(false);
  };

  const handleSetPrimary = async (id: string) => {
    try {
      // First, set all to false
      await supabase.from('withdrawal_methods').update({ is_primary: false }).eq('user_id', userId);
      // Then set the selected to true
      await supabase.from('withdrawal_methods').update({ is_primary: true }).eq('id', id);
      fetchMethods();
      addToast('success', 'Primary method updated');
    } catch (e) {
      addToast('error', 'Failed to update primary method');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this withdrawal method?')) return;
    try {
      await supabase.from('withdrawal_methods').delete().eq('id', id);
      fetchMethods();
      addToast('success', 'Method deleted');
    } catch (e) {
      addToast('error', 'Failed to delete method');
    }
  };

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      let details = {};
      
      if (addTab === 'upi') {
        if (!upiId.includes('@')) throw new Error('Invalid UPI ID format');
        details = { upi_id: upiId };
      } else if (addTab === 'bank') {
        if (!bankDetails.account_no || !bankDetails.ifsc || !bankDetails.bank_name || !bankDetails.holder_name) {
          throw new Error('Please fill all bank details');
        }
        details = { ...bankDetails };
      } else if (addTab === 'qr') {
        if (!qrFile) throw new Error('Please upload a QR Code image');
        
        const fileExt = qrFile.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('qrcodes')
          .upload(fileName, qrFile);
          
        if (uploadError) throw new Error('Failed to upload QR code: ' + uploadError.message);
        
        const { data: publicUrlData } = supabase.storage.from('qrcodes').getPublicUrl(fileName);
        details = { qr_url: publicUrlData.publicUrl };
      }

      const { error } = await supabase.from('withdrawal_methods').insert([{
        user_id: userId,
        type: addTab,
        details,
        is_primary: methods.length === 0 // Make primary if it's the first one
      }]);

      if (error) throw error;
      
      addToast('success', 'Withdrawal method added successfully');
      setIsAdding(false);
      
      // Reset forms
      setUpiId('');
      setBankDetails({ account_no: '', ifsc: '', bank_name: '', holder_name: '' });
      setQrFile(null);
      
      fetchMethods();
    } catch (err: any) {
      addToast('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-red-600 px-6 py-4 flex items-center justify-between text-white">
          <h2 className="font-black italic text-lg tracking-tight uppercase">
            {isAdding ? 'Add New Method' : 'Withdrawal Methods'}
          </h2>
          <button onClick={() => isAdding ? setIsAdding(false) : onClose()} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-red-600" /></div>
          ) : isAdding ? (
            <div className="space-y-6">
              {/* Tabs */}
              <div className="flex bg-white rounded-xl p-1 shadow-sm border border-gray-200">
                {[
                  { id: 'upi', label: 'UPI', icon: Smartphone },
                  { id: 'bank', label: 'Bank', icon: CreditCard },
                  { id: 'qr', label: 'QR Code', icon: QrCode }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setAddTab(t.id as any)}
                    className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${
                      addTab === t.id ? 'bg-red-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <t.icon className="w-3.5 h-3.5" /> {t.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmitNew} className="space-y-4">
                {addTab === 'upi' && (
                  <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">UPI ID</label>
                    <input 
                      type="text" 
                      required
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. user@oksbi"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold focus:outline-none focus:border-red-500"
                    />
                  </div>
                )}

                {addTab === 'bank' && (
                  <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Bank Name</label>
                      <input type="text" required value={bankDetails.bank_name} onChange={e => setBankDetails({...bankDetails, bank_name: e.target.value})} placeholder="e.g. State Bank of India" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold focus:outline-none focus:border-red-500" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Account Holder Name</label>
                      <input type="text" required value={bankDetails.holder_name} onChange={e => setBankDetails({...bankDetails, holder_name: e.target.value})} placeholder="Exact name on account" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold focus:outline-none focus:border-red-500" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Account Number</label>
                      <input type="text" required value={bankDetails.account_no} onChange={e => setBankDetails({...bankDetails, account_no: e.target.value})} placeholder="Account Number" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold focus:outline-none focus:border-red-500" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">IFSC Code</label>
                      <input type="text" required value={bankDetails.ifsc} onChange={e => setBankDetails({...bankDetails, ifsc: e.target.value.toUpperCase()})} placeholder="IFSC Code" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold focus:outline-none focus:border-red-500 uppercase" />
                    </div>
                  </div>
                )}

                {addTab === 'qr' && (
                  <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Upload QR Code</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      required
                      onChange={(e) => e.target.files && setQrFile(e.target.files[0])}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-bold focus:outline-none focus:border-red-500"
                    />
                    {qrFile && <p className="text-green-600 text-xs font-bold mt-2">File selected: {qrFile.name}</p>}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full bg-red-600 text-white font-black py-4 rounded-xl shadow-lg active:scale-95 transition-all uppercase tracking-widest disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Method'}
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              {methods.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="font-bold text-sm">No withdrawal methods saved.</p>
                  <p className="text-xs mt-1">Add a method to receive your winnings.</p>
                </div>
              ) : (
                methods.map(method => (
                  <div key={method.id} className={`bg-white rounded-2xl p-4 border shadow-sm flex items-center justify-between ${method.is_primary ? 'border-red-500 ring-1 ring-red-500/20' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        method.type === 'upi' ? 'bg-purple-50 text-purple-600' :
                        method.type === 'bank' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                      }`}>
                        {method.type === 'upi' ? <Smartphone size={24} /> :
                         method.type === 'bank' ? <CreditCard size={24} /> : <QrCode size={24} />}
                      </div>
                      <div>
                        <h4 className="font-black uppercase text-xs text-gray-800 flex items-center gap-2">
                          {method.type}
                          {method.is_primary && <span className="bg-red-100 text-red-600 text-[8px] px-1.5 py-0.5 rounded uppercase">Primary</span>}
                        </h4>
                        <p className="text-sm font-bold text-gray-600">
                          {method.type === 'upi' ? method.details.upi_id :
                           method.type === 'bank' ? `****${method.details.account_no.slice(-4)}` :
                           'QR Image Saved'}
                        </p>
                        {method.type === 'bank' && <p className="text-[10px] text-gray-400 uppercase font-bold">{method.details.bank_name}</p>}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {!method.is_primary && (
                        <button onClick={() => handleSetPrimary(method.id)} className="text-[10px] font-black text-green-600 uppercase bg-green-50 px-2 py-1 rounded">Make Primary</button>
                      )}
                      <button onClick={() => handleDelete(method.id)} className="text-[10px] font-black text-red-600 uppercase bg-red-50 px-2 py-1 rounded flex items-center justify-center"><Trash2 size={12}/></button>
                    </div>
                  </div>
                ))
              )}

              <button 
                onClick={() => setIsAdding(true)}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest mt-6"
              >
                <Plus size={18} /> Add New Method
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
