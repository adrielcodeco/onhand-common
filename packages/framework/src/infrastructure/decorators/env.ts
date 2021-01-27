export function Env (key: string) {
  return (target: any, propertyKey: string) => {
    Object.defineProperty(target, key, {
      get () {
        return process.env[key] ?? this[`${propertyKey}-defaultValue`]
      },
      set (newValue) {
        this[`${propertyKey}-defaultValue`] = newValue
      },
    })
  }
}
