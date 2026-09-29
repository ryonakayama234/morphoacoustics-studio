import Ajv2020, { type ErrorObject } from 'ajv/dist/2020';
import commonSchema from '../../vendor/performance-contract/v0/common.schema.json';
import characterSchema from '../../vendor/performance-contract/v0/character.schema.json';
import scriptSchema from '../../vendor/performance-contract/v0/script.schema.json';
import directionSchema from '../../vendor/performance-contract/v0/direction.schema.json';
import requestSchema from '../../vendor/performance-contract/v0/performance-request.schema.json';
import resultSchema from '../../vendor/performance-contract/v0/performance-result.schema.json';
import { semanticRequestIssues, semanticResultIssues } from './semanticValidation';

// Keep Ajv strictness enabled, except strictRequired. The upstream schema uses
// `required` inside anyOf branches while defining those properties on the parent
// object, which is valid JSON Schema but intentionally triggers Ajv's optional
// strictRequired diagnostic.
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
for (const schema of [commonSchema, characterSchema, scriptSchema, directionSchema, requestSchema, resultSchema]) {
  ajv.addSchema(schema);
}

const maybeRequestValidator = ajv.getSchema(requestSchema.$id);
const maybeResultValidator = ajv.getSchema(resultSchema.$id);

if (!maybeRequestValidator || !maybeResultValidator) {
  throw new Error('Performance Contract v0 schemas failed to register.');
}

const requestValidator = maybeRequestValidator;
const resultValidator = maybeResultValidator;

export type ValidationResult =
  | { ok: true; issues: [] }
  | { ok: false; issues: string[] };

function formatAjvErrors(errors: ErrorObject[] | null | undefined): string[] {
  return (errors ?? []).map((error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`);
}

export function validatePerformanceRequest(input: unknown): ValidationResult {
  if (!requestValidator(input)) {
    return { ok: false, issues: formatAjvErrors(requestValidator.errors) };
  }
  const semanticIssues = semanticRequestIssues(input);
  return semanticIssues.length === 0
    ? { ok: true, issues: [] }
    : { ok: false, issues: semanticIssues };
}

export function validatePerformanceResult(input: unknown, request?: unknown): ValidationResult {
  if (!resultValidator(input)) {
    return { ok: false, issues: formatAjvErrors(resultValidator.errors) };
  }
  const semanticIssues = semanticResultIssues(input, request);
  return semanticIssues.length === 0
    ? { ok: true, issues: [] }
    : { ok: false, issues: semanticIssues };
}
