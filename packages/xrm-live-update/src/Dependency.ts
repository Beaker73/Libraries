import { v4 } from "uuid";
import { DependencyTracker, RerenderFunction } from "./LiveUpdate";

/** Dependency that allows you to trigger rerenders */
export type Dependency = {
	/** Unique id for this dependency */
	id: string;
	/** call this to trigger a change, resulting in a rerende of the function this dependency is linked to */
	trigger: () => void;
};

/**
 * Creates a dependency
 * @param functionId The id of the function that will be rerendered if this dependency is triggered
 */
export function createDependency(functionId: string, tracker: DependencyTracker, rerender: RerenderFunction): Dependency
{
	const dependency: Dependency = {
		id: v4(),
		trigger: () => rerender(functionId),
	};

	tracker[dependency.id] = dependency;
	return dependency;
}

export function releaseDependency(tracker: DependencyTracker, dependency: Dependency)
{
	delete tracker[dependency.id];
}

