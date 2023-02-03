## Eleventy Plugin Directus

![combined](https://user-images.githubusercontent.com/715377/202714740-44db41be-27a7-42d9-aa58-8d72d486bcbf.png)

### Abbout this plugin

Expose [Directus](https://directus.io) collections as [global data in 11ty](https://www.11ty.dev/docs/data-global/). By default the data will be available in `directus.collections.*`

This plugin also creates [filters to manage assets URLs and translations](#filters-and-shortcodes), creates a `directus.collections.all` collection, and will help you [make pages out of Directus collections](#directus-collections-and-11ty-pages).

> This plugin is a work in progress, we use it in production at [Internet 2000](https://internet2000.net), PRs welcome

Following [this discussion](https://github.com/directus/directus/discussions/17293) with [@rijkvanzanten](https://github.com/rijkvanzanten), lead maintainer of Directus, I need your input on how to make this plugin better, as it depends on the use cases. So please head to [this discussion and let's talk use cases](https://github.com/directus/directus/discussions/17293)

### Why this plugin?

[11ty](https://www.11ty.dev/) static site generator and [Directus](https://directus.io/) headless CMS are excellent tools, both open source and part of the JS ecosystem. They work very well together, they make a great tech stack for static and dynamic sites, and even web apps. They share a "simple is beautiful" philosophy, they are based on open standards to a great extent, and get more complex as your needs grow.

As we use 11ty+Directus a lot at [internet 2000 web studio](https://internet2000.net/) to produce eco-friendly websites, it made sense to open source this part of our code.

Also please note we use [Silex website builder](https://www.silex.me/) with 11ty+Directus as this no-code tool also has a lot in commong with Directus.

### Why a plugin at all?

As you can see on [this official blog post](https://directus.io/guides/get-started-building-an-eleventy-website-with-directus/), it is easy to import Directus data into an 11ty website. With this direct approach, this is how [11ty data file which fetches Directus content](https://github.com/directus/examples/blob/main/eleventy/src/_data/articles.js#L35).

The problem with this approach is that you will need to explicitely re-define your content structure a second time, as you already made the structure in Directus.

What this plugin does is to retrieve all the data recursively from Directus and then you can use it from your templates with the "dot notation" as JSON objects. The drawback this approach - at least as it is implemented for now, is that uses [a "simple" / hacky approach](./_scripts/client.js#L8) to just fetch everything up front, even a lot more data than you need when you have a recursive relationship, e.g. `articles->related_articles->articles` - [see discussion here](https://github.com/directus/directus/discussions/17293).

### Use cases

Use this plugin to

* Access directus collections from your 11ty templates, e.g. `{% for collection in directus.collections.some_collection %}` or `{{ directus.collections.some_singleton.some_field }}`
* Easy nested collections (many to many / one to many / m2a fields), e.g. `{{ directus.collections.some_singleton.some_field_many_to_many.some_field_in_nested_collection }}`
* Use translations for multi-lingual sites, e.g. `{% assign translated = directus.collections.some_singleton | directus_translate: "translation_field", "fr" %}{{ translated.some_field_from_translated_collection }}`
* Render any collection with different layouts depending on the collection, e.g. render the `page` collection the `pages.liquid` and all `post` items in directus with `posts.liquid` in 11ty's `_layout` folder

### Usage

1. Install the plugin using npm:

   ```sh
   npm install @silexlabs/eleventy-plugin-directus
   ```

2. Add the plugin to your `.eleventy.js` config:

   ```js
   const pluginDirectus = require("@silexlabs/eleventy-plugin-directus")

   module.exports = (eleventyConfig) => {
     eleventyConfig.addPlugin(pluginDirectus, {
       url: 'http://localhost:8055',
     })
   }
   ```
3. Run or build your Eleventy project and use the global `directus.collections` data variable to access your collections

### Troubleshooting

`directus_collections` need to be readable, as well as the other collections you want to access in your 11ty website

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
| onItem | A callback to modify each item while collections are created. Use `item.collection` if you need to take the collection name into account. | item => item |
| filterCollection | | |
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
const directus = await  eleventyConfig.globalData.cms()
const { pages, posts, categories } = await directus.getCollections()
const settings = await directus.getCollection('settings')
const all = await directus.getAll()
all.forEach(item => console.log(`I belong to the collection ${item.collection}`))
```

### Filters and shortcodes

#### Media URL

* `directus_asseturl`: get the URL from an image object coming from directus collections, e.g. `{% assign url = item.image | directus_asseturl: 'This is a text displayed when an error occures (i.e. to find missing images)' %}`

#### Translation

Use the translate filter to get the translated part of a directus collection item

Let's say you have a directus collection called "post" containing a list of posts. In this collection you have 2 text fields: `non-translated-text` and a "translation field" called `translation_field`. In the collection "translation_field", you have just one field called `translated-text`

In your layouts use the filter to find the appropriate language and merge the translation with the item itself:

```liquid
{% for item in directus.collections.posts %}
  {% assign translated = item | directus_translate: "translation_field", "fr" %}
  {{ translated.non-translated-text }} This will output the value of the non translated field
  {{ translated.translated-text }} This will output the value of the non translated field  
{% endfor %}
```

Or in a JS data files:

```js
directus.translate(item, "page_translations", "en")
```

What this filter does is find the item language (`item.lang`) in `item[item.collection + "_translations"]` and merge its content into item

> Please ask in the issues if this example is not clear

### Collection's items data

Each `directus.collection` is an array of items or an item (case of a singleton), with items look like this:

| attribute | description |
| -- | -- |
| collection | Name of the item's collection. |
| All other attributes | The attributes you define in Directus |

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
    const directus = await  eleventyConfig.globalData.cms()
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

Use the following layout (`switch`) automatically selects the layout based on the collection name - you need to have a layout with the same name as the collections. You could also use the same technique as the `sitemap` collection above to filter Directus collections and keep only the ones you want to generate pages.

The `switch` layout:

```liquidjs
{% assign layout = '_layouts/' | append: current.collection | default: 'default' | append: '.html' %}
{% layout layout %}

```

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

Here is how to make that happen - let's say your language collection is named `languages` in directus:

```js
  // In .eleventy.js
  eleventyConfig.addCollection('translated', async function(collectionApi) {
    const directus = await  eleventyConfig.globalData.cms()
    return directus.getAll()
      .flatMap(item => directus.collections.languages.map(({code}) => ({
        ...item,
        lang: code,
      })))
      .map(item => ({
        ...item,
        // store translated data here, e.g.
        translated: directus.translate(item, `${item.collection}_translations`),
        // or for the example above
        ...directus.translate(item, `${item.collection}_translations`),
      }))
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

