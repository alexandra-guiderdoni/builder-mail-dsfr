880: 
881:   /**
882:    * The method adds a function called
883:    * [`name`](https://playwright.dev/docs/api/class-page#page-expose-binding-option-name) on the `window` object of
884:    * every frame in this page. When called, the function executes
885:    * [`callback`](https://playwright.dev/docs/api/class-page#page-expose-binding-option-callback) and returns a
886:    * [Promise] which resolves to the return value of
887:    * [`callback`](https://playwright.dev/docs/api/class-page#page-expose-binding-option-callback). If the
888:    * [`callback`](https://playwright.dev/docs/api/class-page#page-expose-binding-option-callback) returns a [Promise],
889:    * it will be awaited.
890:    *
891:    * The first argument of the
892:    * [`callback`](https://playwright.dev/docs/api/class-page#page-expose-binding-option-callback) function contains
893:    * information about the caller: `{ browserContext: BrowserContext, page: Page, frame: Frame }`.
894:    *
895:    * See
896:    * [browserContext.exposeBinding(name, callback)](https://playwright.dev/docs/api/class-browsercontext#browser-context-expose-binding)
897:    * for the context-wide version.
898:    *
899:    * **NOTE** Functions installed via
900:    * [page.exposeBinding(name, callback)](https://playwright.dev/docs/api/class-page#page-expose-binding) survive
901:    * navigations.

928:    * @param name Name of the function on the window object.
929:    * @param callback Callback function that will be called in the Playwright's context.
930:    */
931:   exposeBinding(name: string, playwrightBinding: (source: BindingSource, ...args: any[]) => any): Promise<Disposable>;
932: 
