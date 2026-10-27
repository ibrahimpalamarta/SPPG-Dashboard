import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { validate } from './validate.js';
import { pageQuery } from '../lib/pagination.js';

interface Captured {
  status?: number;
  body?: Record<string, unknown>;
  nexted: boolean;
  req: Partial<Request>;
}

function run(schemas: Parameters<typeof validate>[0], req: Partial<Request>): Captured {
  const captured: Captured = { nexted: false, req };
  const res = {
    status(code: number) {
      captured.status = code;
      return this;
    },
    json(body: Record<string, unknown>) {
      captured.body = body;
      return this;
    },
  } as unknown as Response;

  validate(schemas)(req as Request, res, () => {
    captured.nexted = true;
  });

  return captured;
}

describe('validate', () => {
  test('coerces query strings and hands the parsed value to the handler', () => {
    const req: Partial<Request> = { query: { page: '2', pageSize: '10' } };
    const out = run({ query: pageQuery }, req);

    assert.equal(out.nexted, true);
    assert.deepEqual(req.valid?.query, { page: 2, pageSize: 10 });
  });

  test('applies defaults when the query is empty', () => {
    const req: Partial<Request> = { query: {} };
    run({ query: pageQuery }, req);
    assert.deepEqual(req.valid?.query, { page: 1, pageSize: 25 });
  });

  test('rejects a pageSize past the cap rather than clamping it', () => {
    const out = run({ query: pageQuery }, { query: { pageSize: '5000' } });
    assert.equal(out.status, 400);
    assert.equal(out.nexted, false);
    assert.equal(out.body?.error, 'validation_error');
  });

  test('names the offending field but never echoes its value', () => {
    const schema = z.object({ fileHash: z.string().regex(/^[a-f0-9]{64}$/) });
    const secret = 'not-a-hash-but-sensitive';
    const out = run({ body: schema }, { body: { fileHash: secret } });

    const fields = (out.body?.details as { fields: Record<string, string[]> }).fields;
    assert.ok('body.fileHash' in fields, 'field name should be reported');
    assert.equal(JSON.stringify(out.body).includes(secret), false, 'value must not leak');
  });

  test('reports failures from every part of the request at once', () => {
    const out = run(
      { params: z.object({ id: z.string().regex(/^\d+$/) }), body: z.object({ n: z.number() }) },
      { params: { id: 'abc' }, body: { n: 'nope' } },
    );

    const fields = (out.body?.details as { fields: Record<string, string[]> }).fields;
    assert.deepEqual(Object.keys(fields).sort(), ['body.n', 'params.id']);
  });

  test('surfaces a top-level refine that belongs to no single field', () => {
    const schema = z.object({ a: z.number().optional() }).refine(() => false, 'always fails');
    const out = run({ body: schema }, { body: {} });

    const fields = (out.body?.details as { fields: Record<string, string[]> }).fields;
    assert.deepEqual(fields.body, ['always fails']);
  });
});
