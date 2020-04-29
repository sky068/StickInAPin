/**
 * Created by skyxu on 2019/11/26.
 */

let Utils = require("./../framework/common/UtilsOther");
let DataBase = require("./DataBase");

cc.Class({
    extends: DataBase,

    ctor() {
        this.fileDir = "config/upStarNeedData";
    },

    initData(data) {
        if (!data) {
            return;
        }
        this.dataObj = data;
        this.len = this.dataObj.length;
        this.dataObj = Utils.arrayToDict(this.dataObj, "level");
    },

    getUpStarNeedExp(level) {
        let data = this.dataObj[level];
        let exp = data["evolutionMaxExp"];
        return exp;
    },

    getMaxLevel() {
        return this.len;
    }
});