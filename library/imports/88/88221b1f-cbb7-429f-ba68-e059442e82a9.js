"use strict";
cc._RF.push(module, '88221sfy7dCn7po4FlELoKp', 'UpStarNeedData');
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