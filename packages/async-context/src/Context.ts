import { v4 } from "uuid";

// storage of the contexts
const contextStorage: Record<string, unknown> = {};

/*
** On NodeJS we have AsyncLocalStorage to be able to add local context between async parts
** But on Browsers this is not available, the only package I found supporting something similar
** is zones.js, but this does not support the more modern async-await and works by patching all kinds of browser API's
** So i decided to create it myself using a trick, inserting a 'marker' into the stack trace.
*/

/**
 * Calls a async function with context. This context is available in all awaited sub functions
 * @param func The function to run
 * @param context The context to provide
 * @returns The result of the function
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used inside eval
export function callWithContext<Context = unknown, Result = void>(func: () => Promise<Result>, context: Context): Promise<Result>
{
	// generate unique id and a marker containing that id
	const id = v4().replace(/-/gi, "");
	const marker = `_$context_id$_${id}_$`;

	// store context the dev provided
	contextStorage[id] = context;

	// wrap the eval and the function begin executing with context in a promise.
	// The result will be resolved, and any exception will be rejected.
	return new Promise(
		// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used inside eval
		(resolve, reject) =>
		{
			console.debug("inside new promise", { resolve, reject, func });
			try
			{
				eval(`
					async function ${marker}() { 
						try {
							const result = await func();
							resolve(result);
						}
						catch( err ) {
							console.error("exception during execution of context function", err);
							reject(err);
						}
						finally {
							delete contextStorage[id];
						}
					}
					${marker}();
				`);
			}
			catch (x: unknown)
			{
				console.error("eval function failed", x);
				throw x;
			}
		});
}

/**
 * Tries to get the context, but if not found returns undefined.
 * @param reasonRef Optional target object where a reason might be set, when undefined is returned.
 * @returns the found context, or undefined when not found.
 */
export function tryGetContext<Context = unknown>(): Context | undefined
{
	const [context, _] = getContextOrFailureReason<Context>();
	if (!context)
		return undefined;

	return context;
}

/**
 * Gets the current context. Throws if no context is available.
 * @throws Error with a reason message
 * @returns The current context
 */
export function getContext<Context = unknown>(): Context
{
	const [context, reason] = getContextOrFailureReason<Context>();
	if (!context)
		throw new Error(`Failed to get context: ${reason}`);

	return context;
}


/**
 * Tries to get the context. Returns tuple with either context or failure reason
 * @returns [context, failReason]
 */
function getContextOrFailureReason<Context = unknown>(): [context: Context, reason: undefined] | [context: undefined, reason: string]
{
	// get the stack trace
	Error.stackTraceLimit = Infinity; // ensure with get the WHOLE stack trace, or we might miss the marker
	const stack = new Error().stack;
	if (!stack)
		return fail("This environment does not generate stack traces");

	// find the first matching context name
	const match = stack.match(/_\$context_id\$_(?<id>[0-9a-f]{32})_\$/);
	if (!match || !match.groups || !match.groups.id)
		return fail("No context found in the stack trace");

	// check if context exists in storage
	if (!(match.groups.id in contextStorage))
		return fail(`Context with id ${match.groups.id} found in stack trace, but not found in store`);

	// return context
	return [
		contextStorage[match.groups.id] as Context,
		undefined,
	];


}

/**
 * Adds warning reason to console and return tuple with failure reason.
 * @param reason The reason of the failure
 * @returns Tuple containing failure reason
 */
function fail(reason: string): [context: undefined, reason: string]
{
	console.warn(reason);
	return [undefined, reason];
}


