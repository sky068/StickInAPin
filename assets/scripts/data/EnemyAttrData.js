/**
 * Created by skyxu on 2019/11/28.
 *
 * 敌人属性表
 */

let Utils = require("./../framework/common/UtilsOther");
let DataBase = require("./DataBase");

cc.Class({
    extends: DataBase,

    ctor() {
        this.fileDir = "config/enemyAttrData";
    },

    initData(data) {
        if (!data) {
            return;
        }
        this.dataObj = data;
        this.dataLen = data.length;
        this.dataObj = Utils.arrayToDict(this.dataObj, "id");
    },

    /**
     * 获取知道id的敌人属性信息（name,track, baseMoveSpeed, baseWaveSpeed...）
     * @param id
     * @returns {*}
     */
    getTurretAttr(id) {
        let data = this.dataObj[id];
        return data;
    }
});