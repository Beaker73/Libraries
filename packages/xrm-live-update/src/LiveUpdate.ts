import { callWithContext, getContext } from "@beaker73/async-context";
import memoize from "fast-memoize";
import { v4 } from "uuid";

/** Render functions take no arguments, and can by synchronous or asynchronous, but return no value. */
export type RenderFunction = (() => ((Promise<void>) | void));

/** Function to trigger a rerender of the specified function. Or all when no Id specified */
export type RerenderFunction = (functionId?: string) => Promise<void>;

export type Dependency = {
	/** Unique id for this dependency */
	id: string,
	/** call this to trigger a change, resulting in a rerende of the function this dependency is linked to */
	trigger: () => void,
};

/** The context provided to render functions */
export type LiveContext = {
	/** The currently executing render function */
	executingFunction: RenderFunction;

	/**
	 * Creates a dependency that will trigger updates for the executing function 
	 * @returns The created dependency
	 */
	createDependency(): Dependency;
	/**
	 * Releases a previous created dependency from the executing function
	 * @param dependency The dependency to release
	 */
	releaseDependency(dependency: Dependency): void;

	/** Checks if the key is recognized for this render function 
	 * @param key The key under which the item is remembered
	 * @returns true when the key is recognized; otherwise false
	*/
	recognize(key: string): boolean;
	/** Starts remembering the item under the provided key. 
	 * If during a render remember is not active called, we start forgetting. 
	 * Just before forgetting onForget is called. You cannot avoid forgetting 
	 * @param key The key under which the item is remembered
	 * @param item The item to remember
	 * @param onForget Optional callback to be called just before we forget
	 */
	remember<T>(key: string, item: T, onForget?: (item: T) => void): void;
	/**
	 * Tries to recall the item associated with the key, as long as something is activly recalled, it will persist.
	 * @param key The key of the item you are trying to recall
	 * @returns The recalled item, or undefined when we cannot recall the item
	 */
	recall<T>(key: string): T | undefined;
};

type WithId<T> = T & { __id: string };
const addId = (rf: RenderFunction): string => { const id = v4(); (rf as WithId<RenderFunction>).__id = id; return id; };
// eslint-disable-next-line @typescript-eslint/ban-types -- dont care about number of params or exact match to a specific function
const hasId = <T extends Function | object>(item: T): item is T & { __id: string } => "__id" in item;
// eslint-disable-next-line @typescript-eslint/ban-types -- dont care about number of params or exact match to a specific function
const getId = <T extends Function | object>(x: T) => { if (!hasId(x)) throw new Error("missing id"); return x.__id; };

type MemoryTrackerState = true;
type MemoryTracker = Record<string, MemoryTrackerState>;
type DependencyTracker = Record<string, Dependency>;
type Memory = Record<string, MemoryNode | MemoryTracker | DependencyTracker> & { _$tracker: MemoryTracker, _$dependencies: DependencyTracker };
type MemoryStore = Record<string, Memory>;
type MemoryNode = { item: unknown, onForget?: (item: unknown) => void };

/**
 * Sets up live update on the provided render functions
 * @param renderFunctions List of render functions with business logic
 */
export async function liveUpdates(renderFunctions: RenderFunction[]) 
{
	const storage: MemoryStore = {};

	// for each function, assign id, reserve storage and add to map for quick find
	const renderMap: Record<string, RenderFunction> = {};
	for (const func of renderFunctions) 
	{
		const id = addId(func);
		storage[id] = { _$tracker: {}, _$dependencies: {} };
		renderMap[id] = func;
	}

	// now start first full render of all
	await render();

	// return render function (mostly for tests, but who knows what it might be usable for)
	return render;

	async function render(funcId?: string | string[])
	{
		const fids = Array.isArray(funcId) ? funcId : typeof funcId === "string" ? [funcId] : Object.keys(renderMap);

		// generate list of functions to render
		const funcs = fids.map(id => renderMap[id]).filter(f => typeof f === "function");

		// call all functions
		for (const func of funcs)
		{
			const id = getId(func);
			const memory = storage[id];

			// at start of render cycle, begin with empty tracker
			const oldTracker = memory._$tracker;
			memory._$tracker = {};

			// get the depedency store for this function
			const dependencyStore = memory._$dependencies;

			// create a context for the rendering function
			const context: LiveContext = {
				executingFunction: func,
				createDependency: () => createDependency(id, dependencyStore, render),
				releaseDependency: dependency => releaseDependency(dependencyStore, dependency),
				remember: (key, item, onForget) => remember(memory, key, item, onForget),
				recognize: key => recognize(memory, key),
				recall: key => recall(memory, key),
			};

			try
			{
				// execute the rendering function providing the context
				await callWithContext(async () => await func(), context);
			}
			finally
			{
				forget(memory, oldTracker, memory._$tracker);
			}
		}
	}
}

/**
 * 
 * @param functionId The id of the function that will be rerendered if this dependency is triggered
 */
function createDependency(functionId: string, tracker: DependencyTracker, rerender: RerenderFunction): Dependency
{
	const dependency: Dependency = {
		id: v4(),
		trigger: () => rerender(functionId),
	};

	tracker[dependency.id] = dependency;
	return dependency;
}

function releaseDependency(tracker: DependencyTracker, dependency: Dependency)
{
	delete tracker[dependency.id];
}

function forget(memory: Memory, oldTracker: MemoryTracker, newTracker: MemoryTracker)
{
	// we will forget what we did not activly remember
	// alls keys that are in the OLD tracker, but NOT in the NEW tracker.
	console.log(JSON.stringify({ oldTracker, newTracker }));
	const keysToForget = objectKeys(oldTracker).filter(oldKey => !(oldKey in newTracker));
	console.log(JSON.stringify(keysToForget));

	// for each of these keys, call onForget and then remove from storage
	for (const keyToForget of keysToForget)
	{
		const dataToForget = memory[keyToForget];
		if (isMemoryNode(dataToForget))
		{
			console.log(JSON.stringify(memory));
			dataToForget?.onForget?.(dataToForget.item);
			delete memory[keyToForget];
		}
	}
}

function isMemoryNode(node: MemoryNode | MemoryTracker | DependencyTracker): node is MemoryNode
{
	console.log(JSON.stringify(node));
	return typeof node === "object" && node !== null && "item" in node;
}

function remember<T = unknown>(storage: Memory, key: string, item: T, onForget?: (item: T) => void)
{
	storage[key] = { item, onForget: onForget as (item: unknown) => void } satisfies MemoryNode;
	storage._$tracker[key] = true;
}

function recognize(storage: Memory, key: string): boolean
{
	return typeof storage === "object" && storage !== null && key in storage;
}

function recall<T>(storage: Memory, key: string): T | undefined
{
	if (recognize(storage, key))
	{
		// when recalling, we active reenforce memory to remember.
		storage._$tracker[key] = true;

		const node = storage[key];
		if (isMemoryNode(node))
			return node.item as T;
	}

	return undefined;
}


function objectKeys<K extends string | number | symbol, V>(record: Record<K, V>): K[] 
{
	return Object.keys(record) as K[];
}

// function objectValues<K extends string | number | symbol, V>(record: Record<K, V>): V[]
// {
// 	return Object.values(record);
// }

// function objectEntries<K extends string | number | symbol, V>(record: Record<K, V>): [K, V][]
// {
// 	return Object.entries(record) as [K, V][];
// }


/** Setup function that returns a cleanup function */
type EffectSetup<Result = void> = () => EffectCleanup<Result>;
/** Cleanup either only a cleanup, or a tuple with cleanup and a result */
type EffectCleanup<Result = void> = Result extends void ? EffectCleanupFunction : EffectCleanupObject<Result>;
/** Cleanup function */
type EffectCleanupFunction = () => void;
/** The stored result with the cleanup and the result */
type EffectCleanupObject<Result> = { cleanup: EffectCleanupFunction, result: Result | undefined };

/**
 * Creates an 
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

	// if we are not aware of this effect, rember it until we are about to forget, then cleanup
	if (!context.recognize(key)) 
	{
		// not recognized, start remembering

		// run setup on first entry
		const effectCleanupToRemember = wrapCallbackResult(setup());

		// remember this cleanup
		context.remember(key, effectCleanupToRemember, ec => ec.cleanup());

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

// export function useField(metadata: FieldMetadata) 
// {
// 	useEffect(() => 
// 	{
// 		const dependency = useDependency();
// 		const onChange = () => dependency.trigger();
// 		attribute.addOnChange(onChange);
// 		return () => attribute.removeOnChange(onChange);
// 	});
// }

/***/
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

/**
 * Returns a hash code from a string
 * @param str The string to hash.
 * @return A 32bit integer
 * @see https://stackoverflow.com/questions/6122571/simple-non-secure-hash-function-for-javascript
 */
const hashCode = memoize(
	(str: string): number =>
	{
		let hash = 0;
		for (let i = 0, len = str.length; i < len; i++)
		{
			const chr = str.charCodeAt(i);
			hash = (hash << 5) - hash + chr;
			hash |= 0; // Convert to 32bit integer
		}
		return hash;
	}
);