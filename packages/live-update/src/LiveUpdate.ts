import { callWithContext } from "@beaker73/async-context";
import { v4 } from "uuid";
import { Dependency, createDependency, releaseDependency } from "./Dependency";
import { forget, recall, recognize, remember } from "./Memory";

/** Render functions take no arguments, and can by synchronous or asynchronous, but return no value. */
export type RenderFunction = (() => ((Promise<void>) | void));

/** Function to trigger a rerender of the specified function. Or all when no Id specified */
export type RerenderFunction = (functionId?: string) => Promise<void>;

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

	/**
	 * Shared context as provided by your application, to use as you wish
	 */
	sharedContext?: unknown;
};

type WithId<T> = T & { __id: string };
const addId = (rf: RenderFunction): string => { const id = v4(); (rf as WithId<RenderFunction>).__id = id; return id; };
// eslint-disable-next-line @typescript-eslint/ban-types -- dont care about number of params or exact match to a specific function
const hasId = <T extends Function | object>(item: T): item is T & { __id: string } => "__id" in item;
// eslint-disable-next-line @typescript-eslint/ban-types -- dont care about number of params or exact match to a specific function
export const getId = <T extends Function | object>(x: T) => { if (!hasId(x)) throw new Error("missing id"); return x.__id; };

type MemoryTrackerState = true;
export type MemoryTracker = Record<string, MemoryTrackerState>;
export type DependencyTracker = Record<string, Dependency>;
export type Memory = Record<string, MemoryNode | MemoryTracker | DependencyTracker> & { _$tracker: MemoryTracker, _$dependencies: DependencyTracker };
type MemoryStore = Record<string, Memory>;
export type MemoryNode = { item: unknown, onForget?: (item: unknown) => void };

/**
 * Sets up live update on the provided render functions
 * @param renderFunctions List of render functions with business logic
 * @param sharedContext (optional) a shared context that might be used by all functions or hooks your application uses.
 */
export async function liveUpdates(renderFunctions: RenderFunction[], sharedContext?: unknown)
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
				sharedContext,
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