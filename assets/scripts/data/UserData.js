/**
 * Created by skyxu on 2019/11/27.
 *
 * 玩家在游戏中动态修改的数据
 */

cc.Class({
    ctor() {
        this.lastGotCoinTime = zy.utils.time();  // 上次领取奖励的时间(每10秒给金币)
        this.freeCoinsLevel = 1;  // 免费领取金币等级，等级越高可领取金币越多
        this.hpLevel = 1;  // 当前血量的等级
        this.preInterAdLevel = 0;  // 上次插屏广告的关卡数
        this.phPower = zy.constData.PhDefault;  // 体力值
        this.phPowerCounts = zy.constData.MaxPhCounts1Day;  // 当天可领取的体力次数
        this.phPowerTime = 0;  // 最后一次获取体力的时间，24小时重置领取次数
        this.phLowTime = 0; // 体力值小于最大体力的时间

        this.vibOn = true;  // 震动开关

        this.guide = 0;  //  引导步骤

        this.freeCoinsLastTime = zy.utils.time() - zy.constData.FreeCoinsCooling;  // 上次看广告领奖励的时间
        this.freeCoinsNum = zy.constData.FreeCoinsMaxNum;  // 当日剩余领金币次数
        this.freeCoinsNum2 = 0;  // 当日领取免费金币次数
        this.freeWatchNum = 0;  // 当日观看免费金币广告次数

    },

    saveData() {
        let obj = {};
        for (let key of Object.keys(this)) {
            obj[key] = this[key];
        }
        let data = JSON.stringify(obj);
        cc.sys.localStorage.setItem(zy.constData.StaticKey.PlayerDataKey + zy.constData.StaticKey.SaveDataVersion, data);
    },

    loadData() {
        let data = cc.sys.localStorage.getItem(zy.constData.StaticKey.PlayerDataKey + zy.constData.StaticKey.SaveDataVersion);
        if (data) {
            data = JSON.parse(data);
            for (let key of Object.keys(data)) {
                if (this.hasOwnProperty(key)) {
                    this[key] = data[key];
                }
            }
        }
    }
});