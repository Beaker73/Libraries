import memoize from "fast-memoize";

export function objectKeys<K extends string | number | symbol, V>(record: Record<K, V>): K[]
{
	return Object.keys(record) as K[];
}


/**
 * Returns a hash code from a string
 * @param str The string to hash.
 * @return A 32bit integer
 * @see https://stackoverflow.com/questions/6122571/simple-non-secure-hash-function-for-javascript
 */
export const hashCode = memoize(
	(str: string): number =>
	{
		let hash = 0;
		for (let i = 0, len = str.length; i < len; i++)
		{
			const chr = str.charCodeAt(i);
			hash = (hash << 5) - hash + chr;
			hash |= 0; // Convert to 32bit integer
		}
		return hash;
	}
);