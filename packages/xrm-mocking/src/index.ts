/* eslint-disable deprecation/deprecation -- need to implement the deprecated parts as well */

import { AnyAttributeMetadata } from "@beaker73/xrm-metadata";

export interface MockXrmSetup
{
	attributes: Record<string, AnyAttributeMetadata>,
}

export function mockXrm(setup: MockXrmSetup): MockXrm
{
	// big ass todo, implement XRM
	const xrm: Xrm.XrmStatic = {
		App: {} as Xrm.App,
		Device: {} as Xrm.Device,
		Encoding: {} as Xrm.Encoding,
		Navigation: {} as Xrm.Navigation,
		Mobile: {} as Xrm.Mobile,
		Page: buildFormContext(setup) as Xrm.Page,
		Panel: {} as Xrm.Panel,
		Utility: {} as Xrm.Utility,
		WebApi: {} as Xrm.WebApi,
	};

	return {
		activate: callback =>
		{
			const originalXrm = globalThis.Xrm;
			try
			{
				globalThis.Xrm = xrm;
				callback();
			}
			finally
			{
				globalThis.Xrm = originalXrm;
			}
		},
	};
}

function buildFormContext(setup: MockXrmSetup): Xrm.FormContext
{
	const attributes: Record<string, Xrm.Attributes.Attribute<unknown>> = {};

	for (const metadata of Object.values(setup.attributes))
	{
		const isDirty = false;
		const value = metadata.defaultValue ?? null;

		attributes[metadata.logicalName] = {
			getAttributeType: () => metadata.type,
			getName: () => metadata.logicalName,
			getIsDirty: () => isDirty,
			getValue: () => value,
		};
	}

	return {
		getAttribute: name => attributes[name],
	};
}

interface MockXrm
{
	/** Activates the mock while function is executing */
	activate(callback: () => void): void;
}