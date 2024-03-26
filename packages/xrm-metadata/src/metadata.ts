/** The base for all attribute metadata */
export type AttributeMetadataBase = {
	/** The logical name for the attribute that this metadata describes */
	logicalName: string,
	/** The type of the attribute that this metadata describes */
	type: Xrm.Attributes.AttributeType,
};

/** Metadata for a Text Attribute */
export type TextAttributeMetadata = AttributeMetadataBase & {
	/** The maximum length of the text attribute */
	maxLength: number,
	/** The default value to use when the value is null, if not set null is used */
	defaultValue?: string,
};

/** Metadata for a Integer attribute */
export type IntegerAttributeMetadata = AttributeMetadataBase & {
	/** The minimum value of the number */
	minValue: number,
	/** The maximum value of the number */
	maxValue: number,
	/** The default value to use when the value is null, if not set null is used */
	defaultValue?: number,
};

export type AttributeMetadata<T extends Xrm.Attributes.AttributeType> =
	T extends "string" ? TextAttributeMetadata
		: T extends "integer" ? IntegerAttributeMetadata
			: AnyAttributeMetadata;
export type AnyAttributeMetadata =
	| TextAttributeMetadata
	| IntegerAttributeMetadata
	;
