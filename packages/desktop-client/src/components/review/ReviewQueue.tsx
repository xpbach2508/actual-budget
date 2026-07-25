import { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgInboxCheck, SvgTrash } from '@actual-app/components/icons/v1';
import {
  SvgArrowsSynchronize,
  SvgCheckCircle1,
  SvgNotesPaper,
} from '@actual-app/components/icons/v2';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type { TransactionEntity } from '@actual-app/core/types/models';
import { v4 as uuidv4 } from 'uuid';

import { Error as ErrorAlert } from '#components/alerts';
import { Page } from '#components/Page';
import { useAccounts } from '#hooks/useAccounts';
import { useCategories } from '#hooks/useCategories';
import { useFormat } from '#hooks/useFormat';
import { usePayeesById } from '#hooks/usePayees';
import { useQuery } from '#hooks/useQuery';

import { buildQuickAddTransaction } from './reviewQueueUtils';

export function ReviewQueue() {
  const { t } = useTranslation();
  const { data: transactions, isLoading } = useQuery<TransactionEntity>(
    () => q('transactions').filter({ cleared: false }).select('*'),
    [],
  );
  const { data: payeesById } = usePayeesById();
  const { data: categoriesData } = useCategories();
  const { data: accounts } = useAccounts();
  const formatAmount = useFormat();

  const [quickAddAmount, setQuickAddAmount] = useState('');
  const [quickAddPayee, setQuickAddPayee] = useState('');
  const [quickAddCategory, setQuickAddCategory] = useState('');
  const [quickAddAccount, setQuickAddAccount] = useState('');
  const [quickAddDate, setQuickAddDate] = useState(monthUtils.currentDay());
  const [quickAddError, setQuickAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  const categories = categoriesData?.list ?? [];
  const categoryOptions = useMemo(
    () => categories.map(category => [category.id, category.name] as const),
    [categories],
  );
  const accountOptions = useMemo(
    () => (accounts ?? []).map(account => [account.id, account.name] as const),
    [accounts],
  );
  const payeeOptions = useMemo(
    () =>
      Object.values(payeesById ?? {})
        .filter(payee => !payee.transfer_acct)
        .map(payee => [payee.id, payee.name] as const),
    [payeesById],
  );
  const transferOptions = useMemo(
    () =>
      Object.values(payeesById ?? {})
        .filter(payee => payee.transfer_acct)
        .map(payee => [payee.id, payee.name] as const),
    [payeesById],
  );

  function resetQuickAdd() {
    setQuickAddAmount('');
    setQuickAddPayee('');
    setQuickAddCategory('');
    setQuickAddAccount('');
    setQuickAddDate(monthUtils.currentDay());
  }

  async function handleQuickAdd() {
    setQuickAddError(null);
    const result = buildQuickAddTransaction({
      id: uuidv4(),
      amount: formatAmount.fromEdit(quickAddAmount) ?? 0,
      account: quickAddAccount,
      date: quickAddDate,
      payee: quickAddPayee,
      category: quickAddCategory,
    });

    if ('error' in result) {
      setQuickAddError(
        result.error === 'amount'
          ? t('An amount is required.')
          : result.error === 'account'
            ? t('An account is required.')
            : t('A date is required.'),
      );
      return;
    }

    setIsAdding(true);
    try {
      await send('transactions-batch-update', { added: [result.transaction] });
      resetQuickAdd();
    } catch {
      setQuickAddError(t('Unable to add the transaction. Please try again.'));
    } finally {
      setIsAdding(false);
    }
  }

  async function updateRow(
    id: TransactionEntity['id'],
    changes: Partial<TransactionEntity>,
  ) {
    setRowErrors(current => ({ ...current, [id]: '' }));
    setPendingIds(current => new Set(current).add(id));
    try {
      await send('transactions-batch-update', {
        updated: [{ id, ...changes }],
      });
    } catch {
      setRowErrors(current => ({
        ...current,
        [id]: t('Unable to update the transaction. Please try again.'),
      }));
    } finally {
      setPendingIds(current => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  async function deleteRow(id: TransactionEntity['id']) {
    setRowErrors(current => ({ ...current, [id]: '' }));
    setPendingIds(current => new Set(current).add(id));
    try {
      await send('transactions-batch-update', { deleted: [{ id }] });
    } catch {
      setRowErrors(current => ({
        ...current,
        [id]: t('Unable to delete the transaction. Please try again.'),
      }));
    } finally {
      setPendingIds(current => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <Page header={t('Review')}>
      <View style={{ flex: 1, gap: 20, overflowY: 'auto', padding: 20 }}>
        <View
          style={{
            backgroundColor: theme.tableBackground,
            border: `1px solid ${theme.tableBorder}`,
            borderRadius: 8,
            flexShrink: 0,
            gap: 12,
            padding: 16,
          }}
        >
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}>
            <SvgNotesPaper width={18} height={18} />
            <Text style={{ fontSize: 15, fontWeight: 600 }}>
              <Trans>Quick add transaction</Trans>
            </Text>
          </View>
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <Input
              aria-label={t('Amount')}
              placeholder={t('Amount')}
              value={quickAddAmount}
              onChange={event => setQuickAddAmount(event.target.value)}
              style={{ flex: '1 1 120px' }}
            />
            <Input
              aria-label={t('Date')}
              placeholder={t('YYYY-MM-DD')}
              value={quickAddDate}
              onChange={event => setQuickAddDate(event.target.value)}
              style={{ flex: '1 1 120px' }}
            />
            <Select
              options={accountOptions}
              value={quickAddAccount}
              onChange={setQuickAddAccount}
              defaultLabel={t('Account')}
              style={{ flex: '1 1 120px' }}
            />
            <Select
              options={payeeOptions}
              value={quickAddPayee}
              onChange={setQuickAddPayee}
              defaultLabel={t('Payee')}
              style={{ flex: '1 1 120px' }}
            />
            <Select
              options={categoryOptions}
              value={quickAddCategory}
              onChange={setQuickAddCategory}
              defaultLabel={t('Category')}
              style={{ flex: '1 1 120px' }}
            />
            <Button
              variant="primary"
              onPress={handleQuickAdd}
              isDisabled={isAdding}
            >
              <Trans>Add transaction</Trans>
            </Button>
          </View>
          {quickAddError && <ErrorAlert>{quickAddError}</ErrorAlert>}
        </View>

        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}>
          <SvgInboxCheck width={18} height={18} />
          <Text style={{ fontSize: 16, fontWeight: 600 }}>
            <Trans>Transactions to review</Trans> ({transactions?.length ?? 0})
          </Text>
        </View>

        {isLoading ? (
          <Text style={{ color: theme.pageTextSubdued }}>
            <Trans>Loading…</Trans>
          </Text>
        ) : transactions && transactions.length > 0 ? (
          <View style={{ gap: 12 }}>
            {transactions.map(transaction => {
              const isPending = pendingIds.has(transaction.id);
              const accountName =
                accounts?.find(account => account.id === transaction.account)
                  ?.name ?? t('Unknown account');
              const payeeName = transaction.payee
                ? payeesById?.[transaction.payee]?.name
                : t('No payee');
              const categoryName = transaction.category
                ? categories.find(
                    category => category.id === transaction.category,
                  )?.name
                : t('Uncategorized');

              return (
                <View
                  key={transaction.id}
                  style={{
                    backgroundColor: theme.tableBackground,
                    border: `1px solid ${theme.tableBorder}`,
                    borderRadius: 8,
                    flexShrink: 0,
                    gap: 12,
                    padding: 16,
                  }}
                >
                  <View
                    style={{
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text
                      style={{ color: theme.pageTextSubdued, fontSize: 12 }}
                    >
                      {transaction.date} · {accountName}
                    </Text>
                    <Text
                      style={{
                        color:
                          transaction.amount < 0
                            ? theme.errorText
                            : theme.noticeText,
                        fontSize: 17,
                        fontWeight: 600,
                      }}
                    >
                      {formatAmount(transaction.amount, 'financial')}
                    </Text>
                  </View>
                  <Text style={{ fontWeight: 600 }}>{payeeName}</Text>
                  {transaction.notes && (
                    <View
                      style={{
                        alignItems: 'flex-start',
                        backgroundColor: theme.tableHeaderBackground,
                        flexDirection: 'row',
                        gap: 6,
                        padding: 8,
                      }}
                    >
                      <SvgNotesPaper width={15} height={15} />
                      <Text
                        style={{
                          color: theme.pageTextSubdued,
                          flex: 1,
                          fontSize: 12,
                        }}
                      >
                        {transaction.notes}
                      </Text>
                    </View>
                  )}
                  <View
                    style={{
                      alignItems: 'center',
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <Select
                      options={categoryOptions}
                      value={transaction.category ?? ''}
                      onChange={category =>
                        void updateRow(transaction.id, { category })
                      }
                      defaultLabel={categoryName}
                      disabled={isPending}
                      style={{ flex: '1 1 160px' }}
                    />
                    <View
                      style={{
                        alignItems: 'center',
                        flexDirection: 'row',
                        gap: 4,
                      }}
                    >
                      <SvgArrowsSynchronize width={15} height={15} />
                      <Select
                        options={transferOptions}
                        value={transaction.payee ?? ''}
                        onChange={payee =>
                          void updateRow(transaction.id, { payee })
                        }
                        defaultLabel={t('Transfer')}
                        disabled={isPending}
                        style={{ minWidth: 130 }}
                      />
                    </View>
                    <Button
                      variant="primary"
                      onPress={() =>
                        void updateRow(transaction.id, { cleared: true })
                      }
                      isDisabled={isPending}
                    >
                      <SvgCheckCircle1 width={15} height={15} />
                      <Trans>Approve</Trans>
                    </Button>
                    <Button
                      aria-label={t('Delete transaction')}
                      onPress={() => void deleteRow(transaction.id)}
                      isDisabled={isPending}
                    >
                      <SvgTrash width={15} height={15} />
                    </Button>
                  </View>
                  {rowErrors[transaction.id] && (
                    <ErrorAlert>{rowErrors[transaction.id]}</ErrorAlert>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View
            style={{
              alignItems: 'center',
              backgroundColor: theme.tableBackground,
              border: `1px solid ${theme.tableBorder}`,
              borderRadius: 8,
              flexShrink: 0,
              padding: 40,
            }}
          >
            <Text style={{ color: theme.pageTextSubdued }}>
              <Trans>There are no transactions to review.</Trans>
            </Text>
          </View>
        )}
      </View>
    </Page>
  );
}
