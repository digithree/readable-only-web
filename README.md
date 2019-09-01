# Readable Only Web

Readable filter for the web. Put distance between your hardware and trackers.

### ROW is the Readable Only Web

> Row, row, row your browser
> Gently up the stream.
> Merrily, merrily merrily, merrily,
> Now your page is clean.

This service applies Mozillas "Readability" standalone code (along with other processors) to attempt to extract article text from any give web resource. Will only work for standard articles without access-walls in the current version.

## Usage

Add your website in the query parameter "q" for our URL and "url" endpoint, e.g. http://row.openode.io/url?q=http://website.com/some-article

### Notes

1. Will show images, which might have tracking built in. Optional removal (with click to reveal) coming in future version.
2. All links will also route through this service, giving you seemless usage. However links may have referral codes, removal in future version.
3. Script injection is still possible, full cleaner coming in future version. Should be more or less okay for now.

## Installation

I used to use Heroku but now I can't recommend anything really.

But the whole idea is to run it _not on your own machine_, rather on a third party webserver out there in cloud-cuckoo-land, ideally with more than person using it to really confuse the trackers.

## Attribution

The "logo" for ROW is the [Cano emoji graphic by Jonas Dunkel](https://openmoji.org/library/#search=canoe&emoji=1F6F6), included as part of the [OpenMoji project](https://openmoji.org) and is protected under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), used here under that license.

## Enjoy!

Written by Simon Kenny to prove a point... I mean proof of concept! You can get a lot out of just text. Enjoy the simple life yo.