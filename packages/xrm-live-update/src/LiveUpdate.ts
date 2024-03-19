import type { RenderFunction } from "@beaker73/live-update";
import { liveUpdates } from "@beaker73/live-update";


/** Shared Context accessable by via render functions */
export type XrmLiveContext = {
	/** The XRM form context */
	formContext: Xrm.FormContext,
	/** Shared cache so data can be cached over different render functions */
	sharedCache: Record<string, unknown>,
};

export function xrmLiveUpdates(context: Xrm.FormContext | Xrm.Events.EventContext, renderFunctions: RenderFunction[])
{
	const formContext =
		"getFormContext" in context ? context.getFormContext() :
			"ui" in context && "data" in context ? context :
				undefined;

	if (!formContext)
		throw new Error("No (recognized) context provided. Please provide a FormContext or an EventContext");

	const sharedContext: XrmLiveContext = {
		formContext,
		sharedCache: {},
	};

	return liveUpdates(renderFunctions, sharedContext);
}