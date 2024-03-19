import { describe, expect, test } from "vitest";
import { xrmLiveUpdates } from ".";
import { useFormContext } from "./Hooks";

describe("useFormContext", () =>
{
	test("context available", () =>
	{
		const formContext = {
			data: {},
			ui: {},
		} as Xrm.FormContext;

		let returnedContext;
		function render()
		{
			returnedContext = useFormContext();
		}

		xrmLiveUpdates(formContext, [render]);
		expect(returnedContext).toBe(formContext);
	});
}
);