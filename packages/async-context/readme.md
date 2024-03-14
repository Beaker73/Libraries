# AsyncContext

Provides a context over async function calls. Much like `AsyncLocalStorage` on node.js, but for browsers.

## Important Warning

The way this is done is slightly hacky and __might not work on all browsers__.  We generate a random id that is injected into the stack-trace by calling a function containing the a name containg that id as a marker.

The implementation is dependent on the way the browser generates the stack traces and thus is not guaranteed to work as stack tracers are not part of any standard.

## Usage

```ts

// define some context that should be available anywhere
const context = { value: "banana" };

// call a function with the context.
// even after context switches 
const result = await callWithContext(context, async () => {
	
	// get the context
	const c1 = getContext();
	
	await someAsync();
	
	// stil get the same context
	const c2 = getContext();

	// maybe return a result
	return "coconut";

	async function someAsync() {
		await new Promise(resolve => setTimeout(resolve, 5000));
		
		// also the same context
		const c3 = getContext();
	}
})

```
