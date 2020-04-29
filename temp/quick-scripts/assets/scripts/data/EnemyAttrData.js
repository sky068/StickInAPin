(function() {"use strict";var __module = CC_EDITOR ? module : {exports:{}};var __filename = 'preview-scripts/assets/scripts/data/EnemyAttrData.js';var __require = CC_EDITOR ? function (request) {return cc.require(request, require);} : function (request) {return cc.require(request, __filename);};function __define (exports, require, module) {"use strict";
cc._RF.push(module, '13c2ayStb1OxKw43gQsFz9u', 'EnemyAttrData', __filename);
// scripts/data/EnemyAttrData.js

"use strict";

/**
 * Created by skyxu on 2019/11/28.
 *
 * 敌人属性表
 */

var Utils = require("./../framework/common/UtilsOther");
var DataBase = require("./DataBase");

cc.Class({
    extends: DataBase,

    ctor: function ctor() {
        this.fileDir = "config/enemyAttrData";
    },
    initData: function initData(data) {
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
    getTurretAttr: function getTurretAttr(id) {
        var data = this.dataObj[id];
        return data;
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
        //# sourceMappingURL=EnemyAttrData.js.map
        