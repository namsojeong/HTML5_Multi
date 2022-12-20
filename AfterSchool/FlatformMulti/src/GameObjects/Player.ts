import Phaser, { FacebookInstantGamesLeaderboard } from "phaser";
import InitPlayerAnimation from "../Animations/PlayerAnimation";
import { checkAnimationPlay } from "../Core/GameUtil";
import { DeadInfo, SessionInfo } from "../Network/Protocol";
import ProjectilePool from "./Pools/ProjectilePool";
import PlayerAttack from "./PlayerAttack";
import Projectile from "./Projectile";
import HealthBar from "./HealthBar";
import SocketManager from "../Core/SocketManager";

export default class Player extends Phaser.Physics.Arcade.Sprite
{
    speed:number;
    jumpPower:number;
    cursorKey:Phaser.Types.Input.Keyboard.CursorKeys;
    body:Phaser.Physics.Arcade.Body;

    isGround:boolean = false;
    maxJumpCount :number = 2;
    currentJumpCount:number = 0;

    //netWork
    isRemoto:boolean = false;
    id:string;

    attack:PlayerAttack;
    hasBeenHit:boolean = false;

    waitingConfirm:number[]=[]; // 맞았는데 서버확인을 요청하고 있는 애들의 아이스볼 번호
    bouncePoser = 250;

    // 체력 관련
    hp:number;
    maxHP:number;
    hpBar:HealthBar;
    isDead:boolean = false;

    // 애니메이션 관련
    tween : Phaser.Tweens.Tween;

    constructor(scene:Phaser.Scene,x:number,y:number,key:string,speed:number,jumpPower:number,id:string,isRemoto:boolean)
    {
        super(scene,x,y,key);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.speed = speed;
        this.jumpPower = jumpPower;
        this.isRemoto = isRemoto;
        this.id = id;

        this.attack = new PlayerAttack(this, 1000);

        this.maxHP = this.hp = 10;
        this.hpBar = new HealthBar(this.scene, {x:x-32*0.5, y:y-38*0.5-15}, new Phaser.Math.Vector2(32, 5));

        this.init();
    }

    // 너 지금 이 투사체에 맞아서 대기중이니?
    isWaitingForHit(projectileId:number):boolean
    {
        return this.waitingConfirm.find(x=>x == projectileId)!=undefined;
    }
    // 대기열에 이 투사체도 추가해줘
    addWating(projectileId:number):void
    {
        this.waitingConfirm.push(projectileId);
    }

    removeWating(projectileId:number):void{
        let idx = this.waitingConfirm.findIndex(x=>x == projectileId);
        if(idx<0)return;
        this.waitingConfirm.splice(idx, 1);
    }

    init():void
    {
        this.setCollideWorldBounds(true);
        InitPlayerAnimation(this.scene.anims);

        if(this.isRemoto == false)
        {
            this.cursorKey = this.scene.input.keyboard.createCursorKeys();
            this.scene.events.on(Phaser.Scenes.Events.UPDATE,this.update,this);

            this.scene.input.keyboard.on("keydown-Q",this.fireIceball,this);
        }else
        {
            this.body.setAllowGravity(false);
        }  
    }

    fireIceball():void
    {
        this.attack.attemptAttack();
    }

    //오른쪽 왼쪽 방향만 dir받는다
    move(direction: number):void
    {
        this.setVelocityX(direction * this.speed);
    }

    jump():void
    {
        this.currentJumpCount++;
        if(this.isGround || this.currentJumpCount <= this.maxJumpCount)
        {
            this.setVelocityY(-this.jumpPower);
        }
    }

    setInfoSync(info:SessionInfo):void
    {
        this.x = info.position.x;
        this.y = info.position.y;
        this.setFlipX(info.filpX);

        if(checkAnimationPlay(this.anims, "throw")) return;

        if(info.isMoving)
        {
            this.play("run",true);
        }
        else
        {
            this.play("idle",true);
        }
    }

    isMoving():boolean
    {
        return this.body.velocity.length() > 0.1; // 이동중
    }

    preUpdate(time:number, delta:number)
    {
        super.preUpdate(time, delta);
        this.hpBar.move(this.x-32*0.5, this.y-38*0.5-15);
    }

    update(time:number,delta:number):void
    {

        if(this.hasBeenHit || this.isDead) return;
        if(this.cursorKey == undefined) return;

        const {left,right,space} = this.cursorKey;
        const isSpaceJustDown: boolean = Phaser.Input.Keyboard.JustDown(space);
        this.isGround = this.body.onFloor();

        if(left.isDown)
        {
            this.move(-1);
            this.setFlipX(true);
        }
        else if(right.isDown)
        {
            this.move(1);
            this.setFlipX(false);
        }
        else
        {
            this.move(0);
        }

        if(isSpaceJustDown)
        {
            this.jump();
        }

        if(this.isGround && this.body.velocity.y == 0)
            this.currentJumpCount =0;

        if(checkAnimationPlay(this.anims, "throw")) return; // 공격모션 재생 중일 때는 Return

        if(this.isGround == true)
        {
            if(Math.abs(this.body.velocity.x) <= 0.1)
            {
                this.play("idle",true);
            }
            else
            {
                this.play("run",true);
            }
        }
        else
        {
            this.play("jump",true);
        }
    }

    takeHit(damage:number):void
    {
        if(this.hasBeenHit || this.isDead)return;
        this.hasBeenHit=true;

        this.hp -= damage;
        if(this.hp<=0)
        {
            this.hp=0;
            // 죽음 처리
            this.setDead();
        }
        else
        {
            this.tween = this.scene.tweens.add({
                targets:this,
                duration:0.2,
                repeat:-1,
                alpha:0.2,
                yoyo:true
            });
    
            this.scene.time.delayedCall(1000, ()=>{
                this.hasBeenHit =false;
                this.tween.stop(0); // 0번 타임으로 돌려라
                this.alpha=1;
            });
        }

        this.hpBar.setHealth(this.hp/this.maxHP);
    }

    bounceOff(dir:Phaser.Math.Vector2):void
    {
        let bouncingPower = 400;
        // 여기서 받은 dir을 normal 해서 적절한 힘으로 튕겨나가게 해주면 된다
        this.setVelocity(dir.x * bouncingPower, dir.y*bouncingPower);
    }

    // 사망처리 해주는 함수
    setDead():void
    {
        this.hasBeenHit = false;
        this.setTint(0xff0000);
        this.body.checkCollision.none=true;

        this.isDead=true;
        if(this.isRemoto==false)
        {
            this.setVelocity(0,-200);

            this.scene.time.delayedCall(2000, ()=>{
                // 사망 후 3초 지나면
                // 서버로 플레이어가 사망했음을 알려주고 그걸 브로드캐스트로 모든애들이 받음
                this.setActive(false);
                this.setVisible(false);

                let info:DeadInfo = {playerId:this.id};
                SocketManager.Instance.sendData("player_dead", info); // 내가 죽는 정보를 서버로 전송
            });
        }
    }

    // 부활처리 해주는 함수
    revive():void
    {

    }
}