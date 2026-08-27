import {
  getListPendingCashbackQueryKey,
  useApproveCashback,
  useListPendingCashback,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock3, Gift } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useLang } from '../contexts/LanguageContext';

export default function AdminCashback() {
  const { dir, t } = useLang();
  const queryClient = useQueryClient();
  const { data: transactions, isLoading, isError } = useListPendingCashback();
  const approve = useApproveCashback({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPendingCashbackQueryKey() });
        toast.success(t('cashbackApproved'));
      },
      onError: () => {
        toast.error(dir === 'rtl' ? 'تعذر اعتماد الكاش باك' : 'Could not approve cashback');
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">{t('cashbackPendingReview')}</h1>
          <p className="text-muted-foreground mt-1">{t('cashbackPendingReviewSub')}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2 text-sm font-semibold">
          <Clock3 className="w-4 h-4" />
          {transactions?.length ?? 0} {dir === 'rtl' ? 'قيد الانتظار' : 'pending'}
        </div>
      </div>

      <div className="bg-white rounded-[24px] border border-black/[0.03] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-14 flex flex-col items-center text-muted-foreground">
            <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            {t('loading')}
          </div>
        ) : isError ? (
          <div className="p-14 text-center text-destructive">
            {dir === 'rtl' ? 'تعذر تحميل معاملات الكاش باك.' : 'Could not load cashback transactions.'}
          </div>
        ) : !transactions?.length ? (
          <div className="p-14 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <Gift className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="font-display font-bold text-foreground">{t('cashbackNoPending')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 text-start font-semibold">{dir === 'rtl' ? 'العميل' : 'Customer'}</th>
                  <th className="px-6 py-4 text-start font-semibold">{dir === 'rtl' ? 'الطلب' : 'Order'}</th>
                  <th className="px-6 py-4 text-start font-semibold">{t('cashbackAmount')}</th>
                  <th className="px-6 py-4 text-start font-semibold">{dir === 'rtl' ? 'تاريخ التأكيد' : 'Confirmed on'}</th>
                  <th className="px-6 py-4 text-end font-semibold">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.03]">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-muted/20">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-foreground">{transaction.customerName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{transaction.customerEmail}</p>
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground">#{transaction.orderNumber}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                        {transaction.currency} {transaction.amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {format(new Date(transaction.createdAt), 'MMM d, yyyy • h:mm a')}
                    </td>
                    <td className="px-6 py-4 text-end">
                      <button
                        type="button"
                        onClick={() => approve.mutate({ id: transaction.id })}
                        disabled={approve.isPending}
                        className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-4 py-2 rounded-xl disabled:opacity-60 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {t('cashbackApprove')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}