module.exports = { mixin: mixin }

function mixin(a, b, c) {
  for (var key in b) {
    a[key] = b[key]
  }
  if (c) {
    var args = [].slice.call(arguments)
    args.splice(1, 1)
    return mixin.apply(null, args)
  }
  return a
}
