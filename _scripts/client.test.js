const createClient = require('./client.js')
const { translate } = require('./client.js')
const { start, stop } = require('./directus-server/')

const port = 8056
const OPTIONS = {
  url: `http://localhost:${port}`,
}
const NUM_COLLECTIONS = 5 // page, post, settings, multilingual, languages

beforeAll(async () => {
  return start(port)
})

let client
beforeEach(async () => {
  client = await createClient(OPTIONS)
  await client.init()
})

afterAll(async () => {
  return stop()
})

describe('init', () => {
  test('test create client', async () => {
    expect(async () => createClient(OPTIONS)).not.toThrow()
    expect(async () => createClient({
      url: 'https://donot.exist.com',
    })).not.toThrow()
    expect(await createClient(OPTIONS)).toBeInstanceOf(Object)
  })
  test('Server is up and role "Public" has access to "Directus Collections"', async () => {
    const client = await createClient(OPTIONS)
    await client.init()
    await expect(client.healthCheck()).resolves.not.toThrow()
    await expect(client.healthCheck()).resolves.toBe(true)
  })
})

describe('directus data query', () => {
  test('introspection', async () => {
    await expect(client.getDirectusCollections()).resolves.not.toThrow()
    const collections = await client.getDirectusCollections()
    expect(collections).not.toBeUndefined()
    expect(collections).toBeInstanceOf(Array)
    expect(collections).toHaveLength(NUM_COLLECTIONS)
    expect(collections.find(col => col.collection === 'page')).not.toBeUndefined()
  })
  test('get page', async () => {
    await expect(client.getDirectusCollection('page')).resolves.not.toThrow()
    const page = await client.getDirectusCollection('page')
    expect(page).not.toBeUndefined()
    expect(page).toBeInstanceOf(Array)
    expect(page).toHaveLength(2)
    expect(page[0].title).toBe('Home')
  })
})
describe('API', () => {
  test('getCollections', async () => {
    const {page, post, settings} = await client.getCollections()
    expect(page).not.toBeUndefined()
    expect(page).toBeInstanceOf(Array)
    expect(page.length).toBeGreaterThan(0)
    expect(page[0].text).toBe('Home page')
    expect(post).not.toBeUndefined()
    expect(post).toBeInstanceOf(Array)
    expect(post.length).toBeGreaterThan(0)
    expect(post[0].title).toBe('First')
    expect(settings).not.toBeUndefined()
    expect(settings).toBeInstanceOf(Object)
    expect(settings.test_property).toBe('test value')
  })
  test('getAll', async () => {
  })
  test('collections', async () => {
  })
  test('not multilingual', async () => {
    const {multilingual} = await client.getCollections()
    expect(multilingual.length).toBe(1)
    expect(translate(multilingual[0], 'multilingual_translations')).toBeNull()
  })
  test('translations', async () => {
    client = await createClient({
      ...OPTIONS,
      translationField: 'multilingual_translations',
      languageCollection: 'languages',
    })
    await client.init()
    const {multilingual} = await client.getCollections()
    expect(multilingual.length).toBe(2) // 1 item in 2 lang
    expect(multilingual[0].lang).not.toBeUndefined()
  })
  test('translate filter', async () => {
    client = await createClient({
      ...OPTIONS,
      translationField: 'multilingual_translations',
      languageCollection: 'languages',
    })
    await client.init()
    const {multilingual} = await client.getCollections()
    const item = multilingual[0]
    expect(item.translated).toBeUndefined()
    const translated = translate(item, 'multilingual_translations')
    expect(translated).not.toBeUndefined()
    expect(translated.text).not.toBeUndefined()
    expect(translated.text.startsWith('text '))
  })
})

