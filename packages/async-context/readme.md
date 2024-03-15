# AsyncContext

Provides a context over async function calls. Much like `AsyncLocalStorage` on node.js, but for browsers.

## Important Warning

The way this is done is slightly hacky and __might not work on all browsers__.  We generate a random id that is injected into the stack-trace by calling a function containing the id in a part of the name as a marker.

The implementation is dependent on the way the browser generates the stack traces and thus is not guaranteed to work as stack traces are not part of any standard.

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

## Functions

### callWithContext

Calls a function and set a context during the whole execution of that context. Even during async awaits with context switches. As soon as code continues after the await, the `getContext` will return the correct context again.

```ts
callWithContext<
	// type arguments
	Context = unknown, 
	Result = void
>(
	// arguments
	func: () => Promise<Result>
	context: Context
)
	// result
	: Promise<Result>;
```

#### type arguments

| name    | default | restriction | description                                  |
|---------|---------|-------------|----------------------------------------------|
| Context | unknown | -           | The type of the Context                      |
| Result  | void    | -           | The result the called function will return   |

#### arguments

| name    | type                  |description                                                                                         |
|---------|-----------------------|----------------------------------------------------------------------------------------------------|
| func    | () => Promise&lt;Result> | A callback function to be executed. As long as this function is executing the context will be set. |
| context | Context               | The context to be set during the whole execution of the provided function.                         |

#### result 

| type   | description                                    |
|--------|------------------------------------------------|
| Result | The result as returnd by the callback function |

### getContext

Gets the context at the current execution point. If the code was not started via `callWithContext` the function throws.

```ts
getContext<
	// type arguments
	Context = unknown
>()
	// result
	: Context
```


#### type arguments

| name    | default | restriction | description                                  |
|---------|---------|-------------|----------------------------------------------|
| Context | unknown | -           | (Optional) The type of the Context. This cannot be derived. You can provide it to avoid casting. But there is no guarantee that it is actually of this type. It is not possible to pass down a 'handle' or something else to ensure correct type infering as then you would not need context to begin with.                       |

#### result 

| type   | description                                            |
|--------|--------------------------------------------------------|
| Result | The context object active at this code execution point |

#### throws

| type   | description                                      |
|--------|--------------------------------------------------|
| Error  | Thrown when no execution context could be found  |


### tryGetContext

Tryies the context at the current execution point. If the code was not started via `callWithContext` the function returns undefined instead.


| name    | default | restriction | description                                  |
|---------|---------|-------------|----------------------------------------------|
| Context | unknown | -           | (Optional) The type of the Context. This cannot be derived. You can provide it to avoid casting. But there is no guarantee that it is actually of this type. It is not possible to pass down a 'handle' or something else to ensure correct type infering as then you would not need context to begin with.                       |

#### result 

| type   | description                                            |
|--------|--------------------------------------------------------|
| Result | The context object active at this code execution point or undefined if no execution context could be found |

