# TranspilerExplorer
Decompile and browse code transpiled with Harmony (RW tool). To run it, clone the repo into your Mods folder. The mod starts a web interface available at (by default) http://localhost:8339.

Note that currently transpilers are applied separately from each other.

Also, as transpilers are re-run for every browsing request, it's possible to use my HotSwap mod to change transpiler code and see the effects without restarting the game.

<img src="https://user-images.githubusercontent.com/43299315/126483454-9e349786-620a-4592-9bf5-b52c97a98f7a.png" width="800" />

Built using the wonderful [Harmony](https://github.com/pardeike/Harmony), [MonoMod.Common](https://github.com/MonoMod/MonoMod.Common), [ICSharpCode.Decompiler](https://github.com/icsharpcode/ILSpy/), [Json.NET](https://www.newtonsoft.com/json), [PrismJS](https://prismjs.com/) and [jsdiff](https://github.com/kpdecker/jsdiff).