import { describe, expect, test } from "vitest";
import { Dependency } from "./Dependency";
import { useContext, useDependency, useEffect, useId } from "./Hooks";
import { liveUpdates } from "./LiveUpdate";

describe("liveUpdates", () =>
{
	describe("useId", () => 
	{
		test("id should be different for two ids in same function", async () =>
		{
			const id1s: string[] = [];
			const id2s: string[] = [];
			const id3s: string[] = [];
			let skip = false;

			function render()
			{
				const id1 = useId();
				id1s.push(id1);
				if (!skip)
				{
					const id2 = useId();
					id2s.push(id2);
					expect(id1).not.toEqual(id2);
				}
				const id3 = useId();
				id3s.push(id3);
			}

			const forceRerender = await liveUpdates([render]);

			// assert that all ids differ
			expect(id1s[0]).not.toEqual(id2s[0]);
			expect(id2s[0]).not.toEqual(id3s[0]);

			await forceRerender();

			// assert that second render, same ids are returned
			expect(id1s[1]).toEqual(id1s[0]);
			expect(id2s[1]).toEqual(id2s[0]);
			expect(id3s[1]).toEqual(id3s[0]);

			skip = true;
			await forceRerender();

			// assert that second is not called
			expect(id2s.length).toEqual(2);
			// assert that returned ids still equal
			expect(id1s[2]).toEqual(id1s[1]);
			// assert that 3th id is not getting that from the second, but still its own
			expect(id3s[2]).toEqual(id3s[1]);
			expect(id3s[2]).not.toEqual(id2s[1]);

			skip = false;
			await forceRerender();

			// assert that after restarting id generation, ids are still same as on all previous renders
			expect(id1s[3]).toEqual(id1s[2]);
			expect(id2s[2]).toEqual(id2s[1]);
			expect(id3s[3]).toEqual(id3s[2]);

		});
	});

	describe("memory", () =>
	{
		test("memory", async () =>
		{
			let skip = false;
			let exists = false;
			let forgotCalled = 0;

			function render()
			{
				const context = useContext();
				exists = context.recognize("foobar");
				if (!skip)
					context.remember("foobar", 1, () => forgotCalled += 1);
			}

			const forceRerender = await liveUpdates([render]);
			expect(exists).toBeFalsy();

			await forceRerender();
			expect(exists).toBeTruthy();

			skip = true;
			await forceRerender();
			expect(exists).toBeTruthy(); // still remembering at start of call
			expect(forgotCalled).toBe(1); // should be called at end of render

			await forceRerender();
			expect(exists).toBeFalsy(); // next render value is forgotten
		});
	});

	describe("useEffect", () =>
	{
		test("return value", async () => 
		{
			let result = 0;

			function render()
			{
				result = useEffect(() =>
				{
					return {
						cleanup: () => { },
						result: 25,
					};
				});
			}

			const forceRerender = await liveUpdates([render]);
			// assert setup called and cleanup not called
			expect(result).toBe(25);

			result = 0;
			await forceRerender();
			expect(result).toBe(25); // value returned again on every render
		});

		test("setup and cleanup", async () =>
		{
			let skip = false;
			let setupCalled = 0;
			let cleanupCalled = 0;

			function render()
			{
				if (!skip)
				{
					useEffect(() =>
					{
						setupCalled += 1;
						return () => cleanupCalled += 1;
					});
				}
			}

			const forceRerender = await liveUpdates([render]);
			// assert setup called and cleanup not called
			expect(setupCalled).toBe(1);
			expect(cleanupCalled).toBe(0);

			await forceRerender();
			// assert setup not called again, and cleanup still not called
			expect(setupCalled).toBe(1);
			expect(cleanupCalled).toBe(0);

			skip = true;
			await forceRerender();
			// assert setup not called again, but cleanup now called
			expect(setupCalled).toBe(1);
			expect(cleanupCalled).toBe(1);

			skip = false;
			await forceRerender();
			// assert setup called again, and cleanup not called again
			expect(setupCalled).toBe(2);
			expect(cleanupCalled).toBe(1);
		});
	});

	describe("useDependency", () =>
	{
		test("triggering dependency calls render again", async () =>
		{
			let renderCalled = 0;
			let dep: Dependency | undefined;

			function render()
			{
				dep = useDependency();
				renderCalled += 1;
			}

			await liveUpdates([render]);
			expect(renderCalled).toBe(1);
			expect(dep).toBeDefined();

			dep?.trigger();
			expect(renderCalled).toBe(2);
		});
	});
});