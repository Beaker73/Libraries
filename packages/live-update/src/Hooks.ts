import { getContext } from "@beaker73/async-context";
import { hashCode } from "./Helpers";
import { LiveContext, getId } from "./LiveUpdate";



/** Setup function that returns a cleanup function */
export type EffectSetup<Result = void> = () => EffectCleanup<Result>;
/** Cleanup either only a cleanup, or an object with cleanup and a result */
export type EffectCleanup<Result = void> = Result extends void ? EffectCleanupFunction : EffectCleanupObject<Result>;
/** Cleanup function */
export type EffectCleanupFunction = () => void;
/** The stored result with the cleanup and the result */
export type EffectCleanupObject<Result> = { cleanup?: EffectCleanupFunction, result?: Result };


/**
 * Creates an effect, that calls setup once as long as useEffect keeps being called during renders. 
 * When it stops being called during renders the cleanup function is called. 
 * If you return a value, this value keeps being returned until cleanup is triggered.
 * @param setup The setup function that sets up effect and returns a cleanup function
 */
export function useEffect<Result = void>(setup: EffectSetup<Result>): Result
{
	// on first render where effect is called the setup function is run.
	// on sequential renders the setup will not run anymore.
	// on the first render where effect is not called anymore, the cleanup is executed.
	// on sequential renders where effect is not called, the cleanup will not run anymore.
	const context = useContext();
	const key = useId("useEffect");

	// if we are not aware of this effect, remember it until we are about to forget, then cleanup
	if (!context.recognize(key))
	{
		// not recognized, start remembering
		// run setup on first entry
		const effectCleanupToRemember = wrapCallbackResult(setup());

		// remember this cleanup
		context.remember(key, effectCleanupToRemember, ec => ec.cleanup?.());

		// return the result
		return effectCleanupToRemember.result as Result;
	}

	else
	{
		// recognized, keep returning the same remembered result
		const effectCleanup = context.recall<EffectCleanupObject<Result>>(key);
		return effectCleanup?.result as Result;
	}
}

// wraps al the possible results into the same format for simpler code
function wrapCallbackResult<Result>(cleanup: EffectCleanup<Result>): EffectCleanupObject<Result>
{
	if (typeof cleanup === "function")
		return { cleanup, result: undefined };
	return cleanup;
}



/**
 * Returns the current LiveContext object
 * @returns The current LiveContext object
 * @throws Error when there is no current async context available
 * 			or when current async context does not seem to be a correct LiveContext object
 */
export function useContext()
{
	const context = getContext<LiveContext>();
	if (typeof context !== "object" && !("renderFunction" in context))
		throw new Error("Current context is not a LiveContext object");
	return context;
}

/**
 * Sets up a dependency trigger that allows you to force rerenders
 * @returns Dependency you can use the trigger a dependency change
 */
export function useDependency()
{
	return useEffect(() =>
	{
		const context = useContext();
		const dependency = context.createDependency();
		return {
			cleanup: () => context.releaseDependency(dependency),
			result: dependency,
		};
	});
}


/**
 * Generates a unique Id that is the same for every sequential render, but different per render function.
 * @param prefix Custom prefix to prepand to the id
 * @returns
 */
export function useId(prefix?: string)
{
	const context = useContext();

	Error.stackTraceLimit = Infinity; // ensure with get the WHOLE stack trace	
	const trace = new Error().stack;
	const ix = trace?.indexOf("_$context_id$_");
	const traceUpto = trace?.substring(0, ix);
	const id = getId(context.executingFunction);

	const code = hashCode(`${id ?? "-"}:${traceUpto}`);
	return `${prefix}:${code.toString(16)}`;
}
