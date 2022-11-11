const { Directus } = require('@directus/sdk')

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
  }) {
    this.url = url
    this.login = login
    this.token = token
    this.directus = new Directus(url, { auth })
  }
  /**
   * Init directus client
   */
  async init() {
    this.login && await this.directus.auth.login(this.login)
    this.token && await this.directus.auth.static(this.token)
  }
  /**
   * Check that directus is reachable
   */
  async healthCheck() {
    try  {
      const pong = await this.directus.server.ping('directus_collections')
      return pong === 'pong'
    } catch(e) {
      return false
    }
  }
  /**
   * Get all collections from directus, without their content
   * @param options An optional object which will be passed to [directus.items](https://docs.directus.io/reference/sdk.html#items) method, defaults to {}
   * @param allowHidden If false we will filter out the collections which are not visible in the UI by the end user, defaults to `false`
   * @param allowSystem If false we will filter out the collections which are directus system collections, defaults to `false`
   * @returns An array of objects containing `meta`, `collection`
   */
  async getCollections(options = {}, allowHidden = false, allowSystem = false) {
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
        .filter(collection => (allowSystem || collection.meta.system !== true) && (allowHidden || collection.meta.hidden === false))
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
  async getCollection(name, options = {}) {
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
  async get11tyCollections(languages) {
    const collections = await this.getCollections()
    const results = []
    for(const data of collections) {
      const result = []
      if(data.schema) {
        results.push({
          name: data.collection,
          singleton: data.meta.singleton,
          languages, // this is for get11tyCollection to use
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
  async get11tyCollection({ name, languages }, showDraft) {
    const items = await this.getCollection(name)
    if(items) {
      if(Array.isArray(items)) {
        const result = []
        let has404 = false
        // For each collection item in directus
        for(const item of items) {
          // check the status
          if(!item.status || item.status === 'published' || (showDraft && item.status === 'draft')) {
            // For each lang if any language collection
            for(const lang of languages) {
              const processed = this.processCollectionItem(name, item, lang, languages)
              if(processed.modules) {
                processed.modules = processed.modules
                  .map(module => this.processCollectionItem(module.collection, module.item, lang, languages))
              }
              if(item.page_type !== '404' || has404 === false) {
                has404 = has404 || item.page_type === '404'
                // Add the item
                result.push({
                  ...processed,
                })
              }
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
   * @returns {Array.<Array.<Item>>} an array of collections, each collection being an array of items which have the directus data of a record
   * @example (await get11tyCollectionsExpanded(true))[0][0].id
   * @example (await get11tyCollectionsExpanded(true))[0].__metadata.name
   */
  async get11tyCollectionsExpanded(showDraft) {
    const collections = await this.get11tyCollections()
    return Promise.all(collections.map(async collection => {
      const data = await this.get11tyCollection(collection, showDraft)
      data.__metadata = collection // this adds a property to the array, not so intuitive
      return data
    }))
  }
  getImageUrl(image, log, context) {
    if(!image) {
      console.error(`[${log}] This image does not exist: ${image}, on page: ${context.page}`)
      return ''
    }
    if(DIRECTUS_UPLOAD_FOLDER) {
      // get the file from disk
      return `${DIRECTUS_UPLOAD_FOLDER}${image.filename_disk}`
    }
    // get the file from directus API
    return `${this.url}/assets/${image.filename_disk}`
  }
}

module.exports = async function createClient(options) {
  const client = new Client(options)
  await client.init()
  return client
}

exports.Client = Client
