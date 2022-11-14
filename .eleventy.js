const createClient = require('./_scripts/client')
//const { translate, permalink, absolute, alternate, addContext } = require('_scripts/utils')

module.exports = (eleventyConfig, options) => {
  const defaults = {
    url: 'http://localhost:8055',
    name: 'directus',
    showDraft: true,
    allowHidden: false,
    allowSystem: false,
    languageCollection: 'languages',
    translationField: 'translations',
    // translationField: collection => `${collection}_translations`,
  }

  const directus = createClient({
    ...defaults,
    ...options,
  })

  // Check that we can connect to directus
  directus.healthCheck()
    .then(ok => !ok && console.error('ERROR: could not connect to Directus\n\nIs Directus running? Do we have access to "Directus Collections"?\n\n'))
  
  // Add global data and init
  eleventyConfig.addGlobalData('directus', async () => {
    await directus.init()
    return directus
  })

  // Add filters
  eleventyConfig.addFilter('directus.asseturl', image => directus.getAssetUrl(image))
  eleventyConfig.addFilter('directus.translate', collectionItem => directus.translate(collectionItem))
  // eleventyConfig.addFilter('directus.alternates', item => {
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
