import type { TransactionEntity } from '@actual-app/core/types/models';

type QuickAddInput = Pick<
  TransactionEntity,
  'id' | 'amount' | 'account' | 'date'
> & {
  payee: string;
  category: string;
};

type QuickAddResult =
  | { transaction: TransactionEntity }
  | { error: 'amount' | 'account' | 'date' };

export function buildQuickAddTransaction(input: QuickAddInput): QuickAddResult {
  if (!input.amount) {
    return { error: 'amount' };
  }

  if (!input.account) {
    return { error: 'account' };
  }

  if (!input.date) {
    return { error: 'date' };
  }

  return {
    transaction: {
      id: input.id,
      amount: input.amount,
      account: input.account,
      date: input.date,
      cleared: true,
      ...(input.payee ? { payee: input.payee } : {}),
      ...(input.category ? { category: input.category } : {}),
    },
  };
}
