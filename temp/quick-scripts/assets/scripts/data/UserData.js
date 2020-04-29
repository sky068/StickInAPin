(function() {"use strict";var __module = CC_EDITOR ? module : {exports:{}};var __filename = 'preview-scripts/assets/scripts/data/UserData.js';var __require = CC_EDITOR ? function (request) {return cc.require(request, require);} : function (request) {return cc.require(request, __filename);};function __define (exports, require, module) {"use strict";
cc._RF.push(module, '7336dHaZ0xCkJME+CeR/q9i', 'UserData', __filename);
// scripts/data/UserData.js

"use strict";

/**
 * Created by skyxu on 2019/11/27.
 *
 * 玩家在游戏中动态修改的数据
 */

cc.Class({
    ctor: function ctor() {
        this.lastGotCoinTime = zy.utils.time(); // 上次领取奖励的时间(每10秒给金币)
        this.freeCoinsLevel = 1; // 免费领取金币等级，等级越高可领取金币越多
        this.hpLevel = 1; // 当前血量的等级
        this.preInterAdLevel = 0; // 上次插屏广告的关卡数
        this.phPower = zy.constData.PhDefault; // 体力值
        this.phPowerCounts = zy.constData.MaxPhCounts1Day; // 当天可领取的体力次数
        this.phPowerTime = 0; // 最后一次获取体力的时间，24小时重置领取次数
        this.phLowTime = 0; // 体力值小于最大体力的时间

        this.vibOn = true; // 震动开关

        this.guide = 0; //  引导步骤

        this.freeCoinsLastTime = zy.utils.time() - zy.constData.FreeCoinsCooling; // 上次看广告领奖励的时间
        this.freeCoinsNum = zy.constData.FreeCoinsMaxNum; // 当日剩余领金币次数
        this.freeCoinsNum2 = 0; // 当日领取免费金币次数
        this.freeWatchNum = 0; // 当日观看免费金币广告次数
    },
    saveData: function saveData() {
        var obj = {};
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = Object.keys(this)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var key = _step.value;

                obj[key] = this[key];
            }
        } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion && _iterator.return) {
                    _iterator.return();
                }
            } finally {
                if (_didIteratorError) {
                    throw _iteratorError;
                }
            }
        }

        var data = JSON.stringify(obj);
        cc.sys.localStorage.setItem(zy.constData.StaticKey.PlayerDataKey + zy.constData.StaticKey.SaveDataVersion, data);
    },
    loadData: function loadData() {
        var data = cc.sys.localStorage.getItem(zy.constData.StaticKey.PlayerDataKey + zy.constData.StaticKey.SaveDataVersion);
        if (data) {
            data = JSON.parse(data);
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = Object.keys(data)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var key = _step2.value;

                    if (this.hasOwnProperty(key)) {
                        this[key] = data[key];
                    }
                }
            } catch (err) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion2 && _iterator2.return) {
                        _iterator2.return();
                    }
                } finally {
                    if (_didIteratorError2) {
                        throw _iteratorError2;
                    }
                }
            }
        }
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
        //# sourceMappingURL=UserData.js.map
        