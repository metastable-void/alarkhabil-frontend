# Al Arkhabil frontend server

Frontend codes for Al Arkhabil, the independent thought publication platform.

* [Backend code GitHub](https://github.com/metastable-void/alarkhabil-server)

## Routes

URL | Queries (processed by JS) | Description
----|---------|------------
/ | - | Top: a list of latest posts
/invites/ | - | JS required: create an invite
/signup/ | `?token={invite token}` | JS required: create a new account
/signin/ | - | JS required: sign in into an existing account
/account/ | - | JS required: account information and settings
/c/ | - | List of channels
/c/**:channel_handle**/ | `?action={edit,new_post}` | Channel information and latest posts of the channel
/c/**:channel_handle**/**:post_uuid**/ | `?action=edit` | A post in a channel
/authors/ | - | List of authors
/authors/**:author_uuid**/ | - | Author information and latest posts by the author
/tags/ | - | List of tags
/tags/**:tag_name**/ | - | List of posts with the tag
/meta/ | `?action=new_page` | List of meta pages
/meta/**:page_name**/ | `?action=edit` | A meta page.

### Frontend API

Method | URL | Description
-------|-----|------------
GET | /frontend/api/v1/config/get | Get site config
GET | /frontend/api/v1/timestamp/format?timestamp={u64} | Format UNIX timestamp
POST | /frontend/api/v1/markdown/parse | Parse Markdown into HTML

## Build

Node.js and Rust must be installed.

```
npm install
npm run build
cargo build
```

## Configuration

```
cp ./example.env ./.env
# edit ./.env

cp -r ./branding-default ./branding
# edit files in ./branding

cp ./config-default.json ./config.json
# edit ./config.json
```

## License

Licensed under the Apache 2.0 license.

### Authors

- [@metastable-void](https://github.com/metastable-void)
