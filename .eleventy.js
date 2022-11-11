const { translate, permalink, absolute, alternate } = require('./utils')

module.exports = (eleventyConfig, options) => {
  const defaults = {
    url: 'http://localhost:8055',
    name: 'directus',
  }
    if(await this.healthCheck()) {
    } else {
      throw new Error('ERROR: could not connect to Directus\n\nIs Directus running? Do we have access to "Directus Collections"?\n\n')
    }

    // Get languages
    const languages = await this.getLanguages() || [{code: ''}]
  async getAlternates(item) {
    if(!item) throw new Error('Error: canot get alternates of an undefined item')
    const languages = await this.getLanguages()
    return languages.reduce((result, lang) => ({
      ...result,
      [lang.code]: permalink(translate(item, lang), false),
    }), {})
  }
  async getLanguages() {
    try  {
      return this.getCollection('languages', {
        ...OPTION_LIMIT(),
      })
    } catch(e) {
      console.warn('Could not get languages', e)
      return null
    }
  }

  /**
   * @param name The name of the collection
   * @param item The collection item
   * @param lang The current language
   * @return
   */
  processCollectionItem(name, item, lang) {
    const completedItem = {
      ...item,
      // Add collection
      collection: name,
    }

    // Add the translation if any
    const translatedItem = translate(completedItem, lang)

    // add permalink and URL (collection and lang are required for this to work)
    const permalinkedItem = {
      ...translatedItem,
      permalink: permalink(translatedItem),
      url: absolute(permalink(translatedItem)), // used in sitemap
      data: { // backward compat with other file-based collections
        permalink: permalink(translatedItem),
        url: absolute(permalink(translatedItem)),
      },
    }
    return permalinkedItem
  }
}
