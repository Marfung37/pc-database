import { fail } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { z, type ZodType } from 'zod';
import * as m from '$lib/paraglide/messages';
import { queueRegex } from '$lib/utils/queueUtils';
import type { SetupID, Queue } from '$lib/types';

const DEFAULT = {
  errorKey: 'errors'
}

type ActionFunction<T, R> = (args: { data: T } & RequestEvent) => R | Promise<R>;
type ActionOptions = { errorKey?: string };
type SvelteKitAction = (event: RequestEvent) => Promise<any>;

// Overloading for handling options for the action
export function formAction<T, R>(
  schema: ZodType<T>,
  options: ActionOptions,
  action: ActionFunction<T, R>
): SvelteKitAction;

export function formAction<T, R>(
  schema: ZodType<T>,
  action: ActionFunction<T, R>
): SvelteKitAction;

// wrapper to form actions to check schema and coerce types if specified
export function formAction<T, R>(
  schema: ZodType<T>,
  optionsOrAction: ActionOptions | ActionFunction<T, R>,
  maybeAction?: ActionFunction<T, R>
): SvelteKitAction {
  return async ({ url, cookies, fetch, getClientAddress, platform, params, route, setHeaders, isDataRequest, isSubRequest, tracing, isRemoteRequest, request, locals }: RequestEvent) => {
    const options = typeof optionsOrAction === 'function' ? {} : optionsOrAction;
    const action = typeof optionsOrAction === 'function' ? optionsOrAction : maybeAction!;

    // default values for options
    const errorKey = options.errorKey ?? DEFAULT.errorKey;

    const formData = await request.formData();

    const returnData = Object.fromEntries(formData);
    const { data, error, success } = schema.safeParse(returnData);

    if (!success) {
      const errors: Record<string, string> = {};

      for (const issue of error.issues) {
        const field = issue.path.join('.') || '_form';
        // prefer the first instance of error
        if (!(field in errors))
          errors[field] = issue.message;
      }

      return fail(400, { success, [errorKey]: Object.entries(errors).map(([key, value]) => ({ key, value })) });
    }

    return action({
      data,
      url,
      cookies,
      fetch,
      getClientAddress,
      platform,
      route,
      setHeaders,
      isDataRequest,
      isSubRequest,
      tracing,
      isRemoteRequest,
      request,
      params,
      locals
    });
  };
}

// common schema types
export const setupIDSchema = (type: string) => z
  .string()
  .nonempty({ error: () => m.validation_empty({ type }) })
  .regex(/^[1-9][0-9a-f]{11}$/, { error: () => m.validation_invalid_setupid({ type }) })
  .transform((value) => value as SetupID);
export const pcSchema = () => z.coerce
  .number({ error: () => m.validation_not_number({ type: "pc" }) })
  .int({ error: () => m.validation_not_int({ type: "pc" }) })
  .positive({ error: () => m.validation_not_positive({ type: "pc" }) })
  .lte(9, { error: () => m.validation_out_of_bounds({ type: "pc", min: 1, max: 9 }) });
export const queueSchema = (type: string) => z
  .string()
  .nonempty({ error: () => m.validation_empty({ type }) })
  .regex(queueRegex, { error: () => m.validation_invalid_queue({ type }) })
  .transform((value) => value as Queue);
