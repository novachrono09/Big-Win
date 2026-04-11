import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { FileText, ArrowRightLeft, Clock, CheckCircle, XCircle, Activity as ActivityIcon } from 'lucide-react';
import PaginatedTable from './PaginatedTable';

export default function Activity() {
  const { profile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'bets' | 'transactions'>('bets');

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle className="w-3 h-3 text-green-500" />;
    if (status === 'pending') return <ActivityIcon className="w-3 h-3 text-yellow-500 animate-pulse" />;
    return <XCircle className="w-3 h-3 text-red-500" />;
  };

  const betColumns = [
    { 
      key: 'period', 
      label: 'Period', 
      render: (row: any) => (
        <div>
          <span className="bg-gray-100 text-gray-600 text-[8px] font-black uppercase px-1.5 py-0.5 rounded mr-1.5 border border-gray-200">
            {row.session_type}
          </span>
          <span className="text-[10px] font-bold text-gray-800 font-mono">{row.period}</span>
        </div>
      )
    },
    { 
      key: 'value', 
      label: 'Bet', 
      render: (row: any) => <span className="capitalize font-black text-gray-700">{row.value}</span>
    },
    { 
      key: 'amount', 
      label: 'Amount', 
      render: (row: any) => <span className="font-black text-gray-900">₹{row.amount}</span>
    },
    { 
      key: 'payout', 
      label: 'Result', 
      render: (row: any) => (
        <div className="text-right">
          {row.won === null ? (
            <span className="text-[10px] font-black text-yellow-500 animate-pulse uppercase">Pending</span>
          ) : row.won ? (
            <span className="text-[10px] font-black text-green-600 uppercase">+ ₹{row.payout}</span>
          ) : (
            <span className="text-[10px] font-black text-red-500 uppercase">- ₹{row.amount}</span>
          )}
        </div>
      )
    }
  ];

  const transactionColumns = [
    { 
      key: 'type', 
      label: 'Type', 
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${
            row.type === 'deposit' ? 'bg-green-50 text-green-600' :
            row.type === 'withdrawal' ? 'bg-red-50 text-red-600' :
            row.type === 'win' ? 'bg-yellow-50 text-yellow-600' :
            'bg-gray-100 text-gray-600'
          }`}>
            {row.type === 'deposit' ? '↓' : row.type === 'withdrawal' ? '↑' : row.type === 'win' ? '★' : '−'}
          </div>
          <span className="capitalize font-black italic text-gray-800 text-xs">{row.type}</span>
        </div>
      )
    },
    { 
      key: 'amount', 
      label: 'Amount', 
      render: (row: any) => (
        <span className={Number(row.amount) > 0 ? 'text-green-600 font-black' : 'text-gray-800 font-black'}>
          ₹{Math.abs(Number(row.amount)).toLocaleString()}
        </span>
      )
    },
    { 
      key: 'status', 
      label: 'Status', 
      render: (row: any) => (
        <div className="flex items-center gap-1">
          {getStatusIcon(row.status)}
          <span className={`text-[8px] font-black uppercase tracking-widest ${
            row.status === 'completed' ? 'text-green-500' : 
            row.status === 'pending' ? 'text-yellow-500' : 'text-red-500'
          }`}>
            {row.status}
          </span>
        </div>
      )
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (row: any) => <span className="text-[9px] font-bold text-gray-400">{new Date(row.created_at).toLocaleDateString()}</span>
    }
  ];

  return (
    <div className="p-4 pb-24 animate-in fade-in slide-in-from-right duration-500">
      <div className="mb-4">
        <h2 className="text-2xl font-black italic uppercase tracking-tight text-gray-800">Activity</h2>
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Track your records</p>
      </div>

      <div className="flex bg-white rounded-xl p-1 mb-6 shadow-sm border border-gray-100">
        {[
          { id: 'bets', label: 'My Bets', icon: FileText },
          { id: 'transactions', label: 'Transfers', icon: ArrowRightLeft }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id 
                ? 'bg-red-600 text-white shadow-md' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'bets' ? (
        <PaginatedTable
          key="bets-table"
          tableName="bets"
          queryModifier={(q) => q.eq('user_id', profile?.id)}
          columns={betColumns}
          searchFields={['period', 'value', 'session_type']}
          searchPlaceholder="Search period or type..."
          pageSize={10}
          emptyMessage="No betting records found"
        />
      ) : (
        <PaginatedTable
          key="tx-table"
          tableName="transactions"
          queryModifier={(q) => q.eq('user_id', profile?.id)}
          columns={transactionColumns}
          searchFields={['type', 'status', 'utr']}
          searchPlaceholder="Search type or status..."
          pageSize={10}
          emptyMessage="No transaction records found"
        />
      )}
    </div>
  );
}
