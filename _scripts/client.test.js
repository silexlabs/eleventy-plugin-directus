const createClient = require('./client.js')
const { start, stop } = require('./directus-server/')

const port = 8056
const OPTIONS = {
  url: `http://localhost:${port}`,
  sequencial: true,
  recursions: 7,
}
const NUM_COLLECTIONS = 5 // page, post, settings, multilingual, languages

jest.setTimeout(20000)

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
  // TODO: test('getAll', async () => {})
  // TODO: test('collections', async () => {})
  test('not multilingual', async () => {
    const {page} = await client.getCollections()
    expect(client.translate(page[0], null, 'en-US').lang).toBeUndefined()
  })
  test('translations', async () => {
    client = await createClient({
      ...OPTIONS,
      translationField: 'multilingual_translations',
      languageCollection: 'languages',
    })
    await client.init()
    const {multilingual} = await client.getCollections()
    const item = multilingual[0]
    expect(item.lang).toBeUndefined()
    const translated = client.translate(item, 'multilingual_translations', 'en-US')
    expect(translated).not.toBeUndefined()
    expect(translated.text).not.toBeUndefined()
    expect(translated.text.startsWith('text '))
  })
  test('options recursions', async () => {
    // With the default recursions
    let result = await client.getCollections()
    expect(result.page).toBeInstanceOf(Array)
    result.page.forEach(p => {
      expect(p.user_created).toBeUndefined() // users is not public
    })
    client = await createClient({
      ...OPTIONS,
      recursions: 1,
    })
    await client.init()
    result = await client.getCollections()
    expect(result.page).toBeInstanceOf(Array)
    result.page.forEach(p => {
      expect(typeof p.user_created).toBe('string')
    })
  })
})

