import {expect} from 'chai';
import {spy} from 'sinon';
import assign from 'object-assign';
import {concatAllRuns, concatAllParagraphs, iterateColumnHeaders, iterateRows} from '../../src/utils/traverse';

const FILE_UNDER_TEST = '../../src/utils/cache';

describe('cache', () => {
  let cache;

  before(() => {
    const MANIFEST_VERSION = require(FILE_UNDER_TEST).MANIFEST_VERSION;

    // Pass browser test required by utils/cache
    global.window = {};

    // Mock localStorage
    //
    const fakeLocalStorage = {
      clear: function clear() {
        global.localStorage = assign({}, fakeLocalStorage);
      },
      MANIFEST_VERSION
    };
    fakeLocalStorage.clear();

    // Force reload utils/cache
    //
    delete require.cache[require.resolve(FILE_UNDER_TEST)];
    cache = require(FILE_UNDER_TEST);
  });

  it('should be able to load from cache', () => {
    const TABLE_ID = 'FOO';
    localStorage[TABLE_ID] = '{"foo": "bar"}';

    expect(cache.getTable(TABLE_ID)).to.eql({foo: 'bar'});
  });

  it('should be able to set cache then load cache', () => {
    const TABLE_ID = 'FOO2';
    const DATA = {fooo: "barr"};
    cache.setTable(TABLE_ID, DATA);

    expect(cache.getTable(TABLE_ID)).to.eql(DATA);
  });

  after(() => {
    delete global.window;
    delete global.localStorage;
  });
});

describe('traverse', () => {
  describe('concatAllRuns', () => {
    it('should concat nested runs', () => {
      expect(concatAllRuns([
        {
          "href": "http://www.gvm.com.tw/webonly_content_6748.html",
          "runs": [
            {
              "commentIds": [],
              "text": "2015華人企業領袖遠見高峰會",
              "isB": false,
              "isU": false,
              "isI": false
            }
          ]
        },
        {
          "commentIds": [],
          "text": "、",
          "isB": false,
          "isU": false,
          "isI": false
        },
        {
          "href": "http://web.archive.org/web/20151114054626/http://www.kmt.org.tw/2015/10/blog-post_684.html",
          "runs": [
            {
              "commentIds": [],
              "text": "10/29國民黨新聞稿",
              "isB": false,
              "isU": false,
              "isI": false
            }
          ]
        }
      ])).to.eql('2015華人企業領袖遠見高峰會、10/29國民黨新聞稿');
    });
  });

  describe('concatAllParagraphs', () => {
    it('should concatenate all text in the given paragraphs', () => {
      expect(concatAllParagraphs([
        {
          "level": 0,
          "children": [
            {
              "commentIds": [],
              "text": "以",
              "isB": false,
              "isU": false,
              "isI": false
            },
            {
              "commentIds": [
                "0"
              ],
              "text": "貨櫃安全倡議及大港倡議",
              "isB": false,
              "isU": false,
              "isI": false
            },
            {
              "commentIds": [],
              "text": "為模式推動與美國的反恐合作",
              "isB": false,
              "isU": false,
              "isI": false
            }
          ]
        },
        {
          "level": 0,
          "children": [
            {
              "commentIds": [],
              "text": "承諾ㄧ建立一致性、可預測且可持續的兩岸關係",
              "isB": false,
              "isU": false,
              "isI": false
            }
          ]
        }
      ])).to.eql('以貨櫃安全倡議及大港倡議為模式推動與美國的反恐合作 承諾ㄧ建立一致性、可預測且可持續的兩岸關係');
    });
  });

  describe('iterateRows', () => {
    it('iterates over nested rows', () => {
      // Simplified rows from doc:
      // https://docs.google.com/document/d/1lA_QiIUzjgl3ImwZSU_gFFq7f22y5YqUB62-S0wkkQc/edit
      //

      let iterator = iterateRows([
        {
          "paragraphs": [
            {
              "level": -1,
              "children": [{"text": "a"}]
            }
          ],
          "colspan": 1,
          "children": [
            {
              "paragraphs": [
                {
                  "level": -1,
                  "children": [{"text": "a-1"}]
                }
              ],
              "colspan": 1,
              "cells": ['1st row']
            },
            {
              "paragraphs": [
                {
                  "level": -1,
                  "children": [{"text": "a-2"}]
                }
              ],
              "colspan": 1,
              "cells": ['2nd row']
            }
          ]
        },
        {
          "paragraphs": [
            {
              "level": -1,
              "children": [{"text": "b"}]
            }
          ],
          "colspan": 2,
          "cells": ['3rd row']
        }
      ]);

      expect(iterator.next().value, "1st row").to.eql({
        headers: [
          [{
            "level": -1,
            "children": [{"text": "a"}]
          }],
          [{
            "level": -1,
            "children": [{"text": "a-1"}]
          }]
        ],
        cells: ['1st row']
      });

      expect(iterator.next().value, "2nd row").to.eql({
        headers: [
          [{
            "level": -1,
            "children": [{"text": "a"}]
          }],
          [{
            "level": -1,
            "children": [{"text": "a-2"}]
          }]
        ],
        cells: ['2nd row']
      });

      expect(iterator.next().value, "3rd row").to.eql({
        headers: [
          [{
            "level": -1,
            "children": [{"text": "b"}]
          }]
        ],
        cells: ['3rd row']
      });

      expect(iterator.next().done).to.equal(true);
    });

    it('deals with top-level empty row', () => {
      let iterator = iterateRows([
        {
          "paragraphs": [
            {
              "level": -1,
              "children": []
            }
          ],
          "colspan": 1,
          "cells": ['content!']
        }
      ]);

      expect(iterator.next().value).to.eql({
        headers: [
          [{
            level: -1, children: []
          }]
        ],
        cells: ['content!']
      })
    })
  });

  describe('iterateColumnHeaders', () => {
    it('iterates over nested columns', () => {
      // Simplified columns from doc:
      // https://docs.google.com/document/d/1lA_QiIUzjgl3ImwZSU_gFFq7f22y5YqUB62-S0wkkQc/edit
      //
      let iterator = iterateColumnHeaders([
        {
          "paragraphs": [
            {
              "level": -1,
              "children": [{"text": "A"}]
            }
          ],
          "children": [
            {
              "paragraphs": [
                {
                  "level": -1,
                  "children": [{"text": "A-1"}]
                }
              ]
            },
            {
              "paragraphs": [
                {
                  "level": -1,
                  "children": [{"text": "A-2"}]
                }
              ]
            }
          ]
        },
        {
          "paragraphs": [
            {
              "level": -1,
              "children": [{"text": "B"}] // Has rowspan=2
            }
          ],
          "children": [
            {
              "paragraphs": [
                {
                  "level": -1,
                  "children": []
                }
              ]
            }
          ]
        }
      ]);

      expect(iterator.next().value, '1st column').to.eql([
        [{
          "level": -1,
          "children": [{"text": "A"}]
        }],
        [{
          "level": -1,
          "children": [{"text": "A-1"}]
        }]
      ]);

      // Nested headers for 2nd column
      //
      expect(iterator.next().value, '2nd column').to.eql([
        [{
          "level": -1,
          "children": [{"text": "A"}]
        }],
        [{
          "level": -1,
          "children": [{"text": "A-2"}]
        }]
      ]);

      // Merged header for 3rd column
      //
      expect(iterator.next().value, 'last column').to.eql([
        [{
          "level": -1,
          "children": [{"text": "B"}]
        }]
      ]);
      expect(iterator.next().done).to.equal(true);

    });
  });
});