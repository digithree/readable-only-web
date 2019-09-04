# Readable Only Web

#### ROW, a Readable filter for the web. Put distance between your hardware and the trackers.

Use ROW when you want to:

* do a simple search, e.g. "why is the sky blue"
* read an article, e.g. from a newspaper, blog, Wikipedia, Medium, etc.
* be adventurous and try a text only version of your favourite site

ROW is a little Node.js server which makes search and web page requests on your behalf, and spits back just the text and links (plus optionally images and videos, though these are off by default). It acts as a proxy.

The server attempts to remove all possible tracking mechanisms while keeping text content, if possible. Web pages served back to your browser will be extremely clean and supremely minimal, like the first web page you made in pure HTML.

Cookies, JavaScript and images are not loaded even on the server (a virtual DOM is contructed), so most tracking methods will fail instantly. If any do get through they will only be able to track a little server in the cloud, mixed in with the usage of multiple people. There will be some exceptions.

It's basic and simple to use, and appropriate if you're just interested in the text. There are a few options but these are kept to an absolute minimum.

> _Row, row, row your browser_
>
> _Gently up the stream._
>
> _Merrily, merrily merrily, merrily,_
>
> _Now your page is clean._

![ROW Canoe logo](/icon/icon-128x128.png)

_Note, this image is served by ROW service (or GitHub if viewing readme there)_

### How it works, and features

This service applies Mozilla's _Readability_ standalone library to extract article formatted text. It will generally only work with simple pages or standard articles, although it works on a lot more webpages than I was expecting.

To use it, you supply search terms or a URL using the handy form on the home page, or more technically as a query parameter `q` to the server endpoint `/search` or `/url`. There are some options also, detailed below.

#### Features

All links are prepended with the ROW server address so clicking them routes them back through the service, keeping you protected.

Additionally images, embeds and iframes are explicitly blocked, and there's also a HTML tag whitelist that's applied. All of there are togglable and max restriction is on by default (if no options provided). All options are provided by URL query parameters to keep all communication highly visible and usage completely stateless.

You'll see a footer with these options appended to the page rendering where available. There is also the option to "exit" ROW, that is, to visit the URL directly with your browser, totally leaving the service. This will be necessary if you really want to see the page but ROW fails to render it well enough.

The only form elements allowed are the search and go to URL bars that appear on this page and are added to the search page results at the top.

### Why was this made?

It's clear that web pages have lost the run of themselves, and browsers have failed to step in decisively. All major browsers (yes, even "privacy first" Firefox) are implicitly committed to facilitating any number of tracking methods _on your machine_ by supporting current web conventions.. See below for a summary of some examples of what ROW blocks.

We need to get to a web where acceptance of the advertisers bottom line is not traded in for providing rich media experiences and modern functionality. Every time you are forced to accept cookies just to use a site (or have given up in the fact of the new pop up epidemic and just accept everything, as I imagine many do) you are given a false choice. ROW is an experiment in rejecting that false choice. It also protects you against the powerful and useful, but ultimately ungoverned power of the JavaScript engine, which is most often not a choice at all.

Until we get to a better future, with web apps that are actually trustable, with code that is independently reviewed and protected at a fundamental level, while still providing rich content experiences, we'll have ROW and projects like it.

**ROW argues that simple text-based information can happily exist as lightly formatted text and nothing more.**

If you are anything like me, a significant proportion of your web usage is looking up something interesting, reading something topical and / or interesting, checking a fact or the state of some item of interest, and hearing the news.

When using ROW you can say goodbye to:

1. Cookie tracking, (3rd party, 1st party, all the parties) the main way advertisers and other surveillers track you, not to mention the annoying cookie acceptance overlays and click-throughs
2. Tracking pixels, i.e. loading secret images that track you (images are turned off by default, but can be optionally enabled)
3. IP tracking, all that will show up to web pages you visit will be the service's IP (provided images and videos are off)
4. JavsScript, as it provides many methods of tracking, scripts are never run (which does break some web pages rendering)
5. Device fingerprinting, i.e. querying the browser for device info (or using iOS or Android ads IDs) to build a unique device fingerprint which is paired with a personally identifying profile
6. Cryptominers, again, no JavaScript will be run on your machine _at all_, even will full options turned on
7. [coming soon] Query param tracking, often used for referrals (most broadly of the `UTM` family)

You can also say goodbye to cool graphics, animations, annoying custom scroll intertia effects, design choices of any kind other than my terrible CSS (sorry), input forms, logging in, logging out, messaging. But you can still have gifs, if you want.

Known exceptions:

1. Short-links and other referral links will still inform trackers the links were used. These are common when getting sharing links or from links provided in newsletters and mailing lists, or even intra-site click links. If a way is known to unroll these they can be added in an adapter on a per-site basis.
2. Did I miss something? [Let me know](https://github.com/digithree/readable-only-web/issues/new)

### Limitations

As ROW uses a kind of fancy proxy version of Firefox's Readability mode, the best results come from articles and search results.

It will not work at all for:

* anything you have to log in to, ROW is stateless, doesn't use scripts, cookies or local storage
* anything with forms or any interactivity of any sort, bar hyperlinks
* videos, except gifs (which as we all know are technically not videos!), i.e. YouTube, Vimeo, etc.
* access of any non HTML based resource, such as an audio file, direct image URL, etc.

### Caveats, admissions and disclaimers

I cannot formally guarantee that ROW will protect you, but it is an _experimental tool_ to further that goal. I also cannot guarantee that it is legal in your area, though I see no reason why it should not be. Use it at your own risk, of course, just like anything else.

#### Regarding the OpeNode server

There is a test deployment currently sitting at [https://row.openode.io](https://row.openode.io) which is open for anyone to use. I use it myself. Of course if you use it I could see your IP address and what you're using it for. I don't want to and don't intend to, but you'd be foolish to rule it out, you don't know me.

So, you are encouraged to set up your own little server, it's pretty straight forward to do and there's some info further in this readme. The more people using a single server the better, but up to a point as no server should have too much data logged by the service. I'm not sure what the ideal point is but assume your usage is being monitored by the service, though that should not translate into advertising tracking.

#### Regarding Duck Duck Go

I quote from their URL params info page:

> [...] However, if using them [parameters] for that purpose or any other beyond individual use (e.g. for apps/extensions), please do not remove our branding (ko, kr params etc.) or advertising (k1, k4 params etc.) as we have contracts in place that we would be violating if you did so.

I have removed both in the search options used in ROW, for obvious reasons. Arguably they could remain as it would only be tracking the ROW server, however I have removed them since it's possible and this is an experiment in maximum anti-tracking.

I may change them in the future if it seems wise to do so, but for now branding and tracking is off.

#### The ethics of radical tracker blocking

There are some who will argue that it is ethically wrong to block cookies as there is an implicit (or even sometimes an attempted explicit) contract to allow tracking in exchange for viewing content. In my opinion that's a bad deal and one that shouldn't have to be made anyway. If, as a website, you want to restrict your content, by all means do so. You cannot fault someone querying a resource on an free channel in a reasonable manner.

There are also grounds to argue that services like ROW obstruct the ability of sites to manage their GDPR responsibilities to visitors. As far as I know, any resource on the web that can be fetched is fair game to see as it is, and if no personal data is transferred to them in this fetch, there is no responsibility on their part to manage any data on fetchers. Correct me if I'm wrong, please.

Hopefully initiatives like ROW will put pressure on web service providers to look into alternative content access and distrubtion models. Tracking isn't worth it, and as I'm showing, is circumventable.

## Usage

Two queries are possible, search and URL proxy. Both use the `?q=%s` query parameter format which is standard across the web.

### Search

Search uses Duck Duck Go to fetch results, which are then cleaned, like all proxied traffic.

It also supports "bangs" to leave the ROW proxy service and search directly on Duck Duck Go (!ddg) or Google (!google), leaving the ROW service, e.g.

```
!google does google really track you everywhere
```

brings you right to Google.com search.

### URL

There's nothing fancy about the URL proxy, just give in the URL and make sure it's encoded, or use the URL entry box on index page.

### Options

There are four options, which can be included as query parameters, or toggled by click the hyperlinks on any page footer (except index)

1. imgs: show images (=1) or not (=-1)
2. embeds: show embedded content (=1) or not (=-1)
3. iframes: show iframes (=1) or not (=-1)
4. othertags: show other non-whitelisted HTML tags (=1) or not (=-1)

### Usage notes

1. All links will also route through this service, giving you seemless usage. However links may have referral codes, we plan to filter these out in future version.
2. Of course if you use the instance I have set up it's possible I could see your IP and what you look at (although I don't intend to). If this concerns you then stand up your own instance of the server, it's easy and should be free.
3. Script injection is still possible, full cleaner coming in future version. Should be more or less okay for now.
4. I considered adding a dark mode theme in CSS, but really if you want this just fork it and change it. I want it to be stateless and persistent settings like theme go against that. If the current theme really annoys you, [open a ticket](https://github.com/digithree/readable-only-web/issues/new).
5. You can (kind of) easily set this up on most browsers as a custom search engine for your browser bar. Very handy, especially with the bangs!

## Installation and deployment

### Local test

Like most simple Node.js servers you can get it up and running with the following two commands:

```
npm install
node server.js
```

This will install the NPM packages this project relies on (you must have `npm` installed) and then run the `server.js` script using `node`, which you also must have installed.

You'll see something like `Node app is running on port 5000`, so go to your browser and visit `localhost:5000` in that case.

**Bug:** note that links will go to `row.openode.io` right now, this will be fixed soon to use `localhost` if a local deployment.

### Remote server

The Docker files are set up to be already configured for OpeNode, but you can run it anywhere where Node.js is supported, it's a pretty simple little server.

To use OpeNode, set up an application and simply deploy using the CLI

```
openode deploy
```

## Contributions

Contributions are most welcome. I expect I will get this project to a passable state and leave it as is for posterity, but it would be great also if people built on it, especially in the following ways:

1. Come up with clean, simple and eye pleasing CSS to make it nice to look at
2. Add adapters for allow specific sites to work which have a click through (such as "accept" these cookies)
3. Just simply report any non working sites for me and others to have a look at

Head on over to the [issues page](https://github.com/digithree/readable-only-web/issues) to create one and get involved.

If you have code, create a PR. Don't forget to KISS.

## Attribution

The "logo" for ROW is the [Canoe emoji graphic by Jonas Dunkel](https://openmoji.org/library/#search=canoe&emoji=1F6F6), included as part of the [OpenMoji project](https://openmoji.org) and is protected under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), used here under that license.

## Enjoy!

Written by Simon Kenny to prove a point... I mean proof of concept! You can get a lot out of just text. Enjoy the simple life.

[https://github.com/digithree/readable-only-web](https://github.com/digithree/readable-only-web)