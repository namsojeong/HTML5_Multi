import Phaser from "phaser";
import MapManager from "../Core/MapManager";
import Player from "../GameObjects/Player";
import { GameOption } from "../GameOption";
import { io, Socket } from "socket.io-client";
import { addClientGameListener } from "../Network/ClientListener";
import Session from "../Server/Session";
import { HitInfo, SessionInfo } from "../Network/Protocol";
import SocketManager from "../Core/SocketManager";
import ProjectilePool from "../GameObjects/Pools/ProjectilePool";
import Projectile from "../GameObjects/Projectile";

interface RemotePlayerList
{
    [key:string] : Player;
}

export default class PlayGameScene extends Phaser.Scene
{

    player : Player;

    playerName:string;

    remotePlayers:RemotePlayerList ={};

    syncTimer : number = 0;

    constructor()
    {
        super({key:"PlayGame"});
        SocketManager.Instance.addGameProtocol(this);
    }

    create():void 
    {
        MapManager.Instance = new MapManager(this, "level1");
        //addClientListener(this.socket,this);
        ProjectilePool.Instance = new ProjectilePool(this);

        this.playerName = "namsojeong";
        SocketManager.Instance.sendData("enter",{name:this.playerName});
    }

    onComplateConnection(x:number,y:number):void
    {
        this.createPlayer(x,y,200,350, SocketManager.Instance.socket.id,false);
        this.cameraSetting();
    }

    //원격으로 진행하는 플레이어랑,내가 조종하는 플레이어
    createPlayer(x:number,y:number, speed:number,jumpPower:number,id:string,isRemote:boolean):void
    {
        if(isRemote)
        {
            this.remotePlayers[id] = new Player(this,x,y,"player",speed,jumpPower,id,isRemote);
        }else
        {
            this.player = new Player(this,x,y,"player",speed,jumpPower,id,isRemote);
            this.physics.add.collider(this.player,MapManager.Instance.collisions);
            this.physics.add.collider(this.player, ProjectilePool.Instance.pool, this.hitByIceball, undefined, this);
        }
        
    }
    
    hitByIceball(body1:any, body2:any):void
    {
        let p = body1 as Player;
        let iceball = body2 as Projectile;

        if(p.isWaitingForHit(iceball.projectileId))return;

        p.addWating(iceball.projectileId);

        // 이제 여기서 충돌에 대한 정보를 서버에 보내서 서버가 그걸 기반으로 충돌이 일어났는지를 체크
        let {x, y} = iceball.getTopLeft();

        let hitInfo:HitInfo={
            playerId:SocketManager.Instance.socket.id,
            projectileId:iceball.projectileId,
            projectileLTPosition:{x, y},
            damage:iceball.damage
        };

        SocketManager.Instance.sendData("hit_report", hitInfo);
    }

    removePlayer(key:string):void
    {
        this.remotePlayers[key].hpBar.destroy();
        this.remotePlayers[key].destroy();
        delete this.remotePlayers[key];
    }

    cameraSetting():void
    {
        const {width,height,mapOffset,cameraZoomFator,bottomOffset} = GameOption;
        this.physics.world.setBounds(0,0,width + mapOffset,height + bottomOffset);
        this.cameras.main.setBounds(0,0,width + mapOffset,height);
        this.cameras.main.setZoom(cameraZoomFator);
        this.cameras.main.startFollow(this.player);
    }

    update(time: number, delta: number): void {
        if(this.player == undefined) return;

        //이건 좌표를 저장해두고 이전좌표와 현재좌표의 거리가 0.1 미만이면 그냥 안보내고 , 만약 변했다면 그때 보낸다.
        this.syncTimer += delta; //1000이 1초
        if(this.syncTimer >= 50)
        {
            this.syncTimer = 0;
            let playerInfo : SessionInfo = {
                id:SocketManager.Instance.socket.id,
                name:this.playerName,
                position:{x:this.player.x,y:this.player.y},
                filpX:this.player.flipX,
                isMoving:this.player.isMoving()
            };

            SocketManager.Instance.sendData("info_sync",playerInfo);
        }

    }
}