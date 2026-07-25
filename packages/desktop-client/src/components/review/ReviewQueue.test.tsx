import { getPrimaryOrderBy } from '@actual-app/core/shared/query';
import { describe, expect, it } from 'vitest';

import { makeReviewQuery } from './ReviewQueue';

describe('makeReviewQuery', () => {
  it('filters pending transactions and orders newest first', () => {
    const query = makeReviewQuery();

    expect(getPrimaryOrderBy(query, null)).toEqual({
      field: 'date',
      order: 'desc',
    });
    expect(query.serialize().filterExpressions).toContainEqual({
      cleared: false,
    });
  });
});
