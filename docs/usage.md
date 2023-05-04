# Usage in templates - Documentation Directus plugin for Eleventy

This page is about using the plugin to display data from Directus collections in your eleventy templates.

## Create pages out of Directus data

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

## Display simple fields

This concerns [all text fields](https://docs.directus.io/app/data-model/fields/text-numbers.html), [selection fields](https://docs.directus.io/app/data-model/fields/selection.html)

```liquidjs
{% liquid
    assign article = directus.collections.article | first
    echo article.title
    echo article.date_updated
    echo article.some_checkbox
%}
```


## Display data from a relation

Here is how to display [relational fields](https://docs.directus.io/app/data-model/fields/relational.html) in your 11ty template.

Let's say you have a singleton collection `item` in Directus with fields of the following types

### File or Image

```liquidjs
<a href="{{ directus.collections.item.file.filename_disk }}>{{ directus.collections.item.file.title }}</a>"
```

Here is the [documentation for the file object](https://docs.directus.io/reference/files.html#the-file-object).

### Files (M2M)

```liquidjs
{% for file in directus.collections.item.files %}
    <a href="{{ file.filename_disk }}>{{ file.title }}</a>"
{% endfor %}
```

Here is the [documentation for the file object](https://docs.directus.io/reference/files.html#the-file-object).

### One to Many

Let's take [the same example as this one](https://docs.directus.io/app/data-model/relationships.html#one-to-many-o2m)
`/items/countries`
```json
{"data":[{"id":1,"cities":[1,2]}]}
```

`/items/cities`
```json
{"data":[{"fk":1,"id":1,"label":"test1"},{"fk":1,"id":2,"label":"test2"}]}
```

```liquid
{% assign cities = country | directus_relation: "cities" %}
{% for city in cities %}
    {{ city.name }}
    ...
```

### Many to One

With `city` a singleton collection

```liquid
{{ directus.collections.city | directus_relation: "country" }}
```

### Many to Many

Let's take [the same example as this one](https://docs.directus.io/app/data-model/relationships.html#many-to-many-m2m)

With `reciepe` a singleton collection

```liquid
{% liquid
    ingredient = directus.collections.reciepe | directus_relation: "ingredients" | first
    echo ingredient.name
%}
```
### Builder - M2A

```liquid
{% liquid
for page in directus.collections.pages
    assign sections = page | directus_relation: "sections"
    assign first = sections | first
    if first.collection == "headings"
        echo section.title
    else
        echo section.text
    endif
endfor
%}
```

### Translations

```liquid
{% liquid
    assign article = directus.collections.article | first
    assign translted = article | directus_relation: "translation" | where: "lang", "fr"
    echo translated.title
%}
```
