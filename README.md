## Eleventy Plugin Directus

> This plugin is a work in progress, we use it in production at [Internet 2000](https://internet2000.net), PRs welcome

Expose [Directus](https://directus.io) collections as global data in 11ty. This will let you access your Directus collections as global data in your 11ty site. By default the data will be available in `directus.collections.*`

### Usage

1. Install the plugin using npm:

   ```sh
   npm install @silex/eleventy-plugin-directus
   ```

2. Add the plugin to your `.eleventy.js` config:

   ```js
   const pluginDirectus = require("@silex/eleventy-plugin-directus")

   module.exports = (eleventyConfig) => {
     eleventyConfig.addPlugin(pluginDirectus, {
       url: 'http://localhost:8055',
     })
   }
   ```
3. Run or build your Eleventy project and use the global `directus` data variable to access your collections

### Troubleshooting

For this plugin to retrieve **public** data, check the permissions for the public role in directus

For this plugin to retrieve **private** data, use the `skd.authenticated` option, see "Advanced options" section bellow

### Advanced options

| Variable name | Desctiption | Default |
| -- | -- | -- |
| url | Directus server root URL | `http://localhost:8055` |
| name | Name of the global data key and prefix of the filters | `directus` |
| auth | Object passed to [Directus SDK's constructor as the `auth` option](https://docs.directus.io/reference/sdk.html#auth) | - (optional, this is useful for custom auth implementations only) |
| login | Object passed to [Directus SDK's `auth.login` method](https://docs.directus.io/reference/sdk.html#login) | - (optional, this is useful to retrieve private data only) |
| token | String passed to [Directus SDK's `auth.static` method](https://docs.directus.io/reference/sdk.html#login) | - (optional, this is useful to retrieve private data only) |
| translationField | string or function(collectionName) | collection => `${collection}_translations` |
| showDraft | | |
| allowHidden | | |
| allowSystem | | |

### Config Examples

```js
  eleventyConfig.addPlugin(pluginDirectus, {
    url: 'http://localhost:8055',
    name: 'directus',
    login: {
      email: 'admin@example.com',
      password: 'd1r3ctu5',
    },
  })
```

### Available global data

In your templates:

* `directus.collections.${collection}`
* `directus.collections.all`

In JS:

```js
const { pages, posts, categories } = await directus.getCollections()
const settings = await directus.getCollection('settings')
const all = await directus.getAll()
all.forEach(item => console.log(`I belong to the collection ${item.collection}`))
```

### Filters and shortcodes

#### Media URL

* `directus.asseturl`: get the URL from an image object coming from directus collections, e.g. `{% assign url = item.image | directus.asseturl: 'This is a text displayed when an error occures (i.e. to find missing images)' %}`

#### Translation

Use `directus.translate` filter to get the translated part of a directus collection item:

```liquid
{% assign translated = item | translate %}
{{ translated.text }}
```

### Directus collections and 11ty pages

Here is how to turn your Directus colections into pages

### Singletons

Here is the [definition of a singleton in Directus](https://docs.directus.io/getting-started/glossary.html#singleton)

> A collection that only contains one single item

Read this on how to [create a singleton in Directus](https://docs.directus.io/configuration/data-model/collections.html#create-a-collection)

In your 11ty website use the singleton data as follows - in this example let's call the singleton `settings`:

```liquid
{{ directus.collections.settings.some_field }}
```

### 1 collection as pages

If you have a collection and want every item to have its own page in your website, create a markdown file like this one - in this example let's call the collection `posts`:

```md
---
pagination:
  data: directus.collections.posts
  size: 1
  alias: post
permalink: /example/{{ post.some_field | slug }}/

---

<h1>{{ post.some_field }}</h1>

```

### Directus collections as 11ty collections (example of sitemap)

Let's say you want all the collections which have a field `some_field` to be a collection in 11ty. This can be usefull for the sitemap plugin for example:

```js
  // In .eleventy.js
  // Create 1 collection in 11ty out of each collection in Directus
  eleventyConfig.addCollection('sitemap', async function(collectionApi) {
    return directus.getAll()
      .filter(collection => !!collection.some_field) // keep only the Directus collections you want
      .map(collection => ({
        ...collection,
        url: `${BASE_URL}/example/${slugify(collection.some_field)}/`, // add the `url` field required by the sitemap plugin
      }))
  })
  // sitemap plugin
  eleventyConfig.addPlugin(sitemap, {
    sitemap: {
      hostname: BASE_URL,
    },
  })

```

### All collections as pages

Use the layout `switch` provided by this plugin to automatically select the layout based on the collection name - you need to have a layout with the same name as the collections. You could also use the same technique as the `sitemap` collection above to filter Directus collections and keep only the ones you want to generate pages.


```md
---
layout: switch
pagination:
  data: directus.collections.all
  size: 1
  alias: current
permalink: /example/{{ current.some_field | slug }}/

---

This is the collection of the current item: {{ current.collection }}

It is also the name of the layout used to render this page

```

### Collections in a multi-lingual website

If you use Directus fields of type `translations`, you will probably need to have pages with URLs like these: `/fr/page-1/`, `/en/page-1`, `/fr/page-2/`, ... In that case you need an 11ty collection containing 1 item for each item of a Directus collection **and** for each language of your website:

```json
[{
  "title": "bonjour",
  "lang": "fr",
}, {
  "title": "hello",
  "lang": "en",
}, {
  "title": "ca va bien",
  "lang": "fr",
}, {
  "title": "how are you",
  "lang": "en",
}]
```

Here is how to make that happen:

```js
  // In .eleventy.js
  eleventyConfig.addCollection('translated', async function(collectionApi) {
    return directus.getAll()
      .filter(collection => !!collection.some_field) // keep only the Directus collections you want
      .flatMap(collection => languages.map(lang => ({
        ...collection,
        lang,
        // store translated data here, e.g.
        title: title_translations[lang],
      })))
  })
```

Then you can use this collection in a markdown file

```md
---
pagination:
  data: collections.translated
  size: 1
  alias: current
permalink: /{{ current.lang }}/{{ current.some_field | slug }}/

---

<h1>{{ current.title }}</h1> <--- this will be in the current language

This title is in {{ current.lang }}

The permalink of this page includes the current language

```

### Unit tests

`npm test`

