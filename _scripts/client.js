const { Directus } = require('@directus/sdk')
const memoize = require('memoize-one')

const OPTION_LIMIT = (limit = -1) => ({
  limit,
})

const OPTION_WITH_FIELDS = () => ({
  fields: [
    '*.*.*.*.*.*.*', // this is for all fields on multiple levels
  ],
})

const DIRECTUS_UPLOAD_FOLDER = process.env.DIRECTUS_UPLOAD_FOLDER

/**
 * @class Retrieve content from Directus
 */
class Client {
  constructor({
    url,
    auth,
    login,
    token,
    languageCollection,
    translationField,
    showDraft,
    allowHidden,
    allowSystem,
  }) {
    // init attributes
    this.url = url
    this.login = login
    this.token = token
    this.languageCollection = languageCollection
    this.translationField = translationField
    this.showDraft = showDraft
    this.initDone = false
    this.eleventyCollections = null
    this.languages = null
    this.allowHidden = allowHidden
    this.allowSystem = allowSystem

    // init directus client
    this.directus = new Directus(url, { auth })

    // API methods
    this.getAll = memoize(() => {
      this.checkInit()
      return this.eleventyCollections.flat()
    })
    this.getCollections = memoize(() => {
      this.checkInit()
      return this.eleventyCollections
        .reduce((aggr, data) => {
          aggr[data.__metadata.name] = data
          return aggr
        }, {})
    })
    this.collections = memoize(() => {
      return {
        ...this.getCollections(),
        all: this.getAll(),
      }
    })
  }
  /**
   * Init directus client
   */
  async init() {
    if(this.initDone) throw new Error('Directus client already initialized');
    this.initDone = true
    this.login && await this.directus.auth.login(this.login)
    this.token && await this.directus.auth.static(this.token)
    this.directusCollections = await this.getDirectusCollections()
    this.languages = this.languageCollection && await this.get11tyCollection({
      name: this.languageCollection,
      singleton: false,
    })
    this.eleventyCollections = await this.get11tyCollectionsExpanded()
  }
  /**
   * Check that directus is reachable
   */
  async healthCheck() {
    this.checkInit()
    try  {
      const pong = await this.directus.server.ping('directus_collections')
      return pong === 'pong'
    } catch(e) {
      return false
    }
  }
  checkInit() {
    if(!this.initDone) throw new Error('Directus client not initialized yet')
  }
  /**
   * Get all collections from directus, without their content
   * @param options An optional object which will be passed to [directus.items](https://docs.directus.io/reference/sdk.html#items) method, defaults to {}
   * @returns An array of objects containing `meta`, `collection`
   */
  async getDirectusCollections(options = {}) {
    try {
      // const collections = await this.directus.collections()
      const { data } = await this.directus.items('directus_collections').readByQuery({
        ...OPTION_LIMIT(),
        ...OPTION_WITH_FIELDS(),
        ...options,
      })
      return data
      // Workaround query filter do not work
      // would be better done with filter
        .filter(collection => (this.allowSystem || collection.meta.system !== true) && (this.allowHidden || collection.meta.hidden === false))
    } catch(e) {
      console.error('Could not get collections from directus, did you allow public read on "Collections"?', e)
      throw new Error(`Could not get collections from directus, did you allow public read on "Collections"? Error: ${e.message}`)
    }
  }
  /**
   * Get the content of a collection
   * @param name The name of the collection
   * @param options An optional object which will be passed to [directus.items](https://docs.directus.io/reference/sdk.html#items) method, defaults to {}
   * @returns An object containing `meta`, `collection` (the name of the collection)
   */
  async getDirectusCollection(name, options = {}) {
    try {
      const { data } = await this.directus.items(name).readByQuery({
        ...OPTION_LIMIT(),
        ...OPTION_WITH_FIELDS(),
        ...options,
      })
      return data
    } catch(e) {
      console.error('Error: Could not get directus collection', name, e.message)
    }
    // const response = await fetch(`${this.url}/graphql`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     query: `
    //     {
    //       ${ name } {
    //         name
    //         modules {
    //           *
    //         }
    //       }
    //     }
    //     `,
    //   }),
    // })
    // const json = await response.json()
    // console.log(json)
    // const { data } = json
    // console.log(data[name][0].modules)
    // return data[name]
  }
  /**
   * @return A list of all the collections in directus, with attributes: name, sigleton
   */
  async get11tyCollections() {
    const collections = await this.getDirectusCollections()
    const results = []
    for(const data of collections) {
      const result = []
      if(data.schema) {
        results.push({
          name: data.collection,
          singleton: data.meta.singleton,
        })
      } else {
        // this is probably a folder in directus data model
      }
    }
    return results
  }
  /**
   * @param collection, the object returned by get11tyCollections
   * @return Array of items or a singleton object, one for each language and element in the collection
   */
  async get11tyCollection({ name, singleton }) {
    const items = await this.getDirectusCollection(name)
    if(items) {
      if(!singleton) {
        const result = []
        let has404 = false
        // For each collection item in directus
        for(const item of items) {
          // check the status
          if(!item.status || item.status === 'published' || (this.showDraft && item.status === 'draft')) {
            // For each lang if any language collection
            if(this.languages) {
              for(const lang of this.languages) {
                const processed = this.processCollectionItem(name, item, lang)
                if(processed.modules) {
                  processed.modules = processed.modules
                    .map(module => this.processCollectionItem(module.collection, module.item, lang))
                }
                if(item.page_type !== '404' || has404 === false) {
                  has404 = has404 || item.page_type === '404'
                  // Add the item
                  result.push({
                    ...processed,
                  })
                }
              }
            } else {
              // happen when first getting the languages
              result.push(item)
            }
          }
        }
        return result
      } else {
        // Add the collection name
        items.collection = name
        // return the singleton object
        return items
      }
    } else {
      // this is not supposed to happen
      console.log('Error: directus returned null as the collection items', name)
    }
  }
  /**
   * @param name The name of the collection
   * @param item The collection item
   * @param lang The current language
   * @return
   */
  processCollectionItem(name, item, lang) {
    // Add collection
    const completedItem = {
      ...item,
      collection: name,
    }

    // Add the translation if any
    return this.translate(completedItem, lang)
  }
  /**
   * @returns {Array.<Array.<Item>>} an array of collections, each collection being an array of items which have the directus data of a record
   * @example (await get11tyCollectionsExpanded(true))[0][0].id
   * @example (await get11tyCollectionsExpanded(true))[0].__metadata.name
   */
  async get11tyCollectionsExpanded() {
    const collections = await this.get11tyCollections()
    return Promise.all(collections.map(async collection => {
      const data = await this.get11tyCollection(collection)
      data.__metadata = collection // this adds a property to the array, not so intuitive
      return data
    }))
  }
  getAssetUrl(image) {
    if(!image) {
      console.error(`This image does not exist: ${image}`)
      return ''
    }
    if(DIRECTUS_UPLOAD_FOLDER) {
      // get the file from disk
      return `${DIRECTUS_UPLOAD_FOLDER}${image.filename_disk}`
    }
    // get the file from directus API
    return `${this.url}/assets/${image.filename_disk}`
  }
  getTranslationField(collection) {
    if(typeof this.translationField === 'function') {
      return this.translationField(collection)
    } else {
      return this.translationField
    }
  }
  translate(item, lang, name = item?.collection) {
    if(!item) throw new Error('Error: canot translate item, item is undefined')
    if(!name) throw new Error('Error: canot translate item, collection name is undefined')

    const lang_code = lang?.code ?? lang
    const translated = item[this.getTranslationField(name)]
      // Here translation.languages_code is either an object (case of main collections such as page or post)
      // or a language code (case of modules)
      ?.find(translation => translation.languages_code === lang_code || translation.languages_code?.code === lang_code)
    return {
      ...item,
      // Add language property
      lang: lang_code,
      // Move the translated fields to the translated property
      translated,
    }
  }
}

module.exports = function createClient(options) {
  return new Client(options)
}

exports.Client = Client
