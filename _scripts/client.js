const { Directus } = require('@directus/sdk')
const memoize = require('memoize-one')

const OPTION_LIMIT = (limit = -1) => ({
  limit,
})

const DIRECTUS_UPLOAD_FOLDER = process.env.DIRECTUS_UPLOAD_FOLDER

async function allSync(promises) {
  if (promises.length === 0) return []
  const [firstElement, ...rest] = promises
  return [await firstElement, ...(await allSync(rest))]
}

/**
 * @class Retrieve content from Directus
 */
class Client {
  constructor({
    url,
    auth,
    login,
    token,
    allowHidden,
    allowSystem,
    sequencial,
    recursions,
  }) {
    // init attributes
    this.url = url
    this.login = login
    this.token = token
    this.initDone = false
    this.eleventyCollections = null
    this.allowHidden = allowHidden
    this.allowSystem = allowSystem
    this.sequencial = sequencial
    this.fields = {
      // Get all fields on multiple levels
      fields: [
        '*'.repeat(recursions).split('').join('.'),
      ],
    }

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
  }
  /**
   * Init directus client
   */
  async init(onItem = item => item, filterCollection = () => true) {
    if(this.initDone) {
      return
    }
    this.initDone = true
    this.login && await this.directus.auth.login(this.login)
    this.token && await this.directus.auth.static(this.token)
    this.eleventyCollections = await this.get11tyCollectionsExpanded(onItem, filterCollection)
    this.collections = {
      ...this.getCollections(),
      all: this.getAll(),
    }
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
        ...this.fields,
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
   * @returns {meta, collection} An object containing `meta`, `collection` (the name of the collection)
   */
  async getDirectusCollection(name, options = {}) {
    try {
      const { data } = await this.directus.items(name).readByQuery({
        ...OPTION_LIMIT(),
        ...this.fields,
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
  async get11tyCollections(filterCollection) {
    const collections = await this.getDirectusCollections()
    if(!filterCollection) throw new Error('Missing parameter filterCollection')
    return collections
      .filter(({schema}) => !!schema)
      .filter(filterCollection)
      .map(data => ({
        name: data.collection,
        singleton: data.meta.singleton,
      }))
  }
  /**
   * @param collection, the object returned by get11tyCollections
   * @return Array of items or a singleton object, each with 
   */
  async get11tyCollection({ name, singleton }) {
    const items = await this.getDirectusCollection(name)
    if(items) {
      if(!singleton) {
        return items.map(item => ({
          ...item,
          collection: name,
        }))
      } else {
        return {
          ...items,
          collection: name,
        }
      }
    } else {
      // this is not supposed to happen
      console.error('Error: directus returned null as the collection items', name)
    }
  }
  /**
   * @returns {Array.<Array.<Item>>} an array of collections, each collection being an array of items which have the directus data of a record
   * @example (await get11tyCollectionsExpanded(true))[0][0].id
   * @example (await get11tyCollectionsExpanded(true))[0].__metadata.name
   */
  async get11tyCollectionsExpanded(onItem, filterCollection) {
    const collections = await this.get11tyCollections(filterCollection)
    const promises = collections.map(async collection => {
      const data = await this.get11tyCollection(collection)
      if(!data) {
        console.warn('WARN: directus did not return any data for collection', collection)
        return null
      }
      if(collection.singleton) {
        data.__metadata = collection // FIXME: this adds a property to the array
        return data
      }
      
      const onItemCbks = data.map(onItem)
      const res = this.sequencial ?
        await allSync(onItemCbks) :
        await Promise.all(onItemCbks)

      res.__metadata = collection // FIXME: this adds a property to the array

      return res
    })
    return this.sequencial ? allSync(promises) : Promise.all(promises)
    .then(collections => collections
      .filter(collection => !!collection) // filter the cases when directus errored
    )
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
  /**
   * @param item An item as returned by Client::get11tyCollection
   * @param lang Either a string, e.g. "en-US" or an object, e.g. {code: "en-US"}
   * @param name The collection name
   */
  translate(item, translationField, lang = item?.lang, collection = item?.collection) {
    if(!item) throw new Error('Error: canot translate item, item is undefined')

    const lang_code = lang?.code ?? lang
    const field = translationField ?? (item['translations'] ? 'translations' : `${collection}_translations`)
    if(lang_code && field && item[field]) {
      const translated = item[field]
        ?.find(translation => !!Object.keys(translation)
          .find(key => translation[key]?.code === lang_code) // any key with property `code` will do
        )
      return {
        // Keep original item props
        ...item,
        // Merge with translated data
        ...translated,
        // Keep the item ID and collection
        id: item.id,
        collection: item.collection,
        // add the language
        lang,
      }
    }
    return item // not multilingual
  }
}

module.exports = function createClient(options) {
  return new Client(options)
}

