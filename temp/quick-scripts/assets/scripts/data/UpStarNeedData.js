(function() {"use strict";var __module = CC_EDITOR ? module : {exports:{}};var __filename = 'preview-scripts/assets/scripts/data/UpStarNeedData.js';var __require = CC_EDITOR ? function (request) {return cc.require(request, require);} : function (request) {return cc.require(request, __filename);};function __define (exports, require, module) {"use strict";
cc._RF.push(module, '88221sfy7dCn7po4FlELoKp', 'UpStarNeedData', __filename);
// scripts/data/UpStarNeedData.js

"use strict";

/**
 * Created by skyxu on 2019/11/26.
 */

var Utils = require("./../framework/common/UtilsOther");
var DataBase = require("./DataBase");

cc.Class({
    extends: DataBase,

    ctor: function ctor() {
        this.fileDir = "config/upStarNeedData";
    },
    initData: function initData(data) {
        if (!data) {
            return;
        }
        this.dataObj = data;
        this.len = this.dataObj.length;
        this.dataObj = Utils.arrayToDict(this.dataObj, "level");
    },
    getUpStarNeedExp: function getUpStarNeedExp(level) {
        var data = this.dataObj[level];
        var exp = data["evolutionMaxExp"];
        return exp;
    },
    getMaxLevel: function getMaxLevel() {
        return this.len;
    }
});

cc._RF.pop();
        }
        if (CC_EDITOR) {
            __define(__module.exports, __require, __module);
        }
        else {
            cc.registerModuleFunc(__filename, function () {
                __define(__module.exports, __require, __module);
            });
        }
        })();
        //# sourceMappingURL=UpStarNeedData.js.map
        