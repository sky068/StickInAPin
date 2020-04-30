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
        bgNode: cc.Node,
    },

    init(params) {
        this.smallBalls = [];
        this.tmpBalls = []; // 发射的尚未添加到大球上的小球
        this._bigSpeed = 0;
        this._bigDir = -1;
        this._gameStart = false;
        this.curLevel = cc.sys.localStorage.getItem("game_level") || 1;
        this.curLevel = parseInt(this.curLevel);
        this.loadLevel(this.curLevel);
    },

    loadLevel(l) {
        let data = {
            big: 3,
            small: 5,
            speed: 1,
            dir: 1,
        }
        this._bigDir = data.dir;
        this._bigSpeed = data.speed;
        this.levelLabel.string = "第 " + l + " 关";

        // 清空数据
        for (let b of this.tmpBalls) {
            b.destroy();
        }
        for (let b of this.smallBalls) {
            b.destroy();
        }
        this.tmpBalls.splice(0);
        this.smallBalls.splice(0);

        for (let i = 0; i < data.small; i++) {
            let ball = cc.instantiate(this.bulletNode);
            ball.parent = this.ballPanel;
            this.smallBalls.push(ball);
            ball.getComponentInChildren(cc.Label).string = data.small - i;
        }

        this.bgNode.color = cc.color("#436770");
        this.loadBigBall(data.big);

        this.scheduleOnce(() => {
            this._gameStart = true;
        }, 0.1);
    },

    start() {
        let mng = cc.director.getCollisionManager();
        mng.enabled = true;
        // mng.enabledDebugDraw = true;
        // mng.enabledDrawBoundingBox = true;
        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
        zy.event.on("gameover", () => {
            if (this._gameStart) {
                this._gameStart = false;
                this.bgNode.color = cc.color("#7A3341");
                zy.ui.tip.show("游戏失败，即将重新开始");
                this.scheduleOnce(() => {
                    this.loadLevel(this.curLevel);
                }, 2);
            }
        }, this);
    },

    loadBigBall(counts) {
        this.bigBall.destroyAllChildren();
        let radius = this.bigBall.width / 2 - 2;
        let degree = 360 / counts;
        for (let i = 0; i < counts; i++) {
            let ball = cc.instantiate(this.smallBallPF);
            let radian = cc.misc.degreesToRadians(i * degree);
            let x = radius * Math.sin(radian);
            let y = radius * Math.cos(radian);
            ball.x = x;
            ball.y = y;
            ball.parent = this.bigBall;
            // 计算旋转角度
            ball.angle = 180 - i * degree;
            ball.getChildByName("numLabel").active = false;
        }
    },

    onTouchStart(event) {
        if (!this._gameStart) {
            return;
        }

        if (this.smallBalls.length > 0) {
            let bullet = this.smallBalls.shift();
            let wordPos = bullet.parent.convertToWorldSpaceAR(bullet.getPosition());

            let ball = cc.instantiate(this.smallBallPF);
            ball.getComponentInChildren(cc.Label).string = bullet.getComponentInChildren(cc.Label).string;
            ball.parent = this.bigBall.parent;
            ball.position = this.bigBall.parent.convertToNodeSpaceAR(wordPos);
            this.tmpBalls.push(ball);
            bullet.destroy();

            let radius = this.bigBall.height / 2 - 2;
            let des = cc.v2(0, this.bigBall.y - radius);
            ball.runAction(cc.sequence(cc.moveTo(0.1, des), cc.callFunc(() => {
                this.tmpBalls.shift();
                ball.parent = this.bigBall;
                let angle = this.bigBall.angle;
                angle = angle % 360 + 180;
                let radian = cc.misc.degreesToRadians(angle);

                let x = radius * Math.sin(radian);
                let y = radius * Math.cos(radian);
                ball.x = x;
                ball.y = y;
                ball.angle = 180 - angle;

                this._checkPass();
            })));
        }
    },

    _checkPass() {
        if (this.smallBalls.length == 0) {
            this.bgNode.color = cc.color("#4C7043");
            let des = "恭喜过关，即将进入下一关";
            const max = 20;
            if (this.curLevel < max) {
                this.curLevel += 1;
            } else {
                des = "恭喜你通关了";
            }
            zy.ui.tip.show(des);
            this.scheduleOnce(() => {
                this.loadLevel(this.curLevel);
            }, 2);
            cc.sys.localStorage.setItem("game_level", this.curLevel);
        }
        
    },

    lateUpdate(dt) {
        if (!this._gameStart) {
            return;
        }
        this.bigBall.angle += this._bigDir * this._bigSpeed;
    }
});