import { AttributeMetadata, IntegerAttributeMetadata, TextAttributeMetadata } from "./metadata";

/**
 * Generates the metadata for an attribute of provided type
 * @param name The logical name of the attribute
 * @param type The type of the attribute
 * @param metadata Extra metadata about the attribute
 */
export function attribute<T extends Xrm.Attributes.AttributeType>(name: string, type: T, metadata?: Partial<AttributeMetadata<T>>)
{
	switch (type)
	{
		case "string": return text(name, metadata as TextAttributeMetadata | undefined);
		case "integer": return integer(name, metadata as IntegerAttributeMetadata | undefined);
		default: throw new Error(`${type} not implemented`);
	}
}

/**
 * Generates the metadata for a text attribute
 * @param name The logical name of the attribute
 * @param metadata Extra metadata about the attribute
 */
export function text(name: string, metadata?: Partial<TextAttributeMetadata>)
{
	return {
		logicalName: name,
		type: "string",
		maxLength: metadata?.maxLength ?? 100, // default to 100, the default for dataverse columns when you do not override
		defaultValue: metadata?.defaultValue ?? undefined,
	} satisfies TextAttributeMetadata;
}

/**
 * Generates the metadata for a integer attribute
 * @param name The logical name of the attribute
 * @param metadata Extra metadata about the attribute
 * @returns The final combined metadata about the attribute
 */
export function integer(name: string, metadata?: Partial<IntegerAttributeMetadata>)
{
	return {
		logicalName: name,
		type: "integer",
		minValue: metadata?.minValue ?? -2_147_483_647,
		maxValue: metadata?.maxValue ?? +2_147_483_647,
		defaultValue: metadata?.defaultValue ?? undefined,
	} satisfies IntegerAttributeMetadata;
}