import { useContext } from "@beaker73/live-update";
import { XrmLiveContext } from "./LiveUpdate";

/**
 * Retrieves the Xrm FormContext from the shared context
 * @returns The Xrm FormContext
 */
export function useFormContext(): Xrm.FormContext
{
	const liveContext = useContext();
	const xrmLiveContext = liveContext.sharedContext as XrmLiveContext;

	return xrmLiveContext.formContext;
}