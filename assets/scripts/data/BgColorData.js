/**
 * Created by skyxu on 2019/12/2.
 */

let Utils = require("./../framework/common/UtilsOther");
let DataBase = require("./DataBase");

cc.Class({
    extends: DataBase,

    ctor() {
        this.fileDir = "config/bgColorData";
        this.lastLevel = 1; // 上次游戏的等级
    },

    initData(data) {
        if (!data) {
            return;
        }
        this.dataObj = data;
        this.dataObj = Utils.arrayToDict(this.dataObj, "id");
    },

    // 更加当前等级获取背景颜色
    getBgTopColor(level) {
        let data = this.getBgColorData(level);
        let color = data["top"];
        return "#" + color;
    },

    getBgDownColor(level) {
        let data = this.getBgColorData(level);
        let color = data["down"];
        return "#" + color;
    },

    // 获取当前等级对应的背景颜色数据
    getBgColorData(level) {
        let id = this.getBgColorId(level);
        let data = this.dataObj[id];
        return data;
    },

    // 每十关切换一次，循环切换
    getBgColorId(level) {
        // let id = 1;
        // id += Math.floor((level-1) / 10);
        // id = id % 10;
        // id = id == 0 ? 10 : id;
        // return id;

        // 测试代码，每关都变背景
        let id = level % 10;
        id = id == 0 ? 10 : id;
        return id;
    }
});
