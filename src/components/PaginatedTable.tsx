import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ChevronLeft, ChevronRight, Search, Filter, Download, Loader2 
} from 'lucide-react';
import { cn } from '../utils/cn';

interface PaginatedTableProps {
  tableName: string;
  queryModifier?: (query: any) => any;
  columns: { key: string; label: string; render?: (row: any) => React.ReactNode }[];
  pageSize?: number;
  searchPlaceholder?: string;
  searchFields?: string[];
  dateField?: string;
  emptyMessage?: string;
  onDataLoaded?: (data: any[]) => void;
  refreshTrigger?: any;
}

export default function PaginatedTable({
  tableName,
  queryModifier,
  columns,
  pageSize = 10,
  searchPlaceholder = "Search...",
  searchFields = [],
  dateField = "created_at",
  emptyMessage = "No records found",
  onDataLoaded,
  refreshTrigger
}: PaginatedTableProps) {
  const [data, setData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Logic Fix: Separate loading states
  const [isLoading, setIsLoading] = useState(true);   // Initial data load
  const [pageLoading, setPageLoading] = useState(false); // Page/Filter changes
  
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7d' | '30d' | 'custom'>('30d');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [showFilters, setShowFilters] = useState(false);

  const queryModifierRef = useRef(queryModifier);
  useEffect(() => { queryModifierRef.current = queryModifier; }, [queryModifier]);

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) setIsLoading(true);
    setPageLoading(true);
    
    try {
      let query = supabase.from(tableName).select('*', { count: 'exact' });

      if (queryModifierRef.current) query = queryModifierRef.current(query);

      if (search && searchFields.length > 0) {
        const searchConditions = searchFields.map(field => `${field}.ilike.%${search}%`).join(',');
        query = query.or(searchConditions);
      }

      const now = new Date();
      if (dateFilter === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        query = query.gte(dateField, today);
      } else if (dateFilter === '7d') {
        const last7d = new Date(now.setDate(now.getDate() - 7)).toISOString();
        query = query.gte(dateField, last7d);
      } else if (dateFilter === '30d') {
        const last30d = new Date(now.setDate(now.getDate() - 30)).toISOString();
        query = query.gte(dateField, last30d);
      } else if (dateFilter === 'custom' && customRange.from && customRange.to) {
        query = query.gte(dateField, customRange.from).lte(dateField, customRange.to + 'T23:59:59');
      }

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      
      const { data: result, count, error } = await query
        .order(dateField, { ascending: false })
        .range(from, to);

      if (error) throw error;

      setData(result || []);
      setTotalCount(count || 0);
      if (onDataLoaded) onDataLoaded(result || []);
    } catch (err) {
      console.error(`PaginatedTable Error [${tableName}]:`, err);
    } finally {
      setIsLoading(false);
      setPageLoading(false);
    }
  }, [tableName, currentPage, pageSize, search, dateFilter, customRange, searchFields, dateField, onDataLoaded]);

  // Handle Mount
  useEffect(() => {
    fetchData(true);

    // SAFETY NET: Force clear loading after 15s if it gets stuck
    const timer = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setPageLoading(false);
      }
    }, 15000);

    return () => clearTimeout(timer);
  }, []);

  // Handle Filter/Page Changes (don't show full screen loader)
  useEffect(() => {
    if (!isLoading) fetchData(false);
  }, [currentPage, dateFilter, search, refreshTrigger]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-600 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest">Loading Records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      {/* Search & Export */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:border-red-500"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all border", showFilters ? "bg-red-600 text-white" : "bg-white text-gray-600")}>
            <Filter size={14} /> Filter
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-gray-50 border p-4 rounded-2xl animate-in slide-in-from-top-2">
          <div className="flex flex-wrap gap-2 mb-4">
            {['all', 'today', '7d', '30d'].map(f => (
              <button key={f} onClick={() => setDateFilter(f as any)} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase", dateFilter === f ? "bg-red-600 text-white" : "bg-white border text-gray-500")}>
                {f}
              </button>
            ))}
          </div>
          <button onClick={() => setShowFilters(false)} className="w-full bg-gray-900 text-white py-2 rounded-xl text-[10px] font-black uppercase">Apply Filters</button>
        </div>
      )}

      {/* Table with Inline Page Loader */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[200px] relative">
        {pageLoading && (
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-red-600 animate-spin" />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/50 border-b">
              <tr>
                {columns.map(col => (
                  <th key={col.key} className="p-4 text-[10px] font-black uppercase text-gray-400 tracking-wider">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((row, idx) => (
                <tr key={row.id || idx} className="hover:bg-gray-50/50">
                  {columns.map(col => (
                    <td key={col.key} className="p-4">{col.render ? col.render(row) : row[col.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compact Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 border rounded-xl disabled:opacity-30"><ChevronLeft size={16}/></button>
          <span className="text-[10px] font-black uppercase text-gray-400">Page {currentPage} of {totalPages}</span>
          <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 border rounded-xl disabled:opacity-30"><ChevronRight size={16}/></button>
        </div>
      )}
    </div>
  );
}
