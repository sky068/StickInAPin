(function() {"use strict";var __module = CC_EDITOR ? module : {exports:{}};var __filename = 'preview-scripts/assets/scripts/data/BgColorData.js';var __require = CC_EDITOR ? function (request) {return cc.require(request, require);} : function (request) {return cc.require(request, __filename);};function __define (exports, require, module) {"use strict";
cc._RF.push(module, '73fc8Zfy+RL0IYz9HD/hGyA', 'BgColorData', __filename);
// scripts/data/BgColorData.js

"use strict";

/**
 * Created by skyxu on 2019/12/2.
 */

var Utils = require("./../framework/common/UtilsOther");
var DataBase = require("./DataBase");

cc.Class({
    extends: DataBase,

    ctor: function ctor() {
        this.fileDir = "config/bgColorData";
        this.lastLevel = 1; // 上次游戏的等级
    },
    initData: function initData(data) {
        if (!data) {
            return;
        }
        this.dataObj = data;
        this.dataObj = Utils.arrayToDict(this.dataObj, "id");
    },


    // 更加当前等级获取背景颜色
    getBgTopColor: function getBgTopColor(level) {
        var data = this.getBgColorData(level);
        var color = data["top"];
        return "#" + color;
    },
    getBgDownColor: function getBgDownColor(level) {
        var data = this.getBgColorData(level);
        var color = data["down"];
        return "#" + color;
    },


    // 获取当前等级对应的背景颜色数据
    getBgColorData: function getBgColorData(level) {
        var id = this.getBgColorId(level);
        var data = this.dataObj[id];
        return data;
    },


    // 每十关切换一次，循环切换
    getBgColorId: function getBgColorId(level) {
        // let id = 1;
        // id += Math.floor((level-1) / 10);
        // id = id % 10;
        // id = id == 0 ? 10 : id;
        // return id;

        // 测试代码，每关都变背景
        var id = level % 10;
        id = id == 0 ? 10 : id;
        return id;
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
        //# sourceMappingURL=BgColorData.js.map
        