import Phaser from "phaser";
import { getTimeStamp } from "../Core/GameUtil";
import SocketManager from "../Core/SocketManager";
import { Iceball, Position } from "../Network/Protocol";
import Player from "./Player";
import ProjectilePool from "./Pools/ProjectilePool";

export default class PlayerAttack
{
    lastFireTime:number=0;
    coolDown:number=1000;
    damage:number=10;
    lifeTime:number=1000;

    player:Player;

    constructor(p:Player, lifeTime:number = 1000)
    {
        this.player = p;
        this.lifeTime = lifeTime;
    }

    // 공격시도
    attemptAttack():void
    {
        let now:number = getTimeStamp();
        if(this.coolDown + this.lastFireTime>now)return;


        let ownerID = SocketManager.Instance.socket.id;
        let direction = this.player.flipX?-1:1;
        let {x, y} = this.player.getCenter();
        let position:Position = {x:x + direction*10, y:y};
        let velocity :number = 400; // 속도
    
        let data:Iceball = {
            ownerID, direction, position, lifeTime:this.lifeTime, 
            velocity, projectileId:0, damage:this.damage};

        SocketManager.Instance.sendData("fire_attempt", data);
    }

    fireProjectile(data:Iceball):void
    {
        this.lastFireTime = getTimeStamp(); // 실제 발사 타임스태프 기록

        let p = ProjectilePool.Instance.getProjectile();
        p.fire(data);
        this.player.play("throw", true);
    }
}