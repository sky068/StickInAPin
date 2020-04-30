"use strict";
cc._RF.push(module, '96793wKagVG8LHTdsirugZ2', 'GameScene');
// scripts/scene/GameScene.js

"use strict";

/**
 * Created by xujiawei on 2020-04-29 17:37:50
 */

cc.Class({
    extends: cc.Component,
    properties: {
        ballPanel: cc.Node,
        smallBallPF: cc.Prefab,
        bigBall: cc.Node,
        levelLabel: cc.Label,
        bulletNode: cc.Node,
        bgNode: cc.Node
    },

    init: function init(params) {
        this.smallBalls = [];
        this.tmpBalls = []; // 发射的尚未添加到大球上的小球
        this._bigSpeed = 0;
        this._bigDir = -1;
        this._gameStart = false;
        this.curLevel = cc.sys.localStorage.getItem("game_level") || 1;
        this.curLevel = parseInt(this.curLevel);
        this.loadLevel(this.curLevel);
    },
    loadLevel: function loadLevel(l) {
        var _this = this;

        var data = {
            big: 3,
            small: 5,
            speed: 1,
            dir: 1
        };
        this._bigDir = data.dir;
        this._bigSpeed = data.speed;
        this.levelLabel.string = "第 " + l + " 关";

        // 清空数据
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = this.tmpBalls[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var b = _step.value;

                b.destroy();
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

        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
            for (var _iterator2 = this.smallBalls[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                var _b = _step2.value;

                _b.destroy();
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

        this.tmpBalls.splice(0);
        this.smallBalls.splice(0);

        for (var i = 0; i < data.small; i++) {
            var ball = cc.instantiate(this.bulletNode);
            ball.parent = this.ballPanel;
            this.smallBalls.push(ball);
            ball.getComponentInChildren(cc.Label).string = data.small - i;
        }

        this.bgNode.color = cc.color("#436770");
        this.loadBigBall(data.big);

        this.scheduleOnce(function () {
            _this._gameStart = true;
        }, 0.1);
    },
    start: function start() {
        var _this2 = this;

        var mng = cc.director.getCollisionManager();
        mng.enabled = true;
        // mng.enabledDebugDraw = true;
        // mng.enabledDrawBoundingBox = true;
        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
        zy.event.on("gameover", function () {
            if (_this2._gameStart) {
                _this2._gameStart = false;
                _this2.bgNode.color = cc.color("#7A3341");
                zy.ui.tip.show("游戏失败，即将重新开始");
                _this2.scheduleOnce(function () {
                    _this2.loadLevel(_this2.curLevel);
                }, 2);
            }
        }, this);
    },
    loadBigBall: function loadBigBall(counts) {
        this.bigBall.destroyAllChildren();
        var radius = this.bigBall.width / 2 - 2;
        var degree = 360 / counts;
        for (var i = 0; i < counts; i++) {
            var ball = cc.instantiate(this.smallBallPF);
            var radian = cc.misc.degreesToRadians(i * degree);
            var x = radius * Math.sin(radian);
            var y = radius * Math.cos(radian);
            ball.x = x;
            ball.y = y;
            ball.parent = this.bigBall;
            // 计算旋转角度
            ball.angle = 180 - i * degree;
            ball.getChildByName("numLabel").active = false;
        }
    },
    onTouchStart: function onTouchStart(event) {
        var _this3 = this;

        if (!this._gameStart) {
            return;
        }

        if (this.smallBalls.length > 0) {
            var bullet = this.smallBalls.shift();
            var wordPos = bullet.parent.convertToWorldSpaceAR(bullet.getPosition());

            var ball = cc.instantiate(this.smallBallPF);
            ball.getComponentInChildren(cc.Label).string = bullet.getComponentInChildren(cc.Label).string;
            ball.parent = this.bigBall.parent;
            ball.position = this.bigBall.parent.convertToNodeSpaceAR(wordPos);
            this.tmpBalls.push(ball);
            bullet.destroy();

            var radius = this.bigBall.height / 2 - 2;
            var des = cc.v2(0, this.bigBall.y - radius);
            ball.runAction(cc.sequence(cc.moveTo(0.1, des), cc.callFunc(function () {
                _this3.tmpBalls.shift();
                ball.parent = _this3.bigBall;
                var angle = _this3.bigBall.angle;
                angle = angle % 360 + 180;
                var radian = cc.misc.degreesToRadians(angle);

                var x = radius * Math.sin(radian);
                var y = radius * Math.cos(radian);
                ball.x = x;
                ball.y = y;
                ball.angle = 180 - angle;

                _this3._checkPass();
            })));
        }
    },
    _checkPass: function _checkPass() {
        var _this4 = this;

        if (this.smallBalls.length == 0) {
            this.bgNode.color = cc.color("#4C7043");
            var des = "恭喜过关，即将进入下一关";
            var max = 20;
            if (this.curLevel < max) {
                this.curLevel += 1;
            } else {
                des = "恭喜你通关了";
            }
            zy.ui.tip.show(des);
            this.scheduleOnce(function () {
                _this4.loadLevel(_this4.curLevel);
            }, 2);
            cc.sys.localStorage.setItem("game_level", this.curLevel);
        }
    },
    lateUpdate: function lateUpdate(dt) {
        if (!this._gameStart) {
            return;
        }
        this.bigBall.angle += this._bigDir * this._bigSpeed;
    }
});

cc._RF.pop();