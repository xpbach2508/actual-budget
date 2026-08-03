import { q } from '@actual-app/core/shared/query';
import { describe, expect, it } from 'vitest';

import { makeAccountBalanceQuery } from './Account';

describe('makeAccountBalanceQuery', () => {
  it('excludes accounts hidden from totals for All Accounts', () => {
    const query = makeAccountBalanceQuery(q('transactions'));

    expect(query.query.serialize().filterExpressions).toContainEqual({
      'account.exclude_from_totals': false,
    });
  });
});
