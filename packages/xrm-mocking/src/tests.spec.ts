/* eslint-disable deprecation/deprecation -- need to test implementation of obsoletes */

import { integer, text } from "@beaker73/xrm-metadata";
import { describe, expect, test } from "vitest";
import { mockXrm } from ".";

describe("using-it", () => 
{
	test("foobar", () => 
	{
		const mock = mockXrm({
			attributes: {
				name: text("bkr_name", { maxLength: 20, defaultValue: "foobar" }),
				number: integer("bkr_number", { defaultValue: 31415 }),
			},
		});

		mock.activate(() => 
		{
			const attr = Xrm.Page.getAttribute("bkr_name");
			expect(attr).toBeDefined();
			expect(attr.getName()).toBe("bkr_name");
			expect(attr.getValue()).toBe("foobar");
		});
	});
});