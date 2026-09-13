'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function TabRedirectPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const rawTab = params?.tab as string;
    const tabLower = (rawTab || '').toLowerCase();
    let target = 'members';
    if (['expense', 'expenses', 'expence', 'expences', 'kharcha'].includes(tabLower)) {
      target = 'expense';
    } else if (['income', 'incomes', 'chanda'].includes(tabLower)) {
      target = 'income';
    } else if (['building', 'buildings', 'flats'].includes(tabLower)) {
      target = 'buildings';
    } else if (['member', 'members'].includes(tabLower)) {
      target = 'members';
    } else if (['admin', 'panel'].includes(tabLower)) {
      target = 'admin';
    }
    router.replace(`/?tab=${target}`);
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f5f8f6]">
      <div className="animate-pulse flex flex-col items-center gap-2">
        <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Opening page...</span>
      </div>
    </div>
  );
}
