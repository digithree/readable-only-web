const S = require('string')

var UrlCompress = {
  // private properties, tables
  _lookup_table_common_url_parts: {
    // only supported protocols
    'A': 'http://',
    'B': 'https://',
    // domain extension
    'C': '.com',
    'D': '.org',
    'E': '.net',
    'F': '.co',
    'G': '.io',
    // file extension
    'H': '.htm' //also html variant
  },
  _lookup_table_less_common_url_parts: {
    // domain extension
    '%a': '.edu',
    '%b': '.gov',
    '%c': '.info',
    // file extension
    '%d': '.php',
    '%e': '.asp', //also aspx variant
    '%f': '.jsp'
  },
  _lookup_table_common_special: {
    'I': '-',
    //'': '_'  // underscore is allow, keep
    // for encodeing (delimiter)
    'J': '%',
    'K': '/',
    'L': '?',
    'M': '&',
    'N': '=',
    'O': '+',
    'P': '.',
  },
  _lookup_table_less_common_special: {
    '%g': '!',
    '%h': '~',
    '%i': '*',
    '%j': '\'',
    '%k': '(',
    '%l': ')',
    '%m': ',',
    '%n': ':',
    '%o': '@',
    '%p': '$',
    '%q': '#',
    '%r': ';'
  },
  /*
  _lookup_table_custom_escape: {
    // less common characters we force escape of
    '%2c': ',',
    '%3a': ':',
    '%40': '@',
    '%24': '$',
    '%23': '#',
    '%3b': ';'
  },
  */
 _lookup_table_rare_special: {
    // marked unsafe by RPF-2396
    '%s': '{',
    '%t': '}',
    '%u': '|',
    '%v': '\\',
    '%w': '^',
    '%x': '[',
    '%y': ']',
    '%z': '`'
  },
  _lookup_table_en_pairs: {
    // most common character pairs in English language, from http://letterfrequency.org/
    'Q': 'th',
    'R': 'he',
    'S': 'an',
    'T': 'in',
    'U': 'er',
    'V': 'on',
    'W': 're',
    'X': 'ed',
    'Y': 'nd',
    'Z': 'ha'
    // no point in compressing these to another 2 char encoding, no more single letters left
    /*
    '': 'at',
    '': 'en',
    '': 'es',
    '': 'of',
    '': 'nt',
    '': 'ea',
    '': 'ti',
    '': 'to',
    '': 'io',
    '': 'le',
    '': 'is',
    '': 'ou',
    '': 'ar',
    '': 'as',
    '': 'de',
    '': 'rt',
    '': 've',
    '': 'ss',
    '': 'ee',
    '': 'tt',
    '': 'ff',
    '': 'll',
    '': 'mm',
    '': 'oo'
    */
  },
  _lookup_table_en_triples: {
    '%0': 'the',
    '%1': 'and',
    '%2': 'tha',
    '%3': 'ent',
    '%4': 'ion',
    '%5': 'tio',
    '%6': 'for',
    '%7': 'nde',
    '%8': 'has',
    '%9': 'nce'
    /*
    '': 'edt',
    '': 'tis',
    '': 'oft',
    '': 'sth',
    '': 'men'
    */
  },
  /*
  _lookup_table_en_common_short_words: {
    '': 'some',
    '': 'use',
    '': 'her',
    '': 'this',
    '': 'would',
    '': 'first',
    '': 'have',
    '': 'each',
    '': 'make',
    '': 'water',
    '': 'from',
    '': 'which',
    '': 'like',
    '': 'been',
    '': 'him',
    '': 'call',
    '': 'time',
    '': 'word',
    '': 'look',
    '': 'now',
    '': 'find'
  },
  */

  encode : function (input) {
    var outputS = S(input.toLowerCase())
    // the order is important
    outputS = UrlCompress.replaceTableValueWithKey(outputS, UrlCompress._lookup_table_common_url_parts)
    outputS = UrlCompress.replaceTableValueWithKey(outputS, UrlCompress._lookup_table_en_triples)
    outputS = UrlCompress.replaceTableValueWithKey(outputS, UrlCompress._lookup_table_less_common_url_parts)
    outputS = UrlCompress.replaceTableValueWithKey(outputS, UrlCompress._lookup_table_en_pairs)
    outputS = UrlCompress.replaceTableValueWithKey(outputS, UrlCompress._lookup_table_rare_special)
    outputS = UrlCompress.replaceTableValueWithKey(outputS, UrlCompress._lookup_table_less_common_special)
    outputS = UrlCompress.replaceTableValueWithKey(outputS, UrlCompress._lookup_table_common_special)
    return UrlCompress.rotateChars(outputS.toString(), 10)
  },

  decode : function (input) {
    var outputS = S(UrlCompress.rotateChars(input, -10))
    // the order is important
    outputS = UrlCompress.replaceTableKeyWithValue(outputS, UrlCompress._lookup_table_common_special)
    outputS = UrlCompress.replaceTableKeyWithValue(outputS, UrlCompress._lookup_table_less_common_special)
    outputS = UrlCompress.replaceTableKeyWithValue(outputS, UrlCompress._lookup_table_rare_special)
    outputS = UrlCompress.replaceTableKeyWithValue(outputS, UrlCompress._lookup_table_en_pairs)
    outputS = UrlCompress.replaceTableKeyWithValue(outputS, UrlCompress._lookup_table_less_common_url_parts)
    outputS = UrlCompress.replaceTableKeyWithValue(outputS, UrlCompress._lookup_table_en_triples)
    outputS = UrlCompress.replaceTableKeyWithValue(outputS, UrlCompress._lookup_table_common_url_parts)
    return outputS.toString()
  },

  replaceTableValueWithKey : function (_s, table) {
    for (var key in table) {
      _s = _s.replaceAll(table[key], key)
    }
    //console.log(_s.toString())
    return _s
  },

  replaceTableKeyWithValue : function (_s, table) {
    for (var key in table) {
      _s = _s.replaceAll(key, table[key])
    }
    //console.log(_s.toString())
    return _s
  },

  rotateChars : function (str, amount) {
    // only rotate within three sets, 0-9, a-z, A-Z
    var outStr = ''
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i)
      if (c >= 48 && c < 58) {
        c = UrlCompress.rotateInRange(c, 48, 58, amount)
      } else if (c >= 65 && c < 91) {
        c = UrlCompress.rotateInRange(c, 65, 91, amount)
      } else if (c >= 97 && c < 123) {
        c = UrlCompress.rotateInRange(c, 97, 123, amount)
      }
      outStr += String.fromCharCode(c)
    }
    return outStr
  },

  rotateInRange : function (input, start, end, amount) {
    var value = ((input - start) + amount)
    if (value < 0) {
      value += (end - start)
    }
    return (value % (end - start)) + start;
  }
}

module.exports.UrlCompress = UrlCompress;
