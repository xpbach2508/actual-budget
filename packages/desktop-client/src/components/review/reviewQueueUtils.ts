import { validForTransfer } from '@actual-app/core/shared/transfer';
import type {
  PayeeEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

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

export function transferPayeesForReview(
  payees: readonly PayeeEntity[],
  accountId: string,
) {
  return payees.filter(
    payee => payee.transfer_acct && payee.transfer_acct !== accountId,
  );
}

export function convertReviewTransactionToTransfer({
  transaction,
  payeeId,
  payees,
  candidates,
}: {
  transaction: TransactionEntity;
  payeeId: string;
  payees: readonly PayeeEntity[];
  candidates: readonly TransactionEntity[];
}): {
  updated: Array<Partial<TransactionEntity> & { id: string }>;
  runTransfers?: false;
} {
  const opposite = candidates.find(candidate =>
    validForTransfer(transaction, candidate),
  );
  if (!opposite) {
    return { updated: [{ id: transaction.id, payee: payeeId }] };
  }

  const fromPayee = payees.find(
    payee => payee.transfer_acct === transaction.account,
  );
  const toPayee =
    payees.find(payee => payee.id === payeeId) ??
    payees.find(payee => payee.transfer_acct === opposite.account);

  return {
    updated: [
      {
        id: transaction.id,
        // Runtime API still uses null to clear the category on a transfer.
        category: null as unknown as TransactionEntity['category'],
        payee: toPayee?.id,
        transfer_id: opposite.id,
      },
      {
        id: opposite.id,
        category: null as unknown as TransactionEntity['category'],
        payee: fromPayee?.id,
        transfer_id: transaction.id,
      },
    ],
    runTransfers: false,
  };
}
