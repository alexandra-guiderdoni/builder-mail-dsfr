48: export type PageFunction<Arg, R> = string | ((arg: Unboxed<Arg>) => R | Promise<R>);
49: export type PageFunctionOn<On, Arg2, R> = string | ((on: On, arg2: Unboxed<Arg2>) => R | Promise<R>);
50: export type SmartHandle<T> = [T] extends [Node] ? ElementHandle<T> : JSHandle<T>;
51: export type ElementHandleForTag<K extends keyof HTMLElementTagNameMap> = ElementHandle<HTMLElementTagNameMap[K]>;
52: export type BindingSource = { context: BrowserContext, page: Page, frame: Frame };
