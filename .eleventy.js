const createClient = require('./_scripts/client')
//const { translate, permalink, absolute, alternate, addContext } = require('_scripts/utils')

module.exports = (eleventyConfig, _options) => {
  const defaults = {
    url: 'http://localhost:8055',
    name: 'directus',
    allowHidden: true,
    allowSystem: false,
    onItem: item => item,
    filterCollection: ({collection, meta}) => true,
    sequencial: false,
    recursions: 7,
  }

  const options = {
    ...defaults,
    ..._options,
  }

  const directus = createClient({
    url: options.url,
    allowHidden: options.allowHidden,
    allowSystem: options.allowSystem,
    login: options.login,
    token: options.token,
    auth: options.auth,
    sequencial: options.sequencial,
    recursions: options.recursions,
  })

  // Add global data and init
  let healthOk = false
  eleventyConfig.addGlobalData(options.name, async () => {
    // init the client
    await directus.init(options.onItem, options.filterCollection)
    // Check that we can connect to directus
    if(!healthOk && !await directus.healthCheck()) {
      console.warn('WARNING: could not connect to Directus\n\nIs Directus running? Do we have access to "Directus Collections"?\n\n')
    } else {
      // Check only once when success
      healthOk = true
    }
    return directus
  })

  // Add filters
  eleventyConfig.addFilter(`${options.name}_asseturl`, (...args) => directus.getAssetUrl(...args))
  eleventyConfig.addFilter(`${options.name}_translate`, (...args) => directus.translate(...args))
}
