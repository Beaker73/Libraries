import { describe, expect, test } from "vitest";
import { callWithContext, getContext } from "./Context";

describe("context", () => 
{
	test("restored after await", async () => 
	{
		await callWithContext(test, { fruit: "banana" });

		async function test() 
		{
			console.debug("test entry");

			const ctx = getContext();
			console.debug(ctx);
			expect(ctx).toStrictEqual({ fruit: "banana" });

			// eslint-disable-next-line compat/compat -- this is testing, ignore compat
			await new Promise(resolve => setTimeout(resolve, 1000));

			const ctx2 = getContext();
			console.debug(ctx2);
			expect(ctx2).toStrictEqual({ fruit: "banana" });

			await nestedFunction();
		}

		async function nestedFunction() 
		{
			console.debug("nested entry");

			const ctx = getContext();
			console.debug(ctx);
			expect(ctx).toStrictEqual({ fruit: "banana" });

			// throw new Error("banana");
		}

		expect(getContext).toThrowError("Failed to get context: No context found in the stack trace");

	});
});
