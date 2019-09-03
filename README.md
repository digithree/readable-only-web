# Readable Only Web

Readable filter for the web. Put distance between your hardware and trackers.

ROW is a little Node.js server which make search and general URL requests on your behalf, in other words, it's proxy. The idea is to remove allt the trackers before they get to your personal machine, so if they do track anything it will be a little server in the cloud.

It's basic and simple to use, but there are a few options, detailed below.

> _Row, row, row your browser_

> _Gently up the stream._

> _Merrily, merrily merrily, merrily,_

> _Now your page is clean._

## How it works

This service applies Mozillas "Readability" standalone library to fetched HTML from a given URL (or search results page) to attempt to extract article formatted text. It will generally only work with simple pages or standard articles, although it works on a lot more webpages than I was expecting.

## Usage

Two queries are possible, search and URL proxy. Both use the `?q=%s` query parameter format which is standard across the web.

### Search

Search uses Duck Duck Go to fetch results, which are then cleaned, like all proxied traffic.

It also supports "bangs" to leave the ROW proxy service and search directly on Duck Duck Go (!ddg) or Google (!google), e.g.

> !google does google really track you everywhere

### URL

There's nothing fancy about the URL proxy, just give in the URL and make sure it's encoded, or use the URL entry box on index page.

### Options

There are four options, which can be included as query parameters, or toggled by click the hyperlinks on any page footer (except index)

1. imgs: show images (=1) or not (=-1)
2. embeds: show embedded content (=1) or not (=-1)
3. iframes: show iframes (=1) or not (=-1)
4. othertags: show other non-whitelisted HTML tags (=1) or not (=-1)

## Installation

The Docker files are set up to be already configured for OpeNode, but you can run it anywhere where Node.js is supported, it's a pretty simple little server.

To use OpeNode, set up an application and simply deploy using the CLI

```
openode deploy
```

## Notes

1. All links will also route through this service, giving you seemless usage. However links may have referral codes, we plan to filter these out in future version.
2. Of course if you use the instance I have set up it's possible I could see your IP and what you look at (although I don't intend to). If this concerns you then stand up your own instance of the server, it's easy and should be free.
3. Script injection is still possible, full cleaner coming in future version. Should be more or less okay for now.
4. I considered adding a dark mode theme in CSS, but really if you want this just fork it and change it. I want it to be stateless and persistent settings like theme go against that. If the current theme really annoys you, [open a ticket](https://github.com/digithree/readable-only-web/issues/new).
5. You can (kind of) easily set this up on most browsers as a custom search engine for your browser bar. Very handy, especially with the bangs!

## Attribution

The "logo" for ROW is the [Cano emoji graphic by Jonas Dunkel](https://openmoji.org/library/#search=canoe&emoji=1F6F6), included as part of the [OpenMoji project](https://openmoji.org) and is protected under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), used here under that license.

## Enjoy!

Written by Simon Kenny to prove a point... I mean proof of concept! You can get a lot out of just text. Enjoy the simple life.

[https://github.com/digithree/readable-only-web](https://github.com/digithree/readable-only-web)