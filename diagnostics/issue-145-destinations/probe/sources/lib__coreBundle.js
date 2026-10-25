63088:       async exposeBinding(name, callback) {
63089:         const result2 = await this._channel.exposeBinding({ name }, kNoTimeout);
63090:         this._bindings.set(name, callback);
63091:         return DisposableObject2.from(result2.disposable);
63092:       }
63093:       async _exposeCallbackBinding(name, callback) {

63563:     BindingCall = class extends ChannelOwner {
63564:       static from(channel) {
63565:         return channel._object;
63566:       }
63567:       constructor(parent, type3, guid, initializer) {
63568:         super(parent, type3, guid, initializer);
63569:       }
63570:       async call(func) {
63571:         try {
63572:           const frame = Frame2.from(this._initializer.frame);
63573:           const source14 = {
63574:             context: frame._page.context(),
63575:             page: frame._page,
63576:             frame
63577:           };
63578:           const result2 = await func(source14, ...this._initializer.args.map(parseResult));
63579:           this._channel.resolve({ result: serializeArgument(result2) }, kNoTimeout).catch(() => {
63580:           });
63581:         } catch (e) {
63582:           this._channel.reject({ error: serializeError2(e) }, kNoTimeout).catch(() => {
63583:           });
63584:         }
63585:       }
63586:     };
63587:   }
