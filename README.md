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

   const {
     DIRECTUS_URL,
   } = process.env

   module.exports = (eleventyConfig) => {
     eleventyConfig.addPlugin(pluginDirectus, {
       url: DIRECTUS_URL,
     })
   }
   ```

   The example above is assuming you provide `DIRECTUS_URL` as env var, e.g. start eleventy with `DIRECTUS_URL=http://localhost:8055 eleventy`

3. Run or build your Eleventy project and use the global `directus` data variable to access your collections

### Troubleshooting

For this plugin to retrieve **public** data, check the permissions for the public role in directus

For this plugin to retrieve **private** data, use the `skd.authenticated` option, see "Advanced options" section bellow

### Advanced options

| Variable name | Desctiption | Default |
| -- | -- | -- |
| url | Directus server root URL | `http://localhost:8055` |
| name | Name of the global data key | `directus` |
| auth | Object passed to [Directus SDK's constructor as the `auth` option](https://docs.directus.io/reference/sdk.html#auth) | - (optional, this is useful for custom auth implementations only) |
| login | Object passed to [Directus SDK's `auth.login` method](https://docs.directus.io/reference/sdk.html#login) | - (optional, this is useful to retrieve private data only) |
| token | String passed to [Directus SDK's `auth.static` method](https://docs.directus.io/reference/sdk.html#login) | - (optional, this is useful to retrieve private data only) |

### Config Examples

```js
  eleventyConfig.addPlugin(pluginDirectus, {
    url: DIRECTUS_URL,
    name: 'cms',
    login: {
      email: 'admin@example.com',
      password: 'd1r3ctu5',
    },
  })
```

### Filters and shortcodes

#### Permalinks

#### Media URL

#### Translation

### 1 collection as a page

### All collections as pages

### All collections in all languages as pages

### Unit tests

`npm test`

