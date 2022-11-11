const createClient = require('./client.js')
const { start, stop } = require('./directus-server/')

jest.setTimeout(10000)

const port = 8056
const OPTIONS = {
  url: `http://localhost:${port}`,
}
const NUM_COLLECTIONS = 3 // page, post, settings
const IDX_PAGE_COLLECTION = 0 // page collection is at index 0

beforeAll(async () => {
  return start(port)
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
    await expect(client.healthCheck()).resolves.not.toThrow()
    await expect(client.healthCheck()).resolves.toBe(true)
  })
})

describe('directus data query', () => {
  let client
  beforeAll(async () => {
    client = await createClient(OPTIONS)
  })
  test('introspection', async () => {
    await expect(client.getCollections()).resolves.not.toThrow()
    const collections = await client.getCollections()
    expect(collections).not.toBeUndefined()
    expect(collections).toBeInstanceOf(Array)
    expect(collections).toHaveLength(NUM_COLLECTIONS)
    expect(collections[IDX_PAGE_COLLECTION].collection).toBe('page')
  })
  test('get page', async () => {
    await expect(client.getCollection('page')).resolves.not.toThrow()
    const page = await client.getCollection('page')
    expect(page).not.toBeUndefined()
    expect(page).toBeInstanceOf(Array)
    expect(page).toHaveLength(2)
    expect(page[0].title).toBe('Home')
  })
})
//     // translations
//     expect(page[0].page_translations).not.toBeUndefined()
//     expect(page[0].page_translations.length).toBeGreaterThan(0)
//     expect(page[0].page_translations[0].description).toContain('Description')
//     expect(page[0].page_translations[0].languages_code).not.toBeUndefined()
//     expect(page[0].page_translations[0].languages_code.code).not.toBeUndefined()
//   })
//   test('get page', async () => {
//     await expect(client.getLanguages()).resolves.not.toThrow()
//     const languages = await client.getLanguages()
//     expect(languages).not.toBeUndefined()
//   })
// })
// 
