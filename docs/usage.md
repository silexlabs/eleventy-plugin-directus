# Usage in templates - Documentation Directus plugin for Eleventy

This page is about using the plugin to display data from Directus collections in your eleventy templates.

## Create pages for each item in a collection
## Create a page for a Singleton
## Display simple fields

This concerns [all text fields](https://docs.directus.io/app/data-model/fields/text-numbers.html), [selection fields](https://docs.directus.io/app/data-model/fields/selection.html)

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
    ingredient.name
%}
```
### Builder - M2A

```liquid
{% liquid
for page in directus.collections.pages
    assign sections = page | directus_relation: "sections"
    assign first = sections | first
    if first.collection == "headings"
        section.title
    else
        section.text
    endif
endfor
%}
```
### Translations
```liquid
{% liquid
    assign article = directus.collections.article | first
    assign translted = article | directus_relation: "translation" | where: "lang", "fr"
    translated.title
%}
```
