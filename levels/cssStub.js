// require() hook so plain ts-node (no webpack/Next) can load a chain that transitively imports a
// .module.css - e.g. levels/Easy.ts -> components/Game/Game.tsx -> components/Square/Square.tsx
// -> Square.module.css. Used by this directory's dev scripts that need the real compiled level
// data (lib/levelGenerator.ts's templates come from there, not from re-parsing XML).
require.extensions[".css"] = function (module) {
  module.exports = {};
};
