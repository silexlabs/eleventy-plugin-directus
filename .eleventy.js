const createClient = require('./_scripts/client')
//const { translate, permalink, absolute, alternate, addContext } = require('_scripts/utils')

module.exports = (eleventyConfig, _options) => {
  const defaults = {
    url: 'http://localhost:8055',
    name: 'directus',
    showDraft: true,
    allowHidden: false,
    allowSystem: false,
    //languageCollection: 'languages',
    translationField: collection => `${collection}_translations`,
    //translationField: 'translations',
  }

  const options = {
    ...defaults,
    ..._options,
  }

  const directus = createClient({
    url: options.url,
    showDraft: options.showDraft,
    allowHidden: options.allowHidden,
    allowSystem: options.allowSystem,
    login: options.login,
    token: options.token,
    auth: options.auth,
  })

  // Add global data and init
  eleventyConfig.addGlobalData(options.name, async () => {
    // init the client
    await directus.init()
    // Check that we can connect to directus
    if(!await directus.healthCheck()) {
      console.error('ERROR: could not connect to Directus\n\nIs Directus running? Do we have access to "Directus Collections"?\n\n')
    }
    return directus
  })

  // Add filters
  eleventyConfig.addFilter(`${options.name}.asseturl`, image => directus.getAssetUrl(image))
  eleventyConfig.addFilter(`${options.name}.translate`, (collectionItem, translationField = options.translationField) => directus.translate(collectionItem, translationField))
  // eleventyConfig.addFilter(`${options.name}.alternates`, item => {
  //   const languages = await this.getLanguages() || [{code: ''}]
  //   async getAlternates(item) {
  //     if(!item) throw new Error('Error: canot get alternates of an undefined item')
  //     const languages = await this.getLanguages()
  //     return languages.reduce((result, lang) => ({
  //       ...result,
  //       [lang.code]: permalink(translate(item, lang), false),
  //     }), {})
  //   }
  // })

//   async getLanguages() {
//     try  {
//       return this.getCollection('languages', {
//         ...OPTION_LIMIT(),
//       })
//     } catch(e) {
//       console.warn('Could not get languages', e)
//       return null
//     }
//   }
// 
  //     processCollectionItem
//     // add permalink and URL (collection and lang are required for this to work)
//     const permalinkedItem = {
//       ...translatedItem,
//       permalink: permalink(translatedItem),
//       url: absolute(permalink(translatedItem)), // used in sitemap
//       data: { // backward compat with other file-based collections
//         permalink: permalink(translatedItem),
//         url: absolute(permalink(translatedItem)),
//       },
//     }
//     return permalinkedItem
//   }
}