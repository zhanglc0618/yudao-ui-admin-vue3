const buildKeyMap = (translations) => {
  const map = new Map()
  Object.keys(translations || {}).forEach((key) => {
    map.set(key.toLowerCase(), key)
  })
  return map
}

export default function customTranslate(translations = {}) {
  const keyMap = buildKeyMap(translations)

  const resolveTranslation = (value) => {
    if (typeof value !== 'string') return value
    const hit = keyMap.get(value.toLowerCase())
    return hit ? translations[hit] : value
  }

  return function (template = '', replacements = {}) {
    const templateKey = keyMap.get(String(template).toLowerCase())
    const localizedTemplate = templateKey ? translations[templateKey] : template

    return localizedTemplate.replace(/{([^}]+)}/g, (_, key) => {
      const raw = replacements[key]
      if (raw === undefined || raw === null) {
        return `{${key}}`
      }
      return resolveTranslation(raw)
    })
  }
}
